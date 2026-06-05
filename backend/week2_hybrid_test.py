"""
Week 2 Hybrid Backtest Testing
Tests sequential vs parallel decision logic for different data sizes
"""
import sys
import os
import time
import json
import statistics
from typing import Dict, List
from datetime import datetime, timedelta
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
import numpy as np
from app.quantitative.backtest import run_backtest
from app.quantitative.backtest_hybrid import run_backtest_hybrid

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_synthetic_data(days: int) -> pd.DataFrame:
    """Create synthetic OHLCV data."""
    start_date = datetime.utcnow() - timedelta(days=days)
    dates = pd.date_range(start=start_date, periods=days, freq='D')

    np.random.seed(42)
    returns = np.random.normal(0.0005, 0.012, days)
    prices = 100 * np.exp(np.cumsum(returns))

    df = pd.DataFrame({
        'Open': prices * (1 + np.random.uniform(-0.01, 0.01, days)),
        'High': prices * (1 + np.random.uniform(0.00, 0.02, days)),
        'Low': prices * (1 + np.random.uniform(-0.02, 0.00, days)),
        'Close': prices,
        'Volume': np.random.randint(50000000, 200000000, days),
    }, index=dates)

    df['High'] = df[['Open', 'High', 'Close']].max(axis=1)
    df['Low'] = df[['Open', 'Low', 'Close']].min(axis=1)
    return df


def benchmark_function(func, price_data, iterations=3, phase="test"):
    """Benchmark a backtest function."""
    times = []

    logger.info(f"[{phase.upper()}] Running {iterations} iterations...")
    for i in range(iterations):
        start = time.perf_counter()
        try:
            result = func(
                price_data=price_data,
                initial_capital=100_000.0,
                monthly_contribution=1_000.0,
                risk_profile="balanced",
            )
            elapsed = time.perf_counter() - start
            times.append(elapsed)
            logger.info(f"[{phase.upper()}] Iteration {i+1}/{iterations}: {elapsed:.4f}s")
        except Exception as e:
            logger.error(f"[{phase.upper()}] Failed: {str(e)[:80]}")
            raise

    sorted_times = sorted(times)
    p90 = sorted_times[int(len(sorted_times) * 0.90)] if len(sorted_times) > 0 else 0

    return {
        "min": min(times),
        "mean": statistics.mean(times),
        "median": statistics.median(times),
        "p90": p90,
        "max": max(times),
        "iterations": len(times),
    }


def main():
    logger.info("=" * 80)
    logger.info("WEEK 2 — HYBRID BACKTEST DECISION LOGIC TEST")
    logger.info("=" * 80)

    # Test different data sizes
    test_sizes = [
        (250, "small", "Sequential expected (250 < 500)"),
        (1000, "medium", "Sequential/Parallel neutral (500 < 1000 < 2000)"),
        (5000, "large", "Parallel expected (5000 > 2000)"),
    ]

    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {},
    }

    for days, size_label, description in test_sizes:
        logger.info(f"\n{'=' * 80}")
        logger.info(f"TEST: {size_label.upper()} ({days} days) - {description}")
        logger.info(f"{'=' * 80}")

        price_data = {"SPY": create_synthetic_data(days)}

        # Run sequential baseline
        logger.info("\n[1] Sequential Baseline:")
        seq = benchmark_function(run_backtest, price_data, iterations=2, phase=f"seq_{size_label}")

        # Run hybrid (auto-select)
        logger.info("\n[2] Hybrid (Auto-Select):")
        hyb = benchmark_function(run_backtest_hybrid, price_data, iterations=2, phase=f"hyb_{size_label}")

        # Compare
        speedup = seq["mean"] / hyb["mean"]
        results["tests"][size_label] = {
            "days": days,
            "description": description,
            "sequential_mean": seq["mean"],
            "hybrid_mean": hyb["mean"],
            "speedup": speedup,
            "recommendation": "Hybrid faster" if speedup > 1.05 else "Equivalent or hybrid slower",
        }

        logger.info(f"\nComparison:")
        logger.info(f"  Sequential: {seq['mean']:.4f}s (mean)")
        logger.info(f"  Hybrid:     {hyb['mean']:.4f}s (mean)")
        logger.info(f"  Speedup:    {speedup:.2f}x {'WINS' if speedup > 1.05 else 'LOSES'}")

    # Save results
    output_file = "benchmarks/week2_hybrid_decision_test.json"
    os.makedirs("benchmarks", exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)

    logger.info(f"\n{'=' * 80}")
    logger.info(f"Results saved to: {output_file}")
    logger.info(f"{'=' * 80}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
