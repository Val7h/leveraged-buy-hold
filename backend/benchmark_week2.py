"""
Sprint 1 Week 2 Performance Benchmarking Script
Measures: baseline -> post-indexes -> post-parallelization
"""
import sys
import os
import time
import json
import statistics
from typing import Dict, List
from datetime import datetime
import logging

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
import yfinance as yf
from app.quantitative.backtest import run_backtest

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_spy_data(period="20y") -> pd.DataFrame:
    """Fetch SPY data using yfinance directly (no cache)."""
    logger.info(f"Fetching SPY {period} history...")
    spy = yf.Ticker("SPY")
    df = spy.history(period=period)
    logger.info(f"Fetched {len(df)} trading days")
    return df


def benchmark_equity_curve(
    price_data: Dict[str, pd.DataFrame],
    iterations: int = 5,
    phase: str = "baseline"
) -> Dict[str, float]:
    """Measure equity curve computation time."""
    times: List[float] = []

    logger.info(f"[{phase.upper()}] Running {iterations} iterations...")
    for i in range(iterations):
        start = time.perf_counter()
        try:
            result = run_backtest(
                price_data=price_data,
                initial_capital=100_000.0,
                monthly_contribution=1_000.0,
                risk_profile="balanced",
            )
            elapsed = time.perf_counter() - start
            times.append(elapsed)
            logger.info(f"[{phase.upper()}] Iteration {i+1}/{iterations}: {elapsed:.4f}s")
        except Exception as e:
            logger.error(f"[{phase.upper()}] Iteration {i+1}/{iterations}: FAILED - {e}")
            raise

    valid_times = [t for t in times if t is not None]
    if not valid_times:
        raise RuntimeError("All benchmark iterations failed")

    # Compute percentiles
    sorted_times = sorted(valid_times)
    if len(sorted_times) >= 10:
        p90 = statistics.quantiles(sorted_times, n=10)[8]
        p99 = statistics.quantiles(sorted_times, n=100)[98]
    else:
        p90 = sorted_times[int(len(sorted_times) * 0.90)]
        p99 = sorted_times[-1] if len(sorted_times) > 1 else sorted_times[0]

    return {
        "min": min(valid_times),
        "mean": statistics.mean(valid_times),
        "median": statistics.median(valid_times),
        "p90": p90,
        "p99": p99,
        "max": max(valid_times),
        "iterations": len(valid_times),
        "timestamp": datetime.utcnow().isoformat(),
    }


def main():
    logger.info("=" * 70)
    logger.info("SPRINT 1 WEEK 2 — BASELINE PERFORMANCE BENCHMARK")
    logger.info("=" * 70)

    # Fetch data once
    spy_df = fetch_spy_data("20y")
    price_data = {"SPY": spy_df}

    # Run baseline benchmark
    baseline = benchmark_equity_curve(price_data, iterations=5, phase="baseline")

    # Save results
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "phase": "baseline_pre_indexes",
        "data": {
            "rows": len(spy_df),
            "date_range": f"{spy_df.index[0].date()} to {spy_df.index[-1].date()}",
        },
        "benchmark": {
            "equity_curve": baseline,
        },
    }

    output_file = "benchmarks/baseline_pre_indexes.json"
    os.makedirs("benchmarks", exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)

    # Print summary
    logger.info("\n" + "=" * 70)
    logger.info("BASELINE SUMMARY (5 iterations)")
    logger.info("=" * 70)
    eq = baseline
    logger.info(f"Min:    {eq['min']:.4f}s")
    logger.info(f"Mean:   {eq['mean']:.4f}s")
    logger.info(f"Median: {eq['median']:.4f}s")
    logger.info(f"P90:    {eq['p90']:.4f}s (target after indexes: <3.0s)")
    logger.info(f"P99:    {eq['p99']:.4f}s")
    logger.info(f"Max:    {eq['max']:.4f}s")
    logger.info(f"\nResults saved to: {output_file}")
    logger.info("=" * 70)

    return 0


if __name__ == "__main__":
    sys.exit(main())
