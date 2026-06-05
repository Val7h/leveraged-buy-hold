# LBH SYSTEM - TOP LEGAL RISKS & MITIGATION STRATEGIES
## Executive Risk Summary (1-page reference)

**Date:** June 5, 2026  
**Jurisdiction:** Brazil (CVM, LGPD)  
**Product:** Investment advisory platform with leverage  
**Risk Level:** 🔴 CRITICAL (leverage = high regulatory exposure)

---

## RISK RANKING (Probability × Impact)

| Rank | Risk | Probability | Impact | Mitigation Cost | Timeline |
|------|------|-------------|--------|-----------------|----------|
| 🥇 **#1** | **CVM declares "consultoria" = need license** | 40-60% | 🔴 Shutdowns ops | R$50-200k | D1-D30 |
| 🥈 **#2** | **User loses capital via liquidation → lawsuit** | 30-50% | 🔴 Legal liability | R$5-15k | D1-D14 |
| 🥉 **#3** | **LGPD violation = data breach** | 20-30% | 🔴 ANPD fine R$50M | R$20-50k/yr | Ongoing |

---

## RISK #1: CVM Determines "Consultoria" (Licensing)

### Scenario
Platform recommends leverage via score → CVM: "This is consultoria de investimentos"  
→ Operating without license = illegal  
→ Multa: 10-50% dos patrimônios prejudicados dos usuários  
→ Platform shutdown (emergency measure)

### Why It's Possible
- ✗ Our scoring model recommends leverage levels
- ✗ "Score > 85 = use 3x leverage" = explicit recommendation
- ✗ Monte Carlo simulations = implying strategy performance
- ✗ Risk alerts = guiding user trading decisions

### Why It Might NOT Apply
- ✅ Usuarios choose own trades (we don't execute)
- ✅ Data is from public sources (Yahoo, Quantfury)
- ✅ Not personalized advice (same score for all users)
- ✅ Not portfolio management (no account control)

### GRAY ZONE = Ask CVM Now

**Immediate Action (D1):**
```
Email: consultapublica@cvm.gov.br
Subject: "Regulatory query: Investment screening platform scope"

Body:
"Our platform provides:
1. Stock screening with scoring (0-100, not ranked)
2. Risk metrics (VaR, Sharpe, Beta)
3. Backtesting (past performance)
4. Leverage recommendation table (IF score > 85, leverage = 3x)
5. Monte Carlo simulation (possible future scenarios)

Question: Does #4 or #5 constitute 'consultoria de investimentos' under CVM Instruction 400?
Users make all trading decisions. We provide analysis tools only.

Please advise on compliance requirements."
```

**Response Timeline:** 30-45 days

### Mitigation Options (Ranked by Ease)

#### Option A: Remove "Recommendation" (EASIEST - 1 hour)
- ❌ Remove explicit leverage recommendation table
- ❌ Remove "Your score is 85 → use 3x" copy
- ✅ Show metrics only: "Here are your options: 1x, 2x, 3x, 4x"
- ✅ User picks own leverage independently
- **Result:** No "recommendation" = likely safe from CVM
- **Downside:** UX less helpful, conversion may drop
- **Timeline:** Can do in hours (D5)

#### Option B: Get CVM License (HARDEST - 3-6 months)
- Requires: Business plan, compliance officer, segregated account, insurance
- Cost: R$50-200k upfront + R$20-50k/year ongoing
- Timeline: 3-6 months (applications queue)
- **Result:** Legal to recommend leverage
- **Upside:** Premium positioning, trust signal
- **Downside:** Slow, expensive, may not be approved

#### Option C: Hybrid (RECOMMENDED - 2 weeks + ongoing)
- **Immediate (D1-D5):**
  - Phrase as: "This system recommends leverage levels BASED on your risk tolerance"
  - NOT: "We recommend you use 3x leverage"
  - Subtle language shift = legally safer
  - Can implement in hours

- **Short-term (D8-D30):**
  - Send CVM query (Option A above)
  - Have legal counsel review score model
  - Expect 30-day response
  - If CVM says "OK, not consultoria" → proceed confidently
  - If CVM says "Need license" → pivot to Option A

- **Medium-term (Q3 2026):**
  - Revisit after CVM response
  - If growth justifies: consider license
  - If better as analysis tool: double down on Option A

### Evidence to Keep (Legal Defense)
- ✅ Email chain with CVM (proof of good-faith inquiry)
- ✅ Legal opinion letter (if you hire counsel)
- ✅ Disclaimer: "LBH is not consultoria de investimentos"
- ✅ User consent: "I understand this is analysis, not advice"
- ✅ Documentation: How score is calculated (algorithm transparent)

### Red Flags to Avoid
- ❌ Never say: "We recommend buying this stock"
- ❌ Never say: "Our strategy outperforms market"
- ❌ Never say: "We manage your portfolio"
- ❌ Never personalize: "For you, John, the best leverage is 3x"
- ❌ Never guarantee: "You will earn 12% yearly"

---

## RISK #2: User Loses Capital → Sues LBH

### Scenario
User deposits $10k → uses 3x leverage ($30k exposure) → stock drops 40%  
Broker liquidates position at $2k remaining → User lost $8k (80%)  
User sues: "LBH recommended leverage without proper risk disclosure"  
Lawsuit cost: R$30-100k | Settlement: R$5-50k | Insurance: covers 0-100%

### Why It's Likely
- Leverage amplifies losses (25% drop = 75% loss with 3x)
- Users may not understand margin calls / liquidation
- "Worst-case scenario" from simulator is often wrong in reality
- Psychological: user blames system, not own decision

### Root Causes (Prevent)
1. **Incomplete risk disclosure** → Fix: Modal + Risk Disclosure doc
2. **Poor UX for risk selection** → Fix: Warnings + slow slider
3. **Model unreliability** → Fix: Conservative assumptions + validation
4. **Liquidation mechanics unclear** → Fix: Explain margin call in detail

### Mitigation (Evidence Stack)

#### Tier 1: DOCUMENTATION (D7)
- ✅ Risk Disclaimer Modal (dual-checkbox consent)
- ✅ Risk Disclosure document (section 2.2D above - 5 pages)
- ✅ Terms of Service with liability cap
- ✅ Every consent logged (timestamp, IP, version)

**Why:** If user sues, you prove:
- They clicked "Yes, I understand leverage = ruin possible"
- They read formal risk document
- They signed informed consent
- → Likely to lose case (or settle for minimal amount)

#### Tier 2: TECHNICAL (D7-D10)
- ✅ Leverage limited to 2.5x (not 4x)
- ✅ Real-time VaR calculation (show daily risk)
- ✅ Email alerts: "Your margin at 15%, consider action"
- ✅ Forced deleveraging at critical margin
- ✅ Slippage disclaimer (backtest vs reality)

**Why:** Shows you took reasonable precautions to prevent harm.

#### Tier 3: INSURANCE (D10+)
- ✅ Professional Indemnity (E&O): R$500k-2M coverage
- ✅ Cyber liability: R$200-500k coverage
- ✅ Cost: R$15-30k/year

**Why:** If sued despite above, insurance pays defense + settlement (no out-of-pocket).

#### Tier 4: OPERATIONAL (Ongoing)
- ✅ Log all user interactions (clicks, trades, alerts accepted/ignored)
- ✅ Monitor for misuse (e.g., user sets leverage = 4.0x, we cap to 2.5x)
- ✅ Document internal risk committee meetings
- ✅ Collect user feedback on risk comprehension

**Why:** Additional evidence you tried to protect users.

### Pre-Lawsuit Checklist
- [ ] Did user click "I understand ruin risk"? **YES** → Defensible
- [ ] Did we log consent timestamp? **YES** → Evidence valid
- [ ] Did we have 2.5x cap (not 4x)? **YES** → Responsible
- [ ] Did we send margin alerts? **YES** → Showed care
- [ ] Do we have insurance? **YES** → Covered

If all YES → Case likely dismissed or settled low. If 3+ NO → Risk of large judgment.

---

## RISK #3: LGPD Violation (Data Breach)

### Scenario
Hacker accesses database (weak password, no 2FA on admin)  
Steals: 5,000 emails + CPF + trading history  
User discovers breach when targeted by phishing / identity theft  
ANPD (Brazilian data protection authority) investigates  
Penalty: Up to R$50 million OR 2% revenue (whichever higher)

### Why It Matters
- LGPD is Brazil's strict data law (like EU GDPR)
- Even 1 user without consent = violation
- Breach notification required within 72 hours
- Non-compliance multiplies fines

### Current Status Check
- [ ] Passwords hashed (bcrypt/argon2)? ✅ LIKELY
- [ ] TLS 1.3 in production? ✅ LIKELY
- [ ] 2FA on admin accounts? ❌ TODO
- [ ] Privacy Policy published? ❌ TODO
- [ ] Consent collected? ❌ TODO
- [ ] Data export endpoint? ❌ TODO
- [ ] Delete account endpoint? ❌ TODO
- [ ] DPO (Data Protection Officer) named? ❌ FUTURE

### Mitigation (Phased)

#### Phase 1: IMMEDIATE (D1-D5)
- [ ] Privacy Policy drafted + published (template section 2.2C)
- [ ] Consent checkbox on registration
- [ ] TLS 1.3 verified in production
- [ ] Password hashing verified (code review)
- **Cost:** ~8h engineer time
- **Risk reduction:** 60%

#### Phase 2: SHORT-TERM (D7-D14)
- [ ] Consent logging (track who accepted what)
- [ ] Data export endpoint (users can download their data)
- [ ] Account deletion workflow
- [ ] Cleanup: remove unnecessary fields (e.g., if not using CPF, don't store)
- **Cost:** ~12h engineer time
- **Risk reduction:** 80%

#### Phase 3: MEDIUM-TERM (Q3 2026)
- [ ] 2FA on sensitive actions (leverage change, withdraw)
- [ ] Database encryption (even if hacked, data unreadable)
- [ ] Penetration testing (hired hacker finds vulns)
- [ ] DPO retainer (legal expert on call for incidents)
- [ ] Incident response plan (what to do if breach happens)
- **Cost:** R$30-50k / 20h engineer time
- **Risk reduction:** 95%

#### Phase 4: CONTINUOUS (Ongoing)
- [ ] Monthly security patches
- [ ] Quarterly access reviews (who has admin?)
- [ ] Annual LGPD compliance audit
- [ ] Insurance cyber liability (covers incident costs)

### Evidence for ANPD (If Breach Occurs)
- ✅ Privacy Policy showing transparency
- ✅ Breach notification sent within 72h
- ✅ Incident response plan documented
- ✅ Evidence of good-faith security (TLS, hashing)
- ✅ Data protection training for staff
→ Likely: Fine reduced by 50-75% (showed you tried)

---

## COMPARATIVE RISK MATRIX

| Risk | Probability | Impact $ | Cause | Detection | Timeline to Fix |
|------|-------------|----------|-------|-----------|-----------------|
| **CVM licensing** | 40-60% | R$500k-5M | Oversight | CVM audit | 3-6 months |
| **User lawsuit** | 30-50% | R$5-100k | Poor disclosure | User contact | 3-12 months |
| **LGPD breach** | 20-30% | R$5-50M | Weak security | Public discovery | 1-3 months |
| **Chargebacks** (payment) | 5-10% | R$10-50k | Unhappy users | Payment processor | 1 month |
| **Broker API fail** | 10-20% | R$0-100k | Quantfury outage | User complaint | 1 hour |

---

## EXECUTIVE SUMMARY TABLE

### Top 3 Risks: What to Do Now

| Risk | Action | Deadline | Owner | Evidence |
|------|--------|----------|-------|----------|
| **#1 CVM** | Email regulatory query | D2 | Legal | Email chain |
| | Remove explicit recommendations OR get license | D30 | Product/Legal | Code + docs |
| **#2 Lawsuit** | Publish disclaimers + consent | D7 | Frontend/Legal | DB logs |
| | Limit leverage to 2.5x | D5 | Backend | Git commit |
| | Get E&O insurance | D30 | Finance | Policy cert |
| **#3 LGPD** | Publish privacy policy | D5 | Legal | Website |
| | Add data export + delete | D12 | Backend | API endpoints |
| | 2FA + encryption roadmap | Q3 | DevOps | Eng plan |

---

## BUDGET ESTIMATE

| Item | Cost | Timeline | Impact |
|------|------|----------|--------|
| Legal consulting (regulatory) | R$10-20k | 1-time | High |
| Legal docs (ToS, privacy, etc) | R$5-15k | 1-time | High |
| E&O Insurance | R$15-30k | Annual | High |
| Cyber Insurance | R$5-10k | Annual | Medium |
| Penetration testing | R$10-30k | Annual | High |
| DPO retainer | R$3-8k | Monthly | Medium |
| **TOTAL Year 1** | **R$60-150k** | — | — |

**As % of revenue:**
- 0 users: R$150k (CapEx)
- 100 users @ R$100/month = R$10k/month revenue → 150% cost (unsustainable)
- 1000 users @ R$100/month = R$100k/month revenue → 1.5% cost (sustainable)

**Conclusion:** Legal/compliance costs are ~R$100-150k/year. Acceptable once you have 500+ paying users.

---

## GO / NO-GO DECISION

### CAN WE LAUNCH?

**YES IF:**
- ✅ All Tier 1 documents ready (disclaimer, ToS, privacy)
- ✅ Risk Disclosure published (5 pages)
- ✅ Consent logging implemented
- ✅ Leverage capped at 2.5x
- ✅ Legal counsel reviewed (30-day SLA)

**NO IF:**
- ❌ Risk Disclaimer not live
- ❌ Leverage still at 4.0x
- ❌ No consent logging
- ❌ No privacy policy

**RECOMMEND:** Launch by D12 (June 17) with analysis features + delayed leverage (June 24 pending CVM).

---

## CONTACTS FOR IMMEDIATE ACTION

### Legal/Regulatory
- **CVM** (Comissão de Valores Mobiliários)
  - Email: consultapublica@cvm.gov.br
  - Phone: +55 21 3131-8000
  - Attn: Department of Consultoria de Investimentos

- **ANBIMA** (Associação Brasileira de Entidades dos Mercados Financeiro e de Capitais)
  - Email: compliance@anbima.org.br
  - Phone: +55 11 3879-7000

### Hiring Consultancy
- **Recommendation:** Fintech law firm in São Paulo or Brasília
- **Budget:** R$10-20k for regulatory assessment
- **Timeline:** Engage by D3, report by D8

### Insurance
- **Types:** Professional Indemnity (E&O) + Cyber Liability
- **Providers:** Marsh, Aon, Allianz (all active in Brazil)
- **Budget:** R$20-50k/year
- **Timeline:** RFQ by D10, policy by end June

---

## REFERENCES

- Full regulatory assessment: `LEGAL_REGULATORY_ASSESSMENT_SPRINT1.md`
- Compliance checklist: `COMPLIANCE_CHECKLIST_GO_NOGO.md`
- CVM Instruction 400 (Consultoria de Investimentos): www.cvm.gov.br
- LGPD Law (Lei 13.709): www.planalto.gov.br

---

**Document Version:** 1.0  
**Effective Date:** June 5, 2026  
**Next Review:** June 19, 2026 (post-Sprint 1)  
**Owner:** Legal/Compliance  
**Status:** DRAFT (Awaiting Executive Approval)

---

**CRITICAL:** Do not launch without sign-off from Legal + Product leadership.
