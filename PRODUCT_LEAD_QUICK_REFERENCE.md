# PRODUCT LEAD - QUICK REFERENCE (1-PAGE CHEAT SHEET)
## LBH System Sprint 1 Week 1

**Save this. Print this. Reference constantly.**

---

## THE 7 DELIVERABLES (All Due Wed June 11)

| # | Task | Definition | Owner | Document |
|---|------|-----------|-------|----------|
| 1 | Onboarding Flow | 7-day sequence: D0 signup → D1-3 emails → D7 offer | Product | Section 1 |
| 2 | Activation Metric | First backtest completed by Day 7 (35% target) | Growth | Section 2 |
| 3 | User Journey | Signup → activated user (visual + paths) | Product | Section 3 |
| 4 | Feature Priority | Sprint 1 Must-Have vs Week 2 vs Q3 roadmap | Product | Section 4 |
| 5 | Retention Strategy | Day 1 (welcome), Day 7 (offer), Day 30 (retention) | Growth | Section 5 |
| 6 | Metrics & Tracking | Weekly dashboard + alerts + go/no-go checklist | Growth | Section 6 |
| 7 | Week 1 Report | Executive summary for board approval | Product | Section 7 |

**Master Document:** `C:\Users\Admin\leveraged-buy-hold\PRODUCT_LEAD_SPRINT1_WEEK1.md`

---

## ONBOARDING FLOW (7 DAYS)

```
DAY 0: SIGNUP
├─ Welcome email (30 min video)
├─ Risk disclaimer popup (acceptance > 98%)
└─ Tutorial starts (5 steps, target 70% completion)

DAY 1: ACTIVATION
├─ Email: "Top 3 Assets This Week"
├─ In-app: Highlight screening feature
└─ Goal: 30% re-engage next day

DAY 3: FEATURE DRIP
├─ Email: "Your Backtest is Ready"
├─ Show: Equity curve (LBH vs SPY)
└─ Goal: 15% try simulator

DAY 7: MILESTONE + OFFER
├─ Email: "Week 1 Summary + 50% Off"
├─ NPS survey: "How likely to recommend?"
├─ Offer: $9.50 first month (normally $29)
└─ Goal: 15% free → pro conversion
```

**Success:** >70% tutorial complete, >85% D7 retention, 15% convert to paid

---

## ACTIVATION METRIC (THE NORTH STAR)

**"User Completes First Backtest"**

```
Why? • Most powerful feature (proof it works)
      • Engagement signal (intentional action)
      • Revenue driver (pro plan needed for unlimited)
      • Retention correlation (80% D30 for activators)

When? Day 7 target: 35% of signups

Track:  Event: "backtest_completed"
        • user_id, timestamp, type (free/pro)
        • Dashboard: Real-time funnel visualization
        • Alerts: If <20% by Day 7 → FIX IMMEDIATELY
```

**Secondary Metrics:** Free→Pro conversion (15% target), D7 retention (85%), D30 retention (75%)

---

## USER JOURNEY (3-MINUTE VISUAL)

```
                        SIGNUP (100%)
                            ↓
                    Risk Disclaimer (98%)
                            ↓
                   Tutorial Starts (70%)
                    ↙              ↘
              Screening (95%)   Backtest (35%) ← ACTIVATION
                    ↓                  ↓
              Alerts (60%)        NPS Survey
                    ↓                  ↓
        Day 7 Retention (85%)   Free→Pro Offer
                    ↓                  ↓
        ┌───────────┴────────────┐
        ↓                        ↓
    CONVERT (15%)          STAY FREE (85%)
    ($9.50/mo)         (Limited backtest)
        ↓                        ↓
    D30: 80% ✅           D30: 60%
```

**Two Persona Paths:**
- **Bruno** (individual): Signup → screening → backtest → pro upgrade
- **Ana** (advisor): Signup → skip tutorial → download data → invite clients → enterprise deal

---

## FEATURE PRIORITY (SPRINT 1 ROADMAP)

**WEEK 1–2 (MUST SHIP):** 146 hours total

| Feature | Effort | Week | Why |
|---------|--------|------|-----|
| Screening | 40h | W1 | Foundation |
| Tutorial | 16h | W1 | Day 0 critical |
| Backtest | 20h | W1 | Activation hook |
| Email Sequences | 12h | W1 | Growth driver |
| Disclaimer | 8h | W1 | Legal req |
| Analytics | 12h | W1 | Tracking |
| Responsive Design | 20h | W1 | Mobile UX |
| NPS Survey | 4h | W1 | Feedback |
| **TOTAL** | **146h** | | **2 devs, 2 weeks** |

**WEEK 2 (HIGH PRIORITY):** 76 hours

- SMS Alerts (8h) → upgrade feature
- Portfolio Comparison (12h) → gamification  
- Free Backtest Limits (4h) → drive conversion
- Advisor Dashboard (16h) → white-label
- Email sequences (8h) → retention drips
- Landing page (12h) → A/B test
- Export feature (8h) → advisor use case

**Q3 (NICE-TO-HAVE):** Leaderboard, mobile app, podcast, API

---

## RETENTION STRATEGY (THREE WINDOWS)

```
DAY 1 (Welcome)
───────────────────────────
Email:    "Your first insights ready in 60 sec"
In-app:   "Quick Wins: 3 Assets to Buy"
Goal:     Get them to return on Day 2 (70%)

DAY 7 (Milestone + Offer)
───────────────────────────
Email:    "Week 1 Summary: You're ahead of 80%"
Offer:    50% off Pro for month 1 ($9.50)
NPS:      Survey → if score 8+, grant free month
Goal:     15% free→pro conversion

DAY 30 (Performance + Referral)
───────────────────────────────
Email:    "Month 1 Summary: $X potential gain"
Feature:  Portfolio comparison (LBH vs SPY vs savings)
Referral: "Share link, get 3 free months"
Goal:     75% retention + 5% referral signups
```

**Churn Prevention:** If <7 day logins or <30% engagement → Re-engagement email + free week offer

---

## METRICS DASHBOARD (WHAT TO TRACK)

**Daily (Check Every Morning):**

| Metric | Target | Owner | Alert Level |
|--------|--------|-------|-------------|
| Signups | 100+/week | Growth | <50: 🔴 |
| Tutorial completion | 70%+ | Product | <50%: 🔴 |
| Backtest attempts | 40%+ | Product | <20%: 🔴 |
| D1 Retention | 70%+ | Growth | <50%: 🔴 |
| Email open rate | 35%+ | Growth | <20%: 🟡 |
| Free→Pro conversion | 15%+ | Growth | <10%: 🟡 |

**Weekly (Friday 4 PM Sync):**

- Cohort retention curves (by signup week)
- Feature adoption by funnel stage
- NPS score + feedback themes
- CAC by channel + LTV estimate
- Churn reasons (why users leave)
- Product blockers + recommendations

**Monthly (Month-End Report):**

- Full cohort analysis (retention by week)
- Revenue projections (MRR, ARPU)
- Go/No-Go decision for next phase
- Learnings + product roadmap adjustments

---

## GO/NO-GO DECISION (JUNE 19 PUBLIC LAUNCH)

**MUST PASS ALL TO LAUNCH:**

```
✅ Product Ready
  □ Tutorial functional (70%+ completion)
  □ Backtest works (no timeouts)
  □ Disclaimer accepted (98%+)
  □ Email sequences tested

✅ Growth Ready
  □ Landing page live
  □ Advisor outreach (50 names)
  □ Discord community (100 members)
  □ Content calendar (Week 1-2)

✅ Legal/Compliance
  □ Risk disclaimer approved
  □ CVM compliance verified
  □ Privacy policy linked

✅ Metrics
  □ Beta: 100+ users
  □ D7 Retention: >80%
  □ NPS: >40
  □ Zero critical bugs

IF ANY FAIL → DELAY 1 WEEK (launch Jun 26)
```

---

## DAILY STANDUP FORMAT (15 MIN)

**Post to Slack every morning + evening:**

```
🌅 STANDUP — [DATE]

✅ YESTERDAY:
  • [What shipped?]

🎯 TODAY:
  • [#1 Priority] → Owner: [Name]
  • [#2 Priority] → Owner: [Name]

🚧 PROGRESS:
  • [Feature]: X% → [Next step]

🔴 BLOCKERS:
  • [Issue]: Needs [action] from [person]

📊 METRICS:
  • Tutorial completion: X% (target 70%)
  • D1 retention: X% (target 70%)

Status: 🟢 ON TRACK / 🟡 AT RISK / 🔴 BLOCKED
```

---

## KEY DECISIONS & ASSUMPTIONS

```
✅ DECISIONS MADE:
   • Activation metric: "First backtest complete" (not tutorial)
   • Primary offer: $9.50 first month (50% off $29/mo)
   • Launch date: June 19, 2026
   • Target cohort: Brazil + USA individual investors
   • CAC target: <$50 (organic + referral heavy)

⚠️ ASSUMPTIONS TO VALIDATE:
   • 35% of users will complete backtest by Day 7
   • 15% of free users will convert to paid
   • Organic channel will provide 60%+ of signups
   • Advisors will drive 20% of revenue
   • Retention will match our projections (80% D30)

🔴 RISKS TO MONITOR:
   • Email deliverability (CVM might block links)
   • Backtest performance (<5 sec query time)
   • Regulatory uncertainty (leverage pricing)
   • Competition (Quantfury, IB entering this segment)
```

---

## WEEK 1 TIMELINE (YOUR WEEK)

```
THURSDAY, Jun 5 (D1)
└─ Finalize onboarding flow (7-day architecture)

FRIDAY, Jun 6 (D2)
└─ Define activation metric + user journey map

MON, Jun 9 (D5)
└─ Feature prioritization + retention strategy

TUE, Jun 10 (D6)
└─ Metrics & tracking plan + dashboard

WED, Jun 11 (D7)
└─ Week 1 report + board approval ✅
```

**Each day:** 9 AM standup, document, 5 PM async update

---

## QUICK LINKS

- **Main Document:** PRODUCT_LEAD_SPRINT1_WEEK1.md
- **Daily Standup Template:** PRODUCT_DAILY_STANDUP_TEMPLATE.md
- **Growth Strategy:** GROWTH_DELIVERABLES_SPRINT1.md
- **Growth Dashboard:** [URL]
- **Email Automation:** [Mailgun/SendGrid]
- **Analytics:** [Amplitude/Mixpanel]
- **Slack Channels:** #product | #product-standup | #launches

---

## SUCCESS DEFINITION (BY FRIDAY)

✅ All 7 deliverables documented + shared
✅ Team aligned on roadmap
✅ Growth ready to execute sequences
✅ Analytics tracking live
✅ Onboarding ready to test
✅ Board approval to launch June 19

**Celebrate** 🎉 when complete.

---

**Last Updated:** June 5, 2026  
**Owner:** Product Lead  
**Status:** Ready for Week 1 execution
