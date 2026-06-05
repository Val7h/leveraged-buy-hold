# FINANCE TEAM TASK — SPRINT 1
## Pricing Decision + Unit Economics Validation

**Owner:** Finance Lead / CFO  
**Duration:** 7-14 days (Sprint 1)  
**Success Criteria:** Pricing model locked, unit economics validated, Series A ready

---

## YOUR PRIMARY MISSION (1 Task)

### TASK: Decide & Implement Freemium Pricing Model

**What to deliver:**
1. Pricing tiers finalized (Free / Pro $19 / Enterprise $299)
2. Unit economics model validated against team inputs
3. 18-month financial forecast (revenue + burn)
4. Runway analysis (with & without funding)
5. Key metrics dashboard setup
6. Pricing page draft for website
7. Stripe/payment setup plan (for week 2)

**When:**
- **Day 7 (Jun 12):** Recommendation + decision meeting
- **Day 14 (Jun 19):** Full implementation plan ready for execution

---

## DETAILED TASK BREAKDOWN

### Day 1-2: Context & Validation

**Read these first:**

- [ ] `FINANCIAL_PLAN_SPRINT1.md` (detailed analysis)
- [ ] `BRIEFING_EXECUTIVO_SPRINT1.md` (sprint overview)
- [ ] Compare Option A (Freemium) vs Option B (Premium) in financial plan

**Initial Calls:**

- [ ] **Call Growth Lead:** Confirm CAC/LTV assumptions
  - "What's your expected CAC if we do ads? ($100-150?)"
  - "What free → pro conversion rate would you target? (10%?)"
  - "What acquisition channels are you thinking?"

- [ ] **Call Product/PM:** Confirm feature tier segmentation
  - "Does the feature split (free vs pro) make sense?"
  - "Can you launch backtest 1x/mo for free users?"
  - "Can Enterprise API be built by week 4?"

- [ ] **Call Backend Lead:** Confirm infrastructure assumptions
  - "Monthly costs realistic? ($350-500/mo scaling?)"
  - "Can we cache backtest results to reduce load?"
  - "COGS of 20% realistic for our infrastructure?"

---

### Day 3-4: Pricing Decision Framework

**Task:** Compare 3 pricing options (detailed math)

#### Option A: Freemium (Recommended)

**Tiers:**
```
Free:       $0   (5 assets/mo, 1 backtest, 1 portfolio)
Pro:        $19  (unlimited, 10 backtests, 5 portfolios, alerts, email support)
Enterprise: $299 (API, white-label, dedicated, custom integrations)
```

**Economics (per option 1 in FINANCIAL_PLAN_SPRINT1.md):**
- Year 1 MRR: $57k (month 10 plateau)
- CAC: $37.50 (blended organic + ads)
- LTV: $365 (conservative 24-month)
- LTV:CAC: 10:1 ✅
- Break-even: Month 12

**Sensitivity: If conversion drops to 5%:**
- Year 1 MRR: $28.5k (half)
- Break-even: Month 18+ (delayed)
- Mitigation: Reduce pro price to $15/mo or increase free → pro conversion

---

#### Option B: Premium (Alternative)

**Tiers:**
```
Standard:     $49/mo  (full features, limited support)
Professional: $199/mo (API, dedicated support)
```

**Economics:**
- Year 1 MRR: $13.3k (month 10)
- CAC: $100-150 (paid ads required)
- LTV: $500 (higher ARPU)
- LTV:CAC: 3-4:1 ✅
- Break-even: Month 18+

**Trade-off:** Simpler ops, higher ARPU, but lower virality = slower growth

---

#### Option C: Hybrid (Possible alternative)

**Tiers:**
```
Free:      $0   (5 assets/mo screening only)
Pro:       $15  (backtesting + alerts, 8 backtests/mo)
Premium:   $49  (unlimited, API access, priority support)
Enterprise: $299 (white-label, dedicated)
```

**Rationale:** If $19 feels too high, test $15. If $15 works, upsell to $49 premium.

**Economics:** Similar to Freemium but with $15 base (20% lower revenue, 30% higher conversion maybe)

---

**YOUR DECISION (Day 4 EOD):**

- [ ] **Recommend Option A, B, or C** (with financial justification)
- [ ] **Rationale memo** (1 page max):
  - Why this option?
  - What data supports it?
  - What's the upside/downside vs other options?
  - When to revisit/pivot?

---

### Day 5-6: Unit Economics Deep Dive

**Task:** Build detailed unit economics model

#### Spreadsheet Template (Google Sheets or Excel)

Create a model with these tabs:

**Tab 1: Assumptions**
```
Inputs:
- Monthly CAC (organic): $0
- Monthly CAC (ads): $150 (if ads start month 3)
- Free → Pro conversion rate: 10%
- Pro ARPU: $19
- Enterprise ARPU: $299
- Pro user lifetime: 24 months
- Enterprise user lifetime: 36 months
- Gross margin: 80%
- Monthly OpEx: $13,700
- Monthly marketing spend: $0 (Q1), $2,500 (Q2+)
```

**Tab 2: User Cohort Analysis**
```
Cohort: 100 new PRO users (month 1)

Month | Users | Churn % | Active | MRR | Gross Profit | Cum Profit | Payback mo
1     | 100   | 0%     | 100    | 1.9k | 1.52k | 1.52k | 2.5
2     | 100   | 5%     | 95     | 1.8k | 1.44k | 2.96k | 2.5
3     | 100   | 5%     | 90     | 1.7k | 1.36k | 4.32k | 2.5
...
12    | 100   | 5%     | 61     | 1.2k | 0.96k | 11.5k | payback achieved
24    | 100   | 5%     | 38     | 0.7k | 0.56k | 16.8k | LTV calculated
```

**Expected output:** LTV = sum(gross profit) = ~$365 per user

**Tab 3: Company-wide Forecast (18 months)**
```
Month | Free Users | Pro Users | Enterprise | Pro MRR | Ent MRR | Total MRR | OpEx | EBITDA
1     | 100        | 10        | 0          | 190     | 0       | 190       | 13.7k | -13.5k
3     | 300        | 35        | 0          | 665     | 0       | 665       | 14.0k | -13.3k
6     | 1,000      | 150       | 2          | 2,850   | 600     | 3,450     | 14.5k | -11.0k
12    | 4,500      | 500       | 10         | 9,500   | 3,000   | 12,500    | 15.5k | -3.0k  (almost BE)
18    | 8,000      | 1,000     | 25         | 19,000  | 7,500   | 26,500    | 16.5k | 10.0k
```

**Deliverables:**
- [ ] Spreadsheet with all 3 tabs (Google Sheets link)
- [ ] Charts: (a) Cohort LTV curve, (b) Company MRR growth, (c) Payback period by cohort
- [ ] Summary page with key metrics highlighted

---

### Day 7: Growth + Growth Strategy Input

**Task:** Validate CAC assumptions with Growth lead

#### Meeting: Growth Validation (30 min)

**Discuss with Growth Lead:**

1. **Organic CAC (assumed: $0)**
   - "What's realistic free user growth? (100-500/mo?)"
   - "What conversion to pro? (10% realistic?)"
   - "What % of pro users come from free tier? (75% assumed)"
   - Action: Adjust organic assumptions if growth has different data

2. **Paid CAC (assumed: $100-150 from month 3)**
   - "What channels will you try? (Google ads, Reddit, Twitter?)"
   - "What's typical CPC in fintech? ($0.50-1.50?)"
   - "What conversion rate click → signup? (5-15%?)"
   - Action: Calculate channel-specific CAC

3. **Blend assumptions**
   - If: 75% organic CAC $0 + 25% paid CAC $150 = $37.50 blended
   - Growth says: "Actually 80% organic + 20% paid" → CAC = $30
   - Update model with actual mix

4. **Output: CAC validation memo**
   - [ ] Approved CAC assumptions
   - [ ] Channel breakdown (expected mix)
   - [ ] Go/No-Go: Is CAC <$50? (Yes: proceed. No: rethink pricing)

---

### Day 8-10: Pricing Implementation Plan

**Task:** Prepare pricing for launch (week 3-4)

#### Deliverables

**1. Pricing page (draft)**
```
# Pricing

## Free
$0/month
✓ Screen 5 assets/month
✓ 1 backtest/month, 5-year max
✓ 1 portfolio
✓ Community support
→ Try free now

## Pro
$19/month
✓ Unlimited screening
✓ 10 backtests/month, 20-year max
✓ 5 portfolios
✓ Monte Carlo simulator
✓ 20 custom alerts
✓ Email support (24h response)
✓ PDF export + charts
→ Start 14-day free trial

## Enterprise
$299+/month
✓ Everything in Pro
✓ API access
✓ White-label features
✓ Dedicated account manager
✓ 99.9% SLA guarantee
→ Contact sales

---

Frequently asked questions:
- Q: Can I try Pro free? A: Yes, 14-day trial (credit card required)
- Q: Do prices change? A: No, grandfathered pricing for early adopters
- Q: What if I don't like it? A: Cancel anytime, pro-rated refunds in first 7 days
- Q: Is there annual pricing? A: Yes, $180/year (~20% discount) coming in Q3
```

**2. Stripe setup plan**
- [ ] Create Stripe account (if not already)
- [ ] Setup products: Free (one-time $0), Pro (monthly $19 or $180/yr), Enterprise (custom)
- [ ] Setup payment method (credit card, maybe Apple Pay/Google Pay)
- [ ] Decide: Immediately charge or 14-day free trial?
  - Recommendation: **14-day free trial** (increases conversion 2-3x)
- [ ] Invoice/receipt template (email confirmation)
- [ ] Dunning settings (retry failed payments 2-3x)
- [ ] Webhook to backend (activate pro features when payment succeeds)

**3. Terms of Service / Cancellation policy**
- [ ] Draft TOS covering:
  - Leverage risks disclaimer
  - Limitation of liability
  - No investment advice
  - Data privacy
  - Refund policy (7-day or none?)
- [ ] Share with Legal for review

**4. Retention strategy (optional, but valuable)**
- Pro users churn at 5% MoM unless retained well
- Mitigation tactics (plan these):
  - [ ] Win-back emails (if churned >$200 LTV)
  - [ ] Annual discount ($180/yr vs $228/yr) to lock LTV up
  - [ ] Feature announcements (keep users engaged)
  - [ ] NPS surveys (monthly, identify at-risk users)

---

### Day 11-14: Final Deliverables & Recommendation

**Task:** Package everything for PM decision

#### Deliverable 1: Executive Summary (1 page)

```
PRICING RECOMMENDATION — FREEMIUM MODEL

Recommendation: Free + Pro $19/mo + Enterprise $299/mo

Why:
- Year 1 revenue: $57k MRR (month 10) vs $13k for Premium
- CAC: $37.50 (low due to viral growth)
- LTV:CAC: 10:1 (excellent)
- Break-even: Month 12 (achievable)

Unit Economics:
- Pro ARPU: $19/mo
- Pro LTV: $365 (24-month average)
- Pro CAC: $37.50 (75% organic, 25% paid)
- Payback: 2.5 months ✅

Risk Assessment:
- Conversion rate: 10% (if <5%, model breaks, pivot to Premium)
- Churn rate: 5% MoM (if >10%, LTV falls, adjust pricing)
- Regulatory: CVM must approve (leverage features)

Next Steps:
1. Legal: Confirm CVM clearance (day 1)
2. Product: Implement feature tiers (day 1-7)
3. Growth: Launch beta with pricing (week 2)
4. Backend: Stripe integration (day 8-14)
5. Metrics: Weekly tracking (MRR, conversion, churn)

Approval: [Signed by CFO/Finance Lead] [Date]
```

#### Deliverable 2: Financial Model (spreadsheet + charts)
- [ ] 18-month forecast (revenue, COGS, OpEx, EBITDA)
- [ ] Cohort LTV analysis
- [ ] Payback period by customer
- [ ] Cash flow with funding scenarios
- [ ] Sensitivity tables (conversion rate, CAC, churn)

#### Deliverable 3: Pricing Decision Document
- [ ] Option A/B/C comparison (3 pages max)
- [ ] Unit economics (1 page per option)
- [ ] Recommendation rationale (1 page)
- [ ] Risks & mitigations (1 page)
- [ ] Go/No-Go criteria (0.5 page)

#### Deliverable 4: Implementation Checklist
- [ ] Pricing page (copy + design layout)
- [ ] Stripe setup plan (step-by-step)
- [ ] TOS/Privacy draft (review with Legal)
- [ ] Metrics dashboard (weekly KPI tracking)
- [ ] Communication plan (how to announce pricing to beta users)

---

## KEY DECISION POINTS

### Decision 1: Freemium vs Premium?

| Criteria | Freemium (A) | Premium (B) |
|----------|--|--|
| Revenue Y1 | $57k MRR | $13k MRR |
| CAC | Low ($37) | High ($150) |
| Virality | High | Low |
| Complexity | Medium | Low |
| Go/No-Go | Proceed | Consider if viral strategy fails |

**RECOMMEND: Freemium** (unless Legal says no leverage allowed)

---

### Decision 2: Pro Price Point?

**Options:**
- $9/mo (very affordable, but volume needed = 1,050 users for break-even)
- **$19/mo (recommended, optimal price-elasticity curve)**
- $29/mo (premium, but may reduce conversion 20-30%)
- $39/mo (enterprise-lite, but confuses with Enterprise)

**A/B Testing Plan (Week 2):**
- Split beta users: 50% see $15/mo, 50% see $19/mo
- Measure conversion %, revenue, churn
- Choose winner (probably $19)
- Rollout full pricing week 3

---

### Decision 3: Trial vs Paywall?

**Option A: 14-day free trial**
- Pros: 2-3x higher conversion, less friction, builds habit
- Cons: Revenue delayed 14 days, chargebacks/disputes, churn risk
- Recommendation: **YES**, use free trial

**Option B: Pay immediately, 7-day refund**
- Pros: Revenue recognized immediately
- Cons: 30-50% lower conversion
- Recommendation: NO, less optimal for B2C SaaS

---

### Decision 4: Enterprise Pricing?

**$299/mo seems right because:**
- 16x Pro ($19 × 12 = $228/yr)
- Covers: API costs, dedicated support, infrastructure
- Targets: RIAs with $500k+ AUM (can easily afford)
- Expected volume: 50-100 customers by year 3

**Alternative: Negotiated (custom per customer)**
- Pros: Maximize revenue from large customers
- Cons: Sales overhead (you'll need an account manager)
- Recommendation: WAIT until you have 10+ enterprise leads, then negotiate

---

## METRICS TO TRACK (WEEKLY)

Create a dashboard (Google Data Studio or Mixpanel):

| Metric | Target Y1 | Dashboard | Owner |
|--------|-----------|-----------|-------|
| Free signups/week | 100+ | Mixpanel | Growth |
| Free → Pro conversion % | 10% avg | Weekly report | Growth |
| Pro MRR | $9,500 | Stripe | Finance |
| Pro churn % | <5% MoM | Mixpanel | Product |
| Enterprise MRR | $3,000 | Stripe | Sales |
| CAC (blended) | $37.50 | Manual | Finance |
| CAC (paid only) | <$100 | Google Ads | Growth |
| Payback period | <3 mo | Manual | Finance |
| Runway (months) | 11+ | Bank balance | Finance |

---

## RISKS & MITIGATION

### Risk 1: Conversion <10%

**Scenario:** Only 5% free users convert to pro
- Year 1 MRR: $28.5k (half)
- Break-even: Month 18+ (delayed)

**Mitigation:**
- Test lower price ($15/mo) or higher free limits
- Improve onboarding (reduce friction)
- Add "product hints" (suggest pro features to free users)
- Weekly cohort tracking (catch early)

**Go/No-Go:** If conversion stays <5% after 3 months, pivot to Premium model.

---

### Risk 2: CVM Says "No Leverage"

**Scenario:** Brazilian regulator blocks leverage features
- Product loses differentiator
- Pivot needed: "Backtesting + risk analysis" (no real leverage)
- Revenue model still valid, but growth slower

**Mitigation:**
- Call CVM week 1 (consultoria legal)
- Disclaimer modal (acknowledges risks)
- "Backtesting only" alternative (feature-complete, no leverage)
- USA pivot if Brazil blocked

**Go/No-Go:** Cannot launch leverage features if CVM blocks. Delay launch 2 weeks for clarification.

---

### Risk 3: Infrastructure Costs 35%+

**Scenario:** Backtest/Monte Carlo queries more expensive than expected
- COGS increases 20% → 35%
- Gross margin drops 80% → 65%
- Break-even delayed (more users needed)

**Mitigation:**
- Profile queries week 2 (measure real costs)
- Implement Redis caching week 3
- Pre-compute common backtests (stored results)
- Lazy-load Monte Carlo (user pays for compute time, separate fee?)

**Go/No-Go:** If COGS >25%, revisit pricing (raise to $29 or add usage-based fee).

---

## COMMUNICATION PLAN

### When to Announce Pricing

**Week 2 (June 10-14):**
- [ ] Pricing locked (internal decision)
- [ ] Legal approves (disclaimers, TOS)
- [ ] Product designs feature tiers

**Week 3 (June 17-21):**
- [ ] Beta users see pricing page
- [ ] Pricing page goes live (with 14-day trial CTA)
- [ ] Stripe integration live

**Week 4+ (June 24+):**
- [ ] First pro subscriptions processed
- [ ] Growth measures conversion weekly
- [ ] Finance tracks MRR religiously

### How to Communicate to Users

**Email template (when pricing goes live):**
```
Subject: New: LBH Pro Pricing + 14-day Free Trial!

Hi [Name],

We're officially opening LBH Pro for early access!

For 2 weeks only: Try all Pro features free (no credit card required).
After 14 days: $19/mo (auto-charge) or stay free.

Pro includes:
✓ Unlimited backtesting (20 years of history)
✓ Monte Carlo simulations
✓ Custom alert system
✓ PDF reports + export
✓ Priority email support

→ Start your free trial: [link]

Questions? Reply to this email or join our community Slack.

—The LBH Team
```

---

## FINAL CHECKLIST (Day 14)

- [ ] Freemium model approved (pricing + tiers locked)
- [ ] Unit economics validated (LTV:CAC > 3:1)
- [ ] 18-month financial forecast delivered
- [ ] Stripe setup plan ready (for engineering to implement)
- [ ] Pricing page copy approved (for product to design)
- [ ] TOS/Privacy draft reviewed (for legal to finalize)
- [ ] Metrics dashboard template created (for growth to populate)
- [ ] Risk assessment completed (8-10 top risks identified)
- [ ] Go/No-Go criteria documented (ready for week 3 decision)
- [ ] Recommendation memo signed off (by CFO/PM)

---

## SUCCESS CRITERIA

**By End of Sprint 1 (June 19):**

- ✅ Pricing model decided (Freemium: Free/$19/$299)
- ✅ Unit economics solid (LTV:CAC > 5:1, payback <3mo)
- ✅ Break-even timeline clear (month 12-15 realistic)
- ✅ Funding strategy confirmed ($150k F&F or bootstrap path)
- ✅ Metrics dashboard ready (weekly tracking)
- ✅ Go/No-Go to Sprint 2 decision made

**If all 6 checkboxes checked:** ✅ Finance ready to move to execution phase

---

## RESOURCES

- Full financial analysis: `FINANCIAL_PLAN_SPRINT1.md`
- Executive summary: `FINANCIAL_SUMMARY_DECK.md`
- Sprint briefing: `BRIEFING_EXECUTIVO_SPRINT1.md`
- Growth inputs: Request from Growth lead
- Backend costs: Request from DevOps lead
- Legal review: Coordinate with Legal lead

---

**Owner:** CFO / Finance Lead  
**Deadline:** June 12 (recommendation) + June 19 (full implementation plan)  
**Status:** [Draft] [In Progress] [Complete]  
**Last Updated:** June 5, 2026

