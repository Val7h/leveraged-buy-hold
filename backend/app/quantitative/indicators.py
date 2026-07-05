"""
Technical indicators for oversold detection and entry timing.
All functions operate on pandas Series/DataFrames of OHLCV data.
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional, Tuple


def calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def calculate_stochastic(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    k_period: int = 14,
    d_period: int = 3,
    smooth_k: int = 3,
) -> Tuple[pd.Series, pd.Series]:
    lowest_low = low.rolling(k_period).min()
    highest_high = high.rolling(k_period).max()
    fast_k = 100 * (close - lowest_low) / (highest_high - lowest_low).replace(0, np.nan)
    slow_k = fast_k.rolling(smooth_k).mean()
    slow_d = slow_k.rolling(d_period).mean()
    return slow_k, slow_d


def calculate_bollinger_bands(
    close: pd.Series, period: int = 20, num_std: float = 2.0
) -> Tuple[pd.Series, pd.Series, pd.Series]:
    middle = close.rolling(period).mean()
    std = close.rolling(period).std()
    upper = middle + num_std * std
    lower = middle - num_std * std
    return upper, middle, lower


def calculate_atr(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1
    ).max(axis=1)
    return tr.ewm(com=period - 1, min_periods=period).mean()


def calculate_ma200(close: pd.Series) -> pd.Series:
    return close.rolling(200).mean()


def distance_from_ma(close: pd.Series, ma: pd.Series) -> pd.Series:
    """Returns % distance from MA: negative = below MA (opportunity zone)."""
    return (close - ma) / ma * 100


def realized_volatility(close: pd.Series, period: int = 30) -> pd.Series:
    log_returns = np.log(close / close.shift(1))
    return log_returns.rolling(period).std() * np.sqrt(252) * 100


def bollinger_position(close: pd.Series, upper: pd.Series, lower: pd.Series) -> pd.Series:
    """0 = at lower band, 1 = at upper band, <0 = below lower band."""
    band_width = upper - lower
    return (close - lower) / band_width.replace(0, np.nan)


def compute_all_indicators(df: pd.DataFrame) -> Dict:
    """
    df must have columns: Open, High, Low, Close, Volume
    Returns dict with latest values of all indicators.
    """
    close = df["Close"].squeeze()
    high = df["High"].squeeze()
    low = df["Low"].squeeze()

    rsi = calculate_rsi(close)
    stoch_k, stoch_d = calculate_stochastic(high, low, close)
    bb_upper, bb_middle, bb_lower = calculate_bollinger_bands(close)
    atr = calculate_atr(high, low, close)
    ma200 = calculate_ma200(close)
    dist_ma200 = distance_from_ma(close, ma200)
    rv30 = realized_volatility(close)
    bb_pos = bollinger_position(close, bb_upper, bb_lower)

    latest = df.index[-1]
    price = float(close.iloc[-1])

    return {
        "timestamp": str(latest),
        "price": price,
        "rsi_14": _safe_float(rsi.iloc[-1]),
        "stoch_k": _safe_float(stoch_k.iloc[-1]),
        "stoch_d": _safe_float(stoch_d.iloc[-1]),
        "ma_200": _safe_float(ma200.iloc[-1]),
        "distance_from_ma200": _safe_float(dist_ma200.iloc[-1]),
        "atr_14": _safe_float(atr.iloc[-1]),
        "bb_upper": _safe_float(bb_upper.iloc[-1]),
        "bb_middle": _safe_float(bb_middle.iloc[-1]),
        "bb_lower": _safe_float(bb_lower.iloc[-1]),
        "bb_position": _safe_float(bb_pos.iloc[-1]),
        "realized_vol_30d": _safe_float(rv30.iloc[-1]),
    }


def historical_max_drawdown(close: pd.Series) -> float:
    peak = close.cummax()
    drawdown = (close - peak) / peak
    return float(drawdown.min() * 100)


def annualized_return(close: pd.Series) -> float:
    years = len(close) / 252
    if years <= 0:
        return 0.0
    total_return = close.iloc[-1] / close.iloc[0]
    return float((total_return ** (1 / years) - 1) * 100)


def sharpe_ratio(close: pd.Series, risk_free_rate: float = 0.04) -> float:
    log_returns = np.log(close / close.shift(1)).dropna()
    if len(log_returns) < 30:
        return 0.0
    excess = log_returns - risk_free_rate / 252
    return float(excess.mean() / excess.std() * np.sqrt(252))


def sortino_ratio(close: pd.Series, risk_free_rate: float = 0.04) -> float:
    log_returns = np.log(close / close.shift(1)).dropna()
    if len(log_returns) < 30:
        return 0.0
    excess = log_returns - risk_free_rate / 252
    downside_sq = np.minimum(excess, 0) ** 2
    sigma_d = float(np.sqrt(downside_sq.mean()))
    if sigma_d == 0:
        return float("inf")
    return float(excess.mean() / sigma_d * np.sqrt(252))


def compute_weekly_indicators(df: pd.DataFrame) -> Dict:
    """
    Resamples daily OHLCV to weekly (Friday close) and computes:
      - RSI 14 weekly  (primary entry signal per strategy)
      - Stochastic K weekly
      - Distance from 50-week MA (~1 year)
    Returns empty dict if insufficient data.
    """
    try:
        weekly = df.resample("W-FRI").agg({
            "Open": "first",
            "High": "max",
            "Low": "min",
            "Close": "last",
            "Volume": "sum",
        }).dropna()

        if len(weekly) < 20:
            return {}

        close_w = weekly["Close"].squeeze()
        high_w  = weekly["High"].squeeze()
        low_w   = weekly["Low"].squeeze()

        rsi_w          = calculate_rsi(close_w, 14)
        stoch_k_w, _   = calculate_stochastic(high_w, low_w, close_w)
        ma50w          = close_w.rolling(50).mean()
        dist_ma50w     = distance_from_ma(close_w, ma50w)

        return {
            "rsi_14_weekly":       _safe_float(rsi_w.iloc[-1]),
            "stoch_k_weekly":      _safe_float(stoch_k_w.iloc[-1]),
            "distance_from_ma50w": _safe_float(dist_ma50w.iloc[-1]),
        }
    except Exception:
        return {}


def _safe_float(val) -> Optional[float]:
    try:
        v = float(val)
        return None if np.isnan(v) or np.isinf(v) else round(v, 4)
    except Exception:
        return None


def compute_kelly_criterion(close: pd.Series, risk_free_rate: float = 0.045) -> Dict:
    """
    Calcula o Critério de Kelly para determinar a alavancagem ótima.

    Usa Kelly contínuo:  K = (μ - r) / σ²
    onde μ = retorno anualizado, r = taxa livre de risco, σ = volatilidade anualizada.

    Retorna:
      - kelly_full:  Kelly 100% (teórico — muito agressivo)
      - kelly_half:  Half-Kelly (recomendado para uso prático)
      - kelly_quarter: Quarter-Kelly (conservador)
      - win_rate:    % de dias com retorno positivo
      - avg_win:     retorno médio nos dias positivos (%)
      - avg_loss:    retorno médio nos dias negativos (%)
      - payoff_ratio: avg_win / |avg_loss|
    """
    log_ret = np.log(close / close.shift(1)).dropna()
    if len(log_ret) < 60:
        return {"kelly_full": None, "kelly_half": None, "kelly_quarter": None,
                "win_rate": None, "payoff_ratio": None}

    mu    = float(log_ret.mean()) * 252
    sigma = float(log_ret.std()) * np.sqrt(252)

    if sigma == 0:
        return {"kelly_full": None, "kelly_half": None, "kelly_quarter": None,
                "win_rate": None, "payoff_ratio": None}

    kelly_full = (mu - risk_free_rate) / (sigma ** 2)

    wins   = log_ret[log_ret > 0]
    losses = log_ret[log_ret < 0]
    win_rate    = len(wins) / len(log_ret) * 100
    avg_win     = float(wins.mean() * 100)  if len(wins)   > 0 else 0.0
    avg_loss    = float(losses.mean() * 100) if len(losses) > 0 else 0.0
    payoff_ratio = abs(avg_win / avg_loss) if avg_loss != 0 else None

    return {
        "kelly_full":     round(max(0.0, min(kelly_full,    8.0)), 2),
        "kelly_half":     round(max(0.0, min(kelly_full/2,  4.0)), 2),
        "kelly_quarter":  round(max(0.0, min(kelly_full/4,  2.0)), 2),
        "win_rate":       round(win_rate, 1),
        "avg_win_pct":    round(avg_win, 3),
        "avg_loss_pct":   round(avg_loss, 3),
        "payoff_ratio":   round(payoff_ratio, 2) if payoff_ratio else None,
        "mu_annual_pct":  round(mu * 100, 2),
        "sigma_annual_pct": round(sigma * 100, 2),
    }
