# METRICS TRACKING SPECIFICATION
## LBH System Analytics & Event Instrumentation

**Date:** June 10, 2026  
**Owner:** Growth Lead + Backend Lead  
**Status:** 🟡 IN PROGRESS  
**Timeline:** Core events live by June 15, all dashboards by June 17

---

## EXECUTIVE SUMMARY

This spec defines:
1. **10+ Analytics Events** - signup, tutorial, backtest, conversion, retention
2. **5 Real-Time Dashboards** - funnel, retention, conversion, adoption, email
3. **Backend Instrumentation** - where to fire events in code
4. **Alert Thresholds** - what triggers escalation (red/yellow/green)
5. **Data Quality** - validation, deduplication, privacy compliance

**Success Criteria:**
- ✅ Core 5 events firing correctly by June 12
- ✅ All 10 events live by June 15
- ✅ Dashboards showing real data by June 17
- ✅ <1% false positive rate on events
- ✅ All metrics aligned with business goals

---

## SECTION 1: EVENT TAXONOMY

### 1.1 Core Events (5 Critical)

**Event 1: signup_completed**
```json
{
  "event": "signup_completed",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:30:00Z",
  "properties": {
    "email_domain": "gmail.com",
    "utm_source": "organic",
    "utm_medium": "google",
    "utm_campaign": "search_leverage",
    "country": "BR",
    "device_type": "desktop",
    "browser": "Chrome",
    "referrer": "google.com"
  },
  "context": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess_xyz"
  }
}
```

**Fired when:** User successfully completes signup form and account created  
**Who fires:** Backend (user creation endpoint)  
**Validation:** Must have user_id and email_domain  
**Frequency:** Once per user  
**Volume estimate:** ~50/day first week  

---

**Event 2: tutorial_started**
```json
{
  "event": "tutorial_started",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:31:00Z",
  "properties": {
    "step": 1,
    "source_trigger": "post_login",
    "via_disclaimer": true,
    "has_previous_tutorial": false,
    "device_type": "mobile"
  }
}
```

**Fired when:** User enters tutorial flow (after risk disclaimer acceptance)  
**Who fires:** Frontend (useEffect on TutorialPage mount)  
**Validation:** Must have user_id and step  
**Frequency:** Once per user per onboarding attempt  
**Volume estimate:** ~35/day (70% of signups)  

---

**Event 3: tutorial_step_completed**
```json
{
  "event": "tutorial_step_completed",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:35:00Z",
  "properties": {
    "step_number": 1,
    "step_name": "screening",
    "time_to_complete": 47,
    "skipped_flag": false,
    "assets_added": 2,
    "video_watched": false,
    "completion_percentage": 20
  }
}
```

**Fired when:** User completes or skips a tutorial step  
**Who fires:** Frontend (handleNextStep function)  
**Validation:** step_number 1-5, time_to_complete > 0  
**Frequency:** 1-5 times per user (one per step)  
**Volume estimate:** ~150/day (30-35 users × ~4-5 steps)  

---

**Event 4: first_backtest_completed** ⭐ PRIMARY ACTIVATION METRIC
```json
{
  "event": "first_backtest_completed",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:38:00Z",
  "properties": {
    "num_assets": 2,
    "asset_ids": ["VTSAX", "AAPL"],
    "strategy_type": "balanced",
    "leverage_selected": 3.0,
    "backtest_period_years": 20,
    "backtest_time_duration": 3.2,
    "cagr": 0.124,
    "max_drawdown": -0.38,
    "sharpe_ratio": 0.95,
    "source_channel": "tutorial",
    "day_in_lifecycle": 0,
    "has_tutorial_completed": true
  }
}
```

**Fired when:** User successfully runs first backtest and views results  
**Who fires:** Backend (backtest completion endpoint)  
**Validation:** Must have user_id, num_assets > 0, cagr, max_drawdown  
**Frequency:** Once per user (activation event)  
**Volume estimate:** ~12/day first week (35% of signups by D7 = ~12 users)  

**Why this metric?**
- Strongest correlation with retention (80%+ D30 retention if completed)
- Requires intentional action (not just clicking around)
- Shows product feature adoption
- Monetization signal (Pro plan features backtest)

---

**Event 5: free_to_pro_conversion**
```json
{
  "event": "free_to_pro_conversion",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:50:00Z",
  "properties": {
    "offer_shown": true,
    "offer_name": "$9.50 first month (50% off)",
    "price_tier": "pro_monthly",
    "price_usd": 9.50,
    "days_since_signup": 7,
    "conversion_time_minutes": 20,
    "source_page": "day7_email",
    "email_type": "week1_summary",
    "first_backtest_completed": true,
    "tutorial_completed": true,
    "nps_score": 8
  }
}
```

**Fired when:** User successfully initiates free-to-paid conversion (payment processed)  
**Who fires:** Backend (Stripe webhook on payment success)  
**Validation:** Must have user_id, price_usd, price_tier  
**Frequency:** Multiple times (upgrades, renewals)  
**Volume estimate:** ~1-2/day first week (15% conversion target)  

---

### 1.2 Extended Events (5 Additional)

**Event 6: email_opened**
```json
{
  "event": "email_opened",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:45:00Z",
  "properties": {
    "email_type": "welcome",
    "email_name": "Day 0 - Welcome",
    "day_in_sequence": 0,
    "sequence_type": "onboarding",
    "email_id": "email_abc123",
    "time_since_sent_minutes": 15
  }
}
```

**Fired when:** Email pixel loaded (email opened by user)  
**Who fires:** Email service (Postmark/SendGrid)  
**Tracked via:** Email tracking pixel in footer  
**Volume estimate:** ~20-30/day (40% open rate × 50-75 emails sent)  

---

**Event 7: email_clicked**
```json
{
  "event": "email_clicked",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:48:00Z",
  "properties": {
    "email_type": "welcome",
    "email_name": "Day 0 - Welcome",
    "day_in_sequence": 0,
    "cta_name": "VERIFY EMAIL",
    "cta_url": "https://lbhsystem.com/verify?token=xxx",
    "link_position": "primary"
  }
}
```

**Fired when:** User clicks link in email  
**Who fires:** Email service (click tracking link)  
**Volume estimate:** ~8-15/day (25-50% CTR × 30-50 opens)  

---

**Event 8: nps_response**
```json
{
  "event": "nps_response",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:52:00Z",
  "properties": {
    "score": 8,
    "category": "promoter",
    "feedback_text": "Great tool, very intuitive",
    "days_since_signup": 7,
    "first_backtest_completed": true,
    "source_trigger": "day7_email"
  }
}
```

**Fired when:** User responds to NPS survey  
**Who fires:** Frontend (NPS modal submission)  
**Tracking:** Calculate NPS = %Promoters - %Detractors  
**Volume estimate:** ~4-8/day (15% response rate)  

---

**Event 9: feature_adoption**
```json
{
  "event": "feature_adoption",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:35:00Z",
  "properties": {
    "feature_name": "screening",
    "adoption_type": "first_use",
    "day_in_lifecycle": 0,
    "source_trigger": "tutorial_step_1",
    "is_tutorial_context": true
  }
}
```

**Fired when:** User uses a feature for first time  
**Who fires:** Frontend (when feature accessed)  
**Features tracked:** screening, backtest, alerts, simulator, portfolio_comparison, export  
**Volume estimate:** ~30-50/day  

---

**Event 10: error_occurred**
```json
{
  "event": "error_occurred",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T14:40:00Z",
  "properties": {
    "error_type": "api_timeout",
    "error_message": "Backtest API timeout after 5s",
    "error_code": "BACKTEST_TIMEOUT",
    "feature_name": "backtest",
    "severity": "high",
    "user_action_before_error": "clicked next button"
  }
}
```

**Fired when:** Error occurs in app (tracked by error monitoring)  
**Who fires:** Error boundary / Sentry  
**Severity levels:** low, medium, high, critical  
**Volume estimate:** <5/day (goal is 0)  

---

**Event 11: user_engagement_daily**
```json
{
  "event": "user_engagement_daily",
  "user_id": "usr_123abc",
  "timestamp": "2026-06-09T23:59:59Z",
  "properties": {
    "date": "2026-06-09",
    "day_in_lifecycle": 0,
    "session_count": 2,
    "total_session_duration": 450,
    "features_used": ["screening", "backtest"],
    "event_count": 23,
    "was_active": true
  }
}
```

**Fired when:** Daily aggregation at midnight UTC  
**Who fires:** Backend (daily batch job)  
**Purpose:** Track D1, D7, D30 retention metrics  
**Volume estimate:** ~50/day (one per active user)  

---

### 1.3 Event Validation Rules

```javascript
// All events must pass these validation checks:

VALIDATION_RULES = {
  "user_id": {
    required: true,
    type: "string",
    pattern: /^usr_[a-z0-9]+$/,
    error: "Invalid user ID format"
  },
  
  "timestamp": {
    required: true,
    type: "ISO8601",
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    error: "Timestamp must be ISO 8601 UTC"
  },
  
  "event": {
    required: true,
    type: "string",
    enum: [
      "signup_completed",
      "tutorial_started",
      "tutorial_step_completed",
      "first_backtest_completed",
      "free_to_pro_conversion",
      "email_opened",
      "email_clicked",
      "nps_response",
      "feature_adoption",
      "error_occurred",
      "user_engagement_daily"
    ],
    error: "Event name not in approved list"
  },
  
  "properties": {
    required: true,
    type: "object",
    maxSize: 10000,  // bytes
    error: "Properties object too large"
  }
};

// Validation functions:
function validateEvent(event) {
  const errors = [];
  
  // Check all required fields present
  for (const [field, rule] of Object.entries(VALIDATION_RULES)) {
    if (rule.required && !event[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check field types and patterns
  if (event.user_id && !VALIDATION_RULES.user_id.pattern.test(event.user_id)) {
    errors.push(VALIDATION_RULES.user_id.error);
  }
  
  if (event.timestamp && !VALIDATION_RULES.timestamp.pattern.test(event.timestamp)) {
    errors.push(VALIDATION_RULES.timestamp.error);
  }
  
  if (event.event && !VALIDATION_RULES.event.enum.includes(event.event)) {
    errors.push(VALIDATION_RULES.event.error);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

---

## SECTION 2: DASHBOARD SPECIFICATIONS

### 2.1 Dashboard 1: Real-Time Funnel

**Purpose:** Track users through activation funnel (Day 0-7)  
**Update Frequency:** Real-time (Mixpanel live)  
**Owner:** Growth Lead  
**Tool:** Mixpanel > Funnels

**Funnel Steps:**

```
┌─────────────────────────────────────────┐
│  ACTIVATION FUNNEL (Real-Time)          │
│  Updated: Every 5 seconds               │
├─────────────────────────────────────────┤
│                                         │
│  SIGNUP                                 │
│  ├─ 100 users (100%)                    │
│  │                                      │
│  ├→ EMAIL VERIFIED                      │
│  │  ├─ 84 users (84%)  ✅               │
│  │  │ [Gap: 16 didn't verify]           │
│  │  │                                   │
│  │  ├→ TUTORIAL STARTED                 │
│  │  │  ├─ 59 users (70% of 84)  ✅     │
│  │  │  │ [Gap: 25 bounced before]       │
│  │  │  │                                │
│  │  │  ├→ TUTORIAL COMPLETED            │
│  │  │  │  ├─ 35 users (59% of 59) ✅   │
│  │  │  │  │ [Gap: 24 dropped mid-way]  │
│  │  │  │  │                             │
│  │  │  │  ├→ FIRST BACKTEST COMPLETED   │
│  │  │  │  │  ├─ 12 users (34% of 35)🎯│
│  │  │  │  │  │ [ACTIVATION METRIC]     │
│  │  │  │  │  │                         │
│  │  │  │  │  ├→ FREE → PRO CONVERSION  │
│  │  │  │  │  │  └─ 2 users (17%) ✅   │
│  │  │  │  │  │                         │
│  │  │  │  │  └→ RETAINED (D7)          │
│  │  │  │  │     └─ 30 users (86%) ✅  │
│  │  │  │  │                            │
│  └─ [Rest: 41 users churn]             │
│                                         │
├─────────────────────────────────────────┤
│ FUNNEL ANALYSIS                         │
├─────────────────────────────────────────┤
│ Step              → Drop  %  Completed  │
│ Signup            100    —   100%      │
│ Email Verify      16     16%  84%      │
│ Tutorial Start    25     30%  70%      │
│ Tutorial Complete 24     41%  59%      │
│ First Backtest    23     66%  34% ← 🎯│
│ Free→Pro Conv     10     83%  17%      │
│                                         │
│ BIGGEST DROP: Step 3 (Tutorial)        │
│ → FIX: Simplify step 2 UX?             │
│                                         │
└─────────────────────────────────────────┘
```

**Metric Definitions:**

| Step | Metric | Definition | Target | Alert |
|------|--------|-----------|--------|-------|
| Signup | signup_completed | New users registered | 50+/day | <10/day |
| Email Verify | email verified | Clicked verify link | 75%+ | <50% |
| Tutorial Start | tutorial_started | Entered tutorial | 80%+ | <50% |
| Tutorial Complete | tutorial_completed | All 5 steps done | 70%+ | <40% |
| First Backtest | first_backtest_completed | Ran backtest | 35%+ | <20% |
| Free→Pro | free_to_pro_conversion | Paid for Pro | 15%+ | <10% |
| D7 Retention | user_engagement_daily | Active on D7 | 85%+ | <70% |

**Dropdown Analysis:**
- If Tutorial Start drops <50%: Tutorial discovery broken (check UX placement)
- If Tutorial Complete drops <40%: Steps too hard (check step 2-3)
- If First Backtest drops <20%: Feature not discoverable (check CTA placement)
- If Free→Pro drops <10%: Offer/pricing wrong (check conversion copy)

**Action Items:**
```
🔴 RED (Immediate action):
   - Funnel drop >30% from previous day
   - Conversion rate <target by >25%

🟡 YELLOW (Monitor):
   - Funnel drop 10-30% from previous day
   - Conversion rate slightly below target

🟢 GREEN (Healthy):
   - Funnel drop <10% day-over-day
   - Conversion rates meeting targets
```

---

### 2.2 Dashboard 2: Cohort Retention

**Purpose:** Track user retention by signup cohort (D0, D1, D3, D7, D14, D30)  
**Update Frequency:** Daily at 12 AM UTC  
**Owner:** Growth Lead  
**Tool:** Mixpanel > Retention

**Retention Table:**

```
┌──────────────────────────────────────────────────────┐
│  COHORT RETENTION ANALYSIS                           │
│  Week-over-week retention by signup cohort           │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Cohort      D0    D1    D3    D7    D14   D30   │
│ ────────────────────────────────────────────────    │
│ Week 1      100   56%   48%   49%   40%   —      │
│ (Jun 5-12)  (45)  (25)  (22)  (22)  (18)         │
│                                                      │
│ Week 2      100   62%   55%   50%   —      —     │
│ (Jun 12-19) (50)  (31)  (27)  (25)                │
│                                                      │
│ Week 3      100   58%   53%   —      —      —     │
│ (Jun 19-26) (40)  (23)  (21)                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ TARGET RETENTION                                     │
│ D1: 70%+ (goal: users come back next day)           │
│ D7: 85%+ (goal: strong initial engagement)          │
│ D30: 75%+ (goal: sustainable retention)             │
│                                                      │
│ ANALYSIS                                            │
│ ─────────────────────────────────────────────       │
│ Week 1 D7 retention: 49% 🔴 (target 85%)            │
│ → Issue: Major churn Days 2-4                       │
│ → Action: Check Day 1 email timing/content          │
│                                                      │
│ Week 2 D7 retention: 50% 🟡 (slight improvement)    │
│ → Still below target; needs investigation            │
│                                                      │
│ Week 1 D1 retention: 56% 🟡 (target 70%)            │
│ → Not returning on Day 2                             │
│ → Action: Day 1 onboarding experience issue?        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Retention Formula:**
```
D1 Retention = (Users active on D1) / (Signups on D0) × 100%
D7 Retention = (Users active on D7) / (Signups on D0) × 100%
D30 Retention = (Users active on D30) / (Signups on D0) × 100%

"Active" = Logged in OR clicked email link OR used feature
```

**Cohort Drill-Down:**
- Click on a cohort row to see:
  - Which users churned (email them)
  - Which features kept users engaged
  - Why they left (exit survey analysis)

---

### 2.3 Dashboard 3: Conversion Funnel (Free → Pro)

**Purpose:** Measure monetization conversion rate  
**Update Frequency:** Real-time  
**Owner:** Growth Lead  
**Tool:** Mixpanel or Stripe data

**Conversion Funnel:**

```
┌────────────────────────────────────────┐
│  FREE → PRO CONVERSION FUNNEL          │
│  All time + weekly breakdown           │
├────────────────────────────────────────┤
│                                        │
│ WEEK 1 (Jun 5-12)                     │
│ ────────────────────────────────────   │
│ Free users (D0+)                       │
│ └─ 45 users (100%)                    │
│                                        │
│ Saw Pro offer (email/app)              │
│ └─ 28 users (62%)                     │
│                                        │
│ Clicked "Upgrade" button               │
│ └─ 12 users (27%)                     │
│                                        │
│ Entered payment details                │
│ └─ 4 users (9%)                       │
│                                        │
│ Completed payment ✓                    │
│ └─ 0 users (0%) 🔴                     │
│                                        │
│ WEEK 2 (Jun 12-19)                    │
│ ────────────────────────────────────   │
│ Free users (D0+)                       │
│ └─ 50 users (100%)                    │
│                                        │
│ Saw Pro offer                          │
│ └─ 35 users (70%)                     │
│                                        │
│ Clicked "Upgrade"                      │
│ └─ 15 users (30%)                     │
│                                        │
│ Entered payment details                │
│ └─ 4 users (8%)                       │
│                                        │
│ Completed payment ✓                    │
│ └─ 2 users (4%)  ✅                    │
│                                        │
├────────────────────────────────────────┤
│ CONVERSION RATES                       │
│                                        │
│ Offer → Click: 50% (target: 70%)      │
│ Click → Payment: 29% (target: 50%)    │
│ Signup → Paid: 4% (target: 15%) 🔴   │
│                                        │
│ W1 vs W2 improvement: 0% → 4% ✅       │
│                                        │
├────────────────────────────────────────┤
│ DROPOFF ANALYSIS                       │
│                                        │
│ 🔴 Biggest drop: "Click" → "Payment"   │
│    Only 29% of clickers enter payment  │
│    → Action: Check payment form UX     │
│                                        │
│ 🟡 Secondary drop: "Offer seen" → Click│
│    Only 50% see offer or click it      │
│    → Action: Increase offer prominence │
│                                        │
└────────────────────────────────────────┘
```

**Conversion Metrics:**

| Stage | Metric | Week 1 | Week 2 | Target | Gap |
|-------|--------|--------|--------|--------|-----|
| Offer Impression | % who see offer | 62% | 70% | 80% | -10% |
| CTA Click | % who click upgrade | 27% | 30% | 50% | -20% |
| Payment Form | % who enter payment | 9% | 8% | 25% | -17% |
| Payment Success | % who complete | 0% | 4% | 15% | -11% |
| Overall Conversion | % signup → paid | 0% | 4% | 15% | -11% |

**Insight Drill-Downs:**
- Who drops at "click"? → Missing value prop (improve copy)
- Who drops at "payment form"? → UX issue (check form complexity)
- Who completes? → What's different? (A/B test the winner)

---

### 2.4 Dashboard 4: Feature Adoption

**Purpose:** Track adoption of each major feature  
**Update Frequency:** Daily  
**Owner:** Product Lead  
**Tool:** Mixpanel or custom dashboard

**Feature Adoption Matrix:**

```
┌──────────────────────────────────────────────┐
│  FEATURE ADOPTION BY DAY IN LIFECYCLE        │
│  % of cohort using each feature              │
├──────────────────────────────────────────────┤
│                                              │
│ Feature      D0   D1   D3   D7   D14  D30    │
│ ────────────────────────────────────────    │
│ Screening    95%  60%  58%  64%  45%  20%   │
│ Backtest     0%   5%   22%  34%  28%  15%   │
│ Alerts       0%   8%   18%  40%  35%  18%   │
│ Simulator    0%   0%   2%   18%  22%  15%   │
│ Portfolio    0%   0%   0%   8%   12%  10%   │
│                                              │
├──────────────────────────────────────────────┤
│ INSIGHTS                                     │
│                                              │
│ ✅ Screening: High D0 (onboarding working)  │
│    Drop D1-D7: Expected (casual use)         │
│    Stabilizes at 64% by D7 (good)            │
│                                              │
│ 🟡 Backtest: Slow ramp (5% D1 → 34% D7)     │
│    Not discovered until tutorial step 2      │
│    → FIX: Promote earlier (homepage CTA?)    │
│                                              │
│ 🟡 Alerts: Growing (8% D1 → 40% D7)         │
│    Good trajectory but 40% still < target    │
│    → FIX: Easier alert creation flow?        │
│                                              │
│ 🔴 Simulator: Very low (18% D7)              │
│    Only 18% of users try this feature        │
│    → FIX: More discovery/education needed    │
│                                              │
│ 🟢 Portfolio: New feature, 12% D14 is OK    │
│    May grow as more users explore            │
│                                              │
└──────────────────────────────────────────────┘
```

**Feature Usage Segments:**

| Segment | Users | Screening | Backtest | Alerts | NPS |
|---------|-------|-----------|----------|--------|-----|
| Power Users | 8% | 100% | 90% | 80% | 9+ |
| Regular Users | 28% | 70% | 45% | 40% | 7-8 |
| Casual Users | 40% | 60% | 15% | 10% | 5-6 |
| Inactive | 24% | 10% | 0% | 0% | <5 |

**Action Items:**
- If Power Users <5%: Product not engaging enough
- If Regular Users <30%: Too hard to use
- If Inactive >20%: Onboarding broken
- If Feature adoption uneven: Marketing/education needed

---

### 2.5 Dashboard 5: Email Metrics

**Purpose:** Track email campaign performance  
**Update Frequency:** Real-time  
**Owner:** Growth Lead  
**Tool:** Postmark or SendGrid > Email reports

**Email Performance Table:**

```
┌──────────────────────────────────────────────────┐
│  EMAIL CAMPAIGN METRICS                          │
│  Performance across all onboarding sequences     │
├──────────────────────────────────────────────────┤
│                                                  │
│ Email               Sent  Open  Click  Unsub    │
│ ─────────────────────────────────────────────    │
│                                                  │
│ D0: Welcome         100   40    10    2         │
│     Open Rate:             40% (✅ target 35%+) │
│     Click Rate:            10% (🟡 target 25%) │
│     Unsubscribe:                2% (✅ ok)      │
│                                                  │
│ D1: Top 3 Assets    75    28    8     1         │
│     Open Rate:             37% (✅ target 35%+) │
│     Click Rate:            27% (✅ target 25%) │
│     Unsubscribe:                1% (✅ ok)      │
│                                                  │
│ D3: Backtest Ready  50    21    5     0         │
│     Open Rate:             42% (✅ target 40%+) │
│     Click Rate:            24% (✅ target 30%) │
│     Unsubscribe:                0% (✅ ok)      │
│                                                  │
│ D7: Week 1 Summary  45    20    7     0         │
│     Open Rate:             45% (✅ target 45%+) │
│     Click Rate:            35% (✅ target 35%) │
│     Unsubscribe:                0% (✅ ok)      │
│                                                  │
│ D14: Retention      25    8     2     1         │
│      Open Rate:             32% (🟡 target 35%) │
│      Click Rate:            25% (✅ target 25%) │
│      Unsubscribe:                4% (🔴 high) │
│                                                  │
├──────────────────────────────────────────────────┤
│ TREND ANALYSIS                                   │
│                                                  │
│ ✅ Early emails (D0-D3) performing well         │
│    Open rates 37-42% (above 35% target)        │
│    → Good engagement in first week              │
│                                                  │
│ 🔴 D14 email struggling                         │
│    Open rate 32% < target 35%                  │
│    Unsubscribe rate 4% high (target <1%)        │
│    → Issue: Email fatigue or spam?              │
│    → Action: Review D14 email copy              │
│                                                  │
│ 🟡 Click rates variable                         │
│    Range: 10-35% (high variance)                │
│    → Some emails more compelling than others    │
│    → Action: A/B test subject lines + CTA       │
│                                                  │
├──────────────────────────────────────────────────┤
│ SEGMENT PERFORMANCE                             │
│                                                  │
│ Segment                Open  Click  NPS         │
│ ────────────────────────────────────────        │
│ Gmail users            45%   30%    8.2         │
│ Outlook users          38%   25%    7.9         │
│ Corporate email        42%   28%    8.0         │
│ Free domain (yahoo)    30%   20%    6.5         │
│                                                  │
│ → Gmail users most engaged                      │
│ → Free domain users less engaged                │
│ → May need separate segment strategy            │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Email Delivery Checklist:**
```
[ ] All emails delivered (no bounces)
[ ] Unsubscribe rate <1% (goal)
[ ] Spam complaints <0.5%
[ ] Open rates within expected range
[ ] Click rates healthy (>20%)
[ ] Link clicks tracking correctly
[ ] Pixel tracking working
```

---

## SECTION 3: BACKEND INSTRUMENTATION

### 3.1 Where to Fire Events (Code Locations)

**File Structure (Next.js Backend):**

```
/backend
  /api
    /auth
      /signup.ts          ← Fire: signup_completed
      /verify-email.ts    ← Fire: email_verified (implicit)
      /login.ts           ← Fire: user_login
    /tutorial
      /start.ts           ← Fire: tutorial_started
      /step-complete.ts   ← Fire: tutorial_step_completed
    /backtest
      /run.ts             ← Fire: first_backtest_completed
    /alerts
      /create.ts          ← Fire: alert_created
    /billing
      /convert.ts         ← Fire: free_to_pro_conversion
```

### 3.2 Code Example: Signup Event

```typescript
// pages/api/auth/signup.ts

import { trackEvent } from '@/lib/analytics';

export async function POST(req: Request) {
  const { email, name } = req.body;
  
  try {
    // Create user in database
    const user = await createUser({
      email: email,
      name: name,
      created_at: new Date()
    });
    
    // 🔥 FIRE EVENT: signup_completed
    await trackEvent({
      event: 'signup_completed',
      user_id: user.id,
      timestamp: new Date().toISOString(),
      properties: {
        email_domain: email.split('@')[1],
        utm_source: req.query.utm_source || 'organic',
        utm_medium: req.query.utm_medium || 'direct',
        utm_campaign: req.query.utm_campaign || 'none',
        country: getCountryFromIP(req.headers['x-forwarded-for']),
        device_type: getDeviceType(req.headers['user-agent']),
        browser: parseBrowser(req.headers['user-agent'])
      }
    });
    
    // Send verification email
    await sendVerificationEmail(email, user.id);
    
    return {
      success: true,
      user_id: user.id,
      message: 'Signup successful. Please verify your email.'
    };
  } catch (error) {
    // Log error
    await trackEvent({
      event: 'error_occurred',
      user_id: 'anonymous',
      timestamp: new Date().toISOString(),
      properties: {
        error_type: 'signup_failed',
        error_message: error.message,
        feature_name: 'signup'
      }
    });
    
    throw error;
  }
}
```

### 3.3 Code Example: Backtest Event

```typescript
// pages/api/backtest/run.ts

import { trackEvent } from '@/lib/analytics';

export async function POST(req: Request, user: User) {
  const { assets, risk_profile, leverage } = req.body;
  const startTime = Date.now();
  
  try {
    // Run backtest (expensive operation)
    const backtest = await runBacktest({
      assets: assets,
      risk_profile: risk_profile,
      leverage: leverage,
      start_date: '2004-01-01',
      end_date: '2024-01-01'
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Check if this is first backtest
    const isFirstBacktest = await isUserFirstBacktest(user.id);
    
    if (isFirstBacktest) {
      // 🔥 FIRE EVENT: first_backtest_completed ⭐
      await trackEvent({
        event: 'first_backtest_completed',
        user_id: user.id,
        timestamp: new Date().toISOString(),
        properties: {
          num_assets: assets.length,
          asset_ids: assets,
          strategy_type: risk_profile,
          leverage_selected: leverage,
          backtest_period_years: 20,
          backtest_time_duration: duration,
          cagr: backtest.cagr,
          max_drawdown: backtest.max_drawdown,
          sharpe_ratio: backtest.sharpe_ratio,
          source_channel: 'tutorial',  // or 'manual'
          day_in_lifecycle: getDayInLifecycle(user.created_at),
          has_tutorial_completed: user.tutorial_completed
        }
      });
      
      // Mark user as activated
      await markUserAsActivated(user.id);
    }
    
    return {
      success: true,
      backtest: backtest
    };
  } catch (error) {
    // Log error
    await trackEvent({
      event: 'error_occurred',
      user_id: user.id,
      timestamp: new Date().toISOString(),
      properties: {
        error_type: 'backtest_failed',
        error_message: error.message,
        feature_name: 'backtest'
      }
    });
    
    throw error;
  }
}
```

### 3.4 Email Tracking (Frontend)

```javascript
// components/EmailTrackingPixel.tsx

export function EmailTrackingPixel({
  emailType,
  emailId,
  userId
}) {
  useEffect(() => {
    // Create invisible 1x1 pixel that loads from tracking service
    // This triggers "email_opened" event when pixel loads
    
    const img = new Image();
    img.src = `https://tracking.lbhsystem.com/pixel?` +
              `email_id=${emailId}&` +
              `user_id=${userId}&` +
              `email_type=${emailType}&` +
              `timestamp=${Date.now()}`;
    
    // Pixel loads invisibly, server logs "email_opened" event
  }, []);
  
  // Render nothing (transparent pixel)
  return null;
}
```

### 3.5 Error Tracking (Auto)

```javascript
// lib/errorTracking.ts

import * as Sentry from "@sentry/nextjs";

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Replay({ maskAllText: false })
  ],
  beforeSend(event) {
    // Add custom context before sending
    event.extra = {
      ...event.extra,
      feature: getCurrentFeature(),
      user_action: getLastUserAction()
    };
    return event;
  }
});

// This automatically fires "error_occurred" events for:
// - Unhandled exceptions
// - API errors
// - JavaScript errors
// - Performance issues
```

---

## SECTION 4: ALERT THRESHOLDS & ESCALATION

### 4.1 Alert Configuration

```yaml
ALERTS:
  # CRITICAL (red) - escalate immediately
  CRITICAL:
    - name: "Signup stopped"
      metric: "signup_completed event count"
      threshold: "0 events in past 24 hours"
      action: "Page alert: Check servers, check analytics SDK"
    
    - name: "Tutorial completion dropped"
      metric: "tutorial_completed / tutorial_started"
      threshold: "<20% (drop >50% from baseline)"
      action: "Check tutorial UX; is tutorial broken?"
    
    - name: "First backtest completion dropped"
      metric: "first_backtest_completed count"
      threshold: "<10% of signups"
      action: "Check backtest API; is it slow or broken?"
    
    - name: "API error rate spiking"
      metric: "error_occurred events"
      threshold: ">5% of all requests"
      action: "Check error logs; page on-call engineer"
  
  # YELLOW (caution) - investigate within 4 hours
  WARNING:
    - name: "Tutorial completion below target"
      metric: "tutorial_completed %"
      threshold: "40-70% (target 70%)"
      action: "Review tutorial UX; analyze drop-off"
    
    - name: "Email open rate declining"
      metric: "email_opened count"
      threshold: "<25% (target 35%+)"
      action: "Check email deliverability; test spam score"
    
    - name: "D7 retention below target"
      metric: "users active on D7"
      threshold: "<70% (target 85%)"
      action: "Analyze Day 1-3 churn; check onboarding"
    
    - name: "Conversion rate low"
      metric: "free_to_pro_conversion %"
      threshold: "<10% (target 15%)"
      action: "Review offer; check conversion funnel"
  
  # GREEN (normal) - no action, just monitor
  HEALTHY:
    - name: "All metrics on track"
      metric: "all core metrics"
      threshold: "Within target ranges"
      action: "Continue monitoring"
```

### 4.2 Alert Escalation Flow

```
Alert triggered → Mixpanel dashboard shows red
        ↓
Automated Slack notification to #growth channel
        ↓
Growth Lead investigates (within 30 min)
        ↓
Root cause identified? 
    ├─ YES → Take action (fix, rollback, increase servers)
    │        Post update in Slack
    └─ NO  → Escalate to Product Lead + Engineering Lead
                  └─ Escalation call within 1 hour if critical
                  └─ Decision: Rollback? Hotfix? Notify users?
```

### 4.3 Slack Alert Messages

```
🔴 CRITICAL ALERT
├─ Signup count: 0 events in last 24 hours
├─ Baseline: 50 signups/day expected
├─ Status: 🔴 CRITICAL
└─ Action: Check server status + analytics SDK
   Link: https://mixpanel.com/lbh-dashboard
   Escalate to: @ProductLead @EngineeringLead

---

🟡 WARNING ALERT
├─ Tutorial completion: 35% (target: 70%)
├─ Baseline: 60% last week
├─ Status: 🟡 INVESTIGATE
└─ Action: Review tutorial UX
   Link: https://mixpanel.com/lbh-dashboard
   Owner: @GrowthLead
```

---

## SECTION 5: DATA QUALITY & PRIVACY

### 5.1 Event Deduplication

```javascript
// Prevent duplicate events (e.g., from network retries)

function isDuplicateEvent(event) {
  // Check cache for event with same:
  // - user_id + event type + timestamp (within 5 sec window)
  
  const cacheKey = `${event.user_id}_${event.event}_${Math.floor(event.timestamp / 5000)}`;
  const exists = cache.get(cacheKey);
  
  if (exists) {
    return true; // Duplicate, skip
  }
  
  // Cache this event for 5 seconds
  cache.set(cacheKey, true, 5000);
  return false;
}
```

### 5.2 PII Handling

```javascript
// Never track personally identifiable information

// ❌ NEVER TRACK:
{
  "email": "john@gmail.com",  // NO!
  "phone": "+55 11 99999-9999",  // NO!
  "full_name": "João Silva",  // NO!
  "credit_card": "4111111111111111"  // NO!
}

// ✅ ONLY TRACK:
{
  "user_id": "usr_abc123",  // Hashed ID
  "email_domain": "gmail.com",  // Domain only
  "country": "BR",  // Country code only
}

// Implement on data collection:
function sanitizeEventProperties(properties) {
  const sanitized = { ...properties };
  
  // Remove any known PII fields
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.name;
  delete sanitized.credit_card;
  delete sanitized.ssn;
  
  return sanitized;
}
```

### 5.3 LGPD Compliance (Brazil)

```javascript
// LGPD requires explicit consent for data collection

async function collectEvent(event, user) {
  // Check user has given consent
  if (!user.has_given_analytics_consent) {
    // Don't track (comply with LGPD Article 7)
    return null;
  }
  
  // If user requests deletion, delete their events
  if (user.data_deletion_requested) {
    await deleteUserEvents(user.id);
    return null;
  }
  
  // Track event
  return await trackEvent(event);
}

// Include in app:
<ConsentBanner
  text="We use analytics to improve your experience"
  acceptText="Accept analytics"
  declineText="Decline"
  onAccept={() => setConsent(true)}
/>
```

---

## SECTION 6: TESTING & VALIDATION

### 6.1 QA Checklist for Events

```
[ ] Event 1: signup_completed
    [ ] Fires when user completes signup form
    [ ] Includes user_id, email_domain, utm parameters
    [ ] Doesn't fire on duplicate submission
    [ ] Timestamp is UTC ISO 8601
    [ ] No PII (email, phone, name)

[ ] Event 2: tutorial_started
    [ ] Fires when user enters tutorial
    [ ] Includes current_step, source_trigger
    [ ] Only fires once per user (per session)
    [ ] Fires AFTER disclaimer accepted

[ ] Event 3: tutorial_step_completed
    [ ] Fires when user completes each step (1-5)
    [ ] Includes step number, time to complete
    [ ] Fires whether user completes or skips
    [ ] Accurate time measurement

[ ] Event 4: first_backtest_completed ⭐
    [ ] Fires after backtest API returns results
    [ ] Includes CAGR, max drawdown, sharpe
    [ ] Only fires once per user (first backtest)
    [ ] Includes assets and strategy info
    [ ] Correlates with retention metrics

[ ] Event 5: free_to_pro_conversion
    [ ] Fires when payment succeeds (Stripe webhook)
    [ ] Includes price, tier, offer name
    [ ] Only fires when payment = success
    [ ] Includes time from signup to conversion

[ ] Events 6-11: Extended events
    [ ] All fire at correct triggers
    [ ] All have required properties
    [ ] No data validation errors
    [ ] No timeout errors
```

### 6.2 Dashboard Validation

```
[ ] Funnel dashboard
    [ ] Real-time updates (< 5 min latency)
    [ ] Numbers match database counts
    [ ] Percentages calculate correctly
    [ ] Drill-downs work (click funnel step)

[ ] Retention dashboard
    [ ] D0, D1, D3, D7 dates correct
    [ ] Cohort math correct (D7 ÷ D0)
    [ ] Can compare week-over-week
    [ ] Can drill into cohorts

[ ] Conversion dashboard
    [ ] Shows offer → click → payment flow
    [ ] Drop-offs calculated correctly
    [ ] Can filter by offer type
    [ ] Can segment by channel

[ ] Feature adoption dashboard
    [ ] Tracks all features (screening, backtest, alerts, etc.)
    [ ] Updates daily
    [ ] Shows trends over time
    [ ] Can drill into individual features

[ ] Email metrics dashboard
    [ ] Open/click rates accurate
    [ ] Matches email service provider data
    [ ] Segments working (by domain, etc.)
    [ ] Can filter by email type
```

---

## SECTION 7: DEPLOYMENT & LAUNCH

### 7.1 Event Tracking Launch Checklist

**Week 2 Schedule:**

```
Mon (Jun 10):
  [ ] Define all events (this doc)
  [ ] Code review event properties
  [ ] Backend implements signup_completed event
  [ ] Frontend QA tests event firing

Tue (Jun 11):
  [ ] All critical 5 events implemented
  [ ] Mixpanel dashboards created
  [ ] Test data flowing through pipeline
  [ ] Validate event properties

Wed (Jun 12):
  [ ] All 11 events implemented
  [ ] Dashboards live and showing data
  [ ] Alert thresholds configured
  [ ] Slack notification testing

Thu (Jun 13):
  [ ] Production data validation
  [ ] First real events firing (closed beta)
  [ ] Dashboard accuracy verified
  [ ] Team trained on reading dashboards

Fri (Jun 15):
  [ ] All systems go for public launch
  [ ] Real-time monitoring set up
  [ ] On-call rotation defined
  [ ] Final pre-launch review

Launch (Jun 19):
  [ ] Events flowing from live product
  [ ] Dashboards updating real-time
  [ ] Alerts testing and working
  [ ] Team monitoring cohort funnels
```

### 7.2 Launch Monitoring Plan

```
HOUR 1 (Noon Jun 19):
- Monitor signup flow (are new users coming?)
- Check tutorial_started events (is onboarding working?)
- Watch for errors (any critical bugs?)
- Slack: Post "Product live" notification

HOUR 2-4 (1 PM - 4 PM):
- Monitor funnel: Signup → Tutorial → Backtest
- Check email deliverability (are D0 emails sending?)
- Watch for spikes in error_occurred events
- Slack: Hourly status updates

HOUR 4-8 (Evening):
- Monitor retention (are users coming back?)
- Check email open rates (D0 email performance)
- Verify payment processing (if any convert)
- Slack: EOD summary report

DAY 2-7:
- Daily standup at 10 AM
- Review dashboards for trends
- Identify any issues
- Plan any adjustments
```

---

## APPENDIX: EVENT PAYLOADS (Reference)

All event payloads:

```javascript
// Full payload structure for all events

SIGNUP_COMPLETED = {
  event: "signup_completed",
  user_id: "usr_xxx",
  timestamp: "2026-06-09T14:30:00Z",
  properties: {
    email_domain: "gmail.com",
    utm_source: "google",
    utm_medium: "search",
    utm_campaign: "leverage",
    country: "BR",
    device_type: "mobile",
    browser: "Chrome"
  }
};

TUTORIAL_STARTED = {
  event: "tutorial_started",
  user_id: "usr_xxx",
  timestamp: "2026-06-09T14:31:00Z",
  properties: {
    step: 1,
    source_trigger: "post_login",
    via_disclaimer: true,
    device_type: "mobile"
  }
};

TUTORIAL_STEP_COMPLETED = {
  event: "tutorial_step_completed",
  user_id: "usr_xxx",
  timestamp: "2026-06-09T14:35:00Z",
  properties: {
    step_number: 1,
    step_name: "screening",
    time_to_complete: 47,
    skipped_flag: false,
    assets_added: 2,
    video_watched: false
  }
};

FIRST_BACKTEST_COMPLETED = {
  event: "first_backtest_completed",
  user_id: "usr_xxx",
  timestamp: "2026-06-09T14:38:00Z",
  properties: {
    num_assets: 2,
    asset_ids: ["VTSAX", "AAPL"],
    strategy_type: "balanced",
    leverage_selected: 3.0,
    backtest_period_years: 20,
    backtest_time_duration: 3.2,
    cagr: 0.124,
    max_drawdown: -0.38,
    sharpe_ratio: 0.95,
    source_channel: "tutorial",
    day_in_lifecycle: 0,
    has_tutorial_completed: true
  }
};

FREE_TO_PRO_CONVERSION = {
  event: "free_to_pro_conversion",
  user_id: "usr_xxx",
  timestamp: "2026-06-09T14:50:00Z",
  properties: {
    offer_shown: true,
    offer_name: "$9.50 first month (50% off)",
    price_tier: "pro_monthly",
    price_usd: 9.50,
    days_since_signup: 7,
    conversion_time_minutes: 20,
    source_page: "day7_email",
    nps_score: 8
  }
};
```

---

## SIGN-OFF

**Prepared by:** Growth Lead  
**Date:** June 10, 2026  
**Status:** Ready for Implementation

**Backend Lead Sign-Off:**
```
I have reviewed this specification and confirm:

☐ All events can be implemented in time
☐ No technical blockers identified
☐ Estimated effort: _____ hours
☐ Expected completion: _____ (date)

Signature: ________________  Date: __________
```

**Growth Lead Sign-Off:**
```
I have reviewed this specification and confirm:

☐ Dashboards will measure what matters
☐ Alerts are appropriate and actionable
☐ Data quality requirements understood
☐ Ready for launch

Signature: ________________  Date: __________
```

---

**End of Metrics Tracking Specification**
