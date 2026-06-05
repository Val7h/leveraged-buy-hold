"""
Hybrid Backtest Engine — Intelligent Parallel/Sequential Decision
Week 2 Optimization: Auto-select best execution strategy based on data size.

Decision logic:
  - Data rows < 500: Sequential (overhead not worth it)
  - Data rows 500-2000: ThreadPoolExecutor (minimal technical indicators)
  - Data rows > 2000: ThreadPoolExecutor (good parallelization benefit)
  - For production: ProcessPoolExecutor (scales to many-core systems)
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple
import pandas as pd
import logging
from app.quantitative.backtest import (
    _run_adaptive_strategy,
    _run_buy_hold,
    compute_strategy_metrics,
    analyze_crisis_period,
    _compute_drawdown_series,
    CRISIS_PERIODS,
)

logger = logging.getLogger(__name__)


def run_backtest_hybrid(
    price_data: Dict[str, pd.DataFrame],
    initial_capital: float = 100_000.0,
    monthly_contribution: float = 1_000.0,
    risk_profile: str = "balanced",
    beta: float = 0.7,
    dividend_yield: float = 0.04,
    max_dd_hist: float = -35.0,
    sharpe_hist: float = 0.8,
    vol_hist: float = 15.0,
    max_workers: int = 4,
    auto_select: bool = True,
) -> Dict:
    """
    Run backtest with automatic selection of sequential or parallel execution.

    Args:
        price_data: Dict[ticker -> DataFrame] with OHLCV data
        initial_capital: Starting capital in USD
        monthly_contribution: Monthly recurring contribution
        risk_profile: Risk profile for leverage calculation
        beta: Asset beta for quality scoring
        dividend_yield: Annual dividend yield
        max_dd_hist: Historical max drawdown for scoring
        sharpe_hist: Historical Sharpe ratio for scoring
        vol_hist: Historical volatility for scoring
        max_workers: Number of parallel workers
        auto_select: If True, choose sequential/parallel based on data size

    Returns:
        Dict with equity_curves, metrics, crisis_analysis, etc.
    """
    primary_ticker = list(price_data.keys())[0]
    primary_df = price_data[primary_ticker]
    data_rows = len(primary_df)

    # Decision logic: when is parallelization beneficial?
    use_parallel = True
    reason = ""

    if auto_select:
        if data_rows < 500:
            use_parallel = False
            reason = f"Data too small ({data_rows} rows, threshold: 500)"
        elif data_rows < 2000:
            use_parallel = True
            reason = f"Minimal data ({data_rows} rows, threshold: 2000) - threads may be slower"
        else:
            use_parallel = True
            reason = f"Sufficient data ({data_rows} rows) - parallelization beneficial"

    if use_parallel:
        logger.info(f"[HYBRID] Using PARALLEL execution ({reason})")
        return _run_backtest_parallel(
            price_data, initial_capital, monthly_contribution, risk_profile,
            beta, dividend_yield, max_dd_hist, sharpe_hist, vol_hist, max_workers
        )
    else:
        logger.info(f"[HYBRID] Using SEQUENTIAL execution ({reason})")
        from app.quantitative.backtest import run_backtest
        return run_backtest(
            price_data, initial_capital, monthly_contribution, risk_profile
        )


def _run_backtest_parallel(
    price_data: Dict[str, pd.DataFrame],
    initial_capital: float = 100_000.0,
    monthly_contribution: float = 1_000.0,
    risk_profile: str = "balanced",
    beta: float = 0.7,
    dividend_yield: float = 0.04,
    max_dd_hist: float = -35.0,
    sharpe_hist: float = 0.8,
    vol_hist: float = 15.0,
    max_workers: int = 4,
) -> Dict:
    """Internal parallel execution (same as backtest_parallel.py)."""
    primary_ticker = list(price_data.keys())[0]
    primary_df = price_data[primary_ticker]

    logger.info(f"[PARALLEL] Starting backtest with {max_workers} workers")

    # Define strategy tasks
    strategy_tasks = [
        {
            "name": "adaptive",
            "fn": _run_adaptive_strategy,
            "args": (
                primary_df,
                initial_capital,
                monthly_contribution,
                risk_profile,
                beta,
                dividend_yield,
                max_dd_hist,
                sharpe_hist,
                vol_hist,
            ),
        },
        {
            "name": "buy_hold_1x",
            "fn": _run_buy_hold,
            "args": (
                primary_df,
                initial_capital,
                monthly_contribution,
                1.0,
                dividend_yield,
            ),
        },
        {
            "name": "buy_hold_2x",
            "fn": _run_buy_hold,
            "args": (
                primary_df,
                initial_capital,
                monthly_contribution,
                2.0,
                dividend_yield,
            ),
        },
    ]

    # Add SPY benchmark if available
    if "SPY" in price_data:
        strategy_tasks.append({
            "name": "sp500",
            "fn": _run_buy_hold,
            "args": (
                price_data["SPY"],
                initial_capital,
                monthly_contribution,
                1.0,
                0.015,
            ),
        })

    # Execute strategies in parallel
    strategies: Dict[str, pd.DataFrame] = {}
    adaptive_trades = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for task in strategy_tasks:
            future = executor.submit(task["fn"], *task["args"])
            futures[future] = task

        for future in as_completed(futures):
            task = futures[future]
            try:
                result = future.result()
                df, trades = result
                strategies[task["name"]] = df

                if task["name"] == "adaptive":
                    adaptive_trades = trades

                logger.info(
                    f"[PARALLEL] OK {task['name']:20} — "
                    f"{len(df)} days, final=${df['equity'].iloc[-1]:,.0f}"
                )
            except Exception as e:
                logger.error(f"[PARALLEL] FAIL {task['name']:20} — {e}")
                raise

    # Post-processing (sequential)
    equity_curves = {k: v["equity"] for k, v in strategies.items()}

    metrics = [
        compute_strategy_metrics(eq, name) for name, eq in equity_curves.items()
    ]

    crisis_analysis = []
    for period in CRISIS_PERIODS:
        ca = analyze_crisis_period(equity_curves, period["start"], period["end"])
        ca["name"] = period["name"]
        crisis_analysis.append(ca)

    def serialize_curve(series: pd.Series) -> List[Dict]:
        return [
            {"date": str(idx)[:10], "value": round(float(val), 2)}
            for idx, val in series.items()
        ]

    def serialize_lev_curve(df: pd.DataFrame) -> List[Dict]:
        return [
            {"date": str(idx)[:10], "leverage": round(float(row["leverage"]), 3)}
            for idx, row in df.iterrows()
        ]

    close_series = primary_df["Close"].squeeze()
    trade_dates = {t["date"] for t in adaptive_trades}
    price_series = [
        {"date": str(idx)[:10], "value": round(float(val), 4)}
        for i, (idx, val) in enumerate(close_series.items())
        if i % 5 == 0 or str(idx)[:10] in trade_dates or i == len(close_series) - 1
    ]

    drawdown_curves = {}
    for k, eq in equity_curves.items():
        dd = _compute_drawdown_series(eq)
        drawdown_curves[k] = [
            {"date": str(idx)[:10], "value": round(float(v), 3)}
            for idx, v in dd.items()
        ]

    logger.info(f"[PARALLEL] OK Backtest complete")

    return {
        "equity_curves": {k: serialize_curve(v) for k, v in equity_curves.items()},
        "drawdown_curves": drawdown_curves,
        "leverage_curve": serialize_lev_curve(strategies.get("adaptive", pd.DataFrame())),
        "metrics": metrics,
        "crisis_analysis": [c for c in crisis_analysis if len(c) > 3],
        "price_series": price_series,
        "trades": adaptive_trades,
    }
