"""Analytics endpoints for portfolio performance, metrics, and risk analysis."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

from app.core.database import get_db
from app.core.security import get_current_user_or_demo as get_current_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.position import Position
from app.schemas.analysis import (
    YTDPerformanceResponse, YTDPerformancePoint,
    VolatilityResponse, VolatilityMetric,
    SharpeRatioResponse, SharpeRatioPoint,
    BacktestResultsRequest, BacktestResultsResponse, BacktestResultsData, BacktestResultsMetric,
    RiskAnalysisResponse, RiskMetric, RiskScenario,
)
from app.services.market_data import fetch_price_history, fetch_multiple_price_history
from app.quantitative.leverage import historical_var, expected_shortfall

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 11: GET /api/portfolio/{portfolio_id}/ytd-performance
# ────────────────────────────────────────────────────────────────────────────────

@router.get("/portfolio/{portfolio_id}/ytd-performance", response_model=YTDPerformanceResponse)
def get_ytd_performance(
    portfolio_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Calculate year-to-date performance metrics including daily returns,
    alpha, beta, and tracking error vs SPY.
    """
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user.id
    ).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")

    positions = db.query(Position).filter(
        Position.portfolio_id == portfolio_id,
        Position.is_active == True,
    ).all()

    if not positions:
        raise HTTPException(400, "Carteira sem posições ativas")

    # Get current year start
    now = datetime.utcnow()
    ytd_start = datetime(now.year, 1, 1)
    ytd_start_str = ytd_start.strftime("%Y-%m-%d")
    ytd_end_str = now.strftime("%Y-%m-%d")

    # Fetch price data
    tickers = [p.ticker for p in positions]
    price_data = fetch_multiple_price_history(tickers + ["SPY"], "2y")

    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados de preços")

    # Filter to YTD
    for ticker in price_data:
        price_data[ticker] = price_data[ticker].loc[ytd_start:]

    # Build daily equity curve
    daily_points = []
    daily_equities = []
    daily_spy_prices = []

    for date in sorted(set().union(*[p.index for p in price_data.values()])):
        if date < ytd_start:
            continue

        # Calculate portfolio equity
        portfolio_equity = 0.0
        for pos in positions:
            if pos.ticker in price_data:
                try:
                    price = float(price_data[pos.ticker].loc[date])
                    portfolio_equity += pos.shares * price
                except (KeyError, IndexError):
                    portfolio_equity += pos.shares * pos.avg_price
            else:
                portfolio_equity += pos.shares * pos.avg_price

        # Get SPY price
        spy_price = None
        if "SPY" in price_data:
            try:
                spy_price = float(price_data["SPY"].loc[date])
            except (KeyError, IndexError):
                pass

        daily_equities.append(portfolio_equity)
        if spy_price:
            daily_spy_prices.append(spy_price)

    if not daily_equities or not daily_spy_prices:
        raise HTTPException(400, "Dados insuficientes para YTD")

    # Calculate metrics
    equity_array = np.array(daily_equities)
    spy_array = np.array(daily_spy_prices)

    daily_returns = np.diff(equity_array) / equity_array[:-1]
    daily_spy_returns = np.diff(spy_array) / spy_array[:-1]

    ytd_return_pct = (equity_array[-1] / equity_array[0] - 1) * 100
    ytd_volatility_pct = np.std(daily_returns) * np.sqrt(252) * 100

    # Risk-free rate (assume 5% annual)
    risk_free = 0.05 / 252
    excess_returns = daily_returns - risk_free
    ytd_sharpe = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252) if np.std(excess_returns) > 0 else 0

    # Max drawdown
    cumulative = np.cumprod(1 + daily_returns)
    running_max = np.maximum.accumulate(cumulative)
    drawdown = (cumulative - running_max) / running_max
    ytd_max_drawdown = np.min(drawdown) * 100

    # Alpha and Beta vs SPY
    covariance = np.cov(daily_returns, daily_spy_returns)[0, 1]
    variance_spy = np.var(daily_spy_returns)
    beta = covariance / variance_spy if variance_spy > 0 else 1.0
    alpha = np.mean(daily_returns) - beta * np.mean(daily_spy_returns)
    alpha_pct = alpha * 252 * 100

    # Benchmark return
    benchmark_return_pct = (spy_array[-1] / spy_array[0] - 1) * 100

    # Information ratio
    tracking_error = np.std(daily_returns - daily_spy_returns) * np.sqrt(252)
    information_ratio = (np.mean(daily_returns) - np.mean(daily_spy_returns)) / tracking_error * np.sqrt(252) if tracking_error > 0 else 0

    # Win/loss days
    win_days = np.sum(daily_returns > 0)
    loss_days = np.sum(daily_returns < 0)
    win_rate_pct = (win_days / len(daily_returns)) * 100 if len(daily_returns) > 0 else 0

    # Build daily points
    dates = sorted(set().union(*[p.index for p in price_data.values()]))
    for i, date in enumerate(dates):
        if date < ytd_start or i >= len(daily_equities):
            continue

        daily_ret = daily_returns[i] if i > 0 else 0
        spy_ret = daily_spy_returns[i] if i > 0 else 0
        cumulative_ret = (daily_equities[i] / daily_equities[0]) - 1

        daily_points.append(YTDPerformancePoint(
            date=date.strftime("%Y-%m-%d"),
            equity=round(daily_equities[i], 2),
            daily_return=round(daily_ret * 100, 4),
            cumulative_return=round(cumulative_ret * 100, 2),
            benchmark_price=round(daily_spy_prices[i], 2),
            benchmark_return=round(spy_ret * 100, 4),
            alpha=round(alpha * 100, 4),
            beta=round(beta, 4),
            tracking_error=round(tracking_error * 100, 4),
        ))

    return YTDPerformanceResponse(
        portfolio_id=portfolio_id,
        ytd_start=ytd_start_str,
        ytd_end=ytd_end_str,
        ytd_return_pct=round(ytd_return_pct, 2),
        ytd_volatility_pct=round(ytd_volatility_pct, 2),
        ytd_sharpe_ratio=round(ytd_sharpe, 3),
        ytd_max_drawdown_pct=round(ytd_max_drawdown, 2),
        benchmark_return_pct=round(benchmark_return_pct, 2),
        alpha_pct=round(alpha_pct, 2),
        beta=round(beta, 3),
        information_ratio=round(information_ratio, 3),
        win_days=int(win_days),
        loss_days=int(loss_days),
        win_rate_pct=round(win_rate_pct, 2),
        daily_points=daily_points,
        computed_at=datetime.utcnow(),
    )


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 12: GET /api/metrics/volatility
# ────────────────────────────────────────────────────────────────────────────────

@router.get("/metrics/volatility", response_model=VolatilityResponse)
def get_volatility_metrics(
    tickers: str = Query(..., description="Comma-separated ticker list"),
    start_date: str = Query("2020-01-01"),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Calculate volatility metrics for multiple tickers across different time periods.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(400, "Nenhum ticker informado")

    # Fetch data
    price_data = fetch_multiple_price_history(ticker_list + ["SPY"], "5y")
    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados de preços")

    # Filter by date range
    try:
        for ticker in price_data:
            price_data[ticker] = price_data[ticker].loc[start_date:]
            if end_date:
                price_data[ticker] = price_data[ticker].loc[:end_date]
    except Exception:
        raise HTTPException(400, "Intervalo de datas inválido")

    # Calculate volatility metrics for each period
    periods = ["1m", "3m", "6m", "1y", "2y", "5y"]
    period_days = {"1m": 30, "3m": 90, "6m": 180, "1y": 252, "2y": 504, "5y": 1260}

    metrics = {}
    for ticker in ticker_list:
        if ticker not in price_data:
            continue

        series = price_data[ticker]
        if len(series) < 2:
            continue

        ticker_metrics = []
        for period, days in period_days.items():
            period_data = series.iloc[-days:] if len(series) > days else series

            if len(period_data) < 2:
                continue

            daily_returns = np.log(period_data / period_data.shift(1)).dropna()
            volatility = np.std(daily_returns) * np.sqrt(252) * 100

            # Realized vol
            realized_vol = np.sqrt(np.mean(daily_returns ** 2)) * np.sqrt(252) * 100

            # Percentile rank vs historical
            all_returns = np.log(series / series.shift(1)).dropna()
            vols = np.std(all_returns) * np.sqrt(252) * 100
            percentile = (np.sum(vols <= volatility) / len(vols)) * 100 if len(vols) > 0 else 50

            ticker_metrics.append(VolatilityMetric(
                period=period,
                volatility_pct=round(volatility, 2),
                daily_avg_vol=round(np.mean(np.abs(daily_returns)) * 100, 4),
                realized_vol=round(realized_vol, 2),
                implied_vol=None,
                vol_of_vol=round(np.std(daily_returns) * 100, 4),
                percentile_rank=round(percentile, 1),
            ))

        metrics[ticker] = ticker_metrics

    # Portfolio volatility (weighted)
    if "SPY" in price_data:
        spy_series = price_data["SPY"]
        spy_returns = np.log(spy_series / spy_series.shift(1)).dropna()
        portfolio_vol = np.std(spy_returns) * np.sqrt(252) * 100
    else:
        portfolio_vol = 0.0

    # Correlation matrix
    correlation_data = {}
    for i, t1 in enumerate(ticker_list):
        if t1 not in price_data:
            continue
        correlation_data[t1] = {}
        for j, t2 in enumerate(ticker_list):
            if t2 not in price_data:
                continue
            if i <= j:
                r1 = np.log(price_data[t1] / price_data[t1].shift(1)).dropna()
                r2 = np.log(price_data[t2] / price_data[t2].shift(1)).dropna()
                common_index = r1.index.intersection(r2.index)
                corr = np.corrcoef(r1.loc[common_index], r2.loc[common_index])[0, 1] if len(common_index) > 1 else 1.0
                correlation_data[t1][t2] = round(corr, 3)
            else:
                correlation_data[t1][t2] = correlation_data[t2].get(t1, 1.0)

    min_vol = min([m.volatility_pct for mlist in metrics.values() for m in mlist], default=0)
    max_vol = max([m.volatility_pct for mlist in metrics.values() for m in mlist], default=100)

    return VolatilityResponse(
        tickers=ticker_list,
        start_date=start_date,
        end_date=end_date or datetime.utcnow().strftime("%Y-%m-%d"),
        metrics=metrics,
        portfolio_volatility_pct=round(portfolio_vol, 2),
        min_volatility=round(min_vol, 2),
        max_volatility=round(max_vol, 2),
        correlation_matrix=correlation_data,
        computed_at=datetime.utcnow(),
    )


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 13: GET /api/metrics/sharpe-ratio
# ────────────────────────────────────────────────────────────────────────────────

@router.get("/metrics/sharpe-ratio", response_model=SharpeRatioResponse)
def get_sharpe_ratio_metrics(
    tickers: str = Query(..., description="Comma-separated ticker list"),
    period: str = Query("1y", regex="^(1m|3m|6m|1y|2y|5y)$"),
    risk_free_rate: float = Query(0.05, description="Annual risk-free rate (0.05 = 5%)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Calculate Sharpe ratio, Sortino ratio, and Calmar ratio for multiple assets.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(400, "Nenhum ticker informado")

    period_days = {"1m": 30, "3m": 90, "6m": 180, "1y": 252, "2y": 504, "5y": 1260}
    days = period_days.get(period, 252)

    # Fetch data
    price_data = fetch_multiple_price_history(ticker_list + ["SPY"], "5y")
    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados de preços")

    # Calculate metrics
    metrics_list = []
    portfolio_sharpe = 0.0
    benchmark_sharpe = 0.0
    portfolio_sortino = 0.0
    portfolio_calmar = 0.0
    best_performer = ""
    worst_performer = ""
    best_sharpe = -999
    worst_sharpe = 999

    for ticker in ticker_list:
        if ticker not in price_data or len(price_data[ticker]) < days:
            continue

        series = price_data[ticker].iloc[-days:]
        returns = np.log(series / series.shift(1)).dropna()

        # Sharpe ratio
        excess_ret = returns - (risk_free_rate / 252)
        sharpe = np.mean(excess_ret) / np.std(excess_ret) * np.sqrt(252) if np.std(excess_ret) > 0 else 0

        # Sortino ratio (only downside volatility)
        downside_ret = returns[returns < 0]
        downside_vol = np.std(downside_ret) if len(downside_ret) > 0 else np.std(returns)
        sortino = np.mean(excess_ret) / downside_vol * np.sqrt(252) if downside_vol > 0 else 0

        # Calmar ratio
        cumulative = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_dd = np.min(drawdown) if len(drawdown) > 0 else -1
        annual_return = np.mean(returns) * 252
        calmar = annual_return / abs(max_dd) if max_dd < 0 else 0

        # Additional metrics
        volatility_pct = np.std(returns) * np.sqrt(252) * 100
        total_return_pct = (series.iloc[-1] / series.iloc[0] - 1) * 100
        win_rate = (np.sum(returns > 0) / len(returns)) * 100 if len(returns) > 0 else 0
        recovery_factor = total_return_pct / abs(max_dd * 100) if max_dd < 0 else 0

        metrics_list.append(SharpeRatioPoint(
            ticker=ticker,
            sharpe_ratio=round(sharpe, 3),
            sortino_ratio=round(sortino, 3),
            calmar_ratio=round(calmar, 3),
            excess_return_pct=round(np.mean(excess_ret) * 252 * 100, 2),
            volatility_pct=round(volatility_pct, 2),
            max_drawdown_pct=round(max_dd * 100, 2),
            win_rate_pct=round(win_rate, 2),
            recovery_factor=round(recovery_factor, 2),
        ))

        if sharpe > best_sharpe:
            best_sharpe = sharpe
            best_performer = ticker
        if sharpe < worst_sharpe:
            worst_sharpe = sharpe
            worst_performer = ticker

    # Portfolio metrics (using SPY as proxy)
    if "SPY" in price_data and len(price_data["SPY"]) >= days:
        spy_series = price_data["SPY"].iloc[-days:]
        spy_returns = np.log(spy_series / spy_series.shift(1)).dropna()
        excess_spy = spy_returns - (risk_free_rate / 252)
        portfolio_sharpe = np.mean(excess_spy) / np.std(excess_spy) * np.sqrt(252) if np.std(excess_spy) > 0 else 0
        benchmark_sharpe = portfolio_sharpe
        downside_spy = spy_returns[spy_returns < 0]
        downside_vol_spy = np.std(downside_spy) if len(downside_spy) > 0 else np.std(spy_returns)
        portfolio_sortino = np.mean(excess_spy) / downside_vol_spy * np.sqrt(252) if downside_vol_spy > 0 else 0
        cumulative_spy = np.cumprod(1 + spy_returns)
        running_max_spy = np.maximum.accumulate(cumulative_spy)
        drawdown_spy = (cumulative_spy - running_max_spy) / running_max_spy
        max_dd_spy = np.min(drawdown_spy) if len(drawdown_spy) > 0 else -1
        annual_ret_spy = np.mean(spy_returns) * 252
        portfolio_calmar = annual_ret_spy / abs(max_dd_spy) if max_dd_spy < 0 else 0

    start_date_str = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    end_date_str = datetime.utcnow().strftime("%Y-%m-%d")

    return SharpeRatioResponse(
        period=period,
        risk_free_rate=risk_free_rate,
        start_date=start_date_str,
        end_date=end_date_str,
        metrics=metrics_list,
        portfolio_sharpe=round(portfolio_sharpe, 3),
        benchmark_sharpe=round(benchmark_sharpe, 3),
        portfolio_sortino=round(portfolio_sortino, 3),
        portfolio_calmar=round(portfolio_calmar, 3),
        best_performer=best_performer,
        worst_performer=worst_performer,
        computed_at=datetime.utcnow(),
    )


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 14: POST /api/analytics/backtest-results
# ────────────────────────────────────────────────────────────────────────────────

@router.post("/backtest-results", response_model=BacktestResultsResponse)
def backtest_results(
    request: BacktestResultsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Run backtest on portfolio and return comprehensive results including
    monthly/yearly returns, drawdown periods, and various risk metrics.
    """
    if not request.tickers:
        raise HTTPException(400, "Nenhum ticker informado")

    import time
    start_time = time.time()

    # Fetch data
    price_data = fetch_multiple_price_history(request.tickers + ["SPY"], "20y")
    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados históricos")

    # Filter by date range
    start_dt = pd.Timestamp(request.start_date)
    for ticker in price_data:
        price_data[ticker] = price_data[ticker].loc[start_dt:]
        if request.end_date:
            end_dt = pd.Timestamp(request.end_date)
            price_data[ticker] = price_data[ticker].loc[:end_dt]

    # Build equal-weight portfolio
    tickers_in_data = [t for t in request.tickers if t in price_data]
    if not tickers_in_data:
        raise HTTPException(400, "Nenhum dado de preço disponível")

    weight = 1.0 / len(tickers_in_data)
    daily_returns = pd.Series(0.0, index=price_data[tickers_in_data[0]].index)

    for ticker in tickers_in_data:
        ticker_returns = np.log(price_data[ticker] / price_data[ticker].shift(1)).dropna()
        common_index = daily_returns.index.intersection(ticker_returns.index)
        daily_returns.loc[common_index] += ticker_returns.loc[common_index] * weight

    # Build equity curve
    cumulative_returns = np.cumprod(1 + daily_returns)
    equity_curve = request.initial_capital * cumulative_returns

    # Add monthly contributions
    if request.monthly_contribution > 0:
        for idx, val in enumerate(equity_curve):
            months_passed = idx / 252  # Approximate
            contributions = request.monthly_contribution * months_passed
            equity_curve.iloc[idx] += contributions

    # Calculate metrics
    total_return = (equity_curve.iloc[-1] - request.initial_capital) / request.initial_capital
    total_return_pct = total_return * 100
    years = len(daily_returns) / 252
    cagr_pct = ((equity_curve.iloc[-1] / request.initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0

    volatility_pct = np.std(daily_returns) * np.sqrt(252) * 100
    excess_returns = daily_returns - 0.05 / 252
    sharpe = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252) if np.std(excess_returns) > 0 else 0

    # Max drawdown
    running_max = np.maximum.accumulate(equity_curve)
    drawdown_pct = (equity_curve / running_max - 1) * 100
    max_drawdown_pct = drawdown_pct.min()

    calmar = (cagr_pct / 100) / abs(max_drawdown_pct / 100) if max_drawdown_pct < 0 else 0

    # Win rate
    win_rate_pct = (np.sum(daily_returns > 0) / len(daily_returns)) * 100

    # Monthly returns
    monthly_dates = equity_curve.resample("M").last()
    monthly_returns_list = []
    for i in range(1, len(monthly_dates)):
        ret = (monthly_dates.iloc[i] / monthly_dates.iloc[i-1] - 1) * 100
        monthly_returns_list.append({
            "month": monthly_dates.index[i].strftime("%Y-%m"),
            "return_pct": round(ret, 2),
            "equity": round(monthly_dates.iloc[i], 2),
        })

    # Yearly returns
    yearly_dates = equity_curve.resample("Y").last()
    yearly_returns_list = []
    for i in range(1, len(yearly_dates)):
        ret = (yearly_dates.iloc[i] / yearly_dates.iloc[i-1] - 1) * 100
        yearly_returns_list.append({
            "year": yearly_dates.index[i].strftime("%Y"),
            "return_pct": round(ret, 2),
            "equity": round(yearly_dates.iloc[i], 2),
        })

    # Drawdown periods
    drawdown_periods = []
    in_drawdown = False
    dd_start = None
    peak_value = None

    for idx, dd in enumerate(drawdown_pct):
        if dd < 0 and not in_drawdown:
            in_drawdown = True
            dd_start = idx
            peak_value = running_max.iloc[idx]
        elif dd == 0 and in_drawdown:
            in_drawdown = False
            trough_value = equity_curve.iloc[idx]
            duration = idx - dd_start
            drawdown_periods.append({
                "start": equity_curve.index[dd_start].strftime("%Y-%m-%d"),
                "end": equity_curve.index[idx].strftime("%Y-%m-%d"),
                "duration_days": int(duration),
                "peak": round(peak_value, 2),
                "trough": round(trough_value, 2),
                "loss_pct": round(((trough_value - peak_value) / peak_value) * 100, 2),
            })

    # Ulcer index
    ulcer_index = np.sqrt(np.mean((np.minimum(drawdown_pct, 0)) ** 2))

    # Recovery factor
    recovery_factor = total_return_pct / abs(max_drawdown_pct) if max_drawdown_pct < 0 else 0

    # Equity curve points
    equity_curve_points = []
    for idx, (date, value) in enumerate(equity_curve.items()):
        if idx % 21 == 0:  # Sample ~monthly
            equity_curve_points.append({
                "date": date.strftime("%Y-%m-%d"),
                "equity": round(value, 2),
            })

    # Best/worst months and years
    best_month = max(monthly_returns_list, key=lambda x: x["return_pct"], default={})
    worst_month = min(monthly_returns_list, key=lambda x: x["return_pct"], default={})
    best_year = max(yearly_returns_list, key=lambda x: x["return_pct"], default={})
    worst_year = min(yearly_returns_list, key=lambda x: x["return_pct"], default={})

    best_month_ret = best_month.get("return_pct", 0) if best_month else 0
    worst_month_ret = worst_month.get("return_pct", 0) if worst_month else 0
    best_year_ret = best_year.get("return_pct", 0) if best_year else 0
    worst_year_ret = worst_year.get("return_pct", 0) if worst_year else 0

    avg_monthly_return = np.mean([m["return_pct"] for m in monthly_returns_list]) if monthly_returns_list else 0

    metrics = [
        BacktestResultsMetric(metric_name="Total Return", value=total_return_pct, unit="%"),
        BacktestResultsMetric(metric_name="CAGR", value=cagr_pct, unit="%"),
        BacktestResultsMetric(metric_name="Volatility", value=volatility_pct, unit="%"),
        BacktestResultsMetric(metric_name="Sharpe Ratio", value=sharpe, unit=""),
        BacktestResultsMetric(metric_name="Max Drawdown", value=max_drawdown_pct, unit="%"),
    ]

    results = BacktestResultsData(
        portfolio_id=request.portfolio_id,
        final_equity=round(equity_curve.iloc[-1], 2),
        total_return_pct=round(total_return_pct, 2),
        cagr_pct=round(cagr_pct, 2),
        annualized_volatility_pct=round(volatility_pct, 2),
        sharpe_ratio=round(sharpe, 3),
        max_drawdown_pct=round(max_drawdown_pct, 2),
        calmar_ratio=round(calmar, 3),
        win_rate_pct=round(win_rate_pct, 2),
        best_month_return_pct=round(best_month_ret, 2),
        worst_month_return_pct=round(worst_month_ret, 2),
        best_year_return_pct=round(best_year_ret, 2),
        worst_year_return_pct=round(worst_year_ret, 2),
        avg_monthly_return_pct=round(avg_monthly_return, 2),
        recovery_factor=round(recovery_factor, 2),
        ulcer_index=round(ulcer_index, 3),
        metrics=metrics,
        equity_curve=equity_curve_points,
        monthly_returns=monthly_returns_list,
        yearly_returns=yearly_returns_list,
        drawdown_periods=drawdown_periods,
    )

    execution_time = time.time() - start_time

    return BacktestResultsResponse(
        request=request,
        results=results,
        execution_time_seconds=round(execution_time, 2),
        computed_at=datetime.utcnow(),
    )


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 15: GET /api/analytics/risk-analysis
# ────────────────────────────────────────────────────────────────────────────────

@router.get("/risk-analysis", response_model=RiskAnalysisResponse)
def risk_analysis(
    portfolio_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Comprehensive risk analysis including VaR, CVaR, stress scenarios,
    and leverage utilization warnings.
    """
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user.id
    ).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")

    positions = db.query(Position).filter(
        Position.portfolio_id == portfolio_id,
        Position.is_active == True,
    ).all()

    if not positions:
        raise HTTPException(400, "Carteira sem posições ativas")

    # Calculate portfolio metrics
    tickers = [p.ticker for p in positions]
    price_data = fetch_multiple_price_history(tickers + ["SPY"], "5y")

    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados de preços")

    # Portfolio equity
    total_equity = sum(p.shares * p.avg_price for p in positions)
    total_exposure = sum(p.shares * p.avg_price * p.leverage for p in positions)
    effective_leverage = total_exposure / total_equity if total_equity > 0 else 1.0

    # Build portfolio returns
    daily_returns = pd.Series(0.0, index=price_data[tickers[0]].index)
    for ticker in tickers:
        if ticker not in price_data:
            continue
        ticker_returns = np.log(price_data[ticker] / price_data[ticker].shift(1)).dropna()
        weight = (sum(p.shares * p.avg_price for p in positions if p.ticker == ticker) / total_equity) if total_equity > 0 else 0
        common_idx = daily_returns.index.intersection(ticker_returns.index)
        daily_returns.loc[common_idx] += ticker_returns.loc[common_idx] * weight

    # VaR and CVaR
    var_95 = np.percentile(daily_returns, 5)
    cvar_95 = np.mean(daily_returns[daily_returns <= var_95])

    # Volatility
    volatility = np.std(daily_returns) * np.sqrt(252)

    # Risk metrics
    metrics = [
        RiskMetric(
            name="Value at Risk (95%)",
            value=abs(var_95 * 100),
            unit="%",
            status="moderate" if abs(var_95) < 0.02 else "high",
            threshold=2.0,
            distance_to_threshold=2.0 - abs(var_95 * 100),
        ),
        RiskMetric(
            name="Conditional VaR (95%)",
            value=abs(cvar_95 * 100),
            unit="%",
            status="moderate" if abs(cvar_95) < 0.03 else "high",
            threshold=3.0,
            distance_to_threshold=3.0 - abs(cvar_95 * 100),
        ),
        RiskMetric(
            name="Volatility",
            value=volatility * 100,
            unit="%",
            status="low" if volatility < 0.15 else "moderate" if volatility < 0.25 else "high",
            threshold=25.0,
            distance_to_threshold=25.0 - (volatility * 100),
        ),
        RiskMetric(
            name="Effective Leverage",
            value=effective_leverage,
            unit="x",
            status="low" if effective_leverage < 1.5 else "moderate" if effective_leverage < 2.5 else "high",
            threshold=3.0,
            distance_to_threshold=3.0 - effective_leverage,
        ),
    ]

    # Risk scenarios
    scenarios = [
        RiskScenario(
            name="Market Correction -10%",
            description="S&P 500 declines 10% em um dia",
            market_move="-10%",
            portfolio_impact_pct=-10 * effective_leverage,
            equity_loss=round(total_equity * 0.1 * effective_leverage, 2),
            time_to_recovery_days=30,
            probability_pct=15.0,
        ),
        RiskScenario(
            name="Market Crash -20%",
            description="S&P 500 desaba 20% (bear market)",
            market_move="-20%",
            portfolio_impact_pct=-20 * effective_leverage,
            equity_loss=round(total_equity * 0.2 * effective_leverage, 2),
            time_to_recovery_days=180,
            probability_pct=5.0,
        ),
        RiskScenario(
            name="Volatility Spike 2x",
            description="VIX duplica, volatilidade dispara",
            market_move="2x VIX",
            portfolio_impact_pct=-5 * effective_leverage,
            equity_loss=round(total_equity * 0.05 * effective_leverage, 2),
            time_to_recovery_days=60,
            probability_pct=20.0,
        ),
        RiskScenario(
            name="Interest Rate +100bps",
            description="Taxa de juros sobe 1% (pressiona P/E ratios)",
            market_move="+100bps",
            portfolio_impact_pct=-8 * effective_leverage,
            equity_loss=round(total_equity * 0.08 * effective_leverage, 2),
            time_to_recovery_days=120,
            probability_pct=25.0,
        ),
    ]

    # Concentration risk
    position_weights = [(p.shares * p.avg_price / total_equity) for p in positions] if total_equity > 0 else []
    largest_weight = max(position_weights) if position_weights else 0
    concentration_risk = (largest_weight / (1 / len(positions))) * 100 if positions else 0

    # Margin requirements (assume 25% requirement for unleveraged, scales with leverage)
    margin_requirement = min(25 * effective_leverage, 100)
    margin_cushion = 100 - margin_requirement
    liquidity_coverage = 5.0  # Days of trading needed to liquidate

    # Risk level assessment
    risk_score = 0
    if effective_leverage > 2.0:
        risk_score += 30
    if volatility > 0.25:
        risk_score += 20
    if largest_weight > 0.4:
        risk_score += 20
    if cvar_95 < -0.05:
        risk_score += 15
    if var_95 < -0.03:
        risk_score += 15

    if risk_score < 25:
        risk_level = "low"
    elif risk_score < 50:
        risk_level = "moderate"
    elif risk_score < 75:
        risk_level = "high"
    else:
        risk_level = "critical"

    # Recommendations
    recommendations = []
    if effective_leverage > 2.5:
        recommendations.append("Alavancagem acima de 2.5x detectada. Considere desalavancar.")
    if largest_weight > 0.5:
        recommendations.append("Concentração de posição acima de 50%. Rebalanceie para reduzir risco idiossincrático.")
    if volatility > 0.30:
        recommendations.append("Volatilidade anualizada acima de 30%. Considere aumentar diversificação ou reduzir alavancagem.")
    if margin_cushion < 30:
        recommendations.append("Margem de segurança de margem abaixo de 30%. Risco de margin call elevado.")

    return RiskAnalysisResponse(
        portfolio_id=portfolio_id,
        risk_level=risk_level,
        risk_score=round(risk_score, 1),
        metrics=metrics,
        scenarios=scenarios,
        leverage_utilization_pct=round(effective_leverage * 100 / 3, 1),  # Assuming 3x max
        margin_requirement_pct=round(margin_requirement, 1),
        margin_cushion_pct=round(margin_cushion, 1),
        liquidity_coverage_days=liquidity_coverage,
        concentration_risk_pct=round(concentration_risk, 1),
        largest_position_weight=round(largest_weight * 100, 1),
        recommendations=recommendations,
        computed_at=datetime.utcnow(),
    )
