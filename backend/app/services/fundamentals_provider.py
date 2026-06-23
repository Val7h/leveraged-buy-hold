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
import ssl as _ssl
import json as _json
import time as _time
import logging
import urllib.parse as _urlparse
import urllib.request as _urlreq

logger = logging.getLogger(__name__)

# ─────────────────────────── SSL (mesmo padrão de ranking_service) ───────────────
try:
    import certifi as _certifi
    _CTX = _ssl.create_default_context(cafile=_certifi.where())
except Exception:
    _CTX = _ssl.create_default_context()

# Fallback SEM verificação de cert — gateado por ALLOW_INSECURE_SSL (default "1" preserva
# comportamento; setar "0" em prod p/ endurecer após confirmar que os fundamentos carregam).
_ALLOW_INSECURE = os.environ.get("ALLOW_INSECURE_SSL", "1").strip() == "1"
_CTX_NOVERIFY = _ssl.create_default_context()
_CTX_NOVERIFY.check_hostname = False
_CTX_NOVERIFY.verify_mode = _ssl.CERT_NONE

_TIMEOUT = 15          # segundos
_CACHE_TTL = 6 * 3600  # 6h — fundamentos mudam devagar

# cache em memória: { ticker_upper: (epoch_expira, dict_resultado) }
_CACHE: dict[str, tuple[float, dict]] = {}


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
        "beta": None,
        "beta_note": None,
        "source": source,
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


def _http_json(url: str):
    """GET → JSON, com fallback de SSL. None em falha. Nunca lança."""
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
        logger.warning(f"[FUNDAMENTALS] HTTP falhou {url.split('?')[0]}: {e}")
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

    Returns:
        {
            "roe": float|None,            # %, ex 24.27
            "payout_ratio": float|None,   # fração/razão conforme a fonte
            "debt_to_equity": float|None, # múltiplo, ex 1.52
            "dividend_yield": float|None, # %, ex 6.0
            "fcf_yield": float|None,      # %, ex 16.2
            "source": "fmp"|"brapi"|None,
        }

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
        if _is_no_fundamentals(key):
            result = _empty(None)
        elif key.endswith(".SA"):
            result = _from_brapi(key)
        else:
            # US/mundo: Finnhub PRIMEIRO (grátis, traz beta junto); FMP como fallback.
            result = _from_finnhub(key)
            if result.get("roe") is None and result.get("beta") is None:
                fmp = _from_fmp(key)
                # mescla: usa o que o Finnhub não trouxe
                if any(fmp.get(k) is not None for k in ("roe", "payout_ratio", "debt_to_equity",
                                                        "dividend_yield", "fcf_yield", "beta")):
                    result = fmp

        _CACHE[key] = (now + _CACHE_TTL, dict(result))
        return result
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] get_fundamentals({ticker!r}) falhou: {e}")
        return _empty(None)


__all__ = ["get_fundamentals"]
