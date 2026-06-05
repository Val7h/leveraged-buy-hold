# RISK MITIGATION ROADMAP
## LBH System - 12-Month Implementation Plan

**Status:** SPRINT 1 LAUNCH  
**Date Created:** June 5, 2026  
**Timeline:** June 2026 - May 2027  

---

# PHASE 1: SPRINT 1 (WEEKS 1-2) - CRITICAL FOUNDATIONS

**Goal:** Secure platform for beta launch with real users

---

## TASK GROUP 1.1: SECURITY HARDENING
**Owner:** Backend Lead + Security Officer  
**Status:** IN PROGRESS  
**Risk Reduced:** R-003 (Data Breach) from 10 → 6

### Task 1.1.1: Secret Rotation
**Duration:** 4 hours  
**Deadline:** Day 1  
**Owner:** Backend Lead

**What to do:**
```
1. Identify all secrets in codebase:
   - .env files
   - Docker compose
   - Database passwords
   - API keys (Alpha Vantage, Twilio, etc.)
   - JWT SECRET_KEY
   - Session encryption keys

2. Generate new secrets:
   - SECRET_KEY: 32+ character random string
   - DB password: 16+ character, special chars
   - API keys: Rotate at each provider (request new)

3. Update all environments:
   - Local development (.env.local)
   - Staging (.env.staging)
   - Production (.env.prod)
   - Docker compose (docker-compose.prod.yml)

4. Verify no old secrets in:
   - Git history (git log)
   - Environment variables
   - Docker images
   - Logs
   - Backups

5. Document new secrets in:
   - AWS Secrets Manager
   - HashiCorp Vault (if available)
   - Password manager (Bitwarden, 1Password)
   
6. Backup encrypted secret file
   - Location: /secure/secrets.enc
   - Access: Risk Officer + 1 other authorized
```

**Success Criteria:**
- [ ] No hardcoded secrets in code
- [ ] All environments updated with new secrets
- [ ] Old secrets verified removed from git history
- [ ] New secrets stored securely
- [ ] Rotation documented in runbook

**Testing:**
- [ ] Local dev environment works with new secrets
- [ ] Staging environment works with new secrets
- [ ] Production environment works with new secrets
- [ ] API calls successful with new keys
- [ ] Database connection works with new password

---

### Task 1.1.2: 2FA Implementation
**Duration:** 8 hours  
**Deadline:** Day 2  
**Owner:** Backend Lead

**Requirements:**
```
Technology: TOTP (Time-based One-Time Password)
Provider: Google Authenticator / Authy compatible
Standard: RFC 6238

Implementation:
1. Install library: pip install pyotp qrcode
2. Create 2FA endpoint: POST /auth/2fa/enable
3. Create QR code generation
4. Create verification endpoint: POST /auth/2fa/verify
5. Store backup codes (10 codes, single-use)
6. Enforce 2FA on login (before session creation)
7. Add 2FA status to user model
8. Create recovery flow (backup codes)
```

**User Flow:**
```
User Login:
1. Enter email + password
2. System verifies credentials
3. If 2FA enabled: "Enter 6-digit code from Authenticator"
4. User enters code
5. System verifies (TOTP library check)
6. Session created if valid
7. User logged in

If user loses authenticator:
1. Use backup code (single-use)
2. System resets 2FA
3. User must re-enable
```

**Success Criteria:**
- [ ] 2FA endpoint live and tested
- [ ] QR code generates correctly
- [ ] TOTP verification working
- [ ] Backup codes generated and stored securely
- [ ] Recovery flow functional
- [ ] 100% of beta test users able to enable

**Testing:**
- [ ] Test with Google Authenticator
- [ ] Test with Authy
- [ ] Test with incorrect codes (should fail)
- [ ] Test backup code flow
- [ ] Test concurrent sessions (one account, multiple devices)

---

### Task 1.1.3: Login Rate Limiting
**Duration:** 4 hours  
**Deadline:** Day 3  
**Owner:** Backend Lead

**Implementation:**
```
Technology: Redis-based rate limiter

Rules:
- 5 failed login attempts → 10-minute lockout
- After 3 lockouts → 1-hour cooldown
- IP-based blocking for brute force patterns

Endpoint: POST /auth/login
Tracking:
  - Failed attempt count: {user}:{ip} key in Redis
  - Lockout timestamp: {user}:{ip}:lockout

Logic:
1. Check if IP/user locked (return 429 Too Many Requests)
2. Verify credentials
3. If invalid:
   a. Increment {user}:{ip} failed count
   b. If count = 5: Set lockout timestamp
   c. Return 401 with "Too many attempts" + ETA
4. If valid:
   a. Reset {user}:{ip} failed count
   b. Create session
   c. Return 200 with JWT

Alerts:
- If single user gets 10+ failed attempts → email user
- If single IP gets 50+ failed attempts → block IP
```

**Success Criteria:**
- [ ] Rate limiter deployed
- [ ] Failed attempts tracked
- [ ] Lockout enforced at 5 attempts
- [ ] Alerts firing correctly
- [ ] Legitimate users not affected (normal usage)

**Testing:**
- [ ] Attempt login 5 times with wrong password → locked
- [ ] Attempt after lockout → 429 error
- [ ] After 10 minutes → can retry
- [ ] Multiple users from same IP → independent tracking
- [ ] Correct password works → count reset

---

## TASK GROUP 1.2: ALERT SYSTEM OVERHAUL
**Owner:** Backend Lead + DevOps  
**Status:** IN PROGRESS  
**Risk Reduced:** R-001 (Margin Call) from 20 → 12, R-007 (Alert Failure) from 8 → 4

### Task 1.2.1: SMS Integration (Twilio)
**Duration:** 6 hours  
**Deadline:** Day 3  
**Owner:** Backend Lead

**Implementation:**
```
Provider: Twilio (Brazilian SMS)

Setup:
1. Create Twilio account
2. Purchase Brazilian phone number (+55)
3. Get Twilio API credentials
4. Store in AWS Secrets Manager

Code changes:
1. Install library: pip install twilio
2. Create SMS service: app/services/sms_service.py
3. Implement send_sms(phone, message) function
4. Add SMS log table: sms_logs (phone, message, sent_at, status)
5. Integrate into margin alert flow

Margin Alert Flow:
├─ Event: Margin ratio > 80%
├─ Action 1: Send email (async, Celery)
├─ Action 2: Send SMS (async, Celery)
│  └─ Retry logic: 3 attempts with exponential backoff
├─ Action 3: Send push notification
└─ Action 4: Display in-app banner

SMS Message Template:
"LBH Alert: Margin call warning. Your equity is low.
Review portfolio immediately. Account leverage at risk.
Reply STOP to unsubscribe."
```

**Cost Estimate:**
- Twilio: ~R$0.30 per SMS in Brazil
- Estimated usage: 100 alerts/day × 30 days = 3,000 SMS/month
- Monthly cost: ~R$900

**Success Criteria:**
- [ ] Twilio account active
- [ ] SMS sending within 30 seconds of trigger
- [ ] SMS logged in database
- [ ] Retry logic working
- [ ] Unsubscribe link working
- [ ] Cost within budget

**Testing:**
- [ ] Send test SMS (should arrive within 1 min)
- [ ] Trigger margin alert → SMS sent
- [ ] SMS retry if Twilio down
- [ ] Verify message content correct

---

### Task 1.2.2: Push Notification (FCM)
**Duration:** 8 hours  
**Deadline:** Day 4  
**Owner:** Backend Lead + Frontend Lead

**Implementation:**
```
Provider: Firebase Cloud Messaging (FCM)

Setup:
1. Create Firebase project
2. Generate FCM credentials
3. Store in AWS Secrets Manager
4. Frontend: Install FCM library (@react-native-firebase)

Backend:
1. Install library: pip install firebase-admin
2. Create notification service: app/services/fcm_service.py
3. Store FCM tokens in user_notifications table:
   - user_id, device_token, device_type (ios/android), created_at
4. Implement send_push(user_id, title, body, data)
5. Implement token refresh (expires monthly)

Frontend (Mobile/Web):
1. Request permission for notifications
2. Retrieve FCM token
3. Send token to backend: POST /notifications/register-token
4. Refresh token monthly
5. Handle incoming notifications:
   - Alert received → show notification
   - User taps → open app + show portfolio

Margin Alert Flow:
├─ Trigger: Margin ratio > 80%
├─ Push payload:
│  ├─ title: "Margin Call Warning"
│  ├─ body: "Your margin is low. Review portfolio."
│  └─ data: {action: "open_portfolio", urgency: "high"}
└─ Action: App receives → shows alert banner
```

**Cost Estimate:**
- FCM: Free (included in Firebase)

**Success Criteria:**
- [ ] Firebase project setup
- [ ] Token management working
- [ ] Push notifications delivering
- [ ] Token refresh working
- [ ] 100% of mobile users can receive
- [ ] Notification payload correct

**Testing:**
- [ ] Manual test: Send test notification
- [ ] Trigger margin alert → push sent within 30s
- [ ] User receives on iPhone + Android
- [ ] Tap notification → app opens to correct screen
- [ ] Multiple devices per user (all get notification)

---

### Task 1.2.3: In-App Banner (High Priority)
**Duration:** 4 hours  
**Deadline:** Day 5  
**Owner:** Frontend Lead

**Implementation:**
```
Frontend: Next.js React component

Component: AlertBanner.tsx
├─ Props: {message, severity, action}
├─ Display: Top of page (z-index: 1000)
├─ Colors:
│  ├─ ERROR: Red background
│  ├─ WARNING: Orange background
│  └─ INFO: Blue background
├─ Actions: [Dismiss] [View Details] [Act Now]
└─ Auto-hide: 10 seconds (or user action)

Severity Levels:
├─ ERROR: "Margin call in 5 minutes. Act now!"
├─ WARNING: "Margin at 80%. Review position."
└─ INFO: "Update: Your position changed."

Margin Call Banner:
├─ Icon: ⚠️ (warning symbol)
├─ Message: "MARGIN CALL: Your position will liquidate in 15 min.
             Close position now to avoid auto-liquidation."
├─ Actions: [Close Position Now] [Dismiss]
└─ Auto-refresh: Check margin every 10s

Persistence:
├─ If margin < critical: Don't hide
├─ If margin > threshold: Dismiss
├─ User dismisses: Show again after 5 min
```

**Integration Points:**
```
1. WebSocket connection for real-time updates
   └─ Listen for margin alerts
   └─ Trigger banner immediately
   
2. Polling fallback (if WebSocket down)
   └─ Check margin every 30 seconds
   └─ Show banner if critical
   
3. API endpoint: GET /portfolio/margin-status
   └─ Returns: current_ratio, threshold, urgency_level
```

**Success Criteria:**
- [ ] Banner renders correctly
- [ ] Alert appears within 1 second of event
- [ ] User can dismiss (closes banner)
- [ ] Auto-hides after time (if not critical)
- [ ] Mobile-friendly (responsive design)
- [ ] Accessible (ARIA labels)

**Testing:**
- [ ] Desktop view: Banner visible at top
- [ ] Mobile view: Responsive, not blocking content
- [ ] Click action: Leads to portfolio page
- [ ] Dismiss: Banner closes, no error
- [ ] Auto-hide: Banner closes after 10s (if not critical)

---

## TASK GROUP 1.3: LEGAL & REGULATORY REVIEW
**Owner:** General Counsel + External CVM Attorney  
**Status:** IN PROGRESS  
**Risk Reduced:** R-002 (CVM Action) from 15 → 9

### Task 1.3.1: Hire CVM Regulatory Attorney
**Duration:** 1 day (4 hours)  
**Deadline:** Day 1  
**Owner:** General Counsel + HR

**Process:**
```
1. Search for CVM regulatory specialists in Brazil
   - Law firms: Machado Meyer, Pinheiro Neto, Mattos Filho, Morais Leitão
   - Individual attorneys: Check CVM registry for licensed advisors
   - Criteria:
     * 5+ years fintech/leverage products experience
     * Previous CVM interactions
     * English-speaking preferred
     * Available for immediate 2-week engagement

2. Contact top 3 candidates
   - Phone call: Explain project scope, timeline, budget
   - Share ToS draft for review
   - Ask: Can you start by Day 2?
   
3. Select attorney
   - Negotiate fee: ~R$15k-30k for 2-week engagement
   - Sign engagement letter
   - Provide access to GitHub (code review), Slack (communications)

4. Onboarding
   - Share architecture overview
   - Share current ToS/Privacy Policy drafts
   - Schedule daily sync (30 min, 3 PM BRT)
   - Assign point of contact (General Counsel)
```

**Deliverables:**
- [ ] Attorney engaged by Day 2
- [ ] Attorney reviews ToS draft (Day 3)
- [ ] Attorney reviews Privacy Policy (Day 4)
- [ ] Attorney reviews Leverage Disclaimer (Day 5)
- [ ] Attorney produces risk assessment memo (Day 7)

**Budget:** R$20,000-30,000

---

### Task 1.3.2: ToS (Terms of Service) Draft
**Duration:** 12 hours  
**Deadline:** Day 3  
**Owner:** General Counsel

**Content Sections:**
```
1. Introduction (1 page)
   - What is LBH System?
   - Who can use? (Age requirement, countries)
   - What does this agreement cover?

2. Account Registration & Security (2 pages)
   - User must be 18+ and legally authorized
   - Responsible for keeping password secure
   - 2FA mandatory
   - We're not liable for unauthorized access (if password leaked)
   - Account suspension right (if we detect fraud)

3. Leverage & Margin Features (3 pages) ← CRITICAL
   - How leverage works (explanation)
   - Margin call definition + process
   - Liquidation process (auto-close position if margin < 50%)
   - Risks of leverage (explicit list):
     * You can lose more than initial investment
     * Position can be liquidated at unfavorable prices
     * Interest charges apply on borrowed capital
     * Alerts may fail (multiple redundancies but not 100% guaranteed)
   - Acknowledgment: "I understand and accept margin call risk"

4. User Obligations (2 pages)
   - Accurate information required
   - Monitor account regularly (user's responsibility)
   - Comply with laws (know your customer responsibility)
   - No manipulation, fraud, or market abuse

5. Disclaimers (1 page)
   - Backtest results are NOT guaranteed
   - "Past performance ≠ future results"
   - Market risk beyond our control
   - We're not liable for:
     * Market crashes
     * API provider downtime (but we mitigate)
     * User errors
     * Regulatory changes affecting products
   - We ARE liable for:
     * System errors in calculations
     * Failure to send margin warnings
     * Data breaches due to negligence

6. Limitation of Liability (1 page)
   - Cap: Our liability limited to insurance coverage (R$3M E&O)
   - Or: Last 12 months of fees paid by user (whichever is less)

7. Dispute Resolution (1 page)
   - Arbitration clause (resolves in Brazil, Portuguese)
   - Or: Court jurisdiction (TJSP - São Paulo courts)

8. Changes to Terms (1 paragraph)
   - We can change terms with 30 days notice
   - Material changes (leverage restrictions) = immediate notice

9. Termination (1 page)
   - Either party can terminate (30 days notice)
   - User can withdraw funds without penalty
   - We can close account if violations detected

10. Governing Law (1 paragraph)
    - These terms are governed by Brazilian law
    - CVM regulations apply
```

**Sample Margin Call Section (CRITICAL):**
```
"6. MARGIN CALLS & LIQUIDATION

When Margin Call Triggered:
Your account enters margin call when your equity falls below 50% of 
borrowed capital. When this happens:

Step 1: We send warning alerts via:
- Email (immediately)
- SMS (within 1 minute)
- Push notification (within 1 minute)
- In-app banner (immediately)

Step 2: You have 15 minutes to respond by:
- Closing positions manually
- Adding capital to increase margin
- Authorizing auto-close of positions

Step 3: After 15 minutes without response:
- We automatically liquidate positions to restore margin above 50%
- Liquidation happens at market price (may be unfavorable)
- Transaction costs apply
- You remain responsible for any remaining losses

Risks You Accept:
- Liquidation may happen during market volatility
- Execution price may be worse than you expect
- You lose the position even if you think it will recover
- This is automatic (not manual, not subject to approval)

Important: We do our best to notify you, but alerts can fail
(email spam, SMS delays, network issues). You are responsible for
monitoring your account independently."
```

**Success Criteria:**
- [ ] ToS covers all required sections
- [ ] Margin call explanation clear
- [ ] Disclaimers prominent
- [ ] Risks explicitly listed
- [ ] Limitation of liability stated
- [ ] Compliant with Brazilian law
- [ ] Attorney reviewed and approved

---

### Task 1.3.3: Privacy Policy (LGPD-Compliant)
**Duration:** 8 hours  
**Deadline:** Day 4  
**Owner:** General Counsel

**Content Sections:**
```
1. Introduction (1 page)
   - What personal data we collect
   - How we use it
   - Your rights under LGPD

2. Data Collected (1 page)
   - Account: Name, email, phone, address, ID number
   - Financial: Bank account, portfolio holdings, income
   - Technical: IP address, device info, cookies, logs
   - Behavioral: Trading activity, login history

3. Purpose of Collection (2 pages)
   - Provide trading platform service
   - Comply with AML/KYC (anti-money laundering)
   - Calculate margin & risk metrics
   - Fraud detection
   - Regulatory reporting (CVM, ANPD)
   - Marketing (if user opts in)

4. Data Sharing (1 page)
   - Service providers (AWS, Twilio, Datadog)
   - Payment processors (Stripe, etc.)
   - Regulatory bodies (CVM, ANPD, police)
   - NOT shared with third parties for profit

5. Data Security (1 page)
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS)
   - Access controls (2FA, password hashing)
   - Regular audits
   - Incident response plan

6. Data Retention (1 page)
   - Account data: Until account closed + 7 years (tax law)
   - Transaction data: 7 years (regulatory requirement)
   - Cookies: 2 years (or user deletion)
   - User can request deletion (LGPD right) → deleted within 30 days
   - Exception: Data needed for legal compliance (kept longer)

7. User Rights (LGPD) (1 page) ← CRITICAL
   - Right to access: "What data do you have about me?"
   - Right to correct: "Fix my name, address, etc."
   - Right to delete: "Erase my data" (30 day timeline)
   - Right to port: "Give me my data in machine-readable format"
   - Right to opt-out: "Stop using my data for X purpose"
   - Contact: privacy@lbh.app (response: 15 days)

8. Contact & Complaints (1 paragraph)
   - Data protection officer: [email]
   - ANPD complaint: www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
```

**LGPD Compliance Checklist:**
- [ ] Legal basis for collection stated
- [ ] Purpose specified (not vague)
- [ ] Data minimization applied (only necessary data)
- [ ] User rights clearly explained
- [ ] Data retention periods specified
- [ ] Third-party sharing disclosed
- [ ] Security measures described
- [ ] Breach notification process explained

---

### Task 1.3.4: Leverage Disclaimer Modal
**Duration:** 6 hours  
**Deadline:** Day 5  
**Owner:** Frontend Lead + General Counsel

**Design:**
```
Modal: Appears when user clicks "Enable Leverage" for first time

Title: ⚠️ LEVERAGE RISK DISCLOSURE

Content:
"By enabling leverage, you understand and accept:

RISK 1: Position Liquidation
- Your position can be automatically closed if margin falls below 50%
- This happens automatically, without your approval
- Liquidation happens at market price, which may be unfavorable
- You will lose the entire position, even if you think it will recover

RISK 2: Margin Call Failure
- We send alerts via email, SMS, push, and in-app
- But alerts are NOT guaranteed (email spam, SMS delays, etc.)
- You are responsible for monitoring your account independently
- If you miss alerts, you still face automatic liquidation

RISK 3: Loss Greater Than Investment
- You can lose more than you invested
- If position falls 50% and you have 2x leverage, you lose 100%
- With higher leverage (3x), losses can exceed your capital

RISK 4: Volatile Markets
- Leverage amplifies both gains and losses
- In volatile markets, liquidation can happen very quickly
- You may have only minutes to respond

RISK 5: Lack of Guarantees
- Backtest results are NOT guaranteed in live trading
- Platform is provided 'as-is' with no guarantees
- Past performance does not guarantee future results

I understand and accept these risks.
✓ I have read and understood the margin call explanation
✓ I understand my position can be liquidated automatically
✓ I understand I can lose more than my initial investment
✓ I am responsible for monitoring my account
✓ I accept that alerts may fail

[DECLINE]  [ACCEPT & ENABLE LEVERAGE]"

Store: In database, user record
├─ leverage_accepted: true
├─ accepted_date: 2026-06-10 14:32:00
├─ accepted_ip: 192.168.1.1
└─ version: "1.0"
```

**Success Criteria:**
- [ ] Modal displays before first leverage use
- [ ] All risks clearly explained
- [ ] Checkboxes require explicit acceptance
- [ ] User must click "ACCEPT" (not just close modal)
- [ ] Acceptance recorded in database
- [ ] Can't proceed without acceptance
- [ ] Version controlled (if terms change, user re-confirms)

---

## TASK GROUP 1.4: MARKET DATA REDUNDANCY
**Owner:** Backend Lead + DevOps  
**Status:** READY  
**Risk Reduced:** R-004 (API Downtime) from 12 → 6

### Task 1.4.1: Secondary Market Data Provider (Polygon.io)
**Duration:** 6 hours  
**Deadline:** Day 4  
**Owner:** Backend Lead

**Setup:**
```
Provider: Polygon.io (alternative to Alpha Vantage)

Cost: ~R$150/month (enterprise plan)

Implementation:
1. Create Polygon.io account
2. Get API key
3. Store in AWS Secrets Manager
4. Install Python library: pip install polygon-api-client

Code Changes:
1. Create app/services/polygon_data_service.py
2. Implement functions:
   - get_daily_close(ticker) → returns price
   - get_minute_bars(ticker) → returns intraday data
   - get_previous_close(ticker) → returns previous day close

3. Update market_data.py:
   - Primary: Alpha Vantage (try first)
   - Fallback: Polygon.io (if AV fails)
   - Cache: Redis (4-hour TTL)

Failover Logic:
├─ Call Alpha Vantage
├─ If timeout (>5s) or error:
│  └─ Call Polygon.io
├─ If both fail:
│  └─ Return cached price (up to 4 hours old)
└─ If no cache:
   └─ Return error (no current price available)

Monitoring:
├─ Track which provider used (metric)
├─ Alert if primary failing >2min
├─ Log all provider failures
└─ Dashboard: % time using each provider
```

**Success Criteria:**
- [ ] Polygon.io integration complete
- [ ] Fallover logic working
- [ ] Pricing data accurate (vs market)
- [ ] Failover activates within 2 minutes
- [ ] No user-facing errors during provider outage

---

### Task 1.4.2: Market Data Caching
**Duration:** 4 hours  
**Deadline:** Day 5  
**Owner:** Backend Lead

**Implementation:**
```
Technology: Redis

Cache Strategy:
├─ Key format: market_price:{ticker}
├─ TTL: 4 hours
├─ Value: {price, timestamp, provider}
├─ Invalidation: Manual (when new data received)

Usage:
1. Request price for TSLA
2. Check Redis cache (cache_get("market_price:TSLA"))
3. If cached AND (current_time - cache_time) < 4 hours:
   └─ Return cached price
4. Else:
   ├─ Call primary provider (Alpha Vantage)
   ├─ If error, call fallback (Polygon.io)
   ├─ Update cache
   └─ Return new price

Benefits:
├─ Reduce API calls (lower costs)
├─ Faster response (cache < network)
├─ Fallback if both providers down (stale but not error)
└─ Reduce dependency on single provider

Monitoring:
├─ Cache hit rate (goal: >80%)
├─ Cache miss rate (should be <20%)
├─ API call count (vs cache)
```

---

## TASK GROUP 1.5: BACKTEST DISCLAIMER & MONITORING
**Owner:** Quant Lead + Product Lead  
**Status:** READY  
**Risk Reduced:** R-005 (Backtest Drift) from 12 → 8

### Task 1.5.1: Backtest Disclaimer
**Duration:** 4 hours  
**Deadline:** Day 2  
**Owner:** Product Lead

**Implementation:**
```
Frontend: Show disclaimer on all backtest results

Component: BacktestDisclaimer.tsx
├─ Position: Directly above results
├─ Styling: Warning box (yellow/orange background)
├─ Icon: ⚠️ Info icon
└─ Text (mandatory):

"⚠️ BACKTEST DISCLAIMER

This backtest is based on historical data and does not guarantee 
future results. Key limitations:

1. PAST ≠ FUTURE
   Historical returns may not repeat. Market conditions, correlations,
   and volatility change over time.

2. ACCURACY RANGE
   Actual results may vary by ±5% from backtest projections due to:
   • Market execution (slippage)
   • Liquidity constraints
   • Model assumptions
   • Changed market regimes

3. NO INDIVIDUAL GUARANTEES
   Even if average return is 10%, individual years can vary widely
   (some years +30%, others -15%). See distribution below.

4. LEVERAGE AMPLIFIES VOLATILITY
   Leverage (1-3x) increases both gains AND losses. A drawdown
   that would normally be -20% becomes -40% to -60% with leverage.

5. STRESS TEST GAPS
   Backtests cannot perfectly simulate:
   • Market crashes (2008, 2020 COVID)
   • Black swan events (>5 sigma moves)
   • Liquidity events (sudden market closure)

RECOMMENDATION:
Use this as ONE input in your decision. Combine with:
• Your risk tolerance assessment
• Professional advice (if needed)
• Multiple scenarios / sensitivity analysis
• Real trading with small amounts initially

[I understand these risks - Continue with caution]"

Placement:
├─ Above all backtest results
├─ Always visible (not collapsible)
├─ Cannot proceed without reading
└─ Can dismiss after reading (tracked)
```

**Success Criteria:**
- [ ] Disclaimer visible on 100% of backtest results
- [ ] Text clear and understandable
- [ ] User must read before dismissing
- [ ] Compliance team approves content

---

### Task 1.5.2: Drift Monitoring
**Duration:** 6 hours  
**Deadline:** Day 8  
**Owner:** Quant Lead

**Implementation:**
```
Process: Track actual vs backtest returns

Setup:
1. Create portfolio_backtest_comparison table:
   - backtest_id
   - portfolio_id
   - backtest_return (e.g., 10%)
   - actual_return (e.g., 8.5%)
   - drift (e.g., -1.5%)
   - drift_percent (e.g., -15%)
   - created_at
   - period (1w, 1m, 3m, 6m, 1y)

2. Daily job (Celery): Calculate_drift_metrics.py
   └─ For each active portfolio:
      ├─ Get backtest prediction (from backtest_id)
      ├─ Calculate actual return (current NAV / start NAV - 1)
      ├─ Calculate drift
      ├─ Log to database
      └─ Alert if drift > threshold

3. Thresholds & Actions:
   ├─ Drift < 3%: GREEN (acceptable)
   ├─ Drift 3-5%: YELLOW (monitor)
   ├─ Drift 5-7%: ORANGE (investigate)
   └─ Drift > 7%: RED (alert Risk Officer)

4. Alerts:
   ├─ Daily: Digest of drift by portfolio
   ├─ Weekly: Cumulative drift report
   ├─ Monthly: Drift trends (avg, max, min)
   └─ P2 Alert if: Single portfolio drift > 10%

5. Dashboard:
   ├─ X-axis: Time since backtest creation
   ├─ Y-axis: Drift percentage
   ├─ Plot: Backtest projection vs actual return
   ├─ Color code: Green/Yellow/Orange/Red zones
   └─ Hover: Details (start NAV, current NAV, fees)
```

**Success Criteria:**
- [ ] Drift calculation accurate
- [ ] Daily drift job running
- [ ] Dashboard live and updated daily
- [ ] Alerts firing correctly
- [ ] Risk Officer receives weekly report

---

# PHASE 2: SPRINT 2 (WEEKS 3-4) - MONITORING & COMPLIANCE

**Goal:** Production readiness with full monitoring and incident response

---

## TASK GROUP 2.1: EXTERNAL SECURITY AUDIT
**Owner:** Security Officer (hiring external firm)  
**Status:** BOOKING  
**Risk Reduced:** R-003 (Data Breach) from 6 → 4

### Task 2.1.1: Procurement of Security Audit Firm
**Duration:** 2 days  
**Deadline:** Day 10  
**Owner:** Security Officer + CFO

**Process:**
```
1. Research firms (OWASP-qualified, Brazil-based):
   - Kroll (international, Brazil office)
   - K2 (Brazil, fintech specialist)
   - BDO IT Security (Brazil, Big4)
   - Ernst & Young (Big4, fintech experience)
   - Deloitte (Big4, fintech experience)

2. RFQ (Request for Quote):
   ├─ Scope: Full penetration test
   ├─ Duration: 5 days (onsite + remote)
   ├─ Coverage: API, web app, infrastructure, code review
   ├─ Deliverable: Written report + findings + remediation plan
   ├─ Timeline: Start Day 12, delivery Day 20
   └─ Budget: R$40k-80k

3. Selection criteria:
   - OWASP Top 10 coverage
   - Python + FastAPI experience
   - React/Next.js experience
   - AWS infrastructure experience
   - Brazilian legal knowledge
   - References from other fintech companies

4. Contract:
   - NDA (non-disclosure agreement)
   - Confidentiality clause
   - Liability cap
   - Timeline commitment
   - Report ownership (ours)
   - Embargo period (before public disclosure: 30 days)

5. Kick-off (Day 12):
   - Tour of infrastructure
   - Code repository access
   - Testing environment
   - Business process overview
   - Contact person identified
   - Daily syncs scheduled
```

**Success Criteria:**
- [ ] Firm selected and contracted
- [ ] NDA signed
- [ ] Testing starts by Day 12
- [ ] Report delivered by Day 20

---

### Task 2.1.2: Findings Remediation
**Duration:** 5-7 days  
**Deadline:** Day 27  
**Owner:** Backend Lead + Security Officer

**Process:**
```
Report Categories:
├─ CRITICAL (exploit in hours)
├─ HIGH (exploit in days)
├─ MEDIUM (exploit in weeks)
└─ LOW (exploit in months)

Timeline:
├─ CRITICAL: Fix within 48 hours
├─ HIGH: Fix within 1 week
├─ MEDIUM: Fix within 2 weeks
└─ LOW: Fix by end of month

Typical findings (OWASP Top 10):
1. SQL Injection → Input validation, parameterized queries
2. Broken Auth → Session management, 2FA, rate limiting
3. Sensitive Data Exposure → Encryption, HTTPS
4. XML External Entities → Input validation, disable XXE
5. Access Control → Role-based access, field-level permissions
6. Security Misconfiguration → Security headers, disable debug mode
7. XSS → Input validation, output encoding
8. CSRF → CSRF tokens, SameSite cookies
9. Using Components with Known Vulns → Dependency updates
10. Insufficient Logging → Audit logs, security events

For each finding:
1. Understand the vulnerability
2. Assess business impact
3. Develop fix
4. Code review
5. Test (unit + integration)
6. Deploy to production
7. Verify fix is effective
8. Close finding
```

**Success Criteria:**
- [ ] All CRITICAL findings fixed
- [ ] All HIGH findings fixed
- [ ] MEDIUM findings have remediation plan
- [ ] Audit firm confirms fix effectiveness
- [ ] Report published (with permission)

---

## TASK GROUP 2.2: INSURANCE PROCUREMENT
**Owner:** CFO + Risk Officer  
**Status:** BOOKING  
**Risk Reduced:** All financial risks (insurance-backed)

### Task 2.2.1: Bind E&O Insurance
**Duration:** 2 weeks  
**Deadline:** Day 12  
**Owner:** CFO + Insurance Broker

**Process:**
```
Step 1: Broker Selection (Day 1-2)
├─ Interview 3 insurance brokers specializing in fintech
├─ Evaluate:
│  ├─ Market reach (access to multiple insurers)
│  ├─ Fintech experience
│  ├─ Local knowledge (Brazil)
│  ├─ Claims management
│  └─ Cost
├─ Select broker
└─ Sign brokerage agreement

Step 2: Risk Assessment Questionnaire (Day 3-5)
├─ Insurer requires detailed info:
│  ├─ Business description
│  ├─ Annual revenue (projected)
│  ├─ User base (number)
│  ├─ AUM (assets under management)
│  ├─ Prior claims history (none)
│  ├─ Insurance in place (current)
│  ├─ Risk controls (what we have)
│  └─ Board composition
├─ Attach:
│  ├─ Financial projections
│  ├─ Business plan summary
│  ├─ Risk management document (this one)
│  ├─ ToS and Privacy Policy
│  └─ Governance structure
└─ CFO or CEO signs questionnaire

Step 3: Underwriting (Day 6-10)
├─ Insurer reviews questionnaire
├─ May request additional info:
│  ├─ Call with CEO/CFO
│  ├─ Code review (brief)
│  ├─ Infrastructure overview
│  └─ Team credentials
├─ Underwriter makes decision:
│  ├─ Quote (offer coverage at stated price)
│  ├─ Decline (too risky)
│  └─ Counter-quote (different terms)
└─ Negotiate terms (if needed)

Step 4: Binding (Day 10-12)
├─ Accept quote in writing
├─ Pay premium (or set up payment plan)
├─ Sign policy documents
├─ Receive binder (temporary coverage certificate)
├─ Policy effective date: [date]
└─ Full policy documents delivered

Target Coverage:
├─ Coverage Limit: R$3,000,000
├─ Deductible: R$100,000
├─ Annual Premium: R$110,000 (estimate)
└─ Claims-Made Basis (report claims within 30 days)

Policy Covers:
├─ Errors in calculations
├─ System failures causing user losses
├─ Professional liability claims
├─ Defense costs
└─ Regulatory fines (partial)
```

**Success Criteria:**
- [ ] E&O policy binding by Day 12
- [ ] Coverage R$3M+
- [ ] Deductible <R$100k
- [ ] Annual cost <R$150k
- [ ] Policy document in secure repository

---

### Task 2.2.2: Bind D&O Insurance
**Duration:** 1 week  
**Deadline:** Day 14  
**Owner:** CFO

**Target Coverage:**
```
Coverage: R$2,000,000
Deductible: R$50,000
Annual Premium: R$60,000 (estimate)
Duration: 12 months

Covers:
├─ CEO liability for business decisions
├─ Board liability
├─ Shareholder lawsuits
├─ Defense costs
├─ Employment practices claims (EPL)
└─ Regulatory defense
```

---

### Task 2.2.3: Bind Cyber Liability Insurance
**Duration:** 1 week  
**Deadline:** Day 16  
**Owner:** CFO

**Target Coverage:**
```
Coverage: R$1,000,000
Deductible: R$40,000
Annual Premium: R$48,000 (estimate)
Duration: 12 months

Covers:
├─ Data breach response costs
├─ Forensics investigation
├─ User notification
├─ Credit monitoring (if breached)
├─ Business interruption (loss of income)
├─ LGPD regulatory fines
├─ Network security liability
└─ Extortion/ransomware payments
```

---

## TASK GROUP 2.3: MONITORING INFRASTRUCTURE
**Owner:** DevOps + Risk Officer  
**Status:** READY  
**Risk Reduced:** All risks (improve detection speed)

### Task 2.3.1: Datadog Setup
**Duration:** 8 hours  
**Deadline:** Day 10  
**Owner:** DevOps

**Implementation:**
```
Provider: Datadog (APM + Infrastructure Monitoring)

Cost: ~R$3,000/month (Enterprise)

Setup:
1. Create Datadog account
2. Install agent on all servers:
   - Backend (FastAPI)
   - Database (PostgreSQL)
   - Cache (Redis)
   - Frontend (Next.js)
   - Load balancer (Nginx)

3. Instrument application:
   - APM tracing (request latency)
   - Error tracking
   - Log collection
   - Custom metrics

4. Configure dashboards:
   - System health (CPU, memory, disk)
   - Application metrics (request rate, error rate)
   - Database metrics (query latency, connections)
   - Business metrics (margin calls, user activity)

5. Create alerts:
   - Uptime <99% → P1 alert
   - Error rate >1% → P2 alert
   - Response time >5s → P2 alert
   - Database down → P1 alert
```

**Success Criteria:**
- [ ] Agent installed on all systems
- [ ] Metrics flowing into Datadog
- [ ] Dashboards built and readable
- [ ] Alerts configured
- [ ] Team trained on dashboard

---

### Task 2.3.2: PagerDuty Integration
**Duration:** 4 hours  
**Deadline:** Day 11  
**Owner:** DevOps

**Implementation:**
```
Purpose: Incident alerting and on-call management

Setup:
1. Create PagerDuty account
2. Configure escalation policies:
   - On-call engineer (primary)
   - Technical lead (escalation 1, after 15 min)
   - CTO (escalation 2, after 30 min)

3. Integrate with Datadog:
   - Critical alerts → PagerDuty page
   - High alerts → PagerDuty notify (no page)

4. On-call schedule:
   - Engineer 1: Mon-Wed
   - Engineer 2: Wed-Fri
   - CTO: Weekends + holidays
   - Rotation weekly

5. Test:
   - Trigger test alert
   - Verify page sent
   - Verify SMS/phone call works
   - Team acknowledges and responds
```

**Success Criteria:**
- [ ] PagerDuty account active
- [ ] Escalation policies configured
- [ ] On-call schedule populated
- [ ] Datadog → PagerDuty integration working
- [ ] Test alert triggers correctly

---

# PHASE 3: POST-SPRINT 2 (WEEKS 5-8) - SCALE & HARDENING

**Goal:** Production scaling with refined controls and regulatory relationships

---

## TASK GROUP 3.1: REGULATORY RELATIONSHIP BUILDING
**Owner:** CEO + General Counsel  
**Status:** PLAN  
**Risk Reduced:** R-002 (CVM Action) from 9 → 6

### Task 3.1.1: Proactive CVM Outreach
**Duration:** 2 weeks  
**Deadline:** Week 5  
**Owner:** General Counsel + CEO

**Process:**
```
Goal: Establish relationship with CVM, get early feedback

Activities:
1. Schedule meeting with CVM
   ├─ Contact: Superintendência de Proteção
   ├─ Request: 30-min call to discuss leverage platform
   ├─ Attendees: CEO + General Counsel + CVM official(s)
   ├─ Agenda:
   │  ├─ What is LBH System?
   │  ├─ How leverage works (demo)
   │  ├─ Risk controls in place
   │  ├─ Insurance coverage
   │  ├─ Ask for feedback / guidance
   │  └─ Offer transparency (audit access, etc.)
   └─ Outcome: Written feedback or approval

2. Share documentation:
   ├─ Risk management framework (this doc)
   ├─ ToS + Privacy + Disclaimer
   ├─ Security audit results
   ├─ Insurance policies
   └─ Ask: "Are we compliant?"

3. Join ANBIMA:
   ├─ Membership in industry association
   ├─ Access to regulatory updates
   ├─ Networking with other fintechs
   ├─ Participate in working groups on leverage standards
   └─ Cost: ~R$20k/year

4. Ongoing:
   ├─ Quarterly updates to CVM (no issues, but transparency)
   ├─ Immediate notification if issues arise
   ├─ Annual compliance certification
   └─ Relationship building (CEO meets with CVM 2x/year)
```

**Success Criteria:**
- [ ] CVM meeting held
- [ ] Written feedback received (if any concerns)
- [ ] ANBIMA membership active
- [ ] Ongoing relationship established

---

# PHASE 4: ONGOING (MONTHS 6-12) - CONTINUOUS IMPROVEMENT

---

## CONTINUOUS MONITORING & UPDATES

### Monthly (Risk Committee)
```
[ ] Review all KPIs
[ ] Incidents analysis (post-mortems)
[ ] Risk register update
[ ] Compliance audit
[ ] Insurance claims (if any)
[ ] Board report
```

### Quarterly (Board)
```
[ ] Risk strategy review
[ ] Stress test (one scenario)
[ ] Regulatory changes assessment
[ ] Insurance renewal status
[ ] Budget vs plan review
```

### Annually (Full Audit)
```
[ ] Risk management framework review
[ ] External audit (penetration test)
[ ] Insurance renewal
[ ] Compliance certification
[ ] Risk strategy 2027
```

---

# SUMMARY: SPRINT 1 CRITICAL PATH

```
WEEK 1:
Day 1:   Secrets rotated ✓
Day 2:   2FA enabled ✓
Day 3:   Rate limiting live ✓
Day 3:   SMS alerts integrated ✓
Day 4:   Push notifications working ✓
Day 4:   Secondary market data provider live ✓
Day 4:   Polygon.io integration complete ✓
Day 4:   CVM attorney onboarded ✓
Day 5:   In-app banner complete ✓
Day 5:   ToS draft ready ✓
Day 5:   Leverage disclaimer modal live ✓
Day 5:   Market data caching active ✓

WEEK 2:
Day 8:   Backtest disclaimer on all results ✓
Day 8:   Drift monitoring live ✓
Day 10:  Security audit firm hired ✓
Day 10:  Datadog monitoring live ✓
Day 11:  PagerDuty integration done ✓
Day 12:  E&O insurance binding ✓
Day 14:  D&O insurance binding ✓
Day 16:  Cyber insurance binding ✓
Day 20:  Security audit report delivered ✓
Day 27:  All CRITICAL audit findings fixed ✓

LAUNCH READINESS:
✓ All security fixes deployed
✓ All alerts multi-channel working
✓ All legal docs CVM-compliant
✓ All insurance policies active
✓ All monitoring live and tested
✓ All incident playbooks documented
✓ All team trained on procedures
```

---

**END OF MITIGATION ROADMAP**

Questions? Contact Risk Officer or consult RISK_MANAGEMENT_SPRINT1.md for full context.
