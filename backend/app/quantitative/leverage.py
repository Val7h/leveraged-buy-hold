"""
Leverage calculation engine using Kelly Criterion, VaR, CVaR,
and volatility-adjusted position sizing for long-term leveraged Buy & Hold.
"""
import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple
from scipy import stats


def kelly_fraction(
    win_rate: float,
    avg_win: float,
    avg_loss: float,
    fraction: float = 0.5,
) -> float:
    """
    Kelly Criterion: f* = (p*b - q) / b
    fraction: 0.5 = Half Kelly, 0.25 = Quarter Kelly
    Returns optimal bet fraction (0 to 1).
    """
    if avg_loss == 0:
        return 0.0
    b = avg_win / avg_loss
    q = 1 - win_rate
    f_star = (win_rate * b - q) / b
    return max(0.0, f_star * fraction)


def kelly_from_returns(
    returns: pd.Series,
    fraction: float = 0.5,
    lookback: int = 252,
) -> float:
    """Estimate Kelly from historical returns series."""
    r = returns.dropna().tail(lookback)
    if len(r) < 30:
        return 0.0
    wins = r[r > 0]
    losses = r[r < 0]
    if len(wins) == 0 or len(losses) == 0:
        return 0.0
    win_rate = len(wins) / len(r)
    avg_win = wins.mean()
    avg_loss = abs(losses.mean())
    return kelly_fraction(win_rate, avg_win, avg_loss, fraction)


def historical_var(
    returns: pd.Series,
    confidence: float = 0.95,
    horizon_days: int = 1,
) -> float:
    """Historical Value at Risk (negative = loss). Returns as fraction."""
    r = returns.dropna()
    if len(r) < 30:
        return -0.05
    var = np.percentile(r, (1 - confidence) * 100)
    return float(var * np.sqrt(horizon_days))


def expected_shortfall(
    returns: pd.Series,
    confidence: float = 0.95,
    horizon_days: int = 1,
) -> float:
    """CVaR / Expected Shortfall: mean of losses beyond VaR."""
    r = returns.dropna()
    if len(r) < 30:
        return -0.07
    var = historical_var(r, confidence, 1)
    cvar = r[r <= var].mean()
    return float(cvar * np.sqrt(horizon_days))


def parametric_var(
    returns: pd.Series,
    confidence: float = 0.95,
    horizon_days: int = 1,
) -> float:
    """Parametric VaR assuming normal distribution."""
    r = returns.dropna()
    mu = r.mean()
    sigma = r.std()
    z = stats.norm.ppf(1 - confidence)
    daily_var = mu + z * sigma
    return float(daily_var * np.sqrt(horizon_days))


def annualized_volatility(close: pd.Series, period: int = 252) -> float:
    log_returns = np.log(close / close.shift(1)).dropna()
    return float(log_returns.tail(period).std() * np.sqrt(252))


def max_safe_leverage(
    annualized_vol: float,
    max_acceptable_drawdown: float = 0.40,
    safety_margin: float = 0.70,
) -> float:
    """
    Maximum leverage such that expected max drawdown stays below acceptable level.
    Uses Doran's formula: max_dd ≈ sigma² / (2 * mu) for continuous-time.
    Conservative approximation: leverage ≤ max_dd_target / (vol * sqrt(T) * Z)
    """
    if annualized_vol <= 0:
        return 3.0
    vol_1year = annualized_vol
    lev = (max_acceptable_drawdown * safety_margin) / vol_1year
    return round(min(max(1.0, lev), 5.0), 2)


def liquidation_price(
    entry_price: float,
    leverage: float,
    maintenance_margin: float = 0.10,
) -> float:
    """
    Approximate liquidation price for a leveraged long position.
    Quantfury uses spot leverage — liquidation at equity = maintenance margin.
    liq_price = entry * (1 - (1/leverage) + maintenance_margin)
    """
    if leverage <= 1:
        return 0.0
    initial_margin = 1.0 / leverage
    liq_drop = initial_margin - maintenance_margin
    return round(entry_price * (1 - liq_drop), 4)


def compute_leverage_metrics(
    close: pd.Series,
    entry_price: float,
    leverage: float,
    risk_profile: str = "balanced",
) -> Dict:
    log_returns = np.log(close / close.shift(1)).dropna()

    ann_vol = annualized_volatility(close)
    var_95_1d = historical_var(log_returns, 0.95, 1)
    var_99_1d = historical_var(log_returns, 0.99, 1)
    cvar_95_1d = expected_shortfall(log_returns, 0.95, 1)
    half_kelly = kelly_from_returns(log_returns, 0.5)
    quarter_kelly = kelly_from_returns(log_returns, 0.25)

    dd_limits = {"conservative": 0.25, "balanced": 0.40, "aggressive": 0.55}
    max_dd = dd_limits.get(risk_profile, 0.40)
    max_lev = max_safe_leverage(ann_vol, max_dd)

    liq = liquidation_price(entry_price, leverage)

    lev_var_loss = leverage * abs(var_95_1d)
    lev_cvar_loss = leverage * abs(cvar_95_1d)

    return {
        "annualized_volatility": round(ann_vol * 100, 2),
        "var_95_1d_pct": round(var_95_1d * 100, 3),
        "var_99_1d_pct": round(var_99_1d * 100, 3),
        "cvar_95_1d_pct": round(cvar_95_1d * 100, 3),
        "half_kelly": round(half_kelly, 4),
        "quarter_kelly": round(quarter_kelly, 4),
        "max_safe_leverage": max_lev,
        "liquidation_price": liq,
        "leveraged_var_95_pct": round(lev_var_loss * 100, 3),
        "leveraged_cvar_95_pct": round(lev_cvar_loss * 100, 3),
    }


def deleverage_timeline(
    initial_equity: float,
    initial_notional: float,
    monthly_contribution: float,
    dividend_yield_annual: float,
    expected_cagr: float,
    target_leverage: float = 1.5,
    max_years: int = 30,
) -> list:
    """
    Project how leverage reduces as equity grows through contributions + returns.
    Returns list of {year, equity, notional, leverage}.
    """
    equity = initial_equity
    notional = initial_notional
    results = []

    monthly_return = (1 + expected_cagr) ** (1 / 12) - 1
    monthly_dividend = dividend_yield_annual / 12

    for month in range(max_years * 12):
        equity += equity * monthly_return
        equity += notional * monthly_dividend / 12
        equity += monthly_contribution
        notional *= (1 + monthly_return)

        year = month / 12
        lev = notional / equity if equity > 0 else 0

        if month % 12 == 11:
            results.append({
                "year": round(year + 1, 1),
                "equity": round(equity, 2),
                "notional": round(notional, 2),
                "leverage": round(lev, 3),
            })

        if lev <= target_leverage:
            break

    return results
