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

# Fallback p/ ambientes sem CA bundle (dado público via GET, sem credenciais).
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
        "payout_ratio": None,
        "debt_to_equity": None,
        "dividend_yield": None,
        "fcf_yield": None,
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
            # CA bundle indisponível / erro de cert → tenta sem verificação (dado público)
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
        roe            = financialData.returnOnEquity         (fração → ×100)
        debt_to_equity = financialData.debtToEquity           (já é múltiplo, ex 1.52)
        dividend_yield = defaultKeyStatistics.dividendYield   (fração → ×100)
        fcf_yield      = freeCashflow / marketCap             (derivado → ×100)
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
        out["roe"] = roe * 100.0 if roe is not None else None

        out["debt_to_equity"] = _to_float(fin.get("debtToEquity"))

        # dividendYield aparece em defaultKeyStatistics (fração, ex 0.06); fallback p/ results
        dy = _to_float(stats.get("dividendYield"))
        if dy is None:
            dy = _to_float(r0.get("dividendYield"))
        out["dividend_yield"] = dy * 100.0 if dy is not None else None

        # fcf_yield derivado: freeCashflow / marketCap
        fcf = _to_float(fin.get("freeCashflow"))
        mcap = _to_float(r0.get("marketCap")) or _to_float(stats.get("marketCap"))
        if fcf is not None and mcap and mcap > 0:
            out["fcf_yield"] = (fcf / mcap) * 100.0

        # payout: brapi não traz de forma direta/confiável → None
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] parse brapi {ticker}: {e}")
        return _empty("brapi")
    return out


# ─────────────────────────────────────── FMP (resto do mundo) ───────────────────
def _from_fmp(ticker: str) -> dict:
    """
    Fundamentos via FMP ratios-ttm.
    Endpoint: https://financialmodelingprep.com/api/v3/ratios-ttm/{TICKER}?apikey={KEY}

    Mapeamento (nomes de campo tratados defensivamente p/ variações da API):
        roe            = returnOnEquityTTM                    (fração → ×100)
        payout_ratio   = payoutRatioTTM
        debt_to_equity = debtEquityRatioTTM | debtToEquityTTM | debtToEquityRatioTTM
        dividend_yield = dividendYieldTTM | dividendYielTTM   (fração → ×100)
                         | dividendYieldPercentageTTM (já em %)
        fcf_yield      = freeCashFlowYieldTTM                 (fração → ×100)
    """
    out = _empty("fmp")
    key = os.environ.get("FMP_API_KEY", "").strip()
    if not key:
        logger.warning("[FUNDAMENTALS] FMP_API_KEY ausente — %s sem fundamentos", ticker)
        return out

    url = (f"https://financialmodelingprep.com/api/v3/ratios-ttm/"
           f"{_urlparse.quote(ticker)}?apikey={_urlparse.quote(key)}")
    data = _http_json(url)
    try:
        # FMP devolve uma lista com 1 objeto
        if isinstance(data, list):
            row = data[0] if data else {}
        elif isinstance(data, dict):
            # erro do FMP costuma vir como {"Error Message": ...}
            if "Error Message" in data or "error" in data:
                logger.warning("[FUNDAMENTALS] FMP erro p/ %s: %s",
                               ticker, str(data)[:200])
                return out
            row = data
        else:
            return out
        if not isinstance(row, dict) or not row:
            return out

        def pick(*names):
            for n in names:
                if n in row:
                    v = _to_float(row.get(n))
                    if v is not None:
                        return v
            return None

        roe = pick("returnOnEquityTTM")
        out["roe"] = roe * 100.0 if roe is not None else None

        out["payout_ratio"] = pick("payoutRatioTTM")

        out["debt_to_equity"] = pick(
            "debtEquityRatioTTM", "debtToEquityTTM", "debtToEquityRatioTTM")

        # dividendYield: fração na ratios-ttm (ex 0.0054). Variações de nome incluem
        # o típico typo 'dividendYielTTM'. Se vier campo *Percentage*, já está em %.
        dy_pct = pick("dividendYieldPercentageTTM")
        if dy_pct is not None:
            out["dividend_yield"] = dy_pct
        else:
            dy = pick("dividendYieldTTM", "dividendYielTTM")
            out["dividend_yield"] = dy * 100.0 if dy is not None else None

        fcf = pick("freeCashFlowYieldTTM")
        out["fcf_yield"] = fcf * 100.0 if fcf is not None else None
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] parse FMP {ticker}: {e}")
        return _empty("fmp")
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
            result = _from_fmp(key)

        _CACHE[key] = (now + _CACHE_TTL, dict(result))
        return result
    except Exception as e:
        logger.warning(f"[FUNDAMENTALS] get_fundamentals({ticker!r}) falhou: {e}")
        return _empty(None)


__all__ = ["get_fundamentals"]
