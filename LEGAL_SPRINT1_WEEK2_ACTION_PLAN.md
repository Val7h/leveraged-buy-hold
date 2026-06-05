# SPRINT 1 WEEK 2 EXECUTION PLAN - LEGAL LEAD
**June 9-15, 2026**

---

## 📋 EXECUTIVE SUMMARY

**Critical Objectives (5 deliverables by Friday June 13):**

1. ✅ **CVM Query Sent** — Send regulatory query to consultapublica@cvm.gov.br with confirmation receipt
2. ✅ **Document Customization Complete** — All 3 legal docs fully customized (ToS, Privacy, Risk Disclosure)
3. ✅ **Internal Review Complete** — CEO + Risk Officer review + approve (signed memo)
4. ✅ **Disclaimer Modal Finalized** — Checkbox language locked + approved
5. ✅ **Ready to Publish** — All docs ready for publication on June 16 (Monday)

**Launch Confidence:** On Track IF all deliverables complete by Friday EOD  
**CVM Response Timeline:** 30-45 days (OK to proceed in parallel)  
**Week 2 Status:** GREEN (all documents drafted, now customization + approval)

---

## 📅 DETAILED DAILY CHECKLIST

### DAY 1: MONDAY, JUNE 9 (CVM Query Launch)

**CRITICAL BLOCKER:** CVM query must be sent today

#### Morning (9 AM - 12 PM):

- [ ] **Prepare CVM Query Email**
  - File: `/legal/CVM_QUERY_TEMPLATE.md` (already drafted)
  - Customize:
    - [ ] Company name → [LBH System legal name]
    - [ ] Contact email → [your@email.com]
    - [ ] Contact phone → [+55 11 XXXX-XXXX]
    - [ ] Exact leverage range offered → [1.0x - 2.5x]
    - [ ] Exact score thresholds → [current algorithm specs]
  - Review for tone: Professional, concise, respectful of regulatory authority
  - Recipient: **consultapublica@cvm.gov.br**
  - Subject line: `Regulatory Query: Investment Analysis Platform - Scope Clarification`
  - Expected response: 30-45 business days

#### Afternoon (1 PM - 5 PM):

- [ ] **Send CVM Query**
  - Copy text from `CVM_QUERY_TEMPLATE.md`
  - Send from official company email account
  - Save sent email to `/legal/CVM_CORRESPONDENCE/` folder
  - **CRITICAL:** Take screenshot of sent confirmation
  - Create `/legal/CVM_CORRESPONDENCE/README.md` with:
    - [ ] Date sent
    - [ ] Recipient email
    - [ ] Subject line used
    - [ ] Full email body (as sent)
    - [ ] Expected response date range
    - [ ] Status: `SENT - Awaiting Response`

- [ ] **Confirm Receipt**
  - Check email for automated "delivery confirmation" or bounce
  - If bounce: troubleshoot and resend
  - Expected: Automated confirmation within 2 hours
  - Document: Screenshot → `/legal/CVM_CORRESPONDENCE/001_CVM_Query_SentConfirmation.png`

- [ ] **Report to CEO**
  - Email CEO: "CVM Query Sent Successfully"
  - Include: Sent date/time, expected response window (30-45d), confirmation screenshot
  - Subject: `[WEEK 2 - DAY 1] CVM Query Sent ✅`

**End of Day 1 Deliverable:** ✅ CVM query sent with confirmation + CEO notified

---

### DAY 2-3: TUESDAY-WEDNESDAY, JUNE 10-11 (Document Customization)

**Focus:** Finalize all 3 legal documents with company-specific information

#### Task 1: Customize TERMS_OF_SERVICE_PT_BR_V1.0.md

Current file: `/legal/TERMS_OF_SERVICE_PT_BR_V1.0.md`

Placeholders to fill (currently marked with [XXXX]):

- [ ] **Line 243:** Phone number
  - Current: `📞 **Telefone:** [+55 11 XXXX-XXXX]`
  - Replace with: `📞 **Telefone:** +55 11 3232-8888` (or actual number)
  - Source: Get from company registration

- [ ] **Line 244:** Company address
  - Current: `🏢 **Endereço:** [Endereço da empresa no Brasil]`
  - Replace with: Full legal address in São Paulo
  - Format: "Rua [Nome], nº [X], [Complemento], [CEP], São Paulo, SP"
  - Source: Get from company registration (CNPJ document)

**Review checklist (no changes needed, but verify):**
- [ ] Risk section (7) still clearly states "limited liability" ✅
- [ ] Leverage risks (section 3.2-3.3) match current product spec ✅
- [ ] Liquidation warning (3.3) matches our margin call thresholds ✅
- [ ] Brazilian law reference (section 9) still correct ✅

**Save as:** `TERMS_OF_SERVICE_PT_BR_V1.0_FINAL.md`

---

#### Task 2: Customize PRIVACY_POLICY_LGPD_PT_BR_V1.0.md

Current file: `/legal/PRIVACY_POLICY_LGPD_PT_BR_V1.0.md`

Placeholders to fill (6 total):

- [ ] **Line 13:** Legal company name
  - Current: `- **Nome Legal:** LBH System [razão social completa]`
  - Replace with: Exact registered name from CNPJ (e.g., "LBH SYSTEM LTDA ME")
  - Source: CNPJ registration

- [ ] **Line 14:** CNPJ number
  - Current: `- **CNPJ:** [XXXX.XXXX/XXXX-XX]`
  - Replace with: Full CNPJ (e.g., "12.345.678/0001-90")
  - Format: Must match official registration
  - Source: CNPJ document

- [ ] **Line 15:** Registered address
  - Current: `- **Endereço:** [Endereço registrado no Brasil]`
  - Replace with: Full address (same as ToS)
  - Format: "Rua [Nome], nº [X], [CEP], São Paulo, SP"

- [ ] **Line 16:** Legal email
  - Current: `- **Email:** legal@lbhsystem.com`
  - Verify: Is this correct? If not, update
  - Keep: legal@... format is best practice

- [ ] **Line 17:** Phone number
  - Current: `- **Telefone:** +55 11 XXXX-XXXX`
  - Replace with: Same as ToS

- [ ] **Line 18:** DPO (Data Protection Officer) name/email
  - Current: `- **Encarregado de Dados (DPO):** [Nome, email] *(se aplicável)*`
  - Replace with: Actual DPO name and email
  - OR: If no dedicated DPO, replace with: `- **Encarregado de Dados (DPO):** Contatar legal@lbhsystem.com`
  - Note: LGPD requires DPO or designated contact

**Review checklist (no changes needed, but verify):**
- [ ] Data retention periods (Section 7) match product requirements ✅
- [ ] API endpoints (GET /api/user/data/export, DELETE /api/user/account) exist or planned ✅
- [ ] Security measures (Section 8) realistic for current infrastructure ✅
- [ ] Breach notification timeline (48h to ANPD) is feasible ✅

**Save as:** `PRIVACY_POLICY_LGPD_PT_BR_V1.0_FINAL.md`

---

#### Task 3: Verify RISK_DISCLOSURE_PT_BR_V1.0.md (No placeholders, but verify URLs)

Current file: `/legal/RISK_DISCLOSURE_PT_BR_V1.0.md`

**No text customization needed** — This is regulatory content.

**BUT: Verify all URLs work:**

Search for URLs in document (lines with "http://" or "https://"):

- [ ] Check if document contains any URLs to verify
- [ ] If yes, test each link:
  - [ ] Open in browser
  - [ ] Confirm page loads (no 404)
  - [ ] Document status in checklist

**Review checklist (critical content verification):**
- [ ] Leverage amplification table (Section 1.2) matches product limits ✅
  - Row: "-40%" column "2.5x" = "-100% (ruin)" — CORRECT
  - This matches our 2.5x max leverage policy
- [ ] Risk factors (10 total) align with product design ✅
- [ ] Pre-leverage checklist (if exists) is comprehensive ✅
- [ ] Stress test scenarios (Section 3) are realistic ✅

**Save as:** `RISK_DISCLOSURE_PT_BR_V1.0_FINAL.md`

---

#### End of Day 2-3 Deliverable:
- ✅ All 3 documents customized + final versions saved
- ✅ All placeholders filled with accurate company info
- ✅ URLs verified (if applicable)
- ✅ Ready for internal review

---

### DAY 4: THURSDAY, JUNE 12 (Internal Legal Review)

**Owner:** CEO + Risk Officer (you facilitate)

#### Morning (9 AM - 12 PM):

- [ ] **Schedule & Conduct Review Meeting**
  - Duration: 90 minutes minimum
  - Attendees: 
    - [ ] CEO (final decision authority)
    - [ ] Risk Officer (compliance expertise)
    - [ ] You (Legal Lead, presenting)
    - [ ] Optional: Finance Lead (pricing impacts), Backend Lead (API feasibility)
  - Location: Zoom or in-person
  - Agenda:
    1. (5 min) CVM query status + expected timeline
    2. (20 min) Terms of Service walk-through + Q&A
    3. (20 min) Privacy Policy walk-through + Q&A (LGPD focus)
    4. (20 min) Risk Disclosure walk-through + Q&A
    5. (15 min) Disclaimer modal design + checkbox language
    6. (10 min) Feedback synthesis + action items

- [ ] **Send Pre-Read Materials**
  - Send 24h before meeting:
    - TERMS_OF_SERVICE_PT_BR_V1.0_FINAL.md
    - PRIVACY_POLICY_LGPD_PT_BR_V1.0_FINAL.md
    - RISK_DISCLOSURE_PT_BR_V1.0_FINAL.md
    - DISCLAIMER_MODAL_SPEC.md (checkbox language)
  - Request: "Please review and come prepared with questions"

#### Afternoon (1 PM - 5 PM):

- [ ] **Document All Feedback**
  - Create `/legal/INTERNAL_REVIEW_NOTES_JUNE12.md`
  - Capture:
    - [ ] CEO feedback → required changes
    - [ ] Risk Officer feedback → required changes
    - [ ] Legal review comments → clarifications needed
    - [ ] Action items → who is responsible, deadline

- [ ] **Categorize Feedback**
  - **BLOCKING:** Must fix before publication (e.g., wrong phone number, liability waiver too weak)
  - **IMPORTANT:** Should fix (e.g., clarify language, improve formatting)
  - **NICE-TO-HAVE:** Can address in v1.1 (e.g., add FAQ section)

- [ ] **Create Action Item List**
  - Format: `| Issue | Type | Owner | Deadline | Status |`
  - Example:
    | Clarify "2.5x leverage only" in ToS | BLOCKING | Legal | Fri EOD | Pending |
    | Add DPO contact info to Privacy | BLOCKING | CEO | Fri EOD | Pending |
    | Review leverage waiver language | IMPORTANT | Risk Officer | Fri EOD | Pending |

**End of Day 4 Deliverable:**
- ✅ Internal review completed
- ✅ All feedback documented
- ✅ Action items assigned with deadlines

---

### DAY 5: FRIDAY, JUNE 13 (Final Approval & Approval Memo)

**CRITICAL:** All documents must be 100% approved today

#### Morning (9 AM - 12 PM):

- [ ] **Implement Feedback from Thursday Review**
  - For each BLOCKING item:
    - [ ] Make edit to document
    - [ ] Save new version
    - [ ] Email edited section to CEO/Risk Officer for sign-off
  - Wait for approval on each item
  - Get verbal or email confirmation: "Looks good, approve ✅"

- [ ] **Finalize Disclaimer Modal Language**
  - Get final approval on checkbox text:
    - [ ] Checkbox 1: "☑️ Li e compreendo os riscos de alavancagem" ✅
    - [ ] Checkbox 2: "☑️ Aceito liquidação automática da posição" ✅
  - Get approval from: CEO + Risk Officer
  - Document: Email confirmation

#### Afternoon (1 PM - 3 PM):

- [ ] **Create Legal Sign-Off Memo**
  - File: `/legal/LEGAL_SIGN_OFF_MEMO_SPRINT1_WEEK2.md`
  - Content template:
  
```markdown
# LEGAL SIGN-OFF MEMO
**Sprint 1 Week 2 Document Approval**

**Date:** June 13, 2026  
**Prepared by:** [Your Name], Legal Lead  
**Approved by:** [CEO Name], CEO + [Risk Officer], Risk Officer  

---

## APPROVAL STATUS

**✅ APPROVED FOR PUBLICATION:**

### 1. Terms of Service (PT-BR V1.0)
- File: `TERMS_OF_SERVICE_PT_BR_V1.0_FINAL.md`
- Date approved: June 13, 2026
- Customization: COMPLETE
  - [x] Phone number added
  - [x] Address added
  - [x] Leverage limits (2.5x max) confirmed
  - [x] Liability waiver language reviewed
- Legal assessment: COMPLIANT with CVM guidelines, CDC, LGPD
- Sign-off: [CEO signature or email confirmation]

### 2. Privacy Policy (LGPD PT-BR V1.0)
- File: `PRIVACY_POLICY_LGPD_PT_BR_V1.0_FINAL.md`
- Date approved: June 13, 2026
- Customization: COMPLETE
  - [x] Legal company name added (CNPJ format)
  - [x] CNPJ number added
  - [x] Address added
  - [x] Phone number added
  - [x] DPO contact added
  - [x] LGPD Art. 7 (legal bases) reviewed
  - [x] User rights (Art. 18) fully implemented
  - [x] Data retention periods realistic
- Legal assessment: COMPLIANT with LGPD (Lei 13.709/2018)
- Sign-off: [CEO signature or email confirmation]

### 3. Risk Disclosure (PT-BR V1.0)
- File: `RISK_DISCLOSURE_PT_BR_V1.0_FINAL.md`
- Date approved: June 13, 2026
- Customization: COMPLETE
  - [x] 10 risk factors documented
  - [x] Leverage amplification table verified (2.5x = -100% at -40% drawdown)
  - [x] Margin call/liquidation warnings clear
  - [x] Pre-leverage checklist included
  - [x] Stress test scenarios realistic
- Legal assessment: COMPLIANT with CVM requirements for investment platforms
- Sign-off: [CEO signature or email confirmation]

### 4. Disclaimer Modal Checkboxes
- Language 1: "☑️ Li e compreendo os riscos de alavancagem"
- Language 2: "☑️ Aceito liquidação automática da posição"
- Approved by: [CEO] + [Risk Officer]
- Status: Ready for frontend implementation

---

## CVM REGULATORY STATUS

- [ ] Query sent: June 9, 2026
- [ ] Recipient: consultapublica@cvm.gov.br
- [ ] Expected response: 30-45 business days (by ~July 22)
- [ ] Contingency: If no response by D30, proceed with "Hybrid approach"
- [ ] Status: AWAITING RESPONSE (OK to proceed with publication)

---

## PUBLICATION TIMELINE

- **Monday, June 16:** Publish all 3 documents on website at `/legal/*`
- **Monday, June 16:** Add footer links to all pages
- **Monday, June 16:** Require acceptance on signup flow
- **Monday, June 16:** Implement disclaimer modal (frontend)

---

## CRITICAL DEPENDENCIES (FOR DEV)

**Backend must implement by June 14 (Saturday) EOD:**
- [ ] Compliance DB schema (4 tables) created
- [ ] API endpoints created (4 endpoints)
  - POST /api/compliance/accept-disclaimer
  - GET /api/compliance/my-acceptances
  - POST /api/compliance/consent-leverage
  - POST /api/user/data/export (LGPD)

**Frontend must implement by June 15 (Sunday) EOD:**
- [ ] RiskDisclaimerModal component created
- [ ] Footer links added
- [ ] Acceptance checkboxes required on signup

**Go-Live Status:** ✅ READY IF all backend/frontend work completes by June 15

---

## LEGAL RISKS IDENTIFIED & MITIGATIONS

| Risk | Probability | Impact | Mitigation | Status |
|------|------------|--------|-----------|--------|
| CVM says "need license" | 40-60% | 🔴 Shutdown | CVM query sent, expert review | ADDRESSED |
| User sues for loss capital | 30-50% | 🔴 R$500k-5M liability | Risk disclosure + consent logging | ADDRESSED |
| LGPD violation / breach | 20-30% | 🔴 ANPD fine R$50M | Privacy policy + security review | ADDRESSED |
| Leverage cap not enforced | 10-20% | 🔴 CVM fine | Backend validation (2.5x max) | ADDRESSED |

---

## APPROVALS

**By signing below, you confirm:**
1. All documents are legally compliant with Brazilian law (CVM, LGPD, CDC)
2. Customization is complete and accurate
3. Disclaimer modal language is clear and effective
4. Ready to publish Monday June 16
5. Risk disclosures are complete and comprehensive

**CEO Approval:** _____________________ Date: _______

**Risk Officer Approval:** _____________________ Date: _______

**Legal Lead:** _____________________ Date: June 13, 2026

---

## NEXT STEPS (PUBLISHED FRIDAY EOD)

1. Backend team: Implement DB schema by Saturday EOD
2. Frontend team: Implement modal by Sunday EOD
3. Monday: Publish documents + activate disclaimer flow
4. Monitor: CVM response timeline (30-45 days)
```

  - Save to: `/legal/LEGAL_SIGN_OFF_MEMO_SPRINT1_WEEK2.md`
  - Print & get signed (or email confirmations)

#### Afternoon (3 PM - 5 PM):

- [ ] **Final Verification Checklist**
  - [ ] All 3 documents finalized (ToS, Privacy, Risk)
  - [ ] All placeholders filled
  - [ ] CEO + Risk Officer approval obtained
  - [ ] Sign-off memo created + signed
  - [ ] CVM query sent (Monday confirmation)
  - [ ] Disclaimer modal language approved
  - [ ] Ready for Monday publication

- [ ] **Send Week 2 Status Report to CEO**
  - Subject: `[WEEK 2 - COMPLETE] All Legal Documents Approved ✅`
  - Content:
    - ✅ CVM query sent Monday
    - ✅ All 3 documents customized
    - ✅ Internal review completed
    - ✅ CEO + Risk Officer approval obtained
    - ✅ Disclaimer modal finalized
    - ✅ Ready for June 16 publication
    - ✅ Sign-off memo attached
  - Confidence: "100% on track for June 16 launch"

**End of Week 2 Deliverable:**
- ✅ CVM query sent + confirmed
- ✅ All 3 documents approved
- ✅ Internal review completed
- ✅ Sign-off memo signed
- ✅ Ready for publication

---

## 🎯 SUCCESS CRITERIA (MUST ALL BE ✅ BY FRIDAY EOD)

- [ ] **CVM Query Sent:** Email delivered to consultapublica@cvm.gov.br with confirmation
- [ ] **ToS Customized:** Phone + address filled, finalized version ready
- [ ] **Privacy Policy Customized:** CNPJ, DPO, address filled, finalized version ready
- [ ] **Risk Disclosure Verified:** URLs working, content accurate, finalized version ready
- [ ] **Disclaimer Modal Language:** Both checkboxes approved by CEO + Risk Officer
- [ ] **Internal Review Complete:** CEO + Risk Officer have reviewed all 3 docs
- [ ] **Approval Memo Signed:** Legal sign-off memo created + signed
- [ ] **Publication Ready:** All docs ready to publish Monday June 16

---

## 📞 ESCALATION CONTACTS (If blocked)

**Blockers during Week 2:**

| Blocker | Contact | Action |
|---------|---------|--------|
| Can't reach CEO/Risk Officer | Product Manager | Schedule urgent meeting |
| Unclear company info (CNPJ, address) | Finance Lead | Request official documents |
| Backend not ready for Monday launch | Dev Lead | Escalate to CEO (may delay) |
| CVM bounces email | External lawyer | Verify correct email address |

---

## APPENDIX: DOCUMENT CUSTOMIZATION REFERENCE

**Data needed to customize (collect NOW if not available):**

```
Company Legal Name: ________________
CNPJ: ________________
Address: ________________
City/State: ________________
Phone: ________________
Email (Legal): ________________
DPO Name/Email: ________________
Leverage Cap (1.0x - 2.5x): ________________
```

**Sources for this data:**
1. CNPJ registration (Junta Comercial)
2. Company incorporation documents
3. Finance Lead or CEO office
4. Legal advisor or accountant

---

**Last Updated:** June 5, 2026  
**Status:** READY FOR WEEK 2 EXECUTION  
**Owner:** Legal Lead  
**Confidence:** GREEN (all documents drafted, now execution phase)
