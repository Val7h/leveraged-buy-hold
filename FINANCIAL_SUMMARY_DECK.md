# FINANCIAL PLAN — EXECUTIVE SUMMARY
## LBH System Sprint 1 — Pricing & Monetization Decision

*This 1-pager summarizes the detailed financial analysis. Read this in kickoff meeting (5 min).*

---

## TOP RECOMMENDATION

### Business Model: FREEMIUM

**Tiers:**
- **Free:** 5 assets/mo screening, 1 backtest/mo (marketing layer)
- **Pro:** $19/mo — unlimited screening, 10 backtests/mo, alerts, portfolio limit
- **Enterprise:** $299+/mo — API access, white-label, dedicated support

**Why Freemium beats Premium ($49/mo):**

| Metric | Freemium | Premium |
|--------|----------|---------|
| Year 1 MRR | $57k (month 10) | $13k |
| Year 1 CAC | $37.50 | $150 |
| LTV:CAC ratio | 7-10:1 ✅ | 3-4:1 |
| Break-even | Month 12 | Month 18+ |

→ **Freemium generates 4x revenue Year 1 due to viral growth + lower CAC.**

---

## FINANCIAL SNAPSHOT

### Year 1 Forecast

| Metric | Value | Timeline |
|--------|-------|----------|
| **Target Users** | 5,000 (4,500 free + 500 pro) | Month 12 |
| **Pro MRR** | $9,500 | Month 12 |
| **Annual Revenue** | $57k - $114k | Months 8-12 |
| **Gross Margin** | 80% | SaaS standard |
| **Break-even** | 1,000 PRO users | Month 12 |
| **Funding needed** | $150k | Months 1-2 |
| **Runway** | 11 months | With $150k |

### Unit Economics

```
CAC (blended):        $37.50 (75% viral + 25% ads)
LTV:                  $365 (24-month lifetime)
Payback period:       2.5 months ✅ (excellent)
LTV:CAC ratio:        10:1 ✅ (healthy)
```

---

## MARKET & CUSTOMERS

### Who We Serve (ICP)

**Primary:** Brazilian individual investors
- Age 28-55, $10k-$500k portfolio
- Defensive assets (dividend, utilities, healthcare)
- Buy & Hold 10-20 year horizon
- Non-technical, wants "easy leverage"

**Secondary:** Micro-RIAs (1-5 clients)
- $500k-$10M AUM
- Willing to pay $299+/mo for backtesting

### Market Size

- **TAM:** 100,000 potential users (Brazil + USA expats)
- **SAM (3 year):** 15,000-25,000 reachable
- **SOM (3 year):** 8,000-12,000 realistic

---

## 3-YEAR REVENUE ROADMAP

| Period | Free Users | Pro Users | Enterprise | MRR | ARR |
|--------|-----------|-----------|-----------|-----|-----|
| **Year 1** | 4,500 | 500 | 10 | $9.5k | $114k |
| **Year 2** | 2,500 | 1,500 | 100 | $58.4k | $701k |
| **Year 3** | 6,000 | 3,500 | 300 | $186k | $2.23M |

---

## RISKS & MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| CVM blocks leverage | 30% | Critical | Contact CVM week 1; have backup plan |
| Conversion <10% | 40% | High | Test with beta users week 2; A/B test pricing |
| Infrastructure costs 35%+ | 20% | Medium | Profile queries week 2; implement caching |
| User churn >50% | 40% | High | Weekly cohort tracking; NPS surveys |
| Competitor launch | 50% | Medium | 6-12 month moat via niche + community |

---

## CASH FLOW & RUNWAY

### With $150k Funding (F&F Round)

```
Monthly burn:        $13.7k
Break-even month:    Month 9-12 (revenue overtakes burn)
Remaining runway:     Month 18 = 12.8 months (self-sustaining)
```

**Timeline:**
- Month 1-3: Burn $41k (cash: $109k remaining)
- Month 6-9: Revenue grows ($10k-$21k MRR), burn plateaus
- Month 9: **EBITDA positive** (first time profitable)
- Month 12: **Self-sustaining** (revenue >burn)
- Month 18: **$211k cash** (can fund Series A)

---

## KEY METRICS TO TRACK (Weekly)

1. **Free signups/week** (target: 100+ by month 3)
2. **Free → Pro conversion %** (target: 10% by month 6)
3. **Pro MRR** (target: $9.5k by month 12)
4. **CAC (paid ads only)** (target: <$100)
5. **Free user churn** (target: <10% MoM)
6. **Pro user churn** (target: <5% MoM)

---

## GO / NO-GO CRITERIA (Sprint 1 End)

### GO TO SPRINT 2 if:

- ✅ CVM confirms leverage features are legal
- ✅ Pricing model approved (Freemium $19/mo)
- ✅ Beta test shows >5% free → pro conversion
- ✅ Break-even timeline is month 12-15
- ✅ $150k funding confirmed (or bootstrapped alternative clear)

### NO-GO if:

- ❌ CVM blocks leverage features entirely
- ❌ Beta shows <2% conversion (unit economics broken)
- ❌ Infrastructure costs exceed 30% of revenue
- ❌ Critical security flaw in backtest logic

---

## DECISION SUMMARY

| Question | Answer | Owner |
|----------|--------|-------|
| **Which model?** | Freemium | Finance (approved) |
| **Pro pricing?** | $19/mo | Finance (approved) |
| **Funding?** | $150k F&F target | PM (week 1) |
| **Beta go-live?** | Week 1-2 (June 10-17) | Product (week 1) |
| **Paid tier launch?** | Week 3-4 (June 20-27) | Product + Growth |
| **First revenue?** | Month 3-4 (August) | Growth (track weekly) |
| **Break-even?** | Month 12 (May 2027) | Finance (track MRR) |

---

## NEXT STEPS (This Week)

1. **Monday kickoff** — Present this summary (5 min)
2. **Growth team** — Confirm CAC models + channels by Wed
3. **Legal team** — CVM clearance by Thu
4. **Backend team** — Confirm infra costs realistic by Fri
5. **Finance owner** — Decision on Freemium locked by Thu D7

---

## APPENDIX: Why Freemium Wins

### Freemium Advantages
- **Viral growth:** Free users = marketing layer (15-20% refer friends)
- **Low CAC:** Organic word-of-mouth beats ads at stage 1
- **Fast PMF validation:** 4,500 free users give clear product-market feedback
- **Revenue beats Premium 4x:** $57k/mo vs $13k/mo year 1
- **Scales to Series A:** $2.23M ARR year 3 = $10M+ valuation

### Premium Advantages (but not for us)
- ✗ Simpler operations (but we're early, can afford complexity)
- ✗ Higher ARPU (but lower volume kills revenue)
- ✗ Fewer support tickets (but we have no users yet)

**Verdict:** Freemium is 100% the right choice for niche quant product needing virality.

---

*Prepared for Kickoff Meeting — June 5, 2026*  
*Full detailed analysis: FINANCIAL_PLAN_SPRINT1.md (50 pages)*
