"""
crypto_data — fontes GRÁTIS e confiáveis para o Score de Crypto do Ranking LBH.

PROBLEMA que isto resolve:
    O ranking trata CRYPTO no blend genérico de ações (compute_quality_blend +
    compute_momentum), que é inadequado: crypto não tem ROE/dividendo/Beta-vs-SPY.
    O modelo ratificado (Pal/Hayes/Woo) exige fatores próprios — liquidez global,
    dominância, on-chain, funding, MVRV — e a maioria das fontes on-chain de qualidade
    (Glassnode: MVRV-Z, Reserve Risk, SOPR, Puell) é PAGA.

REGRA DE OURO (inviolável): NUNCA fabricar dado. Só busca o que existe em fonte
    GRÁTIS confiável. O que exige fonte paga → NÃO é fetchado aqui; o scorer omite
    o fator e renormaliza os pesos (mesmo padrão de fundamentals_apply=False).

FONTES GRÁTIS usadas (todas via urllib, mesmo padrão SSL de fundamentals_provider):
    • CoinGecko free  → /coins/markets (volume 24h, market cap, market_cap_rank)
                        /global        (dominância BTC %)
    • Binance Futures → /fapi/v1/premiumIndex  (funding rate por símbolo)
                        /fapi/v1/openInterest   (open interest — circuit breaker)

NÃO buscadas (exigem chave/fonte PAGA → omitidas, scorer renormaliza):
    • MVRV-Z Score, Reserve Risk, SOPR/LTH-SOPR, Puell Multiple  → Glassnode (pago)
    • Saúde on-chain z-score (endereços ativos, NVT, hash rate)  → Glassnode/Coinmetrics
      (free tier não cobre de forma confiável/abrangente o universo)
    • Liquidez líquida global (Fed-RRP-TGA), crédito China        → FRED/macro (chave/parse frágil)
      (DXY e USD/JPY SÃO buscados, mas via Yahoo chart no ranking_service, não aqui)

Tudo BLINDADO: nunca lança exceção. Em qualquer falha (rede/SSL/parse/campo
ausente) retorna None. Cache em memória com TTL (mercado ~10min, dominância ~10min,
funding/OI ~5min). genesis_year é tabela ESTÁTICA (fato público imutável — não é rede).
"""

from __future__ import annotations

import os
import ssl as _ssl
import json as _json
import time as _time
import logging
import urllib.request as _urlreq

logger = logging.getLogger(__name__)

# ─────────────────────────── SSL (mesmo padrão dos outros providers) ───────────────
try:
    import certifi as _certifi
    _CTX = _ssl.create_default_context(cafile=_certifi.where())
except Exception:
    _CTX = _ssl.create_default_context()

# Default "1" preserva a coleta; HARDENING via ALLOW_INSECURE_SSL=0 no Render (passo observado).
_ALLOW_INSECURE = os.environ.get("ALLOW_INSECURE_SSL", "1").strip() == "1"
_CTX_NOVERIFY = _ssl.create_default_context()
_CTX_NOVERIFY.check_hostname = False
_CTX_NOVERIFY.verify_mode = _ssl.CERT_NONE

_TIMEOUT = 15

# ─────────────────────────── cache em memória com TTL ───────────────────────────
_CACHE: dict[str, tuple[float, object]] = {}


def _cache_get(key: str, ttl: int):
    hit = _CACHE.get(key)
    if hit and (_time.time() - hit[0]) < ttl:
        return hit[1]
    return None


def _cache_set(key: str, value) -> None:
    _CACHE[key] = (_time.time(), value)


def _http_json(url: str):
    """GET → JSON, com fallback de SSL. None em falha. Nunca lança."""
    try:
        req = _urlreq.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            r = _urlreq.urlopen(req, timeout=_TIMEOUT, context=_CTX)
        except Exception:
            if not _ALLOW_INSECURE:
                raise
            logger.error(f"[CRYPTO][SSL-INSEGURO] TLS falhou; usando CERT_NONE (risco MITM) "
                         f"p/ {url.split('?')[0]} — set ALLOW_INSECURE_SSL=0 p/ desligar")
            r = _urlreq.urlopen(req, timeout=_TIMEOUT, context=_CTX_NOVERIFY)
        with r:
            return _json.loads(r.read())
    except Exception as e:
        logger.warning(f"[CRYPTO] HTTP falhou {url.split('?')[0]}: {e}")
        return None


def _to_float(v):
    try:
        if v is None:
            return None
        f = float(v)
        if f != f or f in (float("inf"), float("-inf")):
            return None
        return f
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# TABELA ESTÁTICA — gênese (Lindy). Fato público IMUTÁVEL (não é fetch de rede).
# Ano de lançamento da rede/mainnet. Usado p/ idade (anos) no Portão de Sobrevivência.
# ═══════════════════════════════════════════════════════════════════════════════
GENESIS_YEAR = {
    "BTC": 2009, "ETH": 2015, "BNB": 2017, "SOL": 2020, "XRP": 2012,
    "ADA": 2017, "DOGE": 2013, "AVAX": 2020, "TRX": 2018, "LINK": 2017,
    "MATIC": 2019, "DOT": 2020, "LTC": 2011, "BCH": 2017, "XLM": 2014,
    "ATOM": 2019, "UNI": 2020, "ETC": 2016, "FIL": 2020, "NEAR": 2020,
}

# Mapeamento ticker Yahoo (-USD) → id da CoinGecko (/coins/markets usa id).
COINGECKO_ID = {
    "BTC": "bitcoin", "ETH": "ethereum", "BNB": "binancecoin", "SOL": "solana",
    "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin", "AVAX": "avalanche-2",
    "TRX": "tron", "LINK": "chainlink", "MATIC": "matic-network", "DOT": "polkadot",
    "LTC": "litecoin", "BCH": "bitcoin-cash", "XLM": "stellar", "ATOM": "cosmos",
    "UNI": "uniswap", "ETC": "ethereum-classic", "FIL": "filecoin", "NEAR": "near",
}

# Símbolo de perpétuo na Binance Futures (USDT-margined). Funding/OI usam isto.
BINANCE_PERP = {
    "BTC": "BTCUSDT", "ETH": "ETHUSDT", "BNB": "BNBUSDT", "SOL": "SOLUSDT",
    "XRP": "XRPUSDT", "ADA": "ADAUSDT", "DOGE": "DOGEUSDT", "AVAX": "AVAXUSDT",
    "TRX": "TRXUSDT", "LINK": "LINKUSDT", "MATIC": "MATICUSDT", "DOT": "DOTUSDT",
    "LTC": "LTCUSDT", "BCH": "BCHUSDT", "XLM": "XLMUSDT", "ATOM": "ATOMUSDT",
    "UNI": "UNIUSDT", "ETC": "ETCUSDT", "FIL": "FILUSDT", "NEAR": "NEARUSDT",
}


def base_symbol(ticker: str) -> str:
    """'BTC-USD' → 'BTC'. Blindado p/ qualquer formato. Maiúsculo."""
    t = (ticker or "").upper().strip()
    for suf in ("-USD", "-USDT", "USDT", "USD"):
        if t.endswith(suf) and len(t) > len(suf):
            return t[: -len(suf)]
    return t


def genesis_year(ticker: str):
    """Ano de gênese (tabela estática). None se moeda desconhecida (Lindy omitido)."""
    return GENESIS_YEAR.get(base_symbol(ticker))


def age_years(ticker: str):
    """Idade da rede em anos (fato público). None se gênese desconhecida."""
    gy = genesis_year(ticker)
    if gy is None:
        return None
    import datetime as _dt
    return max(0.0, _dt.date.today().year - gy)


# ═══════════════════════════════════════════════════════════════════════════════
# CoinGecko /global — dominância BTC (%). Cache ~10min. None em falha.
# ═══════════════════════════════════════════════════════════════════════════════
_DOMINANCE_TTL = 600


def btc_dominance():
    """Dominância de market cap do BTC, em % (ex 54.2). None em falha. Cache ~10min."""
    cached = _cache_get("btc_dominance", _DOMINANCE_TTL)
    if cached is not None:
        return cached
    d = _http_json("https://api.coingecko.com/api/v3/global")
    val = None
    try:
        val = _to_float(((d or {}).get("data") or {}).get("market_cap_percentage", {}).get("btc"))
    except Exception:
        val = None
    if val is not None:
        _cache_set("btc_dominance", val)
    return val


# ═══════════════════════════════════════════════════════════════════════════════
# CoinGecko /coins/markets — volume 24h, market cap, rank. Cache ~10min (1 fetch
# cobre todo o universo). None em falha.
# ═══════════════════════════════════════════════════════════════════════════════
_MARKETS_TTL = 600


def _markets_snapshot():
    """{coingecko_id: {volume, market_cap, rank}} p/ top 250. {} em falha. Cache ~10min."""
    cached = _cache_get("markets", _MARKETS_TTL)
    if cached is not None:
        return cached
    url = ("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd"
           "&order=market_cap_desc&per_page=250&page=1&sparkline=false")
    data = _http_json(url)
    out = {}
    if isinstance(data, list):
        for row in data:
            try:
                cid = row.get("id")
                if not cid:
                    continue
                out[cid] = {
                    "volume": _to_float(row.get("total_volume")),
                    "market_cap": _to_float(row.get("market_cap")),
                    "rank": row.get("market_cap_rank"),
                }
            except Exception:
                continue
    if out:
        _cache_set("markets", out)
    return out


def market_data(ticker: str):
    """{volume, market_cap, rank} da moeda. None se desconhecida/sem cobertura/falha."""
    cid = COINGECKO_ID.get(base_symbol(ticker))
    if not cid:
        return None
    snap = _markets_snapshot()
    return snap.get(cid)


# ═══════════════════════════════════════════════════════════════════════════════
# Binance Futures — funding rate (premiumIndex) e open interest. Cache ~5min.
# None em falha (ou moeda sem perp na Binance → fator omitido/renormalizado).
# ═══════════════════════════════════════════════════════════════════════════════
_FUNDING_TTL = 300


def funding_rate(ticker: str):
    """Last funding rate do perp (fração, ex 0.0001 = 0.01%/8h). None se sem perp/falha."""
    sym = BINANCE_PERP.get(base_symbol(ticker))
    if not sym:
        return None
    cache_key = f"funding:{sym}"
    cached = _cache_get(cache_key, _FUNDING_TTL)
    if cached is not None:
        return cached
    d = _http_json(f"https://fapi.binance.com/fapi/v1/premiumIndex?symbol={sym}")
    val = None
    try:
        val = _to_float((d or {}).get("lastFundingRate"))
    except Exception:
        val = None
    if val is not None:
        _cache_set(cache_key, val)
    return val


def open_interest(ticker: str):
    """Open interest (em contratos/base asset) do perp. None se sem perp/falha."""
    sym = BINANCE_PERP.get(base_symbol(ticker))
    if not sym:
        return None
    cache_key = f"oi:{sym}"
    cached = _cache_get(cache_key, _FUNDING_TTL)
    if cached is not None:
        return cached
    d = _http_json(f"https://fapi.binance.com/fapi/v1/openInterest?symbol={sym}")
    val = None
    try:
        val = _to_float((d or {}).get("openInterest"))
    except Exception:
        val = None
    if val is not None:
        _cache_set(cache_key, val)
    return val


def fetch_all(ticker: str) -> dict:
    """
    Agrega TODAS as fontes grátis disponíveis p/ a moeda, num dict de shape estável.
    Cada campo é None quando a fonte falha ou não cobre a moeda (o scorer renormaliza).
    NUNCA lança. Chamado 1x por moeda no ranking; as fontes têm cache compartilhado.
    """
    md = market_data(ticker) or {}
    return {
        "symbol": base_symbol(ticker),
        "volume_24h": md.get("volume"),
        "market_cap": md.get("market_cap"),
        "market_cap_rank": md.get("rank"),
        "btc_dominance": btc_dominance(),
        "age_years": age_years(ticker),
        "funding_rate": funding_rate(ticker),
        "open_interest": open_interest(ticker),
    }
