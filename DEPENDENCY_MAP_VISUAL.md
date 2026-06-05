# DEPENDENCY MAP - SPRINT 1 VISUAL

## Timeline Visual (Gantt-style)

```
WEEK 1: June 5-12, 2026
======================

Day 1 (Mon)  [████] Legal: Jurisdiction input from PM
             [████] Risk: Start matrix
             [████] Quant: Start backtest validation
             [████] Finance: Start pricing analysis
             [████] Backend: Baseline perf test
             [████] PM: KICKOFF (90 min)

Day 2 (Tue)  [██████████] Risk: Risk matrix 50%
             [████████] Quant: Backtest validation 40%
             [██████████] Finance: Pricing options 60%

Day 3 (Wed)  [████████████████] Risk: Risk matrix ✓ (deliver)
             [████████] Quant: Backtest 60%
             [██████████████] Finance: Pricing 80%
             [████] Legal: Disclaimer outline

Day 4 (Thu)  [████████████████] Growth: Playbook ✓ (deliver)
             [████████████] Quant: Backtest 80%
             [██████████████████] Finance: Pricing 95%
             [██████] Legal: Disclaimer 30%

Day 5 (Fri)  [████████████████] Legal: Disclaimer ✓ (deliver)
             [████████████████] Backend: Rate limiting ✓ (deliver)
             [████████████████████] Frontend: A11y audit ✓ (deliver)
             [████████████████] Quant: Backtest 90%
             [████████████████████] Finance: Pricing recom ready
             [██████████████████████] DevOps: DB scaling 100%

Day 6 (Sat)  [NO WORK]

Day 7 (Sun)  [NO WORK]

DAY 8 (Mon)  [████████████████████] Finance: Pricing ✓ (deliver D8)
             [████████████████████] Frontend: Mobile perf ✓ (deliver)
             [████████████████████] Quant: Backtest 95%
             [████████████████████] Backend: Performance ✓ (deliver)
             [████████████████████] DevOps: Prod readiness 100%
             [████] Growth: CAC/LTV 60%
             [████] PM: MID-SPRINT SYNC (all 9 specialists)

DAY 9 (Tue)  [████████████████████] Legal: ToS ✓ (deliver D9)
             [████████████████████] Growth: Channels deep dive 80%
             [████████████████████] Frontend: Analytics pages 90%
             [████████████████] Quant: Backtest final 98%
             [████████████████████] Growth: CAC/LTV ✓ (deliver)

DAY 10 (Wed) [████████████████████] Quant: Backtest ✓ (deliver D10)
             [████████████████████] Growth: Landing page ✓ (deliver)
             [████████████████████] Frontend: Analytics ✓ (deliver)
             [████████████████████] Growth: Retention analysis ✓ (deliver)
             [████] Risk: Model validation 50%

DAY 11 (Thu) [████████████████████] Risk: Model validation ✓ (deliver D11)
             [████] PM: Growth channel decision

DAY 12 (Fri) [████████████████████] PM: Leverage model decision ✓ (D12)
             [████████████████████] Backend: VaR monitoring ✓ (deliver)
             [████████] Risk: Final tweaks

DAY 13 (Sat) [NO WORK]

DAY 14 (Sun) [NO WORK]

DAY 15 (Fri) [████████████████████] PM: SPRINT REVIEW + RETRO (120 min)
             [Check: All deliverables complete?]
```

---

## Critical Path (What BLOCKS What)

```
                        ┌─────────────────────────────────────┐
                        │   PRODUCT DECISIONS (3 Gates)       │
                        └──────┬──────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ↓              ↓              ↓
           [D1]            [D8]            [D12]
       Jurisdiction      Pricing        Leverage
         Decision         Choice         Adjusts
             │              │              │
             ↓              ↓              ↓
          Legal          Growth          Quant
         (ToS)          (CAC/LTV)      (Backtest)
          (D7)            (D7-9)        (D10)
             │              │              │
             ↓              ↓              ↓
         Frontend       Backend         Product
      (Disclaimer)    (Analytics)      (Decides)
         (D7)          (D10)            (D12)


DEPENDENCY CHAINS:

Chain 1: COMPLIANCE
  Product: Jurisdiction (D1)
    ↓
  Legal: ToS + Privacy (D7)
    ↓
  Legal: Disclaimer modal (D5)
    ↓
  Frontend: Integrate disclaimer (D7)
    ↓
  Backend: Endpoint `/accept-disclaimer` (D5)
    ↓
  ✓ READY TO LAUNCH (D9)

Chain 2: BUSINESS MODEL
  Finance: Pricing options (D7)
    ↓
  Product: DECIDE pricing (D8)
    ↓
  Growth: CAC/LTV model (D7-9)
    ↓
  Finance: Break-even analysis (D7)
    ↓
  Growth: Channels deep dive (D9)
    ↓
  Product: DECIDE channels (D10)
    ↓
  ✓ READY TO LAUNCH GROWTH (D11)

Chain 3: TECHNICAL EXCELLENCE
  Backend: Performance baseline (D2)
    ↓
  Backend: Optimize queries (D6-8)
    ↓
  Backend: VaR daily compute (D6)
    ↓
  Frontend: Mobile optimization (D10)
    ↓
  Quant: Backtest validation (D10)
    ↓
  Risk: Model validation (D11)
    ↓
  Product: DECIDE leverage changes (D12)
    ↓
  ✓ READY FOR SPRINT 2 (D13)

Chain 4: RISK & COMPLIANCE
  Risk: Matrix identification (D3)
    ↓
  Product: Risk synthesis (D4)
    ↓
  Quant: Backtest validation (D10)
    ↓
  Risk: Stress tests (D10)
    ↓
  Risk: Model validation (D11)
    ↓
  Product: Risk mitigation plan (D13)
    ↓
  ✓ READY FOR EXEC SIGN-OFF (D14)
```

---

## Parallel Work (No Blocking)

Teams that can work independently in Week 1:

```
┌─────────────────────────────────────────────────────────────┐
│ LEGAL (ToS, Privacy, Disclaimer) ←→ RISK (Matrix, Stress)   │
│ No dependencies between each other                           │
├─────────────────────────────────────────────────────────────┤
│ QUANT (Backtest Validation)  ←→  FINANCE (Pricing Analysis) │
│ No dependencies between each other                           │
├─────────────────────────────────────────────────────────────┤
│ BACKEND (Perf + VaR)  ←→  FRONTEND (A11y + Mobile)          │
│ No dependencies except API endpoint (Day 5)                  │
├─────────────────────────────────────────────────────────────┤
│ DEVOPS (Prod Readiness)  ←→  GROWTH (Playbook + CAC)        │
│ No dependencies between each other                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Day-by-Day PM Watch (Critical Decisions)

```
DAY 1: Jurisdiction Decision
├─ Input needed from: Product strategy
├─ Output: Legal can proceed with ToS
├─ Action: PM decides (Brazil? USA? Global?)
└─ Impact: Affects Legal, Risk, Finance (compliance scope)

DAY 3: Risk Matrix Available
├─ Input: Risk officer deliverable
├─ Output: Product reviews, identifies top 5
├─ Action: PM reviews + approves
└─ Impact: Risk mitigation plan for rest of sprint

DAY 4: Growth Playbook Available
├─ Input: Growth officer deliverable
├─ Output: Product aligns messaging + channels
├─ Action: PM validates ICP + pain point
└─ Impact: Foundation for Growth launch

DAY 5: Disclaimer Modal + Backend Endpoint Ready
├─ Input: Legal content, Backend endpoint
├─ Output: Frontend can integrate
├─ Action: PM approves disclaimer UX
└─ Impact: Compliance blocker cleared

DAY 7: Pricing Recommendation + CAC/LTV Ready
├─ Input: Finance recommendation (3 options)
├─ Input: Beta tester feedback on pricing
├─ Output: PM chooses Option A/B/C
├─ Action: PM decides + communicates (email all-hands)
└─ Impact: Growth roadmap locked, Engineering roadmap locked

DAY 8: Performance Validation + Pricing Decision
├─ Input: Backend perf report (<2s confirmed or not)
├─ Input: Pricing chosen (Product decision from D7)
├─ Output: Frontend/Growth can proceed
├─ Action: PM approves infra scaling (if needed)
└─ Impact: Product ready for beta testing next sprint

DAY 10: Backtest Validation + Growth Channels Ready
├─ Input: Quant model validation report
├─ Input: Growth deep dive on channels
├─ Output: PM decides on leverage adjustments + channel priority
├─ Action: PM reviews Quant findings, chooses top 2 channels
└─ Impact: Growth strategy locked, Product roadmap locked

DAY 12: Leverage Model Decision
├─ Input: Quant recommendation (adjust Kelly? RSI? Scoring weights?)
├─ Input: Risk stress test results
├─ Output: PM decides if we implement changes
├─ Action: PM approves + schedules shadow test or direct rollout
└─ Impact: Backtest engine adjusted (if needed)

DAY 14: Sprint Review + Retro + Sprint 2 Planning
├─ Input: All team deliverables
├─ Output: Sprint 2 roadmap ready
├─ Action: PM prepares Sprint 2 briefing
└─ Impact: Full momentum into Sprint 2
```

---

## Blocker Escalation (If X doesn't happen by Day Y)

```
BLOCKER: Disclaimer not ready by Day 5
├─ Owned by: Legal
├─ Escalation: PM → CEO/COO (resource allocation)
├─ Workaround: Launch without disclaimer (regulatory risk)
├─ Fallback: Push to Sprint 2 Week 1 (delay launch 1 week)

BLOCKER: Pricing decision not recommended by Day 7
├─ Owned by: Finance + Product
├─ Escalation: PM → Finance to speed up beta feedback
├─ Workaround: Use Option A (SaaS) as default (quickest)
├─ Fallback: Launch with free tier only, add pricing later

BLOCKER: Backend perf not optimized <2s by Day 8
├─ Owned by: Backend + DevOps
├─ Escalation: PM → Engineering lead (may need resources)
├─ Workaround: Limit backtest to 5-year history (less computation)
├─ Fallback: Cache results 24h (users see slightly stale data)

BLOCKER: CVM doesn't respond by Day 10
├─ Owned by: Legal + Product
├─ Escalation: PM → Legal to escalate via different channel
├─ Workaround: Assume regulation allows (proceed with caution)
├─ Fallback: Only serve USA market (no Brazil launch)

BLOCKER: Team not completing tasks (capacity)
├─ Owned by: PM (resource allocation)
├─ Escalation: PM → CEO (scope cut discussion)
├─ Workaround: Cut lowest-priority tasks (Growth landing page?)
├─ Fallback: Extend sprint to 3 weeks (delay Sprint 2)
```

---

## Metrics Dashboard (Daily PM Check)

```
SPRINT 1 STATUS (Updated daily by PM)

Day:                 [████████████░░░░░░░░░░░░░░░░]  52%
Estimated Completion: June 19, 2026 (Friday)

TEAM HEALTH:
├─ Legal:        ████████░░  (70% complete)
├─ Risk:         ██████░░░░  (60% complete)
├─ Finance:      ████████░░  (75% complete)
├─ Quant:        ██████░░░░  (65% complete)
├─ Backend:      ████████░░  (70% complete)
├─ Frontend:     ██████████  (85% complete)
├─ Growth:       █████░░░░░  (50% complete)
├─ DevOps:       ████████░░  (70% complete)
└─ PM:           ████████░░  (75% complete)

CRITICAL ITEMS:
  [ ] Product: Jurisdiction decision (D1) ✓
  [ ] Legal: Disclaimer modal (D5) ✓
  [ ] Finance: Pricing recommendation (D7) ⏳ (waiting...)
  [ ] Backend: Performance <2s (D8) ⏳ (needs validation)
  [ ] Quant: Backtest validation (D10) ⏳ (in progress)
  [ ] Product: Pricing DECISION (D8) ⏳ (blocked on Finance)
  [ ] Product: Channels DECISION (D10) ⏳ (waiting Growth deep dive)
  [ ] Product: Leverage DECISION (D12) ⏳ (waiting Quant)

BLOCKERS:
  🚧 Backend: Backtest query latency (baseline: 5s, target <2s)
     → Investigating: Missing indices?
     → ETA: Day 6 (initial improvement), Day 8 (final)
  🚧 Finance: Beta tester feedback on pricing (need 5+ responses)
     → Sent survey Day 4, due Day 6
     → If not by D7 morning, PM will decide with incomplete data
  🚧 CVM response: Still waiting on reply (sent D1)
     → Legal following up Daily
     → Will continue in Sprint 2 if no response

ON TRACK:
  ✓ Legal: ToS structure drafted
  ✓ Risk: Matrix 80% complete
  ✓ Growth: Playbook ready Day 4
  ✓ Frontend: Mobile optimization in progress
  ✓ DevOps: Prod readiness checklist 90%
```

---

## Go/No-Go Criteria (Sprint 1 End)

```
GO → Sprint 2 (All Green):
  ✓ Legal: ToS + Privacy signed off
  ✓ Legal: Disclaimer modal live in production
  ✓ Finance: Pricing model chosen + communicated
  ✓ Backend: Backtest queries <2s p90 (90th percentile)
  ✓ Backend: VaR daily computed + monitoring active
  ✓ Frontend: Mobile Lighthouse >85
  ✓ Frontend: Disclaimer modal integrated
  ✓ Quant: Model validation drift <5%
  ✓ Risk: Top 20 risks documented + mitigation assigned
  ✓ Growth: Playbook + CAC/LTV + 2 channels selected
  ✓ Product: H2 roadmap documented

NO-GO → Extend Sprint 1 (Any Red):
  ✗ Regulatory blocker (CVM says no leverage)
    → Pivot to SaaS-only model
  ✗ Performance can't hit <2s target
    → Extend for optimization (budget +1 week)
  ✗ Critical security issue discovered
    → Pause all other work, fix, re-validate
  ✗ >50% of team cannot complete due to capacity
    → Reduce scope aggressively

CONDITIONAL GO → Sprint 2 (Yellow Items):
  ⚠ CVM still hasn't responded (continue in background)
  ⚠ Landing page not launched (can launch Day 1 Sprint 2)
  ⚠ Referral program not fully designed (can launch Day 5 Sprint 2)
```

---

## Synchronization Points (All-Hands Meetings)

```
MONDAY JUNE 5 - 9:00 AM (90 min)
└─ KICKOFF MEETING
   • PM: Welcome + overview
   • Each specialist: 3-min intro of their task
   • Timeline + dependencies walkthrough
   • Q&A (30 min)
   • Async update instructions
   Action: Record for async team

WEDNESDAY JUNE 7 - Time TBD (30 min each)
└─ MID-SPRINT SYNCS (1:1 with PM)
   • Legal:    Progress on ToS, blockers?
   • Risk:     Matrix ready? Next steps?
   • Finance:  Beta feedback? Pricing clear?
   • Quant:    Backtest 60%? On track?
   • Backend:  Perf baseline? VaR plan?
   • Frontend: Mobile audit done? Disclaimer ready?
   • Growth:   Playbook + CAC model drafted?
   • DevOps:   Prod checklist progress?
   Action: Escalate blockers immediately

FRIDAY JUNE 19 - 9:00 AM (120 min)
└─ SPRINT REVIEW + RETRO
   • Demo round: Each specialist 5 min
   • Metrics: Did we hit success criteria?
   • Retro: What went well? What slowed us?
   • Sprint 2: Quick preview
   • Awards: MVP contributor
   Action: Document learnings for Sprint 2

WEEKLY (Tuesdays 2 PM)
└─ RISK STAND-UP (30 min)
   • Risk + Quant + PM
   • Any model/regulatory concerns?
   • Stress test results?
   • Decision updates?

WEEKLY (Thursdays 10 AM)
└─ TECHNICAL STAND-UP (30 min)
   • Backend + Frontend + DevOps + PM
   • Performance metrics?
   • Deployment readiness?
   • Infrastructure scaling needs?
```

---

*Visual created: June 5, 2026*  
*Last update: June 19, 2026 (end sprint)*
