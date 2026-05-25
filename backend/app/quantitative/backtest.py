"""
Backtesting engine for comparing:
  1. Adaptive Leveraged Buy & Hold (our strategy)
  2. Plain Buy & Hold (1x)
  3. Fixed 2x Leveraged Buy & Hold
  4. S&P 500 benchmark (SPY)

Adaptive strategy: leverage adjusts monthly based on composite score.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from app.quantitative.indicators import (
    calculate_rsi, calculate_stochastic, calculate_bollinger_bands,
    calculate_ma200, distance_from_ma, realized_volatility,
    bollinger_position, historical_max_drawdown, sharpe_ratio, sortino_ratio,
)
from app.quantitative.scoring import (
    compute_quality_score, compute_opportunity_score,
    compute_composite_score, leverage_from_score,
)

CRISIS_PERIODS = [
    {"name": "GFC 2008-2009", "start": "2007-10-01", "end": "2009-03-31"},
    {"name": "Flash Crash 2010", "start": "2010-04-01", "end": "2010-07-31"},
    {"name": "European Debt 2011", "start": "2011-07-01", "end": "2011-10-31"},
    {"name": "China Selloff 2015", "start": "2015-08-01", "end": "2016-02-29"},
    {"name": "COVID Crash 2020", "start": "2020-02-01", "end": "2020-04-30"},
    {"name": "Rate Hike Bear 2022", "start": "2022-01-01", "end": "2022-12-31"},
]


def _compute_drawdown_series(equity: pd.Series) -> pd.Series:
    peak = equity.cummax()
    return (equity - peak) / peak * 100


def _compute_cagr(start_val: float, end_val: float, years: float) -> float:
    if start_val <= 0 or years <= 0:
        return 0.0
    return (end_val / start_val) ** (1 / years) - 1


def _compute_calmar(cagr: float, max_dd_pct: float) -> float:
    if max_dd_pct == 0:
        return 0.0
    return cagr / abs(max_dd_pct / 100)


def _run_adaptive_strategy(
    price_df: pd.DataFrame,
    initial_capital: float,
    monthly_contribution: float,
    risk_profile: str,
    beta: float = 0.7,
    dividend_yield: float = 0.04,
    max_drawdown_hist: float = -35.0,
    sharpe_hist: float = 0.8,
    vol_hist: float = 15.0,
) -> pd.DataFrame:
    close = price_df["Close"].squeeze()
    high = price_df["High"].squeeze()
    low = price_df["Low"].squeeze()

    rsi = calculate_rsi(close)
    stoch_k, _ = calculate_stochastic(high, low, close)
    bb_upper, _, bb_lower = calculate_bollinger_bands(close)
    ma200 = calculate_ma200(close)
    dist_ma = distance_from_ma(close, ma200)
    bb_pos = bollinger_position(close, bb_upper, bb_lower)
    rv30 = realized_volatility(close)

    equity = initial_capital
    shares = equity / float(close.iloc[0])
    current_leverage = 1.0

    quality_score, _ = compute_quality_score(
        beta=beta,
        max_drawdown_pct=max_drawdown_hist,
        dividend_yield=dividend_yield,
        sharpe=sharpe_hist,
        volatility_pct=vol_hist,
    )

    records = []
    prev_month = None

    for i, (date, price) in enumerate(close.items()):
        month = pd.Timestamp(date).month
        year = pd.Timestamp(date).year

        if prev_month is None or (month != prev_month):
            opp_score, _ = compute_opportunity_score(
                rsi=float(rsi.iloc[i]) if i < len(rsi) and not np.isnan(rsi.iloc[i]) else None,
                stoch_k=float(stoch_k.iloc[i]) if i < len(stoch_k) and not np.isnan(stoch_k.iloc[i]) else None,
                distance_ma200=float(dist_ma.iloc[i]) if i < len(dist_ma) and not np.isnan(dist_ma.iloc[i]) else None,
                bb_position=float(bb_pos.iloc[i]) if i < len(bb_pos) and not np.isnan(bb_pos.iloc[i]) else None,
            )
            composite = compute_composite_score(quality_score, opp_score)
            lev_rec = leverage_from_score(composite, risk_profile)
            target_lev = lev_rec["recommended_leverage"]

            current_leverage = target_lev
            notional = shares * price * current_leverage
            equity_val = shares * price

            if monthly_contribution > 0:
                contribution = monthly_contribution
                new_shares = (contribution * current_leverage) / price
                shares += new_shares
                equity += contribution

            dividend_income = (shares * price * (dividend_yield / 12))
            extra_shares = dividend_income / price
            shares += extra_shares

            prev_month = month

        current_equity = shares * price
        records.append({
            "date": date,
            "equity": current_equity,
            "leverage": current_leverage,
            "price": price,
        })

    result = pd.DataFrame(records).set_index("date")
    return result


def _run_buy_hold(
    price_df: pd.DataFrame,
    initial_capital: float,
    monthly_contribution: float,
    leverage: float = 1.0,
    dividend_yield: float = 0.04,
) -> pd.DataFrame:
    close = price_df["Close"].squeeze()
    shares = initial_capital / float(close.iloc[0]) * leverage
    equity_start = initial_capital

    records = []
    prev_month = None

    for date, price in close.items():
        month = pd.Timestamp(date).month

        if prev_month is None or month != prev_month:
            if monthly_contribution > 0:
                new_shares = (monthly_contribution * leverage) / price
                shares += new_shares
            div_income = shares * price * (dividend_yield / 12)
            shares += div_income / price
            prev_month = month

        records.append({"date": date, "equity": shares * price, "leverage": leverage, "price": price})

    return pd.DataFrame(records).set_index("date")


def compute_strategy_metrics(equity_series: pd.Series, strategy_name: str, risk_free: float = 0.04) -> Dict:
    start_val = float(equity_series.iloc[0])
    end_val = float(equity_series.iloc[-1])
    years = len(equity_series) / 252

    log_returns = np.log(equity_series / equity_series.shift(1)).dropna()
    dd_series = _compute_drawdown_series(equity_series)
    max_dd = float(dd_series.min())

    cagr = _compute_cagr(start_val, end_val, years)
    total_return = (end_val / start_val - 1) * 100

    ann_vol = float(log_returns.std() * np.sqrt(252)) if len(log_returns) > 0 else 0.0
    excess = log_returns - risk_free / 252
    sharpe = float(excess.mean() / excess.std() * np.sqrt(252)) if excess.std() > 0 else 0.0
    downside = excess[excess < 0]
    sortino = float(excess.mean() / downside.std() * np.sqrt(252)) if len(downside) > 0 and downside.std() > 0 else 0.0
    calmar = _compute_calmar(cagr, max_dd)

    wins = log_returns[log_returns > 0]
    win_rate = float(len(wins) / len(log_returns)) if len(log_returns) > 0 else 0.0

    return {
        "strategy": strategy_name,
        "start_date": str(equity_series.index[0])[:10],
        "end_date": str(equity_series.index[-1])[:10],
        "total_return_pct": round(total_return, 2),
        "cagr_pct": round(cagr * 100, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "sharpe_ratio": round(sharpe, 3),
        "sortino_ratio": round(sortino, 3),
        "calmar_ratio": round(calmar, 3),
        "annualized_vol_pct": round(ann_vol * 100, 2),
        "win_rate_pct": round(win_rate * 100, 2),
        "final_value": round(end_val, 2),
        "initial_value": round(start_val, 2),
    }


def analyze_crisis_period(
    equity_curves: Dict[str, pd.Series],
    start: str,
    end: str,
) -> Dict:
    result = {"start": start, "end": end}
    for name, curve in equity_curves.items():
        period = curve.loc[start:end]
        if len(period) < 2:
            continue
        ret = (float(period.iloc[-1]) / float(period.iloc[0]) - 1) * 100
        dd = float(_compute_drawdown_series(period).min())
        result[name] = {"return_pct": round(ret, 2), "max_drawdown_pct": round(dd, 2)}
    return result


def run_backtest(
    price_data: Dict[str, pd.DataFrame],
    initial_capital: float = 100_000.0,
    monthly_contribution: float = 1_000.0,
    risk_profile: str = "balanced",
    beta: float = 0.7,
    dividend_yield: float = 0.04,
    max_dd_hist: float = -35.0,
    sharpe_hist: float = 0.8,
    vol_hist: float = 15.0,
) -> Dict:
    """Run all strategies and return comparable results."""
    strategies_results: Dict[str, pd.DataFrame] = {}

    # Use first ticker as primary asset, SPY as benchmark
    primary_ticker = list(price_data.keys())[0]
    primary_df = price_data[primary_ticker]

    strategies_results["adaptive"] = _run_adaptive_strategy(
        primary_df, initial_capital, monthly_contribution, risk_profile,
        beta, dividend_yield, max_dd_hist, sharpe_hist, vol_hist,
    )
    strategies_results["buy_hold_1x"] = _run_buy_hold(
        primary_df, initial_capital, monthly_contribution, 1.0, dividend_yield
    )
    strategies_results["buy_hold_2x"] = _run_buy_hold(
        primary_df, initial_capital, monthly_contribution, 2.0, dividend_yield
    )

    if "SPY" in price_data:
        strategies_results["sp500"] = _run_buy_hold(
            price_data["SPY"], initial_capital, monthly_contribution, 1.0, 0.015
        )

    equity_curves = {k: v["equity"] for k, v in strategies_results.items()}
    leverage_curves = {k: v["leverage"] for k, v in strategies_results.items()}

    metrics = [compute_strategy_metrics(eq, name) for name, eq in equity_curves.items()]

    crisis_analysis = []
    for period in CRISIS_PERIODS:
        ca = analyze_crisis_period(equity_curves, period["start"], period["end"])
        ca["name"] = period["name"]
        crisis_analysis.append(ca)

    # Serialize curves for API response
    def serialize_curve(series: pd.Series) -> List[Dict]:
        return [{"date": str(idx)[:10], "value": round(float(val), 2)} for idx, val in series.items()]

    def serialize_lev_curve(df: pd.DataFrame) -> List[Dict]:
        return [{"date": str(idx)[:10], "leverage": round(float(row["leverage"]), 3)} for idx, row in df.iterrows()]

    return {
        "equity_curves": {k: serialize_curve(v) for k, v in equity_curves.items()},
        "drawdown_curves": {k: [{"date": d["date"], "value": round(float(v), 3)} for d, v in zip(serialize_curve(eq), _compute_drawdown_series(eq))] for k, eq in equity_curves.items()},
        "leverage_curve": serialize_lev_curve(strategies_results.get("adaptive", pd.DataFrame())),
        "metrics": metrics,
        "crisis_analysis": [c for c in crisis_analysis if len(c) > 3],
    }
