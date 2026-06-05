# LBH SYSTEM - COMPLIANCE CHECKLIST (GO/NO-GO)
## Quick Decision Framework for Sprint 1 Launch

**Date:** June 5, 2026  
**Target Decision:** June 8 (D3)  
**Owner:** Product + Legal  
**Status:** ⏳ AWAITING DECISIONS

---

## MUST-HAVE (Non-Negotiable for Public Launch)

### Tier 1: LEGAL DOCUMENTS (D7 - June 12)

- [ ] **Risk Disclaimer Modal**
  - What: Interactive popup explaining leverage risks
  - Where: Appears before any leverage feature
  - Implementation: `src/components/RiskDisclaimerModal.tsx`
  - Acceptance: Dual checkboxes + timestamp logging
  - Status: 📝 Design complete, coding starts D2
  
- [ ] **Terms of Service (ToS)**
  - What: Legal agreement governing platform usage
  - Key elements: Liability limits, service availability, modifications
  - Length: 2-3 pages
  - Review: Internal + legal counsel
  - Status: 📝 Template in LEGAL_REGULATORY_ASSESSMENT_SPRINT1.md section 2.2B

- [ ] **Privacy Policy (LGPD)**
  - What: How we collect, use, store user data
  - Key elements: Data types, consent basis, retention, user rights
  - Length: 2-3 pages
  - Legal requirement: Mandatory under LGPD (Brazil)
  - Status: 📝 Template in LEGAL_REGULATORY_ASSESSMENT_SPRINT1.md section 2.2C

- [ ] **Risk Disclosure (Full)**
  - What: Detailed explanation of investment risks
  - Key elements: Market risk, leverage amplification, model limitations
  - Length: 4-5 pages (comprehensive)
  - Legal requirement: Brazil mandatory before leverage
  - Status: 📝 Template in LEGAL_REGULATORY_ASSESSMENT_SPRINT1.md section 2.2D

### Tier 2: REGULATORY CONFIRMATION (D3-D8)

- [ ] **CVM Regulatory Query** (Highest Priority)
  - Action: Email consultapublica@cvm.gov.br
  - Question: "Does our investment screening platform with leverage recommendations constitute 'consultoria de investimentos'?"
  - Timeline: Response expected in 30-45 days
  - Why: Determines if we need CVM license
  - Status: 📋 MUST SEND BY TOMORROW (June 6)
  - If YES → Need license (3-6 months lead time)
  - If NO → Safe harbor with documentation
  - Contingency: Have "analysis only" version ready (no score)

- [ ] **Leverage Limit Decision**
  - Current: 4.0x (our models)
  - B3 Standard: 2.5x (regulated brokers)
  - Quantfury: 3.0-5.0x (needs clarification)
  - Risk: 4.0x with 25% drawdown = -100% ruin
  - **RECOMMENDATION:** Cap at 2.5x until CVM confirms
  - Status: 🚨 BLOCKER - Needs approval by D5
  - Effort: 2h backend change, update scoring tables

- [ ] **Consent Logging System**
  - What: Track every user's acceptance of risks
  - Data: timestamp, IP, user-agent, document version
  - Why: Evidence user understood risks (legal defense)
  - DB: New `consent_logs` table (schema in appendix)
  - Status: 📋 Backend API design done, implementation starts D3

### Tier 3: TECHNICAL SECURITY (D5-D7)

- [ ] **TLS 1.3 in Production**
  - Why: Encrypt all user data in transit
  - Check: Run `curl -I https://api.lbhsystem.com` → verify TLS version
  - Status: ✅ Likely already done (Vercel/Railway both enforce)

- [ ] **Password Security**
  - Algorithm: bcrypt or argon2 (not plain text or MD5)
  - Check: Code review `app/core/security.py`
  - Status: ✅ Likely already done (FastAPI best practice)

- [ ] **2FA for Sensitive Actions**
  - When: Required for leverage setting changes
  - Method: Email OTP or TOTP
  - Status: ⚠️ TODO (scope: Q3 2026)
  - For now: Can skip (marked as future)

---

## NICE-TO-HAVE (Recommended but not blocking)

- [ ] **Disclaimer Version Control**
  - Approach: Every doc has version + effective date
  - Updates: 30 days notice before changes take effect
  - Status: 📋 Planned for D8

- [ ] **LGPD Rights Implementation**
  - Features: Data export, account deletion
  - When: Both required by law, but implementation can be phased
  - Phase 1 (D10): Data export endpoint
  - Phase 2 (D12): Account deletion workflow
  - Status: 📋 Split across two sprints

- [ ] **Insurance**
  - Types: Cyber liability (R$200-500k), E&O (R$500k-2M)
  - Cost: R$20-50k/year
  - Timeline: Secure by end of Q2 2026
  - Status: 📋 Sourcing RFQ by D10

- [ ] **Legal Consulting Agreement**
  - What: Retainer with fintech law firm
  - Cost: R$5-15k one-time assessment
  - Benefit: Expert review of all legal docs
  - Timeline: Engage by D5, review by D8
  - Status: 📋 Sourcing by D3

---

## GO/NO-GO DECISION MATRIX

### Scenario A: PROCEED WITH LEVERAGE (All Tier 1 complete)

**Conditions:**
- ✅ Risk Disclaimer Modal live
- ✅ ToS + Privacy reviewed by lawyer
- ✅ Risk Disclosure published
- ✅ Leverage capped at 2.5x
- ✅ Consent logging implemented
- ⚠️ CVM response pending (not blocking)

**Timeline:** Launch D10-D12 (June 15-17)  
**Risk Level:** MEDIUM (60% CVM will respond "no license needed")  
**Insurance:** Must add E&O by Q3

### Scenario B: LAUNCH ANALYSIS FEATURES ONLY (Tier 1 delayed)

**Rationale:**
- CVM response uncertain
- Legal docs need more review
- Safer to delay leverage 2 weeks

**Features live (D10):**
- ✅ Stock screening (no leverage)
- ✅ Risk metrics (VaR, Sharpe)
- ✅ Backtesting (historical comparison)
- ✅ Monte Carlo (no leverage recommendation)

**Leverage goes live (D24-D31):**
- Once legal docs finalized
- Once CVM responds
- Once disclaimer tested with 100+ users

**Timeline:** Phase 1 launch D10, Phase 2 launch D24  
**Risk Level:** LOW (regulatory safe)  
**User Impact:** Delayed, but feature-complete later

### Scenario C: NO-GO (Any Tier 1 blocker)

**Triggers:**
- ❌ Can't get CVM answer + legal advice in time
- ❌ Leverage clearly requires license (not feasible)
- ❌ Legal counsel advises against launch

**Delay:** Iterate on product, push to July 2026  
**Pivot:** Focus on SaaS model (no leverage, subscription)

---

## DECISION TIMELINE

| Date | Milestone | Decision | Owner |
|------|-----------|----------|-------|
| D1 (Jun 5) | TODAY | Approve this checklist | CEO/PM |
| D1 (Jun 5) | TODAY | Send CVM query + hire lawyer | Legal |
| D3 (Jun 7) | Fri | First draft ToS/Privacy ready | Legal |
| D5 (Jun 9) | Sun | Leverage limit decision | Product |
| D7 (Jun 11) | Tue | All docs reviewed by lawyer | Legal |
| **D8 (Jun 12)** | **WED** | **GO/NO-GO DECISION** | **CEO/PM** |
| D10 (Jun 14) | Fri | Launch Scenario A or B | PM |

---

## EXECUTION CHECKLIST (By Role)

### LEGAL (Deadline: D8)

- [ ] Draft/Review ToS (use template section 2.2B)
- [ ] Draft/Review Privacy Policy (use template section 2.2C)
- [ ] Draft/Review Risk Disclosure (use template section 2.2D)
- [ ] Hire external legal counsel (fintech specialist)
- [ ] Send CVM regulatory query (by D2)
- [ ] Create /legal folder in repo
- [ ] Version control docs (VERSIONS.md)

### FRONTEND (Deadline: D7)

- [ ] Implement RiskDisclaimerModal component
- [ ] Add dual-checkbox logic (entendo + concordo)
- [ ] Style with TailwindCSS + animations
- [ ] Test accessibility (keyboard nav, ARIA labels)
- [ ] Add localStorage flag (show once)
- [ ] Test on mobile (must be readable)
- [ ] QA: verify checkboxes control button state

### BACKEND (Deadline: D7)

- [ ] Create `consent_logs` table (schema in appendix)
- [ ] Implement `POST /api/v1/legal/consent` endpoint
- [ ] Implement `GET /api/v1/legal/status` endpoint
- [ ] Log IP + user-agent with every consent
- [ ] Return timestamp to frontend (for verification)
- [ ] Add test: verify consent required before leverage
- [ ] Reduce max leverage from 4.0x → 2.5x in models

### PRODUCT (Deadline: D5)

- [ ] Decide: Leverage cap at 2.5x (MUST DECIDE)
- [ ] Decide: Scenario A vs B vs C (D8)
- [ ] Draft contingency comms if delay needed
- [ ] Create user-facing FAQ (risks, disclaimers, etc)
- [ ] Define alert thresholds (when to warn users)

### DEVOPS (Deadline: D5)

- [ ] Verify TLS 1.3 in production
- [ ] Verify password hashing (bcrypt/argon2)
- [ ] Set up compliance monitoring (track consents)
- [ ] Backup strategy for legal docs (immutable)

---

## RISK MITIGATION (If you can't meet deadlines)

### If ToS not reviewed by lawyer → D8+3 days

**Mitigation:**
- Launch with "DRAFT" disclaimer (legal review pending)
- Email all users on Day 1: "Updated ToS coming June 15"
- Mark in UI: ⚠️ These terms may change
- Risk: Medium (acceptable for SaaS pattern)

### If CVM doesn't respond → Beyond D8

**Mitigation:**
- Proceed with Scenario B (analysis only, no leverage)
- Launch leverage features with 30-day legal disclaimer
- Commit to update docs when CVM responds
- Risk: Low (safe harbor for good-faith effort)

### If consent logging not ready → D10

**Mitigation:**
- Roll out without logging, add catch-up feature
- Manually log key consents (spreadsheet)
- Retroactively correlate once DB is ready
- Risk: Medium (compliance gap, but acceptable for catch-up)

---

## SUCCESS CRITERIA

### D7 (Wed June 12) - All Tier 1 Complete?

- [ ] ToS signed off by legal (or clear path by D10)
- [ ] Privacy Policy signed off by legal
- [ ] Risk Disclosure complete + accessible
- [ ] Risk Modal on staging (working)
- [ ] Consent DB schema tested
- [ ] Leverage cap changed to 2.5x
- [ ] CVM query sent (response pending)

### D8 (Wed June 12) - GO Decision?

**GO:** YES if 6+ of above 7 checkboxes ✅  
**NO-GO:** if 4 or fewer ❌

**Tiebreaker:** Legal counsel assessment

### D10 (Fri June 14) - Launch?

**Option 1:** Full launch (all features)  
**Option 2:** Phased (analysis now, leverage June 24)  
**Option 3:** Delay (push to July, resolve CVM uncertainty)

---

## APPENDIX: DATABASE SCHEMA

```sql
-- Compliance & Consent Tracking
CREATE TABLE consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'risk_disclaimer', 'tos', 'privacy', 'leverage'
    document_version VARCHAR(10) NOT NULL, -- '1.0', '1.1', etc
    accepted BOOLEAN NOT NULL,
    accepted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_consent_per_user_type_version 
        UNIQUE (user_id, consent_type, document_version)
);

CREATE INDEX idx_consent_user_id ON consent_logs(user_id);
CREATE INDEX idx_consent_type ON consent_logs(consent_type, accepted);
CREATE INDEX idx_consent_date ON consent_logs(accepted_at);

-- Policy: User can only access leverage if has accepted risk_disclaimer v1.0+
CREATE POLICY leverage_requires_consent AS (
    SELECT user_id FROM consent_logs
    WHERE consent_type = 'risk_disclaimer'
    AND accepted = TRUE
    AND document_version >= '1.0'
);
```

---

## CONTACTS & RESOURCES

### Legal/Regulatory
- **CVM:** consultapublica@cvm.gov.br | +55 21 3131-8000
- **ANBIMA:** compliance@anbima.org.br | +55 11 3879-7000

### Legal Consultants (To Source)
- Bechara & Associados (fintech focus)
- Veirano Advogados (Brasília office)
- Cost estimate: R$5-15k for regulatory assessment

### Insurance Providers
- Marsh / Aon (cyber liability)
- Cost estimate: R$15-30k/year for E&O coverage

### Internal Documentation
- Full assessment: `LEGAL_REGULATORY_ASSESSMENT_SPRINT1.md`
- This checklist: `COMPLIANCE_CHECKLIST_GO_NOGO.md`
- Repo: `/legal` folder (to be created)

---

## SIGN-OFF

**Prepared by:** [Legal/PM Name]  
**Reviewed by:** [TBD]  
**Approved by:** [CEO/Founder]  

**Date:** June 5, 2026  
**Status:** ⏳ AWAITING APPROVAL & DECISION  
**Next Review:** June 8, 2026 (D3 - GO/NO-GO)

---

**This checklist is CRITICAL for launch. Do not proceed without sign-off from Legal + Product.**
