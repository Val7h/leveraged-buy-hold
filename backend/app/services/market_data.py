"""
Market data service using yfinance.
Fetches OHLCV, fundamentals, and builds the full asset analysis.
"""
import yfinance as yf
import pandas as pd
import numpy as np
import requests
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging

# Session com cache de 1 hora + headers de browser para evitar rate limit do Yahoo Finance
import requests_cache
import os as _os
_CACHE_DIR = _os.environ.get("YFINANCE_CACHE_DIR", "/tmp")
_session = requests_cache.CachedSession(
    cache_name=f"{_CACHE_DIR}/yfinance_cache",
    expire_after=3600,         # 1 hora de cache
    backend="sqlite",
    allowable_codes=[200],     # SÓ cacheia respostas OK — nunca cacheia 429
    allowable_methods=["GET"],
)
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
})

from app.quantitative.indicators import (
    compute_all_indicators, compute_weekly_indicators,
    historical_max_drawdown, compute_kelly_criterion,
    annualized_return, sharpe_ratio, sortino_ratio, realized_volatility,
)
from app.quantitative.scoring import (
    compute_quality_score, compute_opportunity_score,
    compute_composite_score, leverage_from_score,
    risk_rating, opportunity_rating,
)
from app.quantitative.market_state import detect_market_state, compute_entry_signal

logger = logging.getLogger(__name__)

# ─── Bitget Tokenized Stocks ────────────────────────────────────────────────
# Ações tokenizadas disponíveis na Bitget (sufixo ON = "on-chain", par USDT)
# Lançadas em jan/2025 — dados reais limitados, complementados por sintético

_BITGET_ENDPOINT = "https://api.bitget.com/api/v2/spot/market/candles"

_BITGET_TO_UNDERLYING: dict = {
    "TSLAONUSDT":  "TSLA",
    "NVDAONUSDT":  "NVDA",
    "AAPLONUSDT":  "AAPL",
    "AMZNONUSDT":  "AMZN",
    "GOOGLONUSDT": "GOOGL",
    "MSFTONUSDT":  "MSFT",
    "METAONUSDT":  "META",
    "COINONUSDT":  "COIN",
    "MSTRONUSDT":  "MSTR",
}

# Parâmetros sintéticos para tokenizadas — mais voláteis que o subjacente (24/7)
_TOKENIZED_PARAMS: dict = {
    "TSLAONUSDT":  (0.25, 0.70),
    "NVDAONUSDT":  (0.40, 0.75),
    "AAPLONUSDT":  (0.15, 0.28),
    "AMZNONUSDT":  (0.20, 0.38),
    "GOOGLONUSDT": (0.18, 0.32),
    "MSFTONUSDT":  (0.22, 0.30),
    "METAONUSDT":  (0.28, 0.50),
    "COINONUSDT":  (0.30, 0.90),
    "MSTRONUSDT":  (0.40, 1.00),
}


def _is_tokenized(ticker: str) -> bool:
    return ticker.upper().endswith("ONUSDT")


def fetch_bitget_history(symbol: str, granularity: str = "1day", limit: int = 1000) -> Optional[pd.DataFrame]:
    """Busca OHLCV da Bitget para ações tokenizadas (sem autenticação)."""
    try:
        params = {"symbol": symbol.upper(), "granularity": granularity, "limit": str(limit)}
        resp = requests.get(_BITGET_ENDPOINT, params=params, timeout=15)
        if resp.status_code != 200:
            logger.warning(f"[BITGET] {symbol} HTTP {resp.status_code}")
            return None
        data = resp.json().get("data", [])
        if not data or len(data) < 5:
            logger.warning(f"[BITGET] {symbol} — dados insuficientes ({len(data)} candles)")
            return None
        # Formato: [timestamp_ms, open, high, low, close, vol_base, vol_quote, ...]
        rows = [{"Open": float(d[1]), "High": float(d[2]), "Low": float(d[3]),
                 "Close": float(d[4]), "Volume": float(d[5])} for d in data]
        dates = [pd.Timestamp(int(d[0]), unit="ms", tz="UTC") for d in data]
        df = pd.DataFrame(rows, index=dates)
        df.index = df.index.tz_localize(None)
        df.sort_index(inplace=True)
        logger.info(f"[BITGET] {symbol} — {len(df)} candles reais")
        return df
    except Exception as e:
        logger.warning(f"[BITGET] Erro ao buscar {symbol}: {e}")
        return None


DEFENSIVE_SECTORS = [
    "Utilities", "Consumer Staples", "Healthcare", "Real Estate",
    "Communication Services", "Financials", "Energy", "Industrials",
]

DEFAULT_DEFENSIVE_TICKERS = [
    "NEE", "SO", "D", "DUK", "AEP",
    "JNJ", "PG", "KO", "PEP", "MCD",
    "T", "VZ", "CSCO",
    "WM", "WEC", "ES",
    "AFL", "MO", "ABT",
    "O", "MAIN", "STAG",
    "BRK-B", "JPM",
]



# Parâmetros históricos aproximados (mu anual, sigma anual) para ativos conhecidos.
# Usados no fallback sintético para garantir realismo mesmo sem dados reais.
_TICKER_PARAMS: dict = {
    # Utilities
    "NEE": (0.09, 0.17), "SO":  (0.08, 0.14), "DUK": (0.07, 0.13),
    "D":   (0.07, 0.16), "AEP": (0.08, 0.14), "WEC": (0.09, 0.13),
    "ES":  (0.08, 0.14), "EXC": (0.06, 0.15), "ETR": (0.07, 0.14),
    # Staples / Consumer
    "KO":  (0.09, 0.13), "PEP": (0.09, 0.13), "PG":  (0.10, 0.12),
    "CL":  (0.08, 0.13), "GIS": (0.07, 0.14), "MO":  (0.11, 0.18),
    "HRL": (0.07, 0.13), "CPB": (0.06, 0.14), "K":   (0.06, 0.13),
    # Healthcare
    "JNJ": (0.10, 0.13), "ABT": (0.11, 0.16), "MDT": (0.08, 0.16),
    "PFE": (0.07, 0.18), "MRK": (0.09, 0.16), "BMY": (0.07, 0.18),
    "UNH": (0.15, 0.18), "CVS": (0.08, 0.20), "CI":  (0.12, 0.19),
    # Telecom
    "VZ":  (0.05, 0.16), "T":   (0.04, 0.18),
    # REITs / Income
    "O":   (0.10, 0.15), "WPC": (0.09, 0.16), "STAG": (0.10, 0.18),
    "MAIN": (0.12, 0.18), "AFL": (0.10, 0.17), "BEN": (0.07, 0.20),
    # Financials
    "JPM": (0.12, 0.20), "BRK-B": (0.11, 0.14), "BAC": (0.10, 0.22),
    # Market proxy
    "SPY": (0.10, 0.15), "QQQ": (0.14, 0.20), "IWM": (0.09, 0.20),
    "SHY": (0.03, 0.02),
    # B3 — ações brasileiras (retornos em BRL, volatilidade maior)
    "PETR4": (0.12, 0.38), "VALE3": (0.11, 0.35), "ITUB4": (0.13, 0.28),
    "BBDC4": (0.10, 0.28), "ABEV3": (0.08, 0.22), "WEGE3": (0.18, 0.28),
    "RENT3": (0.15, 0.30), "LREN3": (0.12, 0.32), "RADL3": (0.16, 0.28),
    "FLRY3": (0.12, 0.24), "TAEE11": (0.10, 0.20), "EGIE3": (0.11, 0.20),
    "CPFE3": (0.09, 0.19), "ENGI11": (0.12, 0.22), "TRPL4": (0.10, 0.20),
    "BBSE3": (0.14, 0.24), "CSAN3": (0.13, 0.30), "VIVT3": (0.08, 0.22),
    "KLBN11": (0.11, 0.26), "SUZB3": (0.12, 0.30),
    # Big Tech US (yfinance)
    "TSLA":  (0.25, 0.65), "NVDA": (0.40, 0.70), "AAPL": (0.15, 0.25),
    "AMZN":  (0.20, 0.35), "GOOGL":(0.18, 0.30), "MSFT": (0.22, 0.28),
    "META":  (0.28, 0.48), "COIN": (0.30, 0.90), "MSTR": (0.40, 1.00),
    # Tokenizadas Bitget (sufixo ONUSDT) — mais voláteis que o subjacente (24/7)
    **{k: v for k, v in _TOKENIZED_PARAMS.items()},
}


def _synthetic_price_history(ticker: str, period: str) -> pd.DataFrame:
    """
    GBM synthetic data — fallback quando Yahoo Finance está limitado por rate.
    Usa hashlib (determinístico entre reinícios) e parâmetros por ticker.
    """
    import hashlib
    years_map = {"1y": 1, "2y": 2, "3y": 3, "5y": 5, "10y": 10, "20y": 20}
    years  = years_map.get(period, 5)
    n_days = int(years * 252)
    end    = pd.Timestamp.today().normalize()
    dates  = pd.bdate_range(end=end, periods=n_days)

    # Seed determinístico (independente de PYTHONHASHSEED)
    seed = int(hashlib.md5(ticker.upper().encode()).hexdigest(), 16) % (2 ** 31)
    np.random.seed(seed)

    # Parâmetros realistas por ticker, default defensivo
    mu, sigma = _TICKER_PARAMS.get(ticker.upper(), (0.08, 0.16))

    dt = 1 / 252
    log_returns = (mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * np.random.standard_normal(n_days)
    prices = 100.0 * np.exp(np.cumsum(log_returns))

    df = pd.DataFrame({
        "Open":   prices * 0.999,
        "High":   prices * 1.005,
        "Low":    prices * 0.995,
        "Close":  prices,
        "Volume": np.random.randint(1_000_000, 10_000_000, n_days),
    }, index=dates)

    logger.warning(f"[SYNTHETIC] {ticker} ({period}) — mu={mu:.0%} σ={sigma:.0%} seed={seed}")
    return df


def fetch_price_history(
    ticker: str,
    period: str = "5y",
    interval: str = "1d",
) -> Optional[pd.DataFrame]:
    # ── Tokenizadas Bitget (XYZXONUSDT) ──────────────────────────────────────
    if _is_tokenized(ticker):
        real_df = fetch_bitget_history(ticker.upper(), granularity="1day", limit=1000)
        if real_df is not None and len(real_df) >= 30:
            # Se temos menos de 1260 dias (5a), complementa com sintético no início
            if len(real_df) < 1260:
                n_synthetic = 1260 - len(real_df)
                years_map = {"1y": 1, "2y": 2, "3y": 3, "5y": 5, "10y": 10}
                n_synth_days = int(years_map.get(period, 5) * 252) - len(real_df)
                if n_synth_days > 0:
                    synth = _synthetic_price_history(ticker, period)
                    # Mantém apenas os n_synth_days mais antigos do sintético
                    synth = synth.iloc[:n_synth_days]
                    # Escala o sintético para terminar no preço inicial real
                    scale = float(real_df["Close"].iloc[0]) / float(synth["Close"].iloc[-1])
                    synth = synth * scale
                    real_df = pd.concat([synth, real_df])
                    logger.info(f"[BITGET+SYNTH] {ticker} — {len(real_df)} dias totais ({len(real_df) - n_synth_days} reais + {n_synth_days} sintéticos)")
            return real_df
        # fallback sintético para tokenizadas
        logger.warning(f"[BITGET] {ticker} — sem dados reais, usando sintético")
        return _synthetic_price_history(ticker, period)

    # ── Yahoo Finance (yfinance) ──────────────────────────────────────────────
    for attempt in range(3):
        try:
            tk = yf.Ticker(ticker, session=_session)
            df = tk.history(period=period, interval=interval, auto_adjust=True)
            if df.empty or len(df) < 50:
                logger.warning(f"Empty/insufficient data for {ticker} ({period}) — falling back to synthetic")
                return _synthetic_price_history(ticker, period)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            return df
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Failed to fetch {ticker} (attempt {attempt+1}): {e}")
            if "RateLimit" in type(e).__name__ or "Too Many Requests" in err_str:
                return _synthetic_price_history(ticker, period)
            if attempt < 2:
                wait = 15 + attempt * 15   # 15s, 30s
                logger.info(f"Aguardando {wait}s antes de retentar {ticker}...")
                time.sleep(wait)
    # All attempts exhausted — use synthetic rather than returning None
    logger.warning(f"All fetch attempts failed for {ticker} ({period}) — falling back to synthetic")
    return _synthetic_price_history(ticker, period)


def fetch_fundamentals(ticker: str) -> Dict:
    try:
        # Para tokenizadas, busca fundamentals do ticker subjacente
        yf_ticker = _BITGET_TO_UNDERLYING.get(ticker.upper(), ticker) if _is_tokenized(ticker) else ticker
        tk = yf.Ticker(yf_ticker, session=_session)
        info = tk.info or {}

        return {
            "company_name": info.get("longName") or info.get("shortName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "beta": info.get("beta"),
            "dividend_yield": (info.get("dividendYield") or 0) * 100,
            "forward_dividend_yield": (info.get("dividendRate", 0) / max(info.get("regularMarketPrice", 1), 1)) * 100,
            "payout_ratio": info.get("payoutRatio"),
            "pe_ratio": info.get("trailingPE"),
            "debt_to_equity": info.get("debtToEquity"),
            "free_cash_flow": info.get("freeCashflow"),
            "roe": info.get("returnOnEquity"),
            "current_price": info.get("regularMarketPrice") or info.get("currentPrice"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        }
    except Exception as e:
        logger.warning(f"Failed to fetch fundamentals for {ticker}: {e}")
        return {}


def get_market_state() -> Dict:
    """
    Fetches SPY data (2y daily) and returns the current market state.
    Falls back to NORMAL (3x) if data is unavailable.
    """
    try:
        df = fetch_price_history("SPY", period="2y")
        if df is not None and len(df) >= 200:
            state = detect_market_state(df)
            logger.info(f"[MARKET STATE] {state['state']} (score={state['score']}, multiplier={state['multiplier']}x)")
            return state
    except Exception as e:
        logger.warning(f"[MARKET STATE] Error detecting market state: {e}")

    from app.quantitative.market_state import _default_state
    return _default_state()


def analyze_asset(
    ticker: str,
    risk_profile: str = "balanced",
    market_multiplier: int = 3,
) -> Optional[Dict]:
    df = fetch_price_history(ticker, period="5y")
    if df is None:
        return None

    close = df["Close"].squeeze()
    fund = fetch_fundamentals(ticker)

    # Daily indicators
    technicals = compute_all_indicators(df)

    # Weekly indicators (RSI semanal é o critério primário de entrada)
    weekly = compute_weekly_indicators(df)
    rsi_weekly = weekly.get("rsi_14_weekly")

    ann_vol = float(realized_volatility(close).iloc[-1]) if not realized_volatility(close).isna().iloc[-1] else 15.0
    max_dd = historical_max_drawdown(close)
    sharpe = sharpe_ratio(close)
    beta = fund.get("beta") or 0.8
    dy = fund.get("dividend_yield") or 0.0

    quality_score, quality_breakdown = compute_quality_score(
        beta=beta,
        max_drawdown_pct=max_dd,
        dividend_yield=dy,
        sharpe=sharpe,
        volatility_pct=ann_vol,
        payout_ratio=fund.get("payout_ratio"),
        debt_to_equity=fund.get("debt_to_equity"),
        roe=fund.get("roe"),
    )

    # Usa RSI semanal como input primário para opportunity score quando disponível
    rsi_for_scoring = rsi_weekly if rsi_weekly is not None else technicals.get("rsi_14")

    opp_score, opp_breakdown = compute_opportunity_score(
        rsi=rsi_for_scoring,
        stoch_k=technicals.get("stoch_k"),
        distance_ma200=technicals.get("distance_from_ma200"),
        bb_position=technicals.get("bb_position"),
    )

    composite = compute_composite_score(quality_score, opp_score)
    lev_rec = leverage_from_score(composite, risk_profile)

    # Sinal de entrada baseado no estado do mercado + RSI semanal do ativo
    entry = compute_entry_signal(
        rsi_weekly=rsi_weekly,
        dist_ma200=technicals.get("distance_from_ma200"),
        market_multiplier=market_multiplier,
    )

    score_breakdown = {**quality_breakdown, **opp_breakdown}
    # Para tokenizadas, o preço real vem do último candle Bitget (mais preciso que yfinance)
    current_price = float(close.iloc[-1]) if _is_tokenized(ticker) else (fund.get("current_price") or float(close.iloc[-1]))

    # Kelly Criterion
    kelly = compute_kelly_criterion(close)

    # Adiciona campos nas subdicts
    technicals_out = {
        **technicals,
        "ticker": ticker,
        "rsi_14_weekly": rsi_weekly,
    }
    fundamentals_out = {
        **fund,
        "ticker": ticker,
        "dividend_growth_5y": fund.get("dividend_growth_5y"),
    }

    return {
        "ticker":                  ticker,
        "company_name":            fund.get("company_name") or _BITGET_TO_UNDERLYING.get(ticker.upper(), ticker),
        "sector":                  fund.get("sector") or ("Technology" if _is_tokenized(ticker) else None),
        "is_tokenized":            _is_tokenized(ticker),
        "underlying_ticker":       _BITGET_TO_UNDERLYING.get(ticker.upper()) if _is_tokenized(ticker) else None,
        "current_price":           current_price,
        "quality_score":           quality_score,
        "opportunity_score":       opp_score,
        "composite_score":         composite,
        "leverage_score":          composite,
        "max_recommended_leverage": lev_rec["max_leverage"],
        "recommended_leverage":    entry["entry_leverage"],
        "conservative_leverage":   lev_rec["conservative_leverage"],
        "risk_rating":             risk_rating(quality_score),
        "opportunity_rating":      opportunity_rating(opp_score),
        "entry_signal":            entry["signal"],
        "entry_signal_color":      entry["signal_color"],
        "entry_leverage":          entry["entry_leverage"],
        "entry_rationale":         entry["rationale"],
        "kelly":                   kelly,
        "technicals":              technicals_out,
        "fundamentals":            fundamentals_out,
        "score_breakdown":         score_breakdown,
    }


def screen_assets(
    tickers: Optional[List[str]] = None,
    risk_profile: str = "balanced",
    min_score: float = 0.0,
) -> tuple[List[Dict], Dict]:
    """
    Returns (results, market_state).
    Fetches market state once (SPY) and passes the multiplier to each asset analysis.
    """
    # Detecta estado do mercado uma vez
    market_state = get_market_state()
    market_multiplier = market_state.get("multiplier", 3)

    tickers = tickers or DEFAULT_DEFENSIVE_TICKERS
    results = []
    for i, ticker in enumerate(tickers):
        try:
            if i > 0:
                time.sleep(1.5)  # evitar rate limiting do Yahoo Finance
            analysis = analyze_asset(ticker, risk_profile, market_multiplier=market_multiplier)
            if analysis and analysis["composite_score"] >= min_score:
                results.append(analysis)
        except Exception as e:
            logger.warning(f"Error analyzing {ticker}: {e}")

    sorted_results = sorted(results, key=lambda x: x["composite_score"], reverse=True)
    return sorted_results, market_state


def fetch_multiple_price_history(
    tickers: List[str],
    period: str = "10y",
) -> Dict[str, pd.DataFrame]:
    result = {}
    for i, ticker in enumerate(tickers):
        if i > 0:
            time.sleep(3)
        df = fetch_price_history(ticker, period=period)
        if df is not None:
            result[ticker] = df
    return result


def get_portfolio_live_data(tickers: List[str]) -> Dict[str, Dict]:
    result = {}
    for ticker in tickers:
        try:
            tk = yf.Ticker(ticker)
            info = tk.info or {}
            result[ticker] = {
                "current_price": info.get("regularMarketPrice") or info.get("currentPrice"),
                "day_change_pct": info.get("regularMarketChangePercent"),
                "volume": info.get("regularMarketVolume"),
                "dividend_yield": (info.get("dividendYield") or 0) * 100,
            }
        except Exception:
            result[ticker] = {}
    return result
