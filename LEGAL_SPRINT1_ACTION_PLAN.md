# LBH SYSTEM - LEGAL SPRINT 1 ACTION PLAN
## Daily Checklist (June 5-19, 2026)

**Owner:** Legal Team + Product Lead  
**Start:** Today (June 5, 2026)  
**Goal:** Achieve compliance readiness for leverage launch  
**Success:** All "MUST" items ✅ by June 12

---

## WEEK 1: FOUNDATIONS (June 5-12)

### DAY 1 (THURSDAY, JUNE 5) - TODAY
**Deadline: 5 PM**

#### CRITICAL (Must complete today)
- [ ] **Send CVM regulatory query** (email)
  - To: consultapublica@cvm.gov.br
  - Subject: "Regulatory Query: Investment Screening Platform Scope"
  - Body: Use template from LEGAL_RISKS_MITIGATION.md
  - Why: 30-45 day response needed; every day counts
  - Owner: Legal
  - Time: 30 min

- [ ] **Schedule Legal Consulting RFQ calls** (3 firms)
  - Contacts: Bechara & Associados, Veirano Advogados, +1 other
  - Goal: Get price quote + 30-day legal review offer
  - Ask: "Can you review our ToS, Privacy Policy, and risk disclaimers by June 8?"
  - Owner: Legal + Finance
  - Time: 1 hour (3 calls × 20 min each)

- [ ] **Create /legal folder in repo**
  - Path: `leveraged-buy-hold/legal/`
  - Files to add:
    - `VERSIONS.md` (document version history)
    - `TODO.md` (legal roadmap)
  - Owner: Product
  - Time: 10 min

- [ ] **Assign document owners** (assign to Legal team)
  - ToS: [Name]
  - Privacy Policy: [Name]
  - Risk Disclosure: [Name]
  - Owner: Legal Lead
  - Time: 10 min

- [ ] **Schedule internal legal review meeting** (June 8, 2 hours)
  - Attendees: CEO, Product, Legal, Frontend lead, Backend lead
  - Goal: Discuss drafts, identify gaps, decide launch timing
  - Calendar: Send invites today
  - Owner: Product
  - Time: 10 min

#### HIGH PRIORITY (Complete today if possible)
- [ ] **Read full regulatory assessment** (LEGAL_REGULATORY_ASSESSMENT_SPRINT1.md)
  - Legal team: 30 min to understand all sections
  - Product: 20 min to understand top 3 risks
  - Owner: Legal + Product
  - Time: 30-50 min

- [ ] **Copy document templates into /legal**
  - ToS template (section 2.2B)
  - Privacy Policy template (section 2.2C)
  - Risk Disclosure template (section 2.2D)
  - Owner: Legal
  - Time: 20 min

#### COMMUNICATION
- [ ] **Announce Sprint 1 legal timeline to team** (Slack)
  - Message: "Legal docs critical for launch. Key deadlines: ToS/Privacy D5, Disclaimer Modal D7, Legal review D8, Launch decision D12."
  - Owner: Product Lead
  - Time: 5 min

---

### DAY 2 (FRIDAY, JUNE 6) - SPRINT KICKOFF
**Focus: Drafting + Decisions**

#### Critical
- [ ] **Legal drafting sprint starts**
  - Start with: Privacy Policy (simplest, most templatable)
  - Use template from section 2.2C
  - Customize: Company name, contact email, data types specific to LBH
  - Owner: Legal
  - Time: 2-3 hours

- [ ] **Frontend: Start RiskDisclaimerModal component**
  - Create: `src/components/RiskDisclaimerModal.tsx`
  - Start with: HTML structure + CSS styling (no logic yet)
  - Reference: Design in section 2.3
  - Owner: Frontend Lead
  - Time: 2 hours

- [ ] **Backend: Risk Disclaimer review**
  - Code review: Check password hashing (bcrypt/argon2?)
  - Code review: Check TLS in production
  - Note: Any security gaps found
  - Owner: Backend Lead + DevOps
  - Time: 1 hour

#### High Priority
- [ ] **Product: Leverage decision prep**
  - Analyze: Current leverage caps (4.0x max)
  - Decision: Reduce to 2.5x?
  - Impact: Simulator changes, user messaging, model tweaks
  - Owner: Product + Quant
  - Time: 1 hour
  - **GOAL: Decide by June 8**

- [ ] **Finance: Insurance RFQ started**
  - Contact: 3 insurance brokers (Marsh, Aon, local)
  - Request: Quote for E&O + Cyber (30-day turnaround)
  - Owner: Finance
  - Time: 1 hour

---

### DAY 3 (SATURDAY, JUNE 7) - DRAFTS DUE
**Focus: First drafts of all documents**

#### Must Complete
- [ ] **Privacy Policy DRAFT complete**
  - Status: Ready for internal review (not perfect, but full)
  - Owner: Legal
  - Time: 2-3 hours

- [ ] **ToS DRAFT complete**
  - Use template from section 2.2B
  - Sections: Definitions, Licenses, Risk Disclaimer, Liability Limits, Disputes
  - Owner: Legal
  - Time: 3-4 hours

- [ ] **Risk Disclosure DRAFT complete**
  - Use template from section 2.2D
  - Length: 4-5 pages (comprehensive)
  - Sections: Market risk, Leverage risk, Model risk, Operational risk
  - Owner: Legal
  - Time: 3 hours

- [ ] **RiskDisclaimerModal: Logic complete**
  - Checkbox logic: First checkbox (entendo) → Second checkbox (concordo) → Button enabled
  - Button actions: Reject (exit), Accept (send consent to backend)
  - localStorage: Track "shown_once" flag
  - Owner: Frontend
  - Time: 2 hours

#### High Priority
- [ ] **Backend: Consent endpoint design**
  - Design: `POST /api/v1/legal/consent` request/response
  - Schema: consent_type, version, accepted, timestamp, ip, user_agent
  - Owner: Backend Lead
  - Time: 1 hour

---

### DAY 4 (SUNDAY, JUNE 8) - INTERNAL REVIEW
**Focus: Review + Feedback loop**

#### Critical Meeting (2 hours)
- **Internal Legal Review Meeting**
  - Attendees: CEO, Product, Legal, Frontend, Backend
  - Agenda:
    1. Review 3 documents (Privacy, ToS, Risk Disclosure)
    2. Identify gaps / legal concerns
    3. Decide: Launch Scenario A (with leverage) vs B (analysis only)?
    4. Confirm CVM query sent (review email)
    5. Decide: Leverage cap at 2.5x? CONFIRM TODAY
  - Owner: Legal Lead
  - Output: Decisions + action items

#### Action Items from Meeting
- [ ] **Product: DECIDE leverage cap**
  - Decision: 2.5x? YES or NO?
  - If YES: Notify Backend (implement by D5)
  - If NO: Justify in writing (risk acceptance)
  - Owner: Product + Quant + Risk team
  - **DEADLINE: Today end of day**

- [ ] **Legal: Incorporate feedback into documents**
  - Revisions: Update Privacy, ToS, Risk Disclosure based on meeting
  - Status: Ready for external legal counsel review by tomorrow
  - Owner: Legal
  - Time: 2-3 hours

- [ ] **Frontend: RiskDisclaimerModal: Unit tests**
  - Test: Checkboxes control button state
  - Test: localStorage flag prevents re-display
  - Test: Reject button logs user out
  - Test: Mobile responsive
  - Owner: Frontend
  - Time: 1 hour

---

### DAY 5 (MONDAY, JUNE 9) - EXTERNAL LEGAL REVIEW
**Focus: Get expert eyes + finalize documents**

#### Must Complete Today
- [ ] **Send documents to legal counsel**
  - Docs: Privacy Policy, ToS, Risk Disclosure (v2, post-feedback)
  - Deadline request: Review + feedback by June 12 (4-day turnaround)
  - Owner: Legal
  - Time: 30 min

- [ ] **Backend: Implement leverage cap (if decided YES on D4)**
  - Change: Max leverage 4.0x → 2.5x in scoring tables
  - Files: `app/quantitative/leverage.py` (leverage tables)
  - Files: `app/schemas/leverage.py` (API max)
  - Test: Verify user can't request 3x+ leverage
  - Owner: Backend
  - Time: 2 hours
  - Deadline: **TODAY** (must test by D6)

- [ ] **Backend: Consent logging schema + API**
  - DB migration: Create `consent_logs` table
  - API: `POST /api/v1/legal/consent` (accept consent)
  - API: `GET /api/v1/legal/status` (check user consent status)
  - Owner: Backend
  - Time: 2-3 hours

- [ ] **Frontend: RiskDisclaimerModal integration**
  - Integration: Connect to backend consent API
  - Test: Submit consent → check DB
  - Test: Page reload → consent logged + recognized
  - Owner: Frontend
  - Time: 2 hours

---

### DAY 6 (TUESDAY, JUNE 10) - TESTING + QA
**Focus: Ensure all pieces work together**

#### Quality Assurance
- [ ] **Frontend: RiskDisclaimerModal full QA**
  - Test: Desktop + mobile (responsive?)
  - Test: Checkboxes work smoothly
  - Test: Button enables/disables correctly
  - Test: Accessibility (keyboard nav, ARIA labels)
  - Test: Reject button logs out user
  - Owner: QA + Frontend
  - Time: 2 hours

- [ ] **Backend: Consent API testing**
  - Test: POST /api/v1/legal/consent → accepted
  - Test: GET /api/v1/legal/status → shows acceptance
  - Test: Can't use leverage features without consent
  - Test: Consent logs include IP + user-agent
  - Owner: QA + Backend
  - Time: 1 hour

- [ ] **Integration: Modal → Backend → DB**
  - Test: E2E flow: User opens app → sees modal → checks boxes → submits → DB updated
  - Test: Page refresh → user has "consent accepted" status
  - Owner: QA
  - Time: 1 hour

- [ ] **Leverage: Verify cap at 2.5x**
  - Test: Try set leverage = 3.0x → rejected
  - Test: Try set leverage = 2.5x → accepted
  - Test: Simulator shows "Max 2.5x based on your score"
  - Owner: QA + Backend
  - Time: 1 hour

---

### DAY 7 (WEDNESDAY, JUNE 11) - FINAL REVIEW + LEGAL SIGN-OFF
**Focus: Legal counsel feedback + finalization**

#### External Review Feedback
- [ ] **Receive legal counsel feedback** (4-day turnaround from D5)
  - Documents: Privacy, ToS, Risk Disclosure with comments
  - Owner: Legal
  - Time: 1 hour (read + assess)

- [ ] **Incorporate counsel feedback**
  - Revisions: Address all critical comments
  - Decision: Accept/reject non-critical comments
  - Owner: Legal
  - Time: 2-3 hours

- [ ] **Final legal docs complete (v1.0)**
  - Status: Ready to publish
  - Version: 1.0, effective June 12, 2026
  - Owner: Legal
  - Files to update:
    - `legal/privacy-policy.md` (final v1.0)
    - `legal/terms-of-service.md` (final v1.0)
    - `legal/risk-disclosure.md` (final v1.0)
    - `legal/VERSIONS.md` (log all versions + dates)

#### Staging Deployment
- [ ] **Deploy RiskDisclaimerModal to staging**
  - Environment: staging.lbhsystem.com
  - Status: All features live (disclaimer, consent, leverage cap)
  - Owner: DevOps + Frontend
  - Time: 1 hour

- [ ] **Internal smoke test in staging**
  - Test: Can register new user?
  - Test: Modal appears?
  - Test: Can accept consent?
  - Test: Can't use leverage without consent?
  - Owner: QA
  - Time: 1 hour

---

### DAY 8 (THURSDAY, JUNE 12) - GO/NO-GO DECISION
**Focus: Executive decision on launch timing**

#### Morning: Final Check
- [ ] **Review all "MUST" checklist items** (from COMPLIANCE_CHECKLIST_GO_NOGO.md)
  - Count: How many completed ✅?
  - Gaps: Any blockers?
  - Owner: Product Lead
  - Time: 30 min

- [ ] **CVM response status check**
  - Did CVM respond? If yes: Read + assess
  - If no: Expected 30-45 days (plan accordingly)
  - Owner: Legal
  - Time: 15 min

#### Executive Decision Meeting (2 hours)
- **Attendees:** CEO, Product Lead, Legal Lead, Tech Lead
- **Decision to make:**
  1. **LAUNCH DECISION:** Scenario A (full launch), B (phased), or C (delay)?
  2. **Timing:** June 12 (D12), June 19 (end of sprint), or July 1?
  3. **Insurance:** Approve R$20-50k/year budget?
  4. **Risk acceptance:** Accept residual risks? (Acknowledge in writing)

#### Decision Outcomes
- **Scenario A (FULL LAUNCH):** All features live D12-D19
- **Scenario B (PHASED):** Analysis live D12, leverage live D24
- **Scenario C (DELAY):** Revisit June 24 after CVM response

---

## WEEK 2: DEPLOYMENT & MONITORING (June 13-19)

### DAY 9 (FRIDAY, JUNE 13)
**Focus: Decision execution + launch prep**

#### If Scenario A (Full Launch)
- [ ] **Publish legal documents to website**
  - Pages: /legal/terms-of-service, /legal/privacy-policy, /legal/risk-disclosure
  - Requirement: Accept before using any features
  - Owner: Frontend + Product
  - Time: 1 hour

- [ ] **Release notes preparation**
  - Message: "New compliance features: Risk Disclaimer, updated ToS, privacy policy"
  - Warning: "Leverage carries high risk, read disclaimer"
  - Owner: Product + Marketing
  - Time: 1 hour

#### If Scenario B or C
- [ ] **Update roadmap**
  - Messaging: "Phase 1: Analysis tools, Phase 2: Leverage (pending legal review)"
  - Owner: Product
  - Time: 30 min

---

### DAY 10-12 (JUNE 14-17) - DEPLOYMENT PHASE
**Focus: Go live with compliance features**

#### Deployment (if Scenario A or B)
- [ ] **Deploy to production**
  - Modal: RiskDisclaimerModal live
  - Docs: ToS, Privacy, Risk Disclosure published
  - API: Consent logging active
  - Leverage: Cap at 2.5x (or feature disabled)
  - Owner: DevOps + Product
  - Time: 2-3 hours

- [ ] **Post-deployment monitoring**
  - Metric: Consent acceptance rate (target >90% in 48h)
  - Metric: Modal display count (should match new user count)
  - Metric: Error rate in consent API (target 0.1% or less)
  - Alert: If consent rate <80% (users rejecting = bad UX)
  - Owner: DevOps + Analytics
  - Duration: 48-72 hours post-launch

- [ ] **Support + user comms**
  - Email: Send announcement + link to privacy policy
  - FAQ: Create "What's the disclaimer modal?" + "Why do I need to accept?"
  - Support: Prep team for questions about legal docs
  - Owner: Product + Support
  - Time: 2 hours

---

### DAY 13-14 (JUNE 18-19) - SPRINT REVIEW & RETRO
**Focus: Reflect + plan Q2 remaining work**

#### Sprint Review (1 hour)
- [ ] **Present completed work**
  - Documents: ToS, Privacy, Risk Disclosure (all v1.0)
  - Modal: RiskDisclaimerModal live + consent logging
  - Compliance: Leverage cap at 2.5x (or phased approach)
  - CVM: Email sent + awaiting response
  - Owner: Product Lead

#### Retrospective (1 hour)
- [ ] **Team reflection**
  - What went well? (E.g., legal counsel collaboration)
  - What could improve? (E.g., faster doc turnaround)
  - Blockers? (E.g., CVM uncertainty)
  - Owner: All team leads

#### Post-Sprint Planning
- [ ] **Q2 remaining priorities** (June 19 - July 4)
  - Week 1 (June 19-26): Monitor compliance metrics, await CVM
  - Week 2 (June 26 - July 3): LGPD data export + deletion endpoints
  - Week 3 (July 4+): Iterate on UX based on user feedback
  - Owner: Product

---

## SUPPORTING DOCUMENTS

### Essential References
- **Full Assessment:** `LEGAL_REGULATORY_ASSESSMENT_SPRINT1.md`
- **Compliance Checklist:** `COMPLIANCE_CHECKLIST_GO_NOGO.md`
- **Risk Mitigation:** `LEGAL_RISKS_MITIGATION.md`

### Templates (Ready to Use)
- **Risk Disclaimer:** Section 2.2 of assessment
- **ToS:** Section 2.2B of assessment
- **Privacy Policy:** Section 2.2C of assessment
- **Risk Disclosure:** Section 2.2D of assessment

---

## DAILY STANDUP TEMPLATE

**Slack message (each day, 9:30 AM):**

```
🔒 LEGAL SPRINT UPDATE - [DATE]

Yesterday ✓:
- [Task] completed by [Owner]
- [Metric] achieved

Today 🎯:
- [Task] in progress
- [Metric] target

Blockers 🚧:
- [Issue] - [Resolution needed]

Status: [ON TRACK / AT RISK / BLOCKED]
```

---

## SUCCESS METRICS (End of Sprint)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Legal documents ready | 3 (ToS, Privacy, Risk Disc) | ? | ⏳ |
| Legal review complete | Yes (counsel sign-off) | ? | ⏳ |
| Risk Modal deployed | Yes (live in prod) | ? | ⏳ |
| Consent logged | Yes (DB + 1000+ records) | ? | ⏳ |
| CVM query sent | Yes (dated email) | ? | ⏳ |
| Leverage cap implemented | 2.5x (or phased) | ? | ⏳ |
| Go/No-Go decision made | Yes (documented) | ? | ⏳ |
| Team aligned | 7/7 stakeholders | ? | ⏳ |

---

## ESCALATION PATH

**If blocker occurs:**

1. **Product/Legal Lead:** Try to resolve (1 day)
2. **PM + Legal Lead:** Escalate (same day)
3. **CEO:** Final decision (next day)

**Critical escalations:**
- CVM blocks us (pivot to analysis-only)
- Legal counsel finds fatal flaw (rework docs)
- Security vulnerability found (delay launch)

---

## NOTES FOR TEAM

### For Legal Team
- Use templates provided (don't start from scratch)
- Coordinate with external counsel early (they're slow)
- Version every document (v1.0, v1.1, v2.0)
- Keep CVM email + response (legal evidence)

### For Product Team
- Make leverage decision (2.5x) by D4
- Be prepared to delay leverage launch if needed
- Plan user comms around compliance changes
- Set KPIs: Consent rate, modal rejection rate, etc.

### For Frontend Team
- Mobile-first for modal (most users on phones)
- Test accessibility (WCAG AA minimum)
- Clear visual hierarchy (warnings > other info)
- Keep modal ≤2 minutes to read

### For Backend Team
- Log everything (timestamps, IP, user-agent)
- Write tests for consent API (critical)
- Prepare migration for consent_logs table
- Alert if consent validation fails

### For DevOps Team
- Staging environment ready before D6
- Production deploy plan by D10
- Monitoring dashboards for consent metrics
- Rollback plan (if consent API fails)

---

## FINAL CHECKLIST (Before Launch)

**HARD STOP - Do not launch without these:**

- [ ] All 3 legal documents published (Privacy, ToS, Risk Disc)
- [ ] Legal counsel sign-off (email confirming)
- [ ] Risk Modal live + tested on mobile
- [ ] Consent logging working (can verify in DB)
- [ ] Leverage cap at 2.5x (or feature flagged off)
- [ ] CVM email sent (screenshot proof)
- [ ] E&O insurance quote received (budget approved)
- [ ] Team training: Every engineer knows compliance importance
- [ ] Go/No-Go decision documented (email from CEO)

**If ANY of above is missing → DELAY LAUNCH 1 week**

---

**Owner:** Legal Team + Product Lead  
**Approval:** CEO  
**Version:** 1.0  
**Effective:** June 5, 2026  
**Next Review:** June 19, 2026 (Sprint Review)

---

**This plan is the legal roadmap for Sprint 1. Follow it exactly. No shortcuts.**
