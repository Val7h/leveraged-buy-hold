# LBH SYSTEM - LEGAL DOCUMENTATION INDEX
## Sprint 1 Compliance Package (June 5-19, 2026)

---

## 📑 DOCUMENT STRUCTURE

This folder contains **all legal documents** required for compliance before launching leverage features.

### Organization
```
legal/
├── README_LEGAL_SPRINT1.md (this file - index & quick reference)
├── TERMS_OF_SERVICE_PT_BR_V1.0.md (2-3 pages, PT-BR)
├── PRIVACY_POLICY_LGPD_PT_BR_V1.0.md (4-5 pages, PT-BR + LGPD Art. 14)
├── RISK_DISCLOSURE_PT_BR_V1.0.md (8+ pages, PT-BR detailed)
├── VERSIONS.md (version control for all documents)
└── /archives/ (old versions, kept for 5 years)
```

---

## 🎯 QUICK START (5-MINUTE REFERENCE)

### For Product Lead
**Today (D1):** 
- [ ] Read: LEGAL_EXECUTIVE_BRIEFING_SPRINT1.md (section 1-3)
- [ ] Action: Approve 3 decisions (CVM risk, leverage cap, launch date)
- [ ] Action: Schedule legal review meeting (D8)

**By D5:**
- [ ] Leverage cap decision signed (2.5x recommended)
- [ ] CVM query email sent to consultapublica@cvm.gov.br
- [ ] Legal consulting RFQ sent to 3 law firms

**By D12:**
- [ ] All documents published (ToS, Privacy, Risk Disclosure)
- [ ] Risk Disclaimer Modal implemented (Frontend + Backend)
- [ ] Consent logging tested (DB + API)
- [ ] GO/NO-GO decision made

### For Legal/Compliance
**Today (D1):**
- [ ] Email CVM regulatory query (template in section 2.1)
- [ ] Call 3 law firms for RFQ (60-day review, ~R$10-20k)
- [ ] Create /legal folder in repo (done ✅)
- [ ] Customize ToS/Privacy/Risk templates (company-specific details)

**By D7:**
- [ ] Finalize ToS (review, incorporate legal counsel feedback)
- [ ] Finalize Privacy Policy (LGPD review, add company-specific data types)
- [ ] Finalize Risk Disclosure (verify all 10 risks covered)
- [ ] Publish to website: `/legal/[tos|privacy|risk-disclosure].pdf`
- [ ] Version control in git (v1.0 tags)

**By D12:**
- [ ] Have lawyer review all 3 documents (signed memo)
- [ ] Get CVM response (or confirm queued for 30-45 day wait)
- [ ] Report to legal review meeting (D8)
- [ ] Ensure consent logging is auditable (for CVM if requested)

### For Backend
**By D7:**
- [ ] Create DB schema (section 4 of EXECUTIVE_BRIEFING)
  - `compliance.disclaimer_acceptances`
  - `compliance.leverage_consents`
  - `compliance.terms_updates`
  - `compliance.user_consent_log`
- [ ] API endpoints (4 total)
  - `POST /api/compliance/accept-disclaimer`
  - `GET /api/compliance/my-acceptances`
  - `POST /api/compliance/consent-leverage`
  - `POST /api/user/data/export` (LGPD right to access)

**By D12:**
- [ ] Test consent logging (verify IP, timestamp, version captured)
- [ ] Integrate disclaimer acceptance into user signup flow
- [ ] Verify all acceptances logged before user can access leverage
- [ ] Set up data retention / deletion cron jobs

### For Frontend
**By D7:**
- [ ] Build RiskDisclaimerModal component
  - Path: `src/components/RiskDisclaimerModal.tsx`
  - Design: Reference section 3.2 of EXECUTIVE_BRIEFING
  - Behavior: Dual checkboxes, timestamp logging, can't skip
- [ ] Publish links to ToS/Privacy/Risk Disclosure
  - In footer: "Legal" → opens PDF links
  - In settings: Acceptance history visible

**By D12:**
- [ ] Test modal on all devices (mobile/tablet critical!)
- [ ] Verify checkboxes required before "Continue" button enabled
- [ ] Confirm modal appears FIRST TIME user accesses leverage
- [ ] Add tracking: Which users have NOT accepted (follow-up email)

---

## 📄 DOCUMENT SUMMARIES

### 1. TERMS_OF_SERVICE_PT_BR_V1.0.md
**Length:** 2-3 pages | **Audience:** All users | **Critical:** YES

**What it covers:**
- Platform scope (what we do / don't do)
- User obligations (age 18+, sophisticated investor)
- Risk acknowledgment (leverage, liquidation, system failure)
- Liability limitation (our max responsibility = fees paid)
- Termination policy (how to delete account)
- Applicable law (Brazil, CVM, LGPD, CDC)

**Key clause:** 
> "EM NENHUMA CIRCUNSTÂNCIA SEREMOS RESPONSÁVEIS POR PERDA DE CAPITAL, MESMO QUE TENHAMOS SIDO AVISADOS DA POSSIBILIDADE"

This protects us legally if user loses money (not through our negligence).

**Status:** ✅ Template ready, needs legal review

**Usage:**
- Publish at: `/legal/terms-of-service.pdf`
- Show acceptance checkbox: Signup page
- Log acceptance: DB table `compliance.terms_updates`
- Version control: Tag `tos-v1.0` in git

---

### 2. PRIVACY_POLICY_LGPD_PT_BR_V1.0.md
**Length:** 4-5 pages | **Audience:** All users | **Critical:** YES (LGPD mandatory)

**What it covers:**
- Data collected (name, email, CPF, risk profile, trades, IP, compliance logs)
- Purpose for each data (ID, personalization, compliance, security)
- Retention periods (2 years default, 5 years CPF/compliance, 90 days IP)
- Data sharing (only Quantfury, FMP, payment processor - with DPA)
- User rights (access, correct, delete, port, revoke consent, object)
- Security measures (TLS, bcrypt, encryption, access control)
- Breach notification (ANPD in 48h, users notified)

**Key LGPD articles:**
- Art. 7: Base legal for processing
- Art. 14: Transparency (must have privacy policy)
- Art. 16: Breach notification (48h to ANPD)
- Art. 17: Right to deletion
- Art. 18: User rights (7 rights listed)

**Status:** ✅ Template ready, needs LGPD review

**Usage:**
- Publish at: `/legal/privacy-policy.pdf`
- Show acceptance checkbox: Signup page
- Implement LGPD endpoints:
  - Data export: `GET /api/user/data/export` (15 days to respond)
  - Account deletion: `DELETE /api/user/account` (30 days to process)
- Version control: Tag `privacy-v1.0` in git

---

### 3. RISK_DISCLOSURE_PT_BR_V1.0.md
**Length:** 8+ pages | **Audience:** Users of leverage | **Critical:** YES (CVM requirement)

**What it covers (10 risks):**
1. Leverage amplification (2.5x = -25% when market -10%)
2. Margin calls & liquidation (automatic, no warning)
3. System failures (alerts can fail, server can crash)
4. VaR limitations (doesn't predict tail risk, 2008-type events)
5. Model risk (scoring may underperform)
6. Data errors (delays, splits, wrong historical data)
7. Liquidity risk (low-volume stocks, gaps, circuit breakers)
8. Psychological traps (overconfidence, sunk cost fallacy)
9. Concentration risk (single stock = all-in)
10. Regulatory changes (CVM can ban/restrict leverage)

**Plus:**
- 3 stress scenarios (2008 replay, inflation+rates, fraud/black swan)
- Pre-leverage checklist (10 items, user must mark all)
- Alternatives to leverage (DCA, diversification, stops, options)

**Status:** ✅ Template ready, needs CVM review

**Usage:**
- Publish at: `/legal/risk-disclosure.pdf`
- Show: FIRST TIME user accesses leverage features
- Modal: RiskDisclaimerModal component (2 checkboxes, must accept)
- Log acceptance: DB table `compliance.disclaimer_acceptances` with IP, version, timestamp
- Version control: Tag `risk-v1.0` in git

---

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Documents (D1-D7)
- [ ] Customize all 3 templates
  - [ ] Add company name, contact email, address, phone
  - [ ] Add specific data types collected (check PRIVACY_POLICY section 2)
  - [ ] Add leverage cap (2.5x per decision)
  - [ ] Add retention periods (verify against legal advice)
  
- [ ] Legal review
  - [ ] Send to lawyer (RFQ responses by D5)
  - [ ] Get feedback (comments, edits, required changes)
  - [ ] Incorporate feedback (ensure no weakening of liability limits)
  - [ ] Sign off (lawyer provides memo: "Compliant with CVM/LGPD")

- [ ] Publish
  - [ ] Create PDF versions (convert from markdown)
  - [ ] Host on website: `/legal/*`
  - [ ] Add footer links (every page should have "Legal" link)
  - [ ] Version control in git (tag v1.0 for all 3)

### Phase 2: Database & API (D1-D7)
- [ ] Create schema
  - [ ] Run migrations: 4 new tables (section 4, EXECUTIVE_BRIEFING)
  - [ ] Add indexes for performance
  - [ ] Test schema with dummy data

- [ ] Implement API endpoints
  - [ ] `POST /api/compliance/accept-disclaimer`
    - Input: user_id, disclaimer_version, checkbox_status
    - Output: acceptance_id, timestamp
    - Error: If checkbox not both TRUE, return 400
  - [ ] `GET /api/compliance/my-acceptances`
    - Returns: All past acceptances (for audit)
  - [ ] `POST /api/compliance/consent-leverage`
    - Input: user_id, max_leverage (1.0, 2.0, 2.5)
    - Stores: In DB for audit trail
  - [ ] `POST /api/user/data/export` (LGPD)
    - Returns: JSON with all personal data
    - Async: Schedule for 15 days

- [ ] Test API
  - [ ] Verify IP/user-agent captured
  - [ ] Verify timestamp accurate
  - [ ] Verify version tracked
  - [ ] Verify errors handled (bad input, missing required fields)

### Phase 3: Frontend (D6-D7)
- [ ] RiskDisclaimerModal component
  - [ ] Create: `src/components/RiskDisclaimerModal.tsx`
  - [ ] Design: Based on section 3.2, EXECUTIVE_BRIEFING
  - [ ] Functionality:
    - [ ] Modal appears FIRST access to leverage settings
    - [ ] Prevent scrolling on page behind modal
    - [ ] Show full risk disclosure text (8+ pages)
    - [ ] User must scroll to bottom to unlock buttons
    - [ ] Two checkboxes (must BOTH be checked)
      - ☑ "Li e entendo os riscos de alavancagem"
      - ☑ "Aceito liquidação automática de posição"
    - [ ] "Aceitar" button disabled until both checked
    - [ ] "Não, ver docs primeiro" → links to PDF
    - [ ] Click "Aceitar" → API call → navigate to leverage settings
  - [ ] Test: Mobile (critical!), tablet, desktop
  - [ ] Test: Try to skip modal (should not be possible)

- [ ] Publish legal links
  - [ ] Footer: Add "Legal" links (ToS, Privacy, Risk Disclosure)
  - [ ] Settings page: Show acceptance history
    - [ ] Date accepted
    - [ ] Version number
    - [ ] IP address (first 3 octets only for privacy)
  - [ ] Signup flow: Before creating account, show and require ToS + Privacy checkboxes

### Phase 4: Testing & Launch (D8-D12)
- [ ] UAT (User Acceptance Testing)
  - [ ] Test disclaimer modal flow (can't proceed without accepting)
  - [ ] Verify DB logging (check console, check DB directly)
  - [ ] Verify API responses (curl tests)

- [ ] Compliance audit
  - [ ] Lawyer reviews implementation (does UI match docs?)
  - [ ] Verify LGPD requirements (data export, deletion endpoints)
  - [ ] Verify CVM requirements (risk disclosure, leverage cap)
  - [ ] Get sign-off memo from lawyer

- [ ] Documentation
  - [ ] Update README: Add legal docs section
  - [ ] Internal wiki: How to handle complaints (SOP)
  - [ ] Team training: 1h session on legal docs (Product, Frontend, Backend attend)

- [ ] GO/NO-GO decision (D12)
  - [ ] All checklist items ✅
  - [ ] Lawyer sign-off ✅
  - [ ] CVM query sent (response expected in 30-45d) ✅
  - [ ] Risk Disclaimer Modal live ✅
  - [ ] Consent logging auditable ✅
  - [ ] **DECISION:** Launch leverage (D12) or delay to D24?

---

## 🚨 CRITICAL BLOCKERS

If ANY of these are NOT complete by D12, **DO NOT LAUNCH LEVERAGE:**

1. **Risk Disclaimer Modal not live**
   - Users MUST explicitly accept risks before accessing leverage
   - Without this: CVM violation, user lawsuits
   - Impact: 🔴 CRITICAL

2. **Consent logging not working**
   - Must log every acceptance (IP, timestamp, version)
   - For legal defense if user claims "I didn't know"
   - Without this: Lose lawsuit
   - Impact: 🔴 CRITICAL

3. **Privacy Policy not published**
   - LGPD Art. 14 requires transparency
   - Without this: ANPD fine (2% revenue, max R$50M)
   - Impact: 🔴 CRITICAL

4. **Leverage cap not enforced**
   - Must be max 2.5x (not 4x)
   - Backend MUST reject requests > 2.5x
   - Without this: CVM fine (10-50% of user assets)
   - Impact: 🔴 CRITICAL

5. **ToS liability waiver not accepted by user**
   - Users MUST confirm understanding
   - Without this: Can't defend against lawsuits
   - Impact: 🔴 CRITICAL

---

## 📋 DECISION MATRIX

**By D8, answer these 3 questions:**

### Decision 1: CVM Risk Tolerance
- **Conservative:** Launch analysis only (no leverage D10+, leverage waits for CVM response D24+)
- **Balanced (RECOMMENDED):** Launch full (leverage D12), monitor CVM response, be ready to pivot
- **Aggressive:** Launch immediately, assume CVM won't respond

**Recommended:** Balanced (Option B)

### Decision 2: Leverage Cap
- **Safe:** 2.5x (matches B3 standard) ✅ RECOMMENDED
- **Aggressive:** 3.0x (if Quantfury approves)
- **Risky:** 4.0x (ruin risk in crashes)

**Recommended:** 2.5x

### Decision 3: Launch Date
- **Early:** D10 (analysis features only, leverage later)
- **Standard:** D12 (full launch with all docs) ✅ RECOMMENDED
- **Safe:** D24 (wait for CVM response, maximize certainty)

**Recommended:** D12 (if all Tier 1 checklist complete by D11)

---

## 💰 BUDGET SUMMARY (Year 1)

| Item | Cost | Timeline |
|------|------|----------|
| Legal consulting (30-day review) | R$10-20k | D5-D8 |
| Insurance (E&O + Cyber) | R$30-50k | D30-Q3 |
| LGPD/Privacy audit | R$10-15k | Q3 |
| **Subtotal (one-time)** | **R$50-85k** | |
| Ongoing monitoring/updates | R$5-10k/month | Monthly |
| **TOTAL YEAR 1** | **R$110-205k** | |

**Funding:** Should come from Finance/Operations budget, not product.

---

## 📞 REGULATORY CONTACTS

**CVM (Comissão de Valores Mobiliários) - Brazil**
- Email: consultapublica@cvm.gov.br
- For: Regulatory queries, instruction clarification
- Timeline: 30-45 days response

**ANPD (Autoridade Nacional de Proteção de Dados) - Brazil**
- Website: www.gov.br/cidadania
- For: LGPD compliance, data breach reporting
- Timeline: Immediate (especially for breach)

**Banco Central do Brasil**
- For: AML/KYC compliance, FX regulations
- Timeline: 5-10 days

---

## 🔐 LEGAL HOLD & RECORD RETENTION

**Keep forever (legal hold):**
- [ ] All CVM correspondence (queries + responses)
- [ ] Lawyer review memos (signed)
- [ ] Compliance checklist (evidence we did due diligence)
- [ ] Every user's acceptance log (IP, timestamp, version)
- [ ] Incident reports (if breach, lawsuit, complaint)

**Keep 5 years minimum:**
- [ ] ToS/Privacy/Risk versions (audit trail)
- [ ] CPF data (Banco Central requirement)
- [ ] Compliance logs (audit trail)

**Keep 2 years minimum:**
- [ ] User data backups
- [ ] Trade history logs
- [ ] Server logs (IP access patterns)

**Destroy safely:**
- [ ] Run secure deletion (not just "rm")
- [ ] Document destruction (date, method, witness)
- [ ] Certificate of destruction

---

## ✅ SUCCESS CRITERIA (By D12)

**Minimum viable compliance:**
- [ ] Risk Disclaimer Modal implemented & live
- [ ] User acceptance logged (IP, timestamp, version)
- [ ] Terms of Service published & accepted by users
- [ ] Privacy Policy published & accepted by users
- [ ] Risk Disclosure published & accepted by users
- [ ] Leverage cap enforced (2.5x max)
- [ ] CVM query sent (response pending)
- [ ] Lawyer review completed (sign-off memo)
- [ ] Team trained (Legal/Product understand docs)

**Launch is GREEN if all above ✅**

**Launch is YELLOW if:**
- CVM response not yet received (acceptable, 30-45d typical)
- Minor lawyer corrections still being incorporated

**Launch is RED if:**
- Any of the above ❌
- Lawyer finds major compliance gap
- CVM responds "need license" (need pivot plan)

---

## 📞 QUESTIONS?

**For legal/compliance questions:**
- Email: legal@lbhsystem.com
- Slack: #compliance
- Meeting: Bi-weekly legal review (Thursdays 2 PM)

**For regulatory questions:**
- Contact CVM directly: consultapublica@cvm.gov.br
- Consult with retained lawyer

**For urgent issues:**
- Escalate to CEO
- Document the issue
- Get legal advice before taking action

---

**Last Updated:** June 5, 2026  
**Next Review:** June 8, 2026 (legal review meeting)  
**Status:** 🟡 ON TRACK (if decisions made D5)
