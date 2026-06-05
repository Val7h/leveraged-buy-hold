# LBH System — Load Test Methodology & Plan
**Document Date**: June 5, 2025  
**Target**: Measure backtest endpoint performance under load  
**Goal**: Ensure <2.5s p90 latency at 50 concurrent users  

---

## Executive Summary

The LBH backtest endpoint (`POST /api/v1/backtest`) is the most computationally expensive operation in the system. This document defines how we measure, stress-test, and validate performance improvements.

### Success Criteria
| Metric | Current | Target (Week 1) | Target (June 8) |
|--------|---------|-----------------|-----------------|
| **Single user latency (p90)** | ~3.2s | **<2.5s** | <2.0s |
| **Single user latency (p99)** | ~3.8s | **<3.0s** | <2.5s |
| **Throughput @ 10 concurrent** | ~3 req/s | **>4 req/s** | >6 req/s |
| **Throughput @ 50 concurrent** | N/A (untested) | **>2 req/s** | >3 req/s |
| **Error rate** | <1% | **<0.5%** | <0.1% |

---

## Load Testing Architecture

### Phase 1: Baseline (Single User) — Week 1 Day 1
**Tool**: `benchmarks/backtest_performance.py`  
**Scenario**: 10 sequential requests (no concurrency)  
**Metrics**: min, mean, median, p90, p99, max latency

```bash
cd backend
python -m benchmarks.backtest_performance --iterations 10 --output baseline_20250605.json
```

**Expected Output**:
```json
{
  "timestamp": "2025-06-05T10:00:00Z",
  "iterations": 10,
  "benchmark": {
    "equity_curve": {
      "min": 3.05,
      "mean": 3.18,
      "median": 3.15,
      "p90": 3.40,
      "p99": 3.75,
      "max": 3.82
    }
  }
}
```

---

### Phase 2: Concurrent Load (10 Users) — Week 1 Day 2-3
**Tool**: `benchmarks/load_test_concurrent.py` (to be created)  
**Scenario**: 10 concurrent users making 1 request each (burst load)  
**Metrics**: latency distribution, throughput, error rate  

```bash
python -m benchmarks.load_test_concurrent --users 10 --iterations 5
```

**Expected behavior**:
- No queue buildup (response time similar to single-user)
- ~10-15s total wall-clock time (3.2s × 1 sequential request per user × 10 users)
- CPU utilization: ~40-50% (4 cores available, ~2.5 cores used)

---

### Phase 3: Heavy Concurrent Load (50 Users) — Week 1 Day 6-7
**Tool**: Apache JMeter or Locust  
**Scenario**: 50 concurrent users, 20 requests each (sustained load)  
**Metrics**: latency percentiles, throughput, connection pool saturation  

```bash
# Using Locust (if installed)
locust -f benchmarks/load_test_locust.py --users 50 --spawn-rate 5 -t 5m
```

**Expected behavior**:
- Thread pool saturation (4 backtest workers + 20 other threads)
- Some queueing — requests wait for available worker
- p95/p99 latency increase (5-20% over single-user baseline)
- Throughput plateau at ~6-8 req/s (limited by CPU)

---

### Phase 4: Stress Testing (100+ Users) — Week 2
**Scenario**: Find breaking point and recovery behavior  
**Metrics**: max throughput, graceful degradation, recovery time  

---

## Detailed Load Test Plan

### Test 1: Single-User Baseline
**Status**: READY TO RUN (Day 1)  
**Duration**: ~5 minutes (10 iterations × 3.2s + overhead)  
**Resource**: Laptop, single Python process  

```bash
cd backend
python -m benchmarks.backtest_performance \
  --iterations 10 \
  --output benchmarks/baseline_20250605.json \
  --skip-data-fetch  # Skip to isolate backtest engine only
```

**Pass/Fail Criteria**:
- ✅ PASS: p90 < 3.5s AND p99 < 4.0s
- ⚠️ WARN: p90 in [3.2s, 3.5s]
- ❌ FAIL: p90 > 3.5s or errors > 0

---

### Test 2: Concurrent Load (10 Users)
**Status**: DRAFT (to be implemented Day 2-3)  
**Duration**: ~2 minutes  
**Tool**: Custom Python script using `concurrent.futures.ThreadPoolExecutor`

**Script outline** (pseudocode):
```python
import time
from concurrent.futures import ThreadPoolExecutor
from benchmarks.backtest_performance import benchmark_equity_curve

def concurrent_load_test(num_users=10, iterations=1):
    """Simulate N concurrent users."""
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=num_users) as executor:
        futures = [
            executor.submit(benchmark_equity_curve, iterations=iterations)
            for _ in range(num_users)
        ]
        results = [f.result() for f in futures]
    elapsed = time.perf_counter() - start
    
    # Aggregate results
    all_times = [r for res in results for r in res['times']]
    return {
        'throughput': len(all_times) / elapsed,
        'concurrent_users': num_users,
        'wall_clock_time': elapsed,
        'latency_p90': percentile(all_times, 90),
        'latency_p99': percentile(all_times, 99),
    }
```

**Expected Behavior**:
- 10 users × 1 request each ≈ 32 seconds wall-clock
- Individual request latency unchanged (~3.2s)
- No errors

---

### Test 3: Heavy Load (50 Users)
**Status**: DESIGN ONLY (to be implemented after parallelization)  
**Duration**: 5 minutes  
**Tool**: Locust or custom asyncio script

**Expected Results** (post-optimization):
- Throughput: 6-8 requests/second
- p90 latency: 2.5-3.0s
- p99 latency: 3.0-3.5s
- Error rate: <0.5%

---

## Performance Regression Testing

### CI/CD Integration
Add to GitHub Actions (`.github/workflows/performance-tests.yml`):

```yaml
name: Performance Regression Tests

on: [pull_request, push]

jobs:
  backtest-perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install deps
        run: cd backend && pip install -r requirements.txt
      - name: Baseline benchmark
        run: cd backend && python -m benchmarks.backtest_performance \
          --iterations 5 \
          --output /tmp/perf.json
      - name: Check results
        run: |
          python -c "
          import json
          with open('/tmp/perf.json') as f:
              data = json.load(f)
          p90 = data['benchmark']['equity_curve']['p90']
          if p90 > 3.5:
              print(f'❌ Performance regression: p90={p90:.2f}s > 3.5s')
              exit(1)
          else:
              print(f'✅ Performance OK: p90={p90:.2f}s')
          "
```

---

## Load Test Scenarios

### Scenario A: Typical User Workflow
**Description**: User runs 1-2 backtests per session  
**Load pattern**: Burst (0.5 RPS sustained for 5 min)  
**Expected latency**: <3.5s per request  

### Scenario B: Screening/Comparison Workflow
**Description**: User compares multiple portfolios (5-10 backtests)  
**Load pattern**: 5-10 sequential requests (no parallelism from client side)  
**Expected**: <3.5s each, <30s total wall-clock  

### Scenario C: Scheduled Batch Processing
**Description**: System runs daily/weekly analysis on 50 portfolios  
**Load pattern**: 50 requests in ~5 minute window  
**Expected**: Sustained throughput >2 req/s, queueing acceptable  

---

## Monitoring & Alerting

### Metrics to Track
1. **Endpoint latency**: p50, p90, p99, p99.9
2. **Throughput**: requests/second
3. **Error rate**: % of requests failing
4. **Resource utilization**:
   - CPU: % per core
   - Memory: MB used vs. available
   - Thread count: active threads
5. **Data fetch cache hit rate**: % of price history from cache

### Success Thresholds (for alerts)
- ⚠️ **WARNING**: p90 > 3.5s (5% regression)
- 🔴 **CRITICAL**: p90 > 4.0s or error_rate > 1%

---

## Tools & Infrastructure

### Local Development
- **Python script**: `benchmarks/backtest_performance.py`
- **Profiler**: `cProfile` (for identifying bottlenecks)
- **Memory profiler**: `memory_profiler` (for leaks)

### Optional (If Project Budget Allows)
- **Locust**: Open-source load testing
- **DataDog**: APM monitoring
- **AWS CloudWatch**: For production monitoring

---

## Implementation Schedule

| Date | Task | Duration | Owner |
|------|------|----------|-------|
| Jun 5 (Day 1) | Run baseline benchmark | 1 hour | Backend Engineer |
| Jun 6 (Day 2) | Concurrent load test (10 users) | 2 hours | Backend Engineer |
| Jun 9 (Day 5) | Re-benchmark after parallelization | 1 hour | Backend Engineer |
| Jun 10 (Day 6) | Load test (50 users) | 3 hours | Backend Engineer |
| Jun 11 (Day 7) | Final performance report | 2 hours | Backend Engineer |

---

## Expected Performance Timeline

```
Jun 5  (Baseline):       3.2s p90
Jun 6  (Indexes):       ~3.1s p90  (minimal impact)
Jun 9  (Parallelization): ~1.8s p90  (-44%)
Jun 10 (Cache layer):    ~0.8s p90  (warm cache)
```

**Target by June 8**: <2.5s p90 ✅

---

## Appendix A: Key Assumptions

1. **Data availability**: Market data fetch (3-5s) is cached, not re-measured
2. **Hardware**: 4-core CPU, 8GB RAM (typical laptop)
3. **Network**: No network latency (local testing)
4. **Single strategy**: Measurement focuses on equity curve only, not API overhead
5. **Deterministic data**: SPY data remains constant across runs

---

## Appendix B: Glossary

- **p90**: 90th percentile latency (90% of requests faster)
- **p99**: 99th percentile latency (99% of requests faster)
- **Throughput**: Requests per second (RPS)
- **Concurrent users**: Simultaneous active connections
- **Wall-clock time**: Real elapsed time (vs. CPU time)
- **LRU**: Least Recently Used (cache eviction policy)
- **TTL**: Time-to-Live (cache expiration)
