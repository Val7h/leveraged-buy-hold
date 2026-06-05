# WEEK 3 IMMEDIATE ACTION CHECKLIST
**June 16-19, 2026 - CRITICAL PATH TO GO/NO-GO**

---

## 🚨 URGENT: READ THIS FIRST

**Current Reality Check:**
- All 3 legal documents exist but **NONE are published** to the website
- Risk Disclaimer Modal **has NOT been built** yet
- Consent logging database **does NOT exist** yet
- CEO/Risk Officer approvals **NOT documented yet**
- Only **4 business days** until go/no-go decision Thursday

**Probability of Success:** 40% (if everyone works 8+ hours/day)  
**Recommendation:** Start execution immediately, escalate blockers now

---

## 📋 MONDAY IMMEDIATE ACTIONS (Next 2 hours)

### For Legal Lead (30 minutes)
- [ ] Open `/legal/TERMS_OF_SERVICE_PT_BR_V1.0.md`
  - Line 243: Check if phone number customized (currently shows `[+55 11 XXXX-XXXX]`)
  - Line 244: Check if address customized (currently shows `[Endereço da empresa...]`)
  - **ACTION:** Get company phone + address from Finance Lead TODAY
  - **ACTION:** Fill in placeholders NOW if you have the info
  - **ACTION:** Save as `TERMS_OF_SERVICE_PT_BR_V1.0_FINAL.md`

- [ ] Open `/legal/PRIVACY_POLICY_LGPD_PT_BR_V1.0.md`
  - Line 13: Check company legal name (currently `[razão social completa]`)
  - Line 14: Check CNPJ (currently `[XXXX.XXXX/XXXX-XX]`)
  - Line 15: Check address (currently `[Endereço registrado...]`)
  - Line 17: Check phone (currently `[+55 11 XXXX-XXXX]`)
  - Line 18: Check DPO contact (currently `[Nome, email]`)
  - **ACTION:** Get company data from Finance Lead TODAY
  - **ACTION:** Fill all 6 placeholders NOW
  - **ACTION:** Save as `PRIVACY_POLICY_LGPD_PT_BR_V1.0_FINAL.md`

- [ ] Open `/legal/RISK_DISCLOSURE_PT_BR_V1.0.md`
  - **ACTION:** Verify it's complete (no placeholders to fill)
  - **ACTION:** Confirm with Risk Officer this doc is final (no changes needed)
  - **ACTION:** Save as `RISK_DISCLOSURE_PT_BR_V1.0_FINAL.md`

- [ ] Email Finance Lead:
  ```
  URGENT: Need company data for legal doc publication
  - Phone number (e.g., +55 11 3232-8888)
  - Full address (e.g., Rua X, nº 123, São Paulo, SP 01234-567)
  - Legal company name (razão social completa)
  - CNPJ (XX.XXX.XXX/XXXX-XX)
  - DPO contact (name + email for data protection officer)
  
  Need by: TODAY before 4 PM
  ```

### For CEO/Risk Officer (30 minutes)
- [ ] Block 90 minutes on calendar for legal review meeting
  - **When:** Wednesday June 18, 10 AM (ASAP, not Thursday)
  - **Who:** CEO, Risk Officer, Legal Lead
  - **What:** Review 3 final legal documents + modal design
  - **Outcome:** Signed approval memo
  - **ACTION:** Confirm attendance TODAY

### For Backend Lead (30 minutes)
- [ ] Read: `COMPLIANCE_CHECKLIST_GO_NOGO.md` (appendix - DB schema)
- [ ] Create file: `backend/app/models/compliance.py`
  - This will contain SQLAlchemy model for `consent_logs` table
- [ ] Start Alembic migration: `alembic revision --autogenerate -m "add consent_logs table"`
- [ ] **ACTION:** Have schema ready to run by END OF DAY

### For Frontend Lead (30 minutes)
- [ ] Read: `LEGAL_EXECUTIVE_BRIEFING_SPRINT1.md` (section 3.2 - modal design)
- [ ] Create file: `frontend/src/components/RiskDisclaimerModal.tsx`
  - Empty skeleton with TODO comments
  - Import statements ready
- [ ] Create Next.js page routes (skeleton):
  - `frontend/src/app/legal/terms-of-service/page.tsx`
  - `frontend/src/app/legal/privacy-policy/page.tsx`
  - `frontend/src/app/legal/risk-disclosure/page.tsx`
- [ ] **ACTION:** All files created but not implemented by EOD

---

## 🔥 CRITICAL BLOCKERS TO RESOLVE TODAY

### Blocker #1: Company Data Missing
**Problem:** Can't customize documents without company phone, address, CNPJ, DPO  
**Resolution:**
- [ ] Email Finance Lead (template above)
- [ ] If no response by 2 PM, escalate to CEO
- [ ] Use placeholder if absolutely necessary, but NOT RECOMMENDED
- [ ] **Impact:** 30 minutes to fill in once data received

### Blocker #2: CEO/Risk Officer Not Available
**Problem:** Can't get approval without their review  
**Resolution:**
- [ ] Check CEO/Risk Officer calendars NOW
- [ ] Book 90-minute slot for Wednesday (not Thursday)
- [ ] If they say "too busy," escalate to next-up authority
- [ ] **Fallback:** Legal Lead can get verbal approval (get email confirmation)
- [ ] **Impact:** No approval = automatic NO-GO Thursday

### Blocker #3: Backend/Frontend Not Assigned
**Problem:** Modal + database won't build themselves  
**Resolution:**
- [ ] Get explicit commitment from Backend Lead + Frontend Lead TODAY
- [ ] If they're on other tasks, get CTO to reassign them
- [ ] Create project/issue tracker for these 3 tasks:
  1. Backend: Consent database + API (6-8 hours)
  2. Frontend: Risk modal component (4-5 hours)
  3. Frontend: Legal page routes (1-2 hours)
- [ ] **Impact:** If not assigned by end of Monday, NO-GO is certain

---

## ✅ END OF MONDAY CHECKLIST

**You should have:**
- [ ] All 3 company data placeholders filled (or have clear plan to fill by Tuesday)
- [ ] CEO/Risk Officer meeting scheduled for Wednesday 10 AM
- [ ] Backend file structure created (models + migrations)
- [ ] Frontend file structure created (components + page routes)
- [ ] All stakeholders committed to their tasks

**If ANY of above ❌:** Escalate to CTO/CEO immediately

---

## 📅 TUESDAY-WEDNESDAY EXECUTION

### Tuesday Tasks (Backend Day)
- [ ] Database schema created and migrated
- [ ] SQLAlchemy models working
- [ ] API endpoints stubbed out (basic request/response)
- [ ] Test: Can log to database

### Tuesday Tasks (Frontend Day)
- [ ] Modal UI built (HTML structure + CSS)
- [ ] Checkboxes implemented (no API calls yet)
- [ ] Legal pages showing document text

### Wednesday Tasks (Integration)
- [ ] Backend + Frontend talking to each other
- [ ] Disclaimer modal calling API
- [ ] Consent data being logged to database
- [ ] **CEO/Risk Officer review meeting (10 AM)**
- [ ] Get signed approval

### Wednesday Night (CEO Feedback)
- [ ] Implement any CEO/Risk Officer requested changes
- [ ] Get final sign-off (email confirmation)

---

## 🎯 THURSDAY DECISION (June 19)

### Morning (10 AM - 12 PM): Final Testing
- [ ] Modal works on mobile/tablet/desktop
- [ ] Consent logging working (check database)
- [ ] All 3 documents published on web
- [ ] Legal pages accessible via footer links

### Afternoon (2 PM - 4 PM): Go/No-Go Meeting
- [ ] Present results to CEO + Risk Officer
- [ ] **DECISION TREE:**
  ```
  If all 6 items above ✅
    → GO (launch Monday June 23)
  Else if 4-5 items ✅
    → CONDITIONAL GO (launch with known issues)
  Else if <4 items ✅
    → NO-GO (delay to July)
  ```

### Before 5 PM: Document Decision
- [ ] Create `/legal/LEGAL_WEEK3_GO_NOGO_DECISION.md`
- [ ] Get CEO signature
- [ ] Notify all stakeholders (teams, external lawyer if needed)

---

## 📞 KEY CONTACTS & PHONE NUMBERS

| Role | Purpose | Action |
|------|---------|--------|
| Finance Lead | Company data (phone, address, CNPJ) | **EMAIL NOW** |
| CEO | Review + approval | **SCHEDULE WED** |
| Risk Officer | Compliance review + approval | **SCHEDULE WED** |
| Backend Lead | Database + API | **COMMIT NOW** |
| Frontend Lead | Modal + routes | **COMMIT NOW** |
| CTO | Escalation if devs unavailable | **ESCALATE IF NEEDED** |

---

## 💾 FILES TO CREATE/UPDATE

### To Create:
- [ ] `TERMS_OF_SERVICE_PT_BR_V1.0_FINAL.md` (customized version)
- [ ] `PRIVACY_POLICY_LGPD_PT_BR_V1.0_FINAL.md` (customized version)
- [ ] `RISK_DISCLOSURE_PT_BR_V1.0_FINAL.md` (verified version)
- [ ] `backend/app/models/compliance.py` (SQLAlchemy model)
- [ ] `alembic/versions/[date]_add_consent_logs.py` (migration)
- [ ] `frontend/src/components/RiskDisclaimerModal.tsx` (modal component)
- [ ] `frontend/src/app/legal/terms-of-service/page.tsx` (ToS page)
- [ ] `frontend/src/app/legal/privacy-policy/page.tsx` (Privacy page)
- [ ] `frontend/src/app/legal/risk-disclosure/page.tsx` (Risk page)
- [ ] `LEGAL_SIGN_OFF_MEMO_SPRINT1_WEEK3.md` (CEO + Risk Officer signatures)

### To Update:
- [ ] `backend/main.py` - register legal router
- [ ] `frontend/src/app/layout.tsx` - add footer with legal links

---

## ⚠️ MINIMUM VIABLE COMPLIANCE (If time is short)

**If you can only do 3 things before Thursday:**

1. **Create + publish legal pages (Tuesday)**
   - Frontend: HTML pages with doc text
   - No fancy PDF/PDF viewer, just text on web
   - Takes 2-3 hours
   - **Impact:** Documents are accessible to users

2. **Build Disclaimer Modal basic version (Wednesday)**
   - Just 2 checkboxes + button
   - No validation logic yet
   - Takes 1-2 hours
   - **Impact:** Users can acknowledge risks

3. **Create consent database + simple API (Thursday AM)**
   - Basic SQLite or PostgreSQL table
   - Simple POST endpoint
   - Takes 2-3 hours
   - **Impact:** Can log that user accepted

**If all 3 ✅ by Thursday 3 PM:** Conditional GO (with caveat: "Enhanced consent logging coming next week")

---

## 🎁 WHAT SUCCESS LOOKS LIKE

### Thursday 3 PM Scenario: ✅ FULL SUCCESS
- Docs customized, reviewed, published ✅
- Modal working, beautiful, mobile-ready ✅
- Consent logging 100% functional ✅
- CEO + Risk Officer signed off ✅
- **RESULT:** GO for Monday launch

### Thursday 3 PM Scenario: 🟡 PARTIAL SUCCESS  
- Docs customized, reviewed, published ✅
- Modal working but not fully mobile-optimized 🟡
- Consent logging basic but functional 🟡
- CEO signed, Risk Officer pending ⚠️
- **RESULT:** CONDITIONAL GO (fix mobile by June 23)

### Thursday 3 PM Scenario: ❌ NO GO
- Docs not fully customized or CEO unavailable ❌
- Modal not started ❌
- Database not created ❌
- Approvals not obtained ❌
- **RESULT:** NO-GO, delay to July

---

## 📊 TRACKING DAILY PROGRESS

### Daily Standup Template (10 AM):
```
MONDAY-THURSDAY (10 AM standup with all leads)

✅ Completed yesterday:
- [item 1]
- [item 2]

🔄 In progress today:
- [item 1]
- [item 2]

🚨 Blockers:
- [blocker 1 + owner]
- [blocker 2 + owner]

📅 Next 24 hours:
- [deliverable 1]
- [deliverable 2]
```

---

## 🏁 FINISH LINE

**Thursday 5 PM:**
- All work complete
- All approvals signed
- All tests passing
- **DECISION MADE: GO or NO-GO**

**Friday:**
- If GO: Prepare for Monday launch
- If NO-GO: Plan July timeline + CVM monitoring

---

**Action:** Start this checklist NOW. Success depends on the next 4 days.

**Confidence:** 40% success if full execution starts Monday 9 AM  
**Confidence:** 5% if start is delayed to Tuesday

**Owner:** Legal Lead + CTO  
**Status:** READY FOR EXECUTION 🚀
