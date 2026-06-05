"""
LBH System — Backtest Performance Baseline Benchmark
Measures equity curve calculation latency (p90, p99, mean).

Usage:
    cd backend
    python -m benchmarks.backtest_performance [iterations] [output_file]

Example:
    python -m benchmarks.backtest_performance 10 benchmarks/baseline_20250605.json
"""
import sys
import os
import time
import json
import statistics
from typing import Dict, List
from datetime import datetime, timedelta
import logging

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np

# Import the backtest engine
from app.quantitative.backtest import run_backtest
from app.services.market_data import fetch_price_history

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fetch_benchmark_data() -> Dict[str, pd.DataFrame]:
    """Fetch SPY 20-year history for consistent baseline."""
    logger.info("Fetching SPY 20-year history...")
    spy_df = fetch_price_history("SPY", period="20y")
    if spy_df is None or spy_df.empty:
        raise RuntimeError("Failed to fetch SPY data")
    logger.info(f"Fetched SPY data: {len(spy_df)} trading days")
    return {"SPY": spy_df}


def benchmark_equity_curve(
    price_data: Dict[str, pd.DataFrame],
    iterations: int = 10,
) -> Dict[str, float]:
    """
    Measure equity curve computation time.

    Args:
        price_data: Dict of ticker -> price dataframe
        iterations: Number of benchmark runs

    Returns:
        Dict with min, mean, median, p90, p99, max timings in seconds
    """
    times: List[float] = []

    logger.info(f"Running {iterations} iterations of backtest...")
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
            logger.info(f"  Iteration {i+1}/{iterations}: {elapsed:.4f}s")
        except Exception as e:
            logger.error(f"  Iteration {i+1}/{iterations}: FAILED — {e}")
            times.append(None)

    # Filter out None values
    valid_times = [t for t in times if t is not None]
    if not valid_times:
        raise RuntimeError("All benchmark iterations failed")

    # Compute percentiles
    if len(valid_times) >= 10:
        p90 = statistics.quantiles(valid_times, n=10)[8]
        p99 = statistics.quantiles(valid_times, n=100)[98]
    else:
        # For smaller samples, approximate
        sorted_times = sorted(valid_times)
        p90 = sorted_times[int(len(sorted_times) * 0.90)]
        p99 = sorted_times[int(len(sorted_times) * 0.99)] if len(sorted_times) > 1 else sorted_times[-1]

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


def benchmark_data_fetch(tickers: List[str] = None, iterations: int = 3) -> Dict[str, float]:
    """Measure data fetch latency separately."""
    tickers = tickers or ["SPY"]
    times = []

    logger.info(f"Benchmarking data fetch ({iterations} iterations)...")
    for i in range(iterations):
        start = time.perf_counter()
        for ticker in tickers:
            df = fetch_price_history(ticker, period="20y")
            if df is None:
                raise RuntimeError(f"Failed to fetch {ticker}")
        elapsed = time.perf_counter() - start
        times.append(elapsed)
        logger.info(f"  Iteration {i+1}/{iterations}: {elapsed:.4f}s")

    return {
        "min": min(times),
        "mean": statistics.mean(times),
        "median": statistics.median(times),
        "max": max(times),
        "iterations": len(times),
        "timestamp": datetime.utcnow().isoformat(),
    }


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Benchmark LBH backtest performance")
    parser.add_argument("--iterations", type=int, default=10, help="Number of iterations")
    parser.add_argument("--output", type=str, default=None, help="Output JSON file")
    parser.add_argument("--skip-data-fetch", action="store_true", help="Skip data fetch benchmark")
    args = parser.parse_args()

    # Fetch baseline data once
    logger.info("=" * 70)
    logger.info("LBH BACKTEST PERFORMANCE BASELINE — June 5, 2025")
    logger.info("=" * 70)

    price_data = fetch_benchmark_data()

    # Benchmark components separately
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "iterations": args.iterations,
        "benchmark": {
            "equity_curve": benchmark_equity_curve(price_data, iterations=args.iterations),
        },
        "system": {
            "cpu_count": os.cpu_count(),
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        }
    }

    if not args.skip_data_fetch:
        results["benchmark"]["data_fetch"] = benchmark_data_fetch(iterations=3)

    # Print summary
    logger.info("\n" + "=" * 70)
    logger.info("BASELINE SUMMARY")
    logger.info("=" * 70)

    equity = results["benchmark"]["equity_curve"]
    logger.info(f"Equity Curve Calculation (n={equity['iterations']}):")
    logger.info(f"  Min:    {equity['min']:.4f}s")
    logger.info(f"  Mean:   {equity['mean']:.4f}s")
    logger.info(f"  Median: {equity['median']:.4f}s")
    logger.info(f"  P90:    {equity['p90']:.4f}s")
    logger.info(f"  P99:    {equity['p99']:.4f}s")
    logger.info(f"  Max:    {equity['max']:.4f}s")

    if "data_fetch" in results["benchmark"]:
        fetch = results["benchmark"]["data_fetch"]
        logger.info(f"\nData Fetch (n={fetch['iterations']}):")
        logger.info(f"  Min:    {fetch['min']:.4f}s")
        logger.info(f"  Mean:   {fetch['mean']:.4f}s")
        logger.info(f"  Median: {fetch['median']:.4f}s")
        logger.info(f"  Max:    {fetch['max']:.4f}s")

    # Save to file if requested
    if args.output:
        output_dir = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        logger.info(f"\nResults saved to: {args.output}")

    # Exit code based on success
    equity_mean = equity["mean"]
    if equity_mean > 3.5:
        logger.warning(f"⚠️  Equity curve latency is ABOVE baseline ({equity_mean:.2f}s > 3.5s)")
        return 1
    elif equity_mean < 2.5:
        logger.info(f"✅ Equity curve latency is EXCELLENT ({equity_mean:.2f}s < 2.5s)")
        return 0
    else:
        logger.info(f"⚠️  Equity curve latency is ACCEPTABLE ({equity_mean:.2f}s)")
        return 0


if __name__ == "__main__":
    sys.exit(main())
