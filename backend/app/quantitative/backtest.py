"""
Backtesting engine for comparing:
  1. Adaptive Leveraged Buy & Hold (our strategy)
  2. Plain Buy & Hold (1x)
  3. Fixed 2x Leveraged Buy & Hold
  4. S&P 500 benchmark (SPY)

Adaptive strategy: leverage adjusts monthly based on composite score.
Margin call: uses intraday LOW (not close) — realistic liquidation detection.
Equity model: properly tracks borrowed capital (debt), so equity = shares * price - debt.
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
    {"name": "GFC 2008-2009",       "start": "2007-10-01", "end": "2009-03-31"},
    {"name": "Flash Crash 2010",     "start": "2010-04-01", "end": "2010-07-31"},
    {"name": "European Debt 2011",   "start": "2011-07-01", "end": "2011-10-31"},
    {"name": "China Selloff 2015",   "start": "2015-08-01", "end": "2016-02-29"},
    {"name": "COVID Crash 2020",     "start": "2020-02-01", "end": "2020-04-30"},
    {"name": "Rate Hike Bear 2022",  "start": "2022-01-01", "end": "2022-12-31"},
]


def _compute_drawdown_series(equity: pd.Series) -> pd.Series:
    peak = equity.cummax().replace(0, 1e-10)
    return (equity - peak) / peak * 100


def _compute_cagr(start_val: float, end_val: float, years: float) -> float:
    if start_val <= 0 or years <= 0 or end_val <= 0:
        return -1.0
    return (end_val / start_val) ** (1 / years) - 1


def _compute_calmar(cagr: float, max_dd_pct: float) -> float:
    if max_dd_pct == 0:
        return 0.0
    return cagr / abs(max_dd_pct / 100)


def _safe_float(series: pd.Series, i: int) -> Optional[float]:
    """Safely get float from series at index i, returning None if NaN/out-of-bounds."""
    try:
        val = float(series.iloc[i])
        return None if np.isnan(val) else val
    except Exception:
        return None


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
) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Adaptive leveraged B&H with monthly leverage rebalancing.
    Properly tracks equity = shares * price - borrowed.
    Margin call triggered by intraday LOW, not close.
    """
    close = price_df["Close"].squeeze()
    high  = price_df["High"].squeeze() if "High" in price_df.columns else close * 1.005
    low   = price_df["Low"].squeeze()  if "Low"  in price_df.columns else close * 0.995

    rsi       = calculate_rsi(close)
    stoch_k, _= calculate_stochastic(high, low, close)
    bb_upper, _, bb_lower = calculate_bollinger_bands(close)
    ma200     = calculate_ma200(close)
    dist_ma   = distance_from_ma(close, ma200)
    bb_pos    = bollinger_position(close, bb_upper, bb_lower)

    quality_score, _ = compute_quality_score(
        beta=beta,
        max_drawdown_pct=max_drawdown_hist,
        dividend_yield=dividend_yield,
        sharpe=sharpe_hist,
        volatility_pct=vol_hist,
    )

    # ── Initial position at 1x (no debt) ─────────────────────────────────────
    price0         = float(close.iloc[0])
    total_shares   = initial_capital / price0
    total_borrowed = 0.0
    current_lev    = 1.0
    prev_lev       = 1.0
    liq_price      = 0.0       # No margin call at 1x
    margin_called  = False

    trades: List[Dict] = [{
        "date": str(close.index[0])[:10],
        "type": "INICIAL",
        "price": round(price0, 4),
        "leverage": 1.0,
        "details": "Posição inicial 1x",
    }]

    records    = []
    prev_month = None

    for i, (date, price_val) in enumerate(close.items()):
        price     = float(price_val)
        date_str  = str(date)[:10]
        daily_low = _safe_float(low, i) or price * 0.99

        # ── Already liquidated ────────────────────────────────────────────────
        if margin_called:
            records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": price})
            continue

        # ── Intraday margin call check (uses LOW, not close) ──────────────────
        if liq_price > 0 and daily_low <= liq_price:
            margin_called = True
            trades.append({
                "date": date_str, "type": "MARGIN_CALL",
                "price": round(liq_price, 4), "leverage": 0.0,
                "details": f"Liquidado @ ${liq_price:.2f}",
            })
            total_shares   = 0.0
            total_borrowed = 0.0
            records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": liq_price})
            continue

        month = pd.Timestamp(date).month

        if prev_month is None or month != prev_month:
            # ── Score and leverage for this month ─────────────────────────────
            opp_score, _ = compute_opportunity_score(
                rsi=_safe_float(rsi, i),
                stoch_k=_safe_float(stoch_k, i),
                distance_ma200=_safe_float(dist_ma, i),
                bb_position=_safe_float(bb_pos, i),
            )
            composite = compute_composite_score(quality_score, opp_score)
            lev_rec   = leverage_from_score(composite, risk_profile)
            target_lev = lev_rec["recommended_leverage"]

            # ── Current equity before monthly events ─────────────────────────
            current_equity = max(0.0, total_shares * price - total_borrowed)

            # ── Monthly contribution ──────────────────────────────────────────
            if monthly_contribution > 0:
                current_equity += monthly_contribution
                trades.append({
                    "date": date_str, "type": "APORTE",
                    "price": round(price, 4), "leverage": round(target_lev, 2),
                    "details": f"+${monthly_contribution:,.0f}",
                })

            # ── Dividend reinvestment ─────────────────────────────────────────
            div_income = total_shares * price * (dividend_yield / 12)
            current_equity += div_income

            # ── Rebalance to target leverage ──────────────────────────────────
            new_notional   = current_equity * target_lev
            total_shares   = new_notional / price
            total_borrowed = current_equity * (target_lev - 1)
            current_lev    = target_lev
            liq_price = (total_borrowed / total_shares
                         if total_shares > 0 and total_borrowed > 0 else 0.0)

            # Track significant leverage changes (≥ 0.25x jump)
            if prev_month is not None and abs(target_lev - prev_lev) >= 0.25:
                trade_type = "REBALANCE_ALTA" if target_lev > prev_lev else "REBALANCE_BAIXA"
                trades.append({
                    "date": date_str, "type": trade_type,
                    "price": round(price, 4), "leverage": round(target_lev, 2),
                    "details": f"{prev_lev:.1f}x → {target_lev:.1f}x",
                })

            prev_lev   = target_lev
            prev_month = month

        equity = max(0.0, total_shares * price - total_borrowed)
        records.append({
            "date":     date,
            "equity":   equity,
            "leverage": current_lev,
            "price":    price,
        })

    return pd.DataFrame(records).set_index("date"), trades


def _run_buy_hold(
    price_df: pd.DataFrame,
    initial_capital: float,
    monthly_contribution: float,
    leverage: float = 1.0,
    dividend_yield: float = 0.04,
) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Fixed-leverage buy & hold.
    Properly tracks equity = shares * price - borrowed.
    Margin call triggered by intraday LOW (only relevant for leverage > 1).
    """
    close = price_df["Close"].squeeze()
    low   = price_df["Low"].squeeze() if "Low" in price_df.columns else close * 0.995

    price0         = float(close.iloc[0])
    total_shares   = (initial_capital * leverage) / price0
    total_borrowed = initial_capital * (leverage - 1)
    liq_price = (total_borrowed / total_shares
                 if total_shares > 0 and total_borrowed > 0 else 0.0)
    margin_called  = False

    trades: List[Dict] = []
    if leverage > 1.0:
        trades.append({
            "date": str(close.index[0])[:10],
            "type": "INICIAL",
            "price": round(price0, 4),
            "leverage": leverage,
            "details": f"Posição inicial {leverage:.1f}x",
        })

    records    = []
    prev_month = None

    for i, (date, price_val) in enumerate(close.items()):
        price     = float(price_val)
        date_str  = str(date)[:10]
        daily_low = _safe_float(low, i) or price * 0.99

        if margin_called:
            records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": price})
            continue

        # ── Intraday margin call check ────────────────────────────────────────
        if liq_price > 0 and daily_low <= liq_price:
            margin_called = True
            trades.append({
                "date": date_str, "type": "MARGIN_CALL",
                "price": round(liq_price, 4), "leverage": 0.0,
                "details": f"Liquidado @ ${liq_price:.2f}",
            })
            total_shares   = 0.0
            total_borrowed = 0.0
            records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": liq_price})
            continue

        month = pd.Timestamp(date).month
        if prev_month is None or month != prev_month:
            if monthly_contribution > 0:
                contrib_notional = monthly_contribution * leverage
                total_shares  += contrib_notional / price
                total_borrowed += monthly_contribution * (leverage - 1)
                if leverage > 1.0:
                    trades.append({
                        "date": date_str, "type": "APORTE",
                        "price": round(price, 4), "leverage": leverage,
                        "details": f"+${monthly_contribution:,.0f}",
                    })

            # Dividends reinvested — no new borrowing
            div_income    = total_shares * price * (dividend_yield / 12)
            total_shares += div_income / price

            prev_month = month
            liq_price  = (total_borrowed / total_shares
                          if total_shares > 0 and total_borrowed > 0 else 0.0)

        equity = max(0.0, total_shares * price - total_borrowed)
        records.append({"date": date, "equity": equity, "leverage": leverage, "price": price})

    return pd.DataFrame(records).set_index("date"), trades


def compute_strategy_metrics(
    equity_series: pd.Series,
    strategy_name: str,
    risk_free: float = 0.04,
) -> Dict:
    start_val = float(equity_series.iloc[0])
    end_val   = float(equity_series.iloc[-1])
    years     = len(equity_series) / 252

    # Handle margin-call scenario (equity reached 0)
    if end_val <= 0 or start_val <= 0:
        return {
            "strategy":           strategy_name,
            "start_date":         str(equity_series.index[0])[:10],
            "end_date":           str(equity_series.index[-1])[:10],
            "total_return_pct":   -100.0,
            "cagr_pct":           -100.0,
            "max_drawdown_pct":   -100.0,
            "sharpe_ratio":       -9.99,
            "sortino_ratio":      -9.99,
            "calmar_ratio":       -9.99,
            "annualized_vol_pct": 0.0,
            "win_rate_pct":       0.0,
            "final_value":        round(end_val, 2),
            "initial_value":      round(start_val, 2),
        }

    log_returns  = np.log(equity_series / equity_series.shift(1)).dropna()
    dd_series    = _compute_drawdown_series(equity_series)
    max_dd       = float(dd_series.min())
    cagr         = _compute_cagr(start_val, end_val, years)
    total_return = (end_val / start_val - 1) * 100
    ann_vol      = float(log_returns.std() * np.sqrt(252)) if len(log_returns) > 0 else 0.0
    excess       = log_returns - risk_free / 252
    sharpe_val   = float(excess.mean() / excess.std() * np.sqrt(252)) if excess.std() > 0 else 0.0
    downside     = excess[excess < 0]
    sortino_val  = (float(excess.mean() / downside.std() * np.sqrt(252))
                    if len(downside) > 0 and downside.std() > 0 else 0.0)
    calmar       = _compute_calmar(cagr, max_dd)
    wins         = log_returns[log_returns > 0]
    win_rate     = float(len(wins) / len(log_returns)) if len(log_returns) > 0 else 0.0

    return {
        "strategy":           strategy_name,
        "start_date":         str(equity_series.index[0])[:10],
        "end_date":           str(equity_series.index[-1])[:10],
        "total_return_pct":   round(total_return, 2),
        "cagr_pct":           round(cagr * 100, 2),
        "max_drawdown_pct":   round(max_dd, 2),
        "sharpe_ratio":       round(sharpe_val, 3),
        "sortino_ratio":      round(sortino_val, 3),
        "calmar_ratio":       round(calmar, 3),
        "annualized_vol_pct": round(ann_vol * 100, 2),
        "win_rate_pct":       round(win_rate * 100, 2),
        "final_value":        round(end_val, 2),
        "initial_value":      round(start_val, 2),
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
        start_v = float(period.iloc[0])
        if start_v <= 0:
            result[name] = {"return_pct": -100.0, "max_drawdown_pct": -100.0}
            continue
        ret = (float(period.iloc[-1]) / start_v - 1) * 100
        dd  = float(_compute_drawdown_series(period).min())
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
    primary_ticker = list(price_data.keys())[0]
    primary_df     = price_data[primary_ticker]

    adaptive_df,  adaptive_trades  = _run_adaptive_strategy(
        primary_df, initial_capital, monthly_contribution, risk_profile,
        beta, dividend_yield, max_dd_hist, sharpe_hist, vol_hist,
    )
    bh1x_df,  _  = _run_buy_hold(primary_df, initial_capital, monthly_contribution, 1.0, dividend_yield)
    bh2x_df,  bh2x_trades = _run_buy_hold(primary_df, initial_capital, monthly_contribution, 2.0, dividend_yield)

    strategies: Dict[str, pd.DataFrame] = {
        "adaptive":    adaptive_df,
        "buy_hold_1x": bh1x_df,
        "buy_hold_2x": bh2x_df,
    }

    if "SPY" in price_data:
        spy_df, _ = _run_buy_hold(price_data["SPY"], initial_capital, monthly_contribution, 1.0, 0.015)
        strategies["sp500"] = spy_df

    equity_curves = {k: v["equity"] for k, v in strategies.items()}

    metrics = [compute_strategy_metrics(eq, name) for name, eq in equity_curves.items()]

    crisis_analysis = []
    for period in CRISIS_PERIODS:
        ca = analyze_crisis_period(equity_curves, period["start"], period["end"])
        ca["name"] = period["name"]
        crisis_analysis.append(ca)

    def serialize_curve(series: pd.Series) -> List[Dict]:
        return [{"date": str(idx)[:10], "value": round(float(val), 2)} for idx, val in series.items()]

    def serialize_lev_curve(df: pd.DataFrame) -> List[Dict]:
        return [{"date": str(idx)[:10], "leverage": round(float(row["leverage"]), 3)}
                for idx, row in df.iterrows()]

    # ── Price series for trade-marker chart (sample every 5 days + all trade dates) ──
    close_series = primary_df["Close"].squeeze()
    trade_dates  = {t["date"] for t in adaptive_trades}
    price_series = [
        {"date": str(idx)[:10], "value": round(float(val), 4)}
        for i, (idx, val) in enumerate(close_series.items())
        if i % 5 == 0 or str(idx)[:10] in trade_dates or i == len(close_series) - 1
    ]

    # ── Drawdown curves ───────────────────────────────────────────────────────
    drawdown_curves = {}
    for k, eq in equity_curves.items():
        dd = _compute_drawdown_series(eq)
        drawdown_curves[k] = [
            {"date": str(idx)[:10], "value": round(float(v), 3)}
            for idx, v in dd.items()
        ]

    return {
        "equity_curves":   {k: serialize_curve(v) for k, v in equity_curves.items()},
        "drawdown_curves": drawdown_curves,
        "leverage_curve":  serialize_lev_curve(strategies.get("adaptive", pd.DataFrame())),
        "metrics":         metrics,
        "crisis_analysis": [c for c in crisis_analysis if len(c) > 3],
        "price_series":    price_series,
        "trades":          adaptive_trades,
    }
