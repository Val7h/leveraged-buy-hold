# LBH System — Sprint 1, Week 1 Performance Optimization Plan

## Executive Summary
Target: Reduce equity curve calculation from 3.2s → <2.5s (ideally <2s) by June 8, 2026.

Current bottleneck: `run_backtest()` function in `app/quantitative/backtest.py` — sequential processing of 4 strategies across 20+ years of daily data.

---

## Architecture Overview

### Current Flow
1. **API**: `POST /api/v1/backtest` (FastAPI)
2. **Market Data Fetch**: `fetch_multiple_price_history()` — fetches OHLCV for primary + SPY (3-5s)
3. **Backtest Engine**: `run_backtest()` calls 3 strategy functions sequentially:
   - `_run_adaptive_strategy()` — 252*years iterations with indicator lookups
   - `_run_buy_hold()` (1x) — 252*years iterations
   - `_run_buy_hold()` (2x) — 252*years iterations
   - SPY benchmark — 252*years iterations
4. **Metrics Computation**: `compute_strategy_metrics()` — vectorized pandas operations
5. **Serialization**: Convert to JSON-compatible format

### Performance-Critical Components
| Component | Time (est.) | Optimization |
|-----------|-------------|--------------|
| Data fetch (yfinance) | 3-5s | Cache + concurrent fetch |
| Adaptive strategy loop | 0.8-1.2s | Vectorize + multithread |
| Buy&Hold (1x/2x) loops | 0.3-0.5s each | Vectorize + multithread |
| SPY benchmark | 0.2-0.3s | Vectorize |
| Metrics computation | 0.4-0.6s | Vectorize + lazy evaluation |
| Serialization | 0.2-0.3s | Native format output |
| **Total** | **3.2-5.0s** | **Target: <2.0s** |

---

## Week 1 Deliverables Roadmap

### Day 1 (Thursday) — Baseline Measurement ✅ THIS
- [ ] Create `benchmarks/backtest_performance.py` — measure p90/p99 latency
- [ ] Run 10 iterations with real data (SPY, 20y history)
- [ ] Record baseline metrics

### Day 2 (Friday) — Database Indexes
- [ ] Analyze current schema for query bottlenecks
- [ ] Create migration: `add_database_indexes.py`
  - User email index (already exists)
  - Portfolio user_id index
  - Position portfolio_id + ticker indexes
- [ ] Measure impact on read/write ops

### Day 3-4 (Sat-Sun) — Optional Catch-up
- Refine measurements
- Adjust optimization priorities

### Day 5 (Monday) — Parallelization (ThreadPoolExecutor)
- [ ] Refactor `run_backtest()` to execute 4 strategies in parallel
- [ ] Test thread safety (no shared mutable state)
- [ ] Draft PR: `feat/parallel-backtest-strategies`

### Day 6 (Tuesday) — Performance Re-measurement
- [ ] Run benchmarks with parallelization
- [ ] Target: 50-60% latency reduction (~1.6-1.8s)

### Day 7 (Wednesday) — In-Memory Cache Layer
- [ ] Design `app/cache/backtest_cache.py`:
  - LRU cache for ticker price data
  - 1-hour TTL
  - Key: `{ticker}:{period}:{date_hash}`
- [ ] Implement `BacktestCacheManager` class
- [ ] Integrate into `fetch_price_history()`

---

## Optimization Strategies

### 1. Database Indexes (Low-hanging fruit, Day 2)
**Expected gain**: 5-10% (mainly on portfolio reads, not backtest)

```sql
CREATE INDEX idx_portfolio_user_id ON portfolios(user_id);
CREATE INDEX idx_position_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_position_ticker ON positions(ticker);
```

### 2. Parallelization (ThreadPoolExecutor, Days 5-6)
**Expected gain**: 40-50% (4 strategies can run in parallel)

Current sequential: ~1.3s total for 4 strategies
Parallelized: ~0.35s (assuming balanced load)

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [
        executor.submit(_run_adaptive_strategy, ...),
        executor.submit(_run_buy_hold, ..., leverage=1.0),
        executor.submit(_run_buy_hold, ..., leverage=2.0),
        executor.submit(_run_buy_hold, ..., leverage=1.0, is_spy=True),
    ]
    strategies = {name: future.result() for name, future in futures}
```

### 3. In-Memory Cache (Day 7)
**Expected gain**: 30-40% (for repeated ticker requests)

LRU cache with TTL for price data:
- Cold start: 3-5s (network I/O)
- Warm cache: <0.5s (in-memory only)

### 4. Vectorization Opportunities (Future)
- Replace `_run_adaptive_strategy()` loop with NumPy operations
- Pre-compute indicator series once (not monthly)
- Use pandas `apply()` instead of Python loops where possible

---

## Measurement Methodology

### Baseline Script (`benchmarks/backtest_performance.py`)
```python
import time
import statistics

def benchmark_backtest(iterations=10):
    """Measure p90/p99 latency for equity curve calculation."""
    times = []
    for i in range(iterations):
        start = time.perf_counter()
        run_backtest(
            price_data={'SPY': df},
            initial_capital=100_000,
            monthly_contribution=1_000,
        )
        elapsed = time.perf_counter() - start
        times.append(elapsed)
    
    return {
        'min': min(times),
        'mean': statistics.mean(times),
        'median': statistics.median(times),
        'p90': statistics.quantiles(times, n=10)[8],
        'p99': statistics.quantiles(times, n=100)[98],
        'max': max(times),
    }
```

### Success Criteria
| Metric | Current | Week 1 Target | Week 2 Target |
|--------|---------|---------------|---------------|
| p90 latency | ~3.2s | **<2.5s** | <1.5s |
| p99 latency | ~3.8s | **<3.0s** | <2.0s |
| Mean latency | ~3.0s | **<2.2s** | <1.3s |

---

## Technical Constraints
- **Thread Safety**: Backtest engine uses read-only data (price_df), no shared mutable state
- **Memory**: 20y SPY data = ~5,200 rows × 5 columns = <1MB — no memory pressure
- **GIL**: Numeric computation (pandas/numpy) releases GIL — parallelization gains apply
- **Database**: Backtest doesn't use DB, so index optimization helps other endpoints only

---

## Next Steps
1. **Now (Day 1)**: Create baseline measurement script
2. **Tomorrow (Day 2)**: Database migration + indexes
3. **Monday (Day 5)**: ThreadPoolExecutor refactoring
4. **Wednesday (Day 7)**: Cache layer design + implementation

---

## Success Indicator
By end of Week 1 (June 8):
- ✅ Baseline metrics recorded (p90/p99)
- ✅ Database indexes applied
- ✅ Parallelization 50% complete (PR drafted)
- ✅ Cache layer designed (not integrated yet)
- ✅ Load test methodology documented
- ✅ Trend shows <2.5s achievable by June 10-12
