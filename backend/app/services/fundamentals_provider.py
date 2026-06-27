"""
fundamentals_provider — fonte CONFIÁVEL de fundamentos para o ranking LBH.

PROBLEMA que isto resolve:
    O ranking usava fetch_fundamentals (yfinance .info) que FALHA em produção
    (retorna {} vazio) → ROE / payout / dívida-patrimônio / dividend_yield nulos.

ESTE módulo NÃO depende de yfinance. Busca direto via HTTP (urllib + SSL com
fallback, igual ao padrão de ranking_service._chart_api_series):

    • Ações .SA (Brasil)  → brapi.dev   (grátis; modules funcionam sem token)
    • Demais (US/EU/etc.) → FMP         (FMP_API_KEY no env)
    • Crypto (-USD) / índices (^...) / câmbio (=X) → tudo None (não têm fundamentos)

Tudo BLINDADO: nunca lança exceção. Em qualquer falha (rede/SSL/parse/campo
ausente) retorna o dict-padrão com Nones. Cache em memória com TTL ~6h, pois
fundamentos mudam devagar.

Uso:
    from app.services.fundamentals_provider import get_fundamentals
    get_fundamentals("AAPL")      # via FMP
    get_fundamentals("PETR4.SA")  # via brapi
    get_fundamentals("BTC-USD")   # tudo None
"""

from __future__ import annotations

import os
import re as _re
import ssl as _ssl
import json as _json
import time as _time
import logging
import tempfile as _tempfile
import urllib.parse as _urlparse
import urllib.request as _urlreq

logger = logging.getLogger(__name__)

# ─────────────────────────── SSL (mesmo padrão de ranking_service) ───────────────
try:
    import certifi as _certifi
    _CTX = _ssl.create_default_context(cafile=_certifi.where())
except Exception:
    _CTX = _ssl.create_default_context()

# Fallback SEM verificação de cert — gateado por ALLOW_INSECURE_SSL. Default "1" preserva a coleta;
# HARDENING via ALLOW_INSECURE_SSL=0 no Render (passo deliberado/observado, não às cegas).
_ALLOW_INSECURE = os.environ.get("ALLOW_INSECURE_SSL", "1").strip() == "1"
_CTX_NOVERIFY = _ssl.create_default_context()
_CTX_NOVERIFY.check_hostname = False
_CTX_NOVERIFY.verify_mode = _ssl.CERT_NONE

_TIMEOUT = 15          # segundos
_CACHE_TTL = 6 * 3600  # 6h — fundamentos mudam devagar

# cache em memória: { ticker_upper: (epoch_expira, dict_resultado) }
_CACHE: dict[str, tuple[float, dict]] = {}

# ───────────────────────── CACHE DO ÚLTIMO-BOM (anti-oscilação, em DISCO) ─────────────────────────
# PROBLEMA: o dado fundamental BR é frágil — o scrape do Fundamentus oscila/falha e a brapi free
# cobre poucos tickers. Quando a fonte FALHA (None) num ciclo, a ação caía pro fallback fraco/None,
# perdia roic/safety/fcf e era carimbada "dado fino"/CONF BAIXA — embora MINUTOS antes tivesse o
# dado bom. Solução: persistir em DISCO o ÚLTIMO valor BOM por ticker e, quando a coleta volta vazia,
# REUSAR esse último-bom (dentro de um TTL de DIAS) em vez de descartar o que já tínhamos.
#
# IMPORTANTE: isto NÃO fabrica dado — só evita PERDER o que já foi coletado de verdade. A origem é
# marcada (data_origin = fresh | cache | ausente) p/ auditoria. Fora do TTL o cache expira e some.
#
# Persistência: 1 JSON por ticker em FUNDAMENTALS_CACHE_DIR (default = <tmp>/lbh_fundamentals_cache).
# Usa o diretório de cache de RUNTIME (mesmo padrão de market_data.YFINANCE_CACHE_DIR), NÃO o
# backend/app/cache/ do código — aquele 'cache/' é gitignored p/ fontes (ver project_lbh_gitignore
# _cache_gotcha); aqui é cache de runtime mesmo, gitignore é desejado (não versionar dado coletado).
_LASTGOOD_TTL = int(os.environ.get("FUNDAMENTALS_LASTGOOD_TTL_DAYS", "7")) * 86400  # dias → seg
_LASTGOOD_DIR = os.environ.get(
    "FUNDAMENTALS_CACHE_DIR",
    os.path.join(_tempfile.gettempdir(), "lbh_fundamentals_cache"))

# Campos-NÚCLEO que definem "dado bom" o suficiente p/ valer cachear (≥1 pilar real de negócio).
_LASTGOOD_CORE_FIELDS = ("roic", "roe", "fcf_yield", "debt_to_equity")


def _lastgood_path(key: str) -> str:
    safe = _re.sub(r"[^A-Za-z0-9._-]", "_", key)
    return os.path.join(_LASTGOOD_DIR, f"{safe}.json")


def _has_core_data(d: dict) -> bool:
    """True se o dict traz ≥1 pilar-núcleo real de negócio (vale como 'bom' p/ cachear/reusar)."""
    return any(d.get(k) is not None for k in _LASTGOOD_CORE_FIELDS)


def _lastgood_write(key: str, result: dict) -> None:
    """Persiste em disco o último-bom (só se tiver dado-núcleo real). Blindado: nunca lança."""
    try:
        if not _has_core_data(result):
            return
        os.makedirs(_LASTGOOD_DIR, exist_ok=True)
        payload = {"saved_at": _time.time(), "data": result}
        tmp = _lastgood_path(key) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            _json.dump(payload, f)
        os.replace(tmp, _lastgood_path(key))   # escrita atômica
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] last-good write falhou {key}: {e}")


def _lastgood_read(key: str) -> dict | None:
    """Lê o último-bom do disco se ainda dentro do TTL (dias). None se ausente/expirado/corrompido."""
    try:
        path = _lastgood_path(key)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            payload = _json.load(f)
        saved_at = payload.get("saved_at", 0)
        if (_time.time() - saved_at) > _LASTGOOD_TTL:
            return None                        # expirou — não reusa (não cristaliza dado velho)
        data = payload.get("data")
        return dict(data) if isinstance(data, dict) else None
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] last-good read falhou {key}: {e}")
        return None


def _empty(source=None) -> dict:
    """Dict-padrão de retorno (shape estável). Nunca falta uma chave."""
    return {
        "roe": None,
        "roic": None,
        "payout_ratio": None,
        "debt_to_equity": None,
        "dividend_yield": None,
        "fcf_yield": None,
        # Crescimento REAL da EMPRESA (não do preço) — em %, ex 8.5. Só Finnhub (US) traz; BR=None.
        # Substitui o "g5 de preço" na nota de Qualidade (quebra a circularidade). Ausente→None.
        "rev_growth_5y": None,
        "eps_growth_5y": None,
        # Crescimento RECENTE (TTM YoY) — p/ o anti-faca #15c pegar a boa empresa APODRECENDO agora
        # (que a média de 6a esconde). Em %, ex -12. Só Finnhub (US).
        "rev_growth_ttm": None,
        "eps_growth_ttm": None,
        "beta": None,
        "beta_note": None,
        "source": source,
        # ORIGEM do dado p/ auditoria (anti-oscilação): "fresh" = coletado agora; "cache" = reusado
        # do último-bom em disco pq a fonte falhou/voltou vazia; "ausente" = sem dado-núcleo. NÃO
        # fabrica — só rastreia de onde veio. Preenchido em get_fundamentals.
        "data_origin": None,
    }


def _to_float(v):
    """Converte p/ float blindado. None/erro → None."""
    try:
        if v is None:
            return None
        f = float(v)
        # rejeita NaN/inf
        if f != f or f in (float("inf"), float("-inf")):
            return None
        return f
    except Exception:
        return None


def _http_json(url: str, _retries: int = 1):
    """GET → JSON, com fallback de SSL e RETRY (robustez anti-oscilação). None em falha. Nunca lança.

    _retries: nº de tentativas EXTRA em falha de rede (default 1 → até 2 tentativas). O scrape/brapi
    BR oscila (timeouts esporádicos); um retry simples recupera boa parte sem fabricar nada nem
    multiplicar chamadas pagas (só re-tenta o MESMO GET que falhou)."""
    last_exc = None
    for attempt in range(_retries + 1):
        try:
            req = _urlreq.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            try:
                r = _urlreq.urlopen(req, timeout=_TIMEOUT, context=_CTX)
            except Exception:
                if not _ALLOW_INSECURE:
                    raise
                # Fallback SEM verificação de cert — risco de MITM (dado forjado). NÃO é silencioso:
                # loga ERRO para ser visível. Desligue setando ALLOW_INSECURE_SSL=0 no ambiente.
                logger.error(f"[FUNDAMENTALS][SSL-INSEGURO] verificação TLS falhou; usando CERT_NONE "
                             f"(risco MITM) p/ {url.split('?')[0]} — set ALLOW_INSECURE_SSL=0 p/ desligar")
                r = _urlreq.urlopen(req, timeout=_TIMEOUT, context=_CTX_NOVERIFY)
            with r:
                return _json.loads(r.read())
        except Exception as e:
            last_exc = e
            if attempt < _retries:
                continue   # re-tenta (falha esporádica de rede)
    logger.warning(f"[FUNDAMENTALS] HTTP falhou {url.split('?')[0]}: {last_exc}")
    return None


# ───────────────────────────────── classificação de ticker ──────────────────────
def _is_no_fundamentals(t: str) -> bool:
    """Crypto (-USD), índices (^...), câmbio/futuros (=X, =F) → sem fundamentos."""
    tu = t.upper()
    if tu.startswith("^"):
        return True
    if "=" in tu:               # USDBRL=X, GC=F
        return True
    if tu.endswith("-USD") or tu.endswith("-BRL") or tu.endswith("-USDT"):
        return True
    return False


# ───────────────────────────────────── brapi (Brasil .SA) ───────────────────────
def _from_brapi(ticker: str) -> dict:
    """
    Fundamentos via brapi.dev para ações .SA.
    Endpoint: https://brapi.dev/api/quote/{SEM_.SA}?fundamental=true
              &modules=defaultKeyStatistics,financialData&token={BRAPI_TOKEN}
    Os modules funcionam SEM token (verificado). O token é incluído se existir.

    Mapeamento (campos confirmados ao vivo p/ PETR4):
        roe            = financialData.returnOnEquity         (fração, mantida — score usa >=0.20)
        debt_to_equity = financialData.debtToEquity           (já é múltiplo, ex 1.52)
        dividend_yield = defaultKeyStatistics.dividendYield   (fração → ×100)
        fcf_yield      = freeCashflow / marketCap             (derivado, fração — score usa >=0.08)
        payout_ratio   = None  (brapi não expõe payout de forma confiável)
    """
    out = _empty("brapi")
    base = ticker[:-3] if ticker.upper().endswith(".SA") else ticker
    token = os.environ.get("BRAPI_TOKEN", "").strip()
    params = {"fundamental": "true",
              "modules": "defaultKeyStatistics,financialData"}
    if token:
        params["token"] = token
    url = f"https://brapi.dev/api/quote/{_urlparse.quote(base)}?{_urlparse.urlencode(params)}"

    data = _http_json(url)
    try:
        results = (data or {}).get("results") or []
        if not results:
            return out
        r0 = results[0] or {}
        fin = r0.get("financialData") or {}
        stats = r0.get("defaultKeyStatistics") or {}

        roe = _to_float(fin.get("returnOnEquity"))
        out["roe"] = roe if roe is not None else None   # FRAÇÃO (brapi já manda fração; score usa roe>=0.20)

        # brapi às vezes manda D/E em PERCENTUAL (152.0 = 1.52x); o score usa MÚLTIPLO
        # (limiares 0.5/3.0). D/E real > 5x é raríssimo → se vier > 5, quase certamente é % → ÷100.
        _de = _to_float(fin.get("debtToEquity"))
        out["debt_to_equity"] = (_de / 100.0) if (_de is not None and _de > 5.0) else _de

        # dividendYield aparece em defaultKeyStatistics (fração, ex 0.06); fallback p/ results
        dy = _to_float(stats.get("dividendYield"))
        if dy is None:
            dy = _to_float(r0.get("dividendYield"))
        out["dividend_yield"] = dy * 100.0 if dy is not None else None

        # fcf_yield derivado: freeCashflow / marketCap
        fcf = _to_float(fin.get("freeCashflow"))
        mcap = _to_float(r0.get("marketCap")) or _to_float(stats.get("marketCap"))
        if fcf is not None and mcap and mcap > 0:
            out["fcf_yield"] = fcf / mcap   # FRAÇÃO (score usa fcf_yield>=0.08)

        # payout: brapi não traz de forma direta/confiável → None
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] parse brapi {ticker}: {e}")
        return _empty("brapi")
    return out


# ──────────────────────── Fundamentus (Brasil .SA, GRÁTIS) ──────────────────────
def _from_fundamentus(ticker: str) -> dict:
    """
    Fundamentos via fundamentus.com.br (HTML scraping) — cobertura total B3, sem token.
    Campos: ROE, ROIC → fração (÷100); Div. Yield → %; Dív Líq/Patrim → múltiplo.
    FCF não disponível nesta fonte.
    """
    out = _empty("fundamentus")
    base = ticker[:-3] if ticker.upper().endswith(".SA") else ticker
    url = f"https://www.fundamentus.com.br/detalhes.php?papel={_urlparse.quote(base.upper())}"
    try:
        req = _urlreq.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9",
            "Referer": "https://www.fundamentus.com.br/",
        })
        try:
            r = _urlreq.urlopen(req, timeout=_TIMEOUT, context=_CTX)
        except Exception:
            if not _ALLOW_INSECURE:
                raise
            r = _urlreq.urlopen(req, timeout=_TIMEOUT, context=_CTX_NOVERIFY)
        with r:
            html = r.read().decode("utf-8", errors="replace")
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] fundamentus HTTP falhou {ticker}: {e}")
        return out

    try:
        def _field(label: str) -> str | None:
            pat = (rf'<span class="txt">{_re.escape(label)}</span></td>'
                   r'\s*<td class="data[^"]*"><span class="[^"]*">\s*([^<]+?)\s*</span>')
            m = _re.search(pat, html)
            if not m:
                return None
            v = m.group(1).strip()
            return None if v == "-" else v

        def _pct_frac(v: str | None) -> float | None:
            if v is None:
                return None
            try:
                return float(v.replace("%", "").replace(".", "").replace(",", ".").strip()) / 100.0
            except Exception:
                return None

        def _pct(v: str | None) -> float | None:
            if v is None:
                return None
            try:
                return float(v.replace("%", "").replace(".", "").replace(",", ".").strip())
            except Exception:
                return None

        def _ratio(v: str | None) -> float | None:
            if v is None:
                return None
            try:
                return float(v.replace(".", "").replace(",", ".").strip())
            except Exception:
                return None

        out["roe"] = _pct_frac(_field("ROE"))
        out["roic"] = _pct_frac(_field("ROIC"))
        out["dividend_yield"] = _pct(_field("Div. Yield"))
        out["debt_to_equity"] = _ratio(_field("Dív Líq / Patrim"))
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] parse fundamentus {ticker}: {e}")
        return _empty("fundamentus")
    return out


# ─────────────────────────────────── Finnhub (US/mundo, GRÁTIS) ─────────────────
def _from_finnhub(ticker: str) -> dict:
    """
    Fundamentos via Finnhub (GRÁTIS, 60 req/min) — 1 chamada traz tudo, inclusive BETA.
    Endpoint: https://finnhub.io/api/v1/stock/metric?symbol={T}&metric=all&token={KEY}

    Campos em 'metric' (Finnhub já entrega em %, NÃO multiplicar):
        beta            = beta
        roe             = roeTTM | roeAnnual            (% → ÷100 p/ fração; score usa >=0.20)
        roic            = roicTTM | roiTTM | roicAnnual (Finnhub manda em %, ex 15) → ÷100 p/ fração
        payout_ratio    = payoutRatioTTM | payoutRatioAnnual
        debt_to_equity  = "totalDebt/totalEquityQuarterly" | ...Annual | "longTermDebt/equityAnnual"
        dividend_yield  = currentDividendYieldTTM | dividendYieldIndicatedAnnual  (já em %)
    """
    out = _empty("finnhub")
    key = os.environ.get("FINNHUB_API_KEY", "").strip() or os.environ.get("FINNHUB_TOKEN", "").strip()
    if not key:
        return out
    url = (f"https://finnhub.io/api/v1/stock/metric?symbol={_urlparse.quote(ticker)}"
           f"&metric=all&token={_urlparse.quote(key)}")
    data = _http_json(url)
    try:
        m = (data or {}).get("metric") or {}
        if not isinstance(m, dict) or not m:
            return out

        def pick(*names):
            for n in names:
                if n in m:
                    v = _to_float(m.get(n))
                    if v is not None:
                        return v
            return None

        _roe = pick("roeTTM", "roeAnnual")                             # Finnhub manda em % (ex 15)
        out["roe"] = (_roe / 100.0) if _roe is not None else None      # → FRAÇÃO (score usa roe>=0.20), igual roic/payout
        # roic: Finnhub manda em % (ex 15); o score espera FRAÇÃO (roic >= 0.15) → ÷100 (mesmo padrão do payout)
        _roic = pick("roicTTM", "roiTTM", "roicAnnual")
        out["roic"] = (_roic / 100.0) if _roic is not None else None
        # payout: Finnhub manda em % (ex 80); o score espera FRAÇÃO (igual FMP, ex 0.8) → ÷100
        _pay = pick("payoutRatioTTM", "payoutRatioAnnual")
        out["payout_ratio"] = (_pay / 100.0) if _pay is not None else None
        out["debt_to_equity"] = pick(
            "totalDebt/totalEquityQuarterly", "totalDebt/totalEquityAnnual",
            "longTermDebt/equityQuarterly", "longTermDebt/equityAnnual")
        out["dividend_yield"] = pick(
            "currentDividendYieldTTM", "dividendYieldIndicatedAnnual", "dividendYield5Y")
        # Crescimento REAL da empresa (#15a) — Finnhub manda em % (ex 8.5). O score (score_growth_5y)
        # ESPERA % (limiares 15/-5), igual ao g5 de preço que substituímos → SEM conversão (≠ roe/roic
        # que viram fração). Custo ZERO de request (mesmo metric=all). Fallback p/ YoY se não houver 5Y.
        # ⚠️ VALIDAR AO VIVO: confirmar que o valor real vem em % (ex 8.5), não fração (0.085).
        out["rev_growth_5y"] = pick("revenueGrowth5Y", "revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy")
        out["eps_growth_5y"] = pick("epsGrowth5Y", "epsGrowthTTMYoy", "epsGrowthQuarterlyYoy")
        # RECENTE (TTM YoY) separado — p/ o anti-faca #15c (apodrecimento atual). Em %.
        out["rev_growth_ttm"] = pick("revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy")
        out["eps_growth_ttm"] = pick("epsGrowthTTMYoy", "epsGrowthQuarterlyYoy")
        b = pick("beta")
        if b is not None and b != 0:
            out["beta"] = b
            out["beta_note"] = "ok"
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] parse Finnhub {ticker}: {e}")
        return _empty("finnhub")
    return out


# ─────────────────────────────────────── FMP (resto do mundo) ───────────────────
def _from_fmp(ticker: str) -> dict:
    """
    Fundamentos via FMP ratios-ttm.
    Endpoint: https://financialmodelingprep.com/api/v3/ratios-ttm/{TICKER}?apikey={KEY}

    Mapeamento (nomes de campo tratados defensivamente p/ variações da API):
        roe            = returnOnEquityTTM                    (fração, mantida — score usa >=0.20)
        roic           = roicTTM | returnOnCapitalEmployedTTM (FMP já manda como fração, ex 0.15 → SEM conversão; score usa roic >= 0.15)
        payout_ratio   = payoutRatioTTM
        debt_to_equity = debtEquityRatioTTM | debtToEquityTTM | debtToEquityRatioTTM
        dividend_yield = dividendYieldTTM | dividendYielTTM   (fração → ×100)
                         | dividendYieldPercentageTTM (já em %)
        fcf_yield      = freeCashFlowYieldTTM                 (fração, mantida — score usa >=0.08)
    """
    out = _empty("fmp")
    key = os.environ.get("FMP_API_KEY", "").strip()
    if not key:
        logger.warning("[FUNDAMENTALS] FMP_API_KEY ausente — %s sem fundamentos", ticker)
        return out

    # 1) ratios-ttm → fundamentos. BEST-EFFORT: se falhar, NÃO impede o beta (passo 2).
    url = (f"https://financialmodelingprep.com/api/v3/ratios-ttm/"
           f"{_urlparse.quote(ticker)}?apikey={_urlparse.quote(key)}")
    data = _http_json(url)
    row = {}
    if isinstance(data, list) and data and isinstance(data[0], dict):
        row = data[0]
    elif isinstance(data, dict):
        if "Error Message" in data or "error" in data:
            logger.warning("[FUNDAMENTALS] FMP ratios erro p/ %s: %s", ticker, str(data)[:200])
        else:
            row = data
    try:
        if row:
            def pick(*names):
                for n in names:
                    if n in row:
                        v = _to_float(row.get(n))
                        if v is not None:
                            return v
                return None

            roe = pick("returnOnEquityTTM")
            out["roe"] = roe if roe is not None else None   # FRAÇÃO (FMP já manda fração; score usa roe>=0.20)
            # roic: FMP ratios-ttm entrega como FRAÇÃO (ex 0.15), igual payout → SEM ÷100; score usa roic >= 0.15
            out["roic"] = pick("roicTTM", "returnOnCapitalEmployedTTM")
            out["payout_ratio"] = pick("payoutRatioTTM")
            out["debt_to_equity"] = pick(
                "debtEquityRatioTTM", "debtToEquityTTM", "debtToEquityRatioTTM")
            dy_pct = pick("dividendYieldPercentageTTM")
            if dy_pct is not None:
                out["dividend_yield"] = dy_pct
            else:
                dy = pick("dividendYieldTTM", "dividendYielTTM")
                out["dividend_yield"] = dy * 100.0 if dy is not None else None
            fcf = pick("freeCashFlowYieldTTM")
            out["fcf_yield"] = fcf if fcf is not None else None   # FRAÇÃO (FMP já manda fração; score usa fcf_yield>=0.08)
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] parse FMP ratios {ticker}: {e}")

    # 2) BETA via /profile: DESLIGADO por padrão. Dobrava as chamadas à FMP (ratios+profile)
    # e, no plano grátis (~250/dia), estourava a cota — quebrando até os fundamentos.
    # Só liga se FMP_FETCH_BETA=1 (quem tiver plano pago). Senão o beta vem da regressão de 5a.
    if os.environ.get("FMP_FETCH_BETA", "").strip() == "1":
        out["beta"], out["beta_note"] = _fmp_beta(ticker, key)
    return out


def _fmp_beta(ticker: str, key: str):
    """Beta publicado via FMP /profile. Tenta v3 e, se vazio, o 'stable' (chaves novas).
    Retorna (beta|None, note) — note diagnostica o que houve: ok / http_* / err_* /
    nobeta_* / parse_*. Surge no beta_source p/ depurar em produção sem ver a chave."""
    last = "no_resp"
    for tag, url in (
        ("v3", f"https://financialmodelingprep.com/api/v3/profile/{_urlparse.quote(ticker)}?apikey={_urlparse.quote(key)}"),
        ("st", f"https://financialmodelingprep.com/stable/profile?symbol={_urlparse.quote(ticker)}&apikey={_urlparse.quote(key)}"),
    ):
        data = _http_json(url)
        if data is None:
            last = f"http_{tag}"
            continue
        try:
            row = data[0] if isinstance(data, list) and data else (data if isinstance(data, dict) else {})
            if isinstance(row, dict) and ("Error Message" in row or "error" in row):
                last = f"err_{tag}"
                continue
            b = _to_float((row or {}).get("beta"))
            if b is not None and b != 0:
                return b, "ok"
            last = f"nobeta_{tag}"
        except Exception as e:
            logger.warning(f"[FUNDAMENTALS] parse FMP profile {ticker}: {e}")
            last = f"parse_{tag}"
    return None, last
    return out


# ───────────────────────────────────────── API pública ──────────────────────────
def get_fundamentals(ticker: str) -> dict:
    """
    Retorna fundamentos confiáveis de um ticker. NUNCA lança.

    Returns (CONTRATO DE UNIDADES — não mexer sem alinhar com o score):
        {
            "roe": float|None,            # FRAÇÃO, ex 0.2427 (score usa roe>=0.20)
            "roic": float|None,           # FRAÇÃO, ex 0.18  (score usa roic>=0.15)
            "payout_ratio": float|None,   # FRAÇÃO, ex 0.40  (score usa 0.2..0.7)
            "debt_to_equity": float|None, # múltiplo, ex 1.52
            "dividend_yield": float|None, # %, ex 6.0        (score_dividend_q usa <3 / <=7)
            "fcf_yield": float|None,      # FRAÇÃO, ex 0.08  (score usa fcf_yield>=0.08)
            "rev_growth_5y"/"eps_growth_5y"/"*_ttm": float|None,  # %, ex 12.5 (score_growth_5y usa >=15)
            "source": "fmp"|"brapi"|"finnhub"|None,
        }
        ATENÇÃO: roe/roic/payout/fcf_yield saem em FRAÇÃO; só dividend_yield e os growth
        ficam em %. Finnhub manda roe/roic/payout em % → cada _from_* já faz ÷100. Travado
        por golden test_fundamentals_roe_fcf_are_fractions — NÃO reintroduzir ÷100 duplo.

    Cache em memória com TTL ~6h.
    """
    try:
        if not ticker or not isinstance(ticker, str):
            return _empty(None)
        key = ticker.strip().upper()
        if not key:
            return _empty(None)

        # cache hit?
        now = _time.time()
        hit = _CACHE.get(key)
        if hit and hit[0] > now:
            return dict(hit[1])  # cópia defensiva

        # sem fundamentos (crypto/índice/câmbio)
        _no_fund = _is_no_fundamentals(key)
        if _no_fund:
            result = _empty(None)
        elif key.endswith(".SA"):
            result = _from_brapi(key)
            # brapi free cobre poucos tickers B3 (PETR4, ITUB4…); resto retorna 403.
            # Fallback 1: fundamentus.com.br — cobertura total B3, sem token.
            if (result.get("roe") is None or result.get("roic") is None):
                try:
                    fund = _from_fundamentus(key)
                    for k in ("roe", "roic", "dividend_yield", "debt_to_equity"):
                        if result.get(k) is None and fund.get(k) is not None:
                            result[k] = fund[k]
                    if result.get("source") in (None, "brapi") and any(
                            fund.get(k) is not None for k in ("roe", "roic")):
                        result["source"] = (
                            (result.get("source") + "+fundamentus")
                            if result.get("source") else "fundamentus")
                except Exception as e:
                    logger.warning(f"[FUNDAMENTALS] Fundamentus fallback BR falhou p/ {key}: {e}")
            # Fallback 2: FMP (cobre alguns .SA; preenche só lacunas ainda None).
            if (result.get("roe") is None or result.get("fcf_yield") is None):
                try:
                    fmp = _from_fmp(key)
                    for k in ("roe", "roic", "fcf_yield", "payout_ratio", "debt_to_equity",
                              "rev_growth_5y", "eps_growth_5y", "rev_growth_ttm",
                              "eps_growth_ttm", "dividend_yield", "beta"):
                        if result.get(k) is None and fmp.get(k) is not None:
                            result[k] = fmp[k]
                    if result.get("source") in (None, "brapi") and any(
                            fmp.get(k) is not None
                            for k in ("roe", "roic", "fcf_yield", "payout_ratio")):
                        result["source"] = (
                            (result.get("source") + "+fmp")
                            if result.get("source") else "fmp")
                except Exception as e:
                    logger.warning(f"[FUNDAMENTALS] FMP fallback BR falhou p/ {key}: {e}")
        else:
            # US/mundo: Finnhub PRIMEIRO (grátis, traz beta junto); FMP como fallback.
            result = _from_finnhub(key)
            if result.get("roe") is None and result.get("beta") is None:
                fmp = _from_fmp(key)
                # mescla: usa o que o Finnhub não trouxe
                if any(fmp.get(k) is not None for k in ("roe", "payout_ratio", "debt_to_equity",
                                                        "dividend_yield", "fcf_yield", "beta")):
                    result = fmp

        # ── CACHE DO ÚLTIMO-BOM (anti-oscilação) — só p/ tickers que DEVERIAM ter fundamentos.
        # Crypto/índice/câmbio (_no_fund) nunca têm pilares de negócio → não entram (None é correto).
        if not _no_fund:
            if _has_core_data(result):
                # coleta FRESCA com dado real → marca origem e persiste como novo último-bom.
                result["data_origin"] = "fresh"
                _lastgood_write(key, result)
            else:
                # fonte falhou/voltou vazia: REUSA o último-bom em disco (dentro do TTL) em vez de
                # cair pro None fraco. NÃO fabrica — recupera o que JÁ foi coletado de verdade.
                cached = _lastgood_read(key)
                if cached is not None and _has_core_data(cached):
                    cached["data_origin"] = "cache"
                    logger.info(f"[FUNDAMENTALS] {key}: fonte vazia → reusando último-bom em disco "
                                f"(origem=cache, anti-oscilação)")
                    result = cached
                else:
                    result["data_origin"] = "ausente"

        _CACHE[key] = (now + _CACHE_TTL, dict(result))
        return result
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] get_fundamentals({ticker!r}) falhou: {e}")
        return _empty(None)


__all__ = ["get_fundamentals"]
