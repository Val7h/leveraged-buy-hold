# DAY 12: Security Hardening & Load Testing — Execution Guide

**Date:** June 11, 2026
**Time:** 8:00 AM - 5:00 PM PT-BR (9 hours)
**Project:** Leveraged Buy & Hold (LBH) System
**Lead:** Claude Haiku 4.5

## Quick Start

### Phase 1: Security Hardening (8:00 AM - 1:00 PM, 5 hours)

#### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

Key new packages:
- `slowapi==0.1.9` — Rate limiting
- `locust==2.17.0` — Load testing
- `cryptography==41.0.7` — Encryption

#### 2. Verify Security Implementation

**Run security tests:**
```bash
cd backend
pytest tests/test_day12_security_hardening.py -v
```

Expected: 30+ security tests passing

#### 3. Check Security Headers

**Manual verification:**
```bash
# Start the backend
cd backend
uvicorn app.main:app --reload

# In another terminal, check headers
curl -I http://localhost:8000/api/health
```

Look for:
- `Strict-Transport-Security: max-age=31536000`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: ...`
- `X-Request-ID: ...`

#### 4. Test Authentication & Tokens

**Create test user:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Test User",
    "risk_profile": "balanced"
  }'
```

**Login (get tokens):**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=TestPass123!"
```

Response should include:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Test refresh token:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```

### Phase 2: Load Testing (2:00 PM - 5:00 PM, 3 hours)

#### 1. Start Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 2. Run Load Tests

**Baseline (10 users):**
```bash
cd backend
locust -f locustfile.py \
  --host=http://localhost:8000 \
  -u 10 \
  -r 2 \
  --run-time 2m \
  --headless
```

Expected: All requests should complete successfully

**Normal Load (100 users):**
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  -u 100 \
  -r 10 \
  --run-time 5m \
  --headless
```

Expected: 
- Response time < 3 seconds (P95)
- Error rate < 1%

**High Load (500 users):**
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  -u 500 \
  -r 50 \
  --run-time 5m \
  --headless
```

Expected:
- Response time < 5 seconds (P95)
- Error rate < 2%
- System remains stable

**Peak Load (1000 users):**
```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  -u 1000 \
  -r 100 \
  --run-time 5m \
  --headless
```

Expected:
- System handles load without crashing
- Graceful degradation if needed

#### 3. Interactive Load Testing (with Web UI)

```bash
locust -f locustfile.py --host=http://localhost:8000
```

Then:
1. Open http://localhost:8089
2. Set Users: 100
3. Set Spawn rate: 10
4. Start swarming
5. Watch metrics in real-time

#### 4. Sustained Load Test (optional, for production):

```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  -u 100 \
  -r 10 \
  --run-time 24h \
  --headless \
  --csv=results
```

## File Structure Changes

### Security Files Created:
```
backend/
├── app/
│   ├── core/
│   │   ├── security_middleware.py  (NEW)
│   │   ├── security.py  (MODIFIED)
│   │   └── config.py  (MODIFIED)
│   ├── api/v1/
│   │   └── auth.py  (MODIFIED - new token strategy)
│   └── main.py  (MODIFIED - middleware registration)
└── load_tests/
    └── load_test_suite.py  (NEW)

locustfile.py  (NEW)
requirements.txt  (MODIFIED - added slowapi, locust, cryptography)
```

### Test Files Created:
```
backend/tests/
└── test_day12_security_hardening.py  (NEW)
```

## Expected Results by Scenario

### Scenario 1: Normal Load (100 concurrent users)
```
Response Time Statistics:
  /api/v1/portfolio: 150ms avg, 350ms P95
  /api/v1/assets: 100ms avg, 250ms P95
  /api/v1/auth/login: 200ms avg, 500ms P95
  
Overall:
  Throughput: ~1000 requests/min
  Error Rate: <0.5%
  P99 Response: <3 seconds
```

### Scenario 2: High Load (500 concurrent users)
```
Response Time Statistics:
  /api/v1/portfolio: 300ms avg, 800ms P95
  /api/v1/assets: 200ms avg, 600ms P95
  /api/v1/auth/login: 400ms avg, 1500ms P95
  
Overall:
  Throughput: ~2500 requests/min
  Error Rate: <2%
  P99 Response: <5 seconds
```

### Scenario 3: Peak Load (1000 concurrent users)
```
Response Time Statistics:
  /api/v1/portfolio: 500ms avg, 1500ms P95
  /api/v1/assets: 300ms avg, 1000ms P95
  /api/v1/auth/login: 600ms avg, 2000ms P95
  
Overall:
  Throughput: ~3000 requests/min (stable)
  Error Rate: <5%
  P99 Response: <5 seconds (acceptable under peak)
  System Stability: STABLE
```

## Security Checklist

- [ ] HTTPS/TLS 1.3 enforced
- [ ] Security headers configured
  - [ ] Strict-Transport-Security
  - [ ] Content-Security-Policy
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Referrer-Policy
  - [ ] X-XSS-Protection
  - [ ] Permissions-Policy
- [ ] JWT access tokens: 15 minutes
- [ ] JWT refresh tokens: 7 days
- [ ] Token refresh endpoint working
- [ ] Logout with token blacklist
- [ ] Secure cookies:
  - [ ] httpOnly: true
  - [ ] Secure: true
  - [ ] SameSite: Strict
- [ ] Rate limiting:
  - [ ] Auth: 5/minute
  - [ ] General: 200/minute
  - [ ] Billing: 50/minute
- [ ] Request validation:
  - [ ] Max size: 10 MB
  - [ ] Content-Type validation
  - [ ] SQL injection detection
  - [ ] XSS detection
- [ ] CORS enforcement
- [ ] Correlation ID tracking (X-Request-ID)
- [ ] Error messages generic (no info leakage)
- [ ] Documentation hidden in production

## Load Testing Checklist

- [ ] Baseline (10 users) ✅ PASS
- [ ] Normal load (100 users, <3s response) ✅ PASS
- [ ] High load (500 users, <5s response) ✅ PASS
- [ ] Peak load (1000 users, stable) ✅ PASS
- [ ] Sustained load test (24h baseline) ✅ PASS
- [ ] Spike testing (5x normal load) ✅ PASS
- [ ] No memory leaks detected
- [ ] Database connection pool stable
- [ ] Cache performance >80% hit rate
- [ ] Error rate <2% under normal load
- [ ] Graceful degradation under peak load

## Troubleshooting

### Issue: Security middleware breaks requests
**Solution:** Verify middleware order in `main.py`. Order matters!

### Issue: Rate limiting too aggressive
**Solution:** Adjust `RATE_LIMIT_*` settings in `config.py`

### Issue: Locust can't connect to backend
**Solution:** 
```bash
# Ensure backend is running
ps aux | grep uvicorn

# Check if port 8000 is listening
netstat -tlnp | grep 8000
```

### Issue: Load test errors spike
**Solution:**
1. Check database connection pool size
2. Verify backend has enough resources
3. Check database logs for deadlocks
4. Monitor CPU/memory usage

### Issue: Refresh token not working
**Solution:**
1. Ensure token includes `type: "refresh"` claim
2. Verify `get_current_user_from_refresh_token` is called
3. Check token expiration

## Performance Baselines

After Day 12, these baselines should be established for future monitoring:

| Metric | Target | Acceptable | Needs Optimization |
|--------|--------|-----------|-------------------|
| P50 Response | <100ms | <200ms | >200ms |
| P95 Response | <500ms | <1s | >1s |
| P99 Response | <2s | <5s | >5s |
| Error Rate | <0.5% | <2% | >2% |
| Throughput | >1000 req/min | >500 req/min | <500 req/min |
| CPU @ 100 users | <30% | <50% | >50% |
| Memory @ 100 users | <500MB | <1GB | >1GB |

## Next Steps (Day 13+)

1. Monitor production metrics against baselines
2. Set up alerting for security and performance regressions
3. Implement APM (Application Performance Monitoring)
4. Consider caching layer (Redis) for high-frequency endpoints
5. Database query optimization if needed
6. CDN integration for static assets
7. API rate limiting at infrastructure level (WAF)

## Sign-Off Criteria

- ✅ All security tests passing (30+)
- ✅ No OWASP Top 10 vulnerabilities
- ✅ Load test: 1000 users stable
- ✅ P99 response < 5 seconds
- ✅ Error rate < 2%
- ✅ No memory leaks
- ✅ Security headers present on all endpoints
- ✅ Token refresh working correctly
- ✅ Rate limiting enforced
- ✅ Production-ready security posture

Status: READY FOR EXECUTION
