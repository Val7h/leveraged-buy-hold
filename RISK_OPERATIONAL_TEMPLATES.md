# RISK OPERATIONAL TEMPLATES
## LBH System - Incident Response & Monitoring Templates

**Created:** June 5, 2026  
**Last Updated:** June 5, 2026  
**Owner:** Risk Officer  

---

# SECTION 1: DAILY RISK REPORT TEMPLATE

Copy this template and send every morning @ 8 AM BRT to Risk Officer, CEO, CFO.

---

## DAILY RISK REPORT

**Date:** [YYYY-MM-DD]  
**Reporting Period:** [Yesterday date] 00:00 - 23:59 BRT  
**Prepared by:** [Name]  
**Status:** [GREEN / YELLOW / RED]

### EXECUTIVE SUMMARY (1 line)
[Today's status: All systems nominal / Issue detected / Critical incident]

---

### CRITICAL METRICS (vs Target)

| Metric | Target | Yesterday | Status | Trend |
|--------|--------|-----------|--------|-------|
| Platform Uptime | >99.5% | 99.8% | GREEN | ↑ |
| Margin Call Failures | 0 | 0 | GREEN | — |
| Alert Delivery Rate | 100% | 100% | GREEN | — |
| Backtest Drift | <5% | +2.1% | GREEN | ↓ |
| User Complaints | <2 | 0 | GREEN | — |
| Regulatory Inquiries | 0 | 0 | GREEN | — |
| **Overall Status** | **ALL GREEN** | **—** | **OPERATIONAL** | **—** |

---

### INCIDENTS SUMMARY

**Number of Incidents Yesterday:** 0  
**Total Open Incidents:** 0  
**Incidents Requiring Action:** 0  

**If any incidents:**
```
Incident #1: [Title]
├─ Severity: P1/P2/P3
├─ Status: OPEN / RESOLVED
├─ Time to Detect: X min
├─ Time to Resolve: X hrs
├─ Root Cause: [Brief]
├─ Impact: [Brief]
└─ Action: [Next step]
```

---

### OPERATIONAL ALERTS

**High Priority Alerts (Pages):** 0  
**Medium Priority Alerts (Emails):** 0  
**Low Priority Alerts (Log only):** [Number]  

**Alerts requiring investigation:**
- [List if any]

---

### FINANCIAL RISK SNAPSHOT

| Metric | Value | Status |
|--------|-------|--------|
| Total AUM | R$[X]M | GREEN |
| Avg Leverage Ratio | 1.5x | GREEN |
| Max Leverage Used | 2.8x | GREEN |
| VaR (95%, 1-day) | [X]% | GREEN |
| Users at Risk | [X] | [Status] |
| Estimated Loss Exposure | R$[X]k | GREEN |

---

### REGULATORY STATUS

| Item | Status | Notes |
|------|--------|-------|
| CVM Inquiries | NONE | N/A |
| Compliance Issues | NONE | N/A |
| Data Breach Alerts | NONE | N/A |
| Insurance Claims | NONE | N/A |

---

### SECURITY SNAPSHOT

| Item | Status | Notes |
|------|--------|-------|
| Data Breach Attempts | 0 | All blocked |
| Unauthorized Login Attempts | [Number] | [Blocked/Monitored] |
| Malware Detected | NONE | N/A |
| SSL Certificate | VALID | Expires [Date] |
| Secrets Rotation | ON SCHEDULE | Last: [Date] |

---

### ACTION ITEMS FOR TODAY

**Immediate (Today):**
- [ ] [Action 1] - Owner: [Name]
- [ ] [Action 2] - Owner: [Name]

**This Week:**
- [ ] [Action 1] - Owner: [Name]

---

### UPCOMING RISKS (Next 7 Days)

1. [Risk Name] - Probability: [%], Impact: [High/Med/Low]
2. [Risk Name] - Probability: [%], Impact: [High/Med/Low]

---

### DASHBOARD LINKS

- [Real-time Monitoring Dashboard](https://dashboard.lbh.app/risk)
- [Incident Tracker](https://incidents.lbh.app)
- [Security Alerts](https://security.lbh.app)
- [Performance Metrics](https://metrics.lbh.app)

---

### NOTES

[Any additional context or observations]

---

**Report prepared by:** [Name] [Time]  
**Contact:** [Phone/Email]  
**Next report:** [Tomorrow date] @ 8 AM BRT

---

---

# SECTION 2: INCIDENT SEVERITY CLASSIFICATION

Use this to triage incidents quickly.

---

## INCIDENT SEVERITY MATRIX

### P1 - CRITICAL (RESPOND IN 5 MINUTES)

**Triggers:**
- User loses money due to system error
- Platform completely down (100% users affected)
- Data breach confirmed
- Regulatory action letter received
- System security compromise detected
- Multiple margin call failures (>10 users)

**Response:**
- Page on-call engineer + Risk Officer + CEO immediately
- Open war room (Zoom + Slack channel)
- Begin detailed incident log
- CIO/CFO engaged immediately
- Insurance broker notified

**Escalation Path:**
1. On-call Engineer (fix)
2. Risk Officer (oversight)
3. CEO (decisions)
4. Legal (regulatory)

**Target Resolution:** <4 hours

---

### P2 - HIGH (RESPOND IN 30 MINUTES)

**Triggers:**
- Partial system degradation (some users affected)
- API response time >5 seconds
- Alert system failures (email not sending)
- Data inconsistency detected
- Regulatory inquiry received
- Security vulnerability discovered

**Response:**
- Notify Risk Officer + team leads
- Open incident channel (#incident-[name])
- Begin root cause investigation
- Status page updated
- Customer communication prepared

**Escalation Path:**
1. Team Lead (investigation)
2. Risk Officer (monitoring)
3. CEO (if ongoing >30 min)

**Target Resolution:** <2 hours

---

### P3 - MEDIUM (RESPOND IN 2 HOURS)

**Triggers:**
- Single user unable to trade (not system-wide)
- Backtest drift >5% (but <10%)
- Database performance degraded
- Non-critical API failure
- Minor security issue

**Response:**
- Notify responsible team lead
- Email Risk Officer
- Investigate root cause
- Document in incident tracker
- Customer communication (if needed)

**Target Resolution:** <8 hours

---

### P4 - LOW (RESPOND IN 24 HOURS)

**Triggers:**
- UI glitch
- Documentation update needed
- Feature request
- Minor performance issue
- Typo/cosmetic issue

**Response:**
- Log in incident tracker
- Assign to responsible team
- Schedule in next sprint
- No escalation needed

---

---

# SECTION 3: INCIDENT COMMAND TEMPLATE

Use when opening an incident war room.

---

## INCIDENT COMMAND STRUCTURE

```
┌─────────────────────────────────────────────────────────────┐
│ INCIDENT COMMANDER (Risk Officer / CEO)                     │
│ Single decision maker, owns incident resolution              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
├─ TECHNICAL LEAD (CTO / Backend Lead)                         │
│  └─ Responsible: Diagnosis, fix, prevention                  │
│                                                               │
├─ COMMUNICATIONS (CEO / Communications Lead)                  │
│  └─ Responsible: Internal/external messaging                 │
│                                                               │
├─ CUSTOMER SUPPORT (Support Lead)                             │
│  └─ Responsible: User support, escalation handling           │
│                                                               │
└─ FINANCE/RISK (CFO / Risk Officer)                           │
   └─ Responsible: Impact assessment, insurance, compliance    │
```

---

## INCIDENT COMMANDER CHECKLIST

**T+0 (Incident Called):**
```
[ ] Declare incident (severity level)
[ ] Open Zoom bridge: [link]
[ ] Open Slack channel: #incident-[name]
[ ] Start recording (Zoom)
[ ] Create incident document (Google Doc)
[ ] Page on-call engineer
[ ] Page team leads (based on severity)
```

**T+5 (Initial Meeting):**
```
Attendees: Incident Commander + Tech Lead + Comms + Finance

Agenda (15 minutes):
[ ] What is the incident? (1 min)
[ ] What's the impact? (1 min)
[ ] What's the root cause (preliminary)? (2 min)
[ ] What's the fix/mitigation? (3 min)
[ ] What's the timeline? (2 min)
[ ] Who does what? (3 min)
[ ] Next check-in time? (1 min)

Output: Shared incident log with above info
```

**T+15 (Ongoing Updates):**
```
Every 15 minutes:
[ ] Tech Lead updates status
[ ] Any blockers?
[ ] ETA to resolution?
[ ] Communications sent?
[ ] Post update to Slack #incident-[name]
[ ] Adjust plan if needed
```

**T+[End] (Incident Resolved):**
```
[ ] Tech Lead confirms fix
[ ] Verify no regressions
[ ] Customer notifications sent
[ ] CTO sign-off
[ ] Incident Commander closes incident
[ ] Schedule post-mortem (24 hours later)
```

---

## INCIDENT LOG TEMPLATE

**Keep running document during incident. Share in #incident channel.**

```
INCIDENT: [Title]
ID: INC-2026-06-XXX
Severity: P1/P2/P3/P4
Status: OPEN / RESOLVED / INVESTIGATING
Started: [Time]
Resolved: [Time] (if done)

IMPACT:
- Users affected: [Number]
- Services affected: [List]
- Estimated loss: [Amount]
- Reputation risk: [High/Med/Low]

TIMELINE:
T+00:00 - [Event detected / reported]
T+00:05 - [Investigation started]
T+00:15 - [Root cause identified: ...]
T+00:45 - [Fix deployed]
T+01:00 - [Verified resolved]

ROOT CAUSE:
[Detailed explanation of why incident happened]

PREVENTION:
[What we'll do to prevent recurrence]

REMEDIATION:
[What we did to resolve it]

NEXT STEPS:
1. Post-mortem meeting [Date/Time]
2. Fix implementation [Date]
3. Prevention deployment [Date]
4. Monitoring enhancement [Date]

Responsible: [IC Name]
Updated: [Time] by [Person]
```

---

---

# SECTION 4: STAKEHOLDER COMMUNICATION TEMPLATES

Copy-paste and customize for your incident.

---

## TEMPLATE 1: INTERNAL (EXEC TEAM)

**To:** CEO, CFO, CTO, Head of Legal  
**From:** Incident Commander  
**Subject:** INCIDENT [P1/P2]: [Title] - Status Update  
**Time:** [HH:MM] BRT

---

Hi team,

**Status:** [ACTIVE / INVESTIGATING / RESOLVED]  
**Severity:** [P1/P2/P3/P4]  
**Impact:** [X users / R$X loss / Service down]  
**Duration:** [X hours]

**What happened:**
[2-3 sentences explaining incident]

**Current status:**
[Where we are in diagnosis/fix]

**ETA to resolution:**
[Expected timeline]

**Actions taken:**
- [Action 1]
- [Action 2]
- [Action 3]

**What we need:**
- [Approval for action?]
- [Resource/approval?]

**Next update:** [Time] or when status changes

---

[Incident Commander Name]  
[Contact info]

---

## TEMPLATE 2: USERS (IN-APP NOTIFICATION)

**Channel:** In-app banner (urgent)

---

**We're investigating a platform issue**

We've detected an issue affecting [X users / platform availability]. Our team is working to resolve it immediately.

**What you should do:**
- Do not submit new trades at this time
- Your existing positions are safe and monitored
- We'll update you every 15 minutes

**Current ETA:** Resolution by [TIME]

[Check status page] [Contact support]

---

## TEMPLATE 3: USERS (EMAIL)

**Subject:** LBH System Service Update - We're Fixing [Issue]

---

Hi [User Name],

We're writing to inform you that we've identified and are resolving a service issue.

**What happened:**
[Explanation]

**How we're responding:**
- Our engineering team is [action]
- We've implemented [containment measure]
- ETA to resolution: [time]

**Your account:**
- Your positions are safe
- You can [withdraw / transfer / view], but we recommend waiting
- No additional fees will be charged

**Questions?**
Contact support: support@lbh.app or +55 11 XXXX-XXXX

Thank you for your patience.

—LBH Team

---

## TEMPLATE 4: REGULATORY (CVM NOTIFICATION)

**Note:** Use when incident must be reported to CVM.

---

[CVM Official Contact]

**Re: Notification of Service Incident**

Dear [CVM Officer],

We are formally notifying the CVM of a service incident that occurred on [DATE] in accordance with [Regulation X].

**Incident Summary:**
- **Date/Time:** [Date] [Time] BRT
- **Duration:** [X hours]
- **Root Cause:** [Technical explanation]
- **Impact:** [Number of users], [Description of impact]

**Immediate Actions Taken:**
1. [Action 1]
2. [Action 2]
3. [Action 3]

**Remediation Timeline:**
- Fix implemented: [Date]
- Monitoring enhanced: [Date]
- Full resolution: [Date]

**Affected Users Communication:**
- [Notification method]
- [Compensation offered, if any]

**Prevention Measures:**
[Description of controls to prevent recurrence]

We remain committed to maintaining the highest standards of operational excellence and regulatory compliance.

Sincerely,
[CEO Name / Legal Counsel]
LBH System
[Contact info]

---

## TEMPLATE 5: INSURANCE CLAIM (IF APPLICABLE)

**To:** [Insurance Broker/Company]  
**Subject:** INSURANCE CLAIM - [Incident Type]  
**Claim Type:** [E&O / Cyber / D&O]

---

Dear [Insurance Contact],

We are filing a claim under our [Policy Name] policy for the following incident:

**Incident Details:**
- **Date:** [Date]
- **Type:** [Incident type]
- **Root Cause:** [Brief]
- **Impact:** [Financial loss], [Users affected]

**Documentation Attached:**
- Incident report
- Root cause analysis
- Evidence of investigation
- Remediation plan
- Impact assessment

**Estimated Loss:**
- Direct costs: R$[Amount]
- Indirect costs: R$[Amount]
- **Total claimed:** R$[Amount]

**Insurance Coverage:**
- Policy: [Name]
- Coverage limit: R$[Amount]
- Deductible: R$[Amount]
- Expected covered amount: R$[Amount]

**Timeline:**
- Incident date: [Date]
- Claim filed: [Date]
- Expected claim decision: [Date]

We will provide any additional information requested.

Contact: [Name] [Phone] [Email]

---

---

# SECTION 5: POST-INCIDENT REVIEW TEMPLATE

Schedule 24-48 hours after incident resolution.

---

## POST-INCIDENT REVIEW (PIR) MEETING NOTES

**Incident:** [Title]  
**Incident ID:** INC-2026-06-XXX  
**Date:** [Date]  
**Attendees:** [List]

---

### SECTION 1: INCIDENT RECAP

**Timeline:**
- **T+00:00** - [Event]
- **T+[Time]** - [Event]
- **T+[Time]** - [Event]
- **T+[Time]** - RESOLVED

**Duration:** [X hours]  
**Severity:** P[1-4]  
**Impact:** [X users], [R$X loss]

---

### SECTION 2: ROOT CAUSE ANALYSIS

**Problem Statement:**
[What went wrong?]

**Root Cause (5 Whys):**
1. Why did [X] happen? → Because [reason]
2. Why [reason]? → Because [reason]
3. Why [reason]? → Because [root cause]

**Contributing Factors:**
- [Factor 1]
- [Factor 2]
- [Factor 3]

**Why Wasn't This Caught?**
- [Detection gap 1]
- [Detection gap 2]
- [Process gap 1]

---

### SECTION 3: WHAT WENT WELL

✓ [Team action that went well]  
✓ [Communication that was effective]  
✓ [Process that helped]

---

### SECTION 4: WHAT COULD IMPROVE

✗ [Issue 1]  
✗ [Issue 2]  
✗ [Issue 3]

---

### SECTION 5: ACTION ITEMS (PREVENTION)

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [Action] | [Person] | [Date] | P1/P2/P3 |
| [Action] | [Person] | [Date] | P1/P2/P3 |
| [Action] | [Person] | [Date] | P1/P2/P3 |

---

### SECTION 6: ACTION ITEMS (DETECTION)

| Metric/Alert | Owner | Implementation | Target Date |
|---|---|---|---|
| [Add alert for X] | [Person] | [How?] | [Date] |
| [Improve monitoring of Y] | [Person] | [How?] | [Date] |
| [Create runbook for Z] | [Person] | [How?] | [Date] |

---

### SECTION 7: BLAMELESS CULTURE REMINDER

This review is NOT about blame. It's about:
- Understanding what happened
- Finding systemic issues (not individual failures)
- Improving processes & tools
- Supporting the team

Everyone did their best with the information they had at the time.

---

### SECTION 8: FOLLOW-UP

**Post-mortems for board/investors:**
- Date of board notification: [Date]
- Memo sent: [Yes/No]
- Executive briefing scheduled: [Yes/No]

**Media/PR response:**
- Blog post published: [Yes/No]
- Transparency note: [Yes/No]
- Social media: [Yes/No]

**Regulatory filing:**
- CVM notification filed: [Yes/No]
- Insurance claim filed: [Yes/No]
- Customer compensation: [Amount / Yes]

---

**Meeting notes prepared by:** [Name]  
**Date:** [Date]  
**Next follow-up:** [Date]

---

---

# SECTION 6: WEEKLY RISK COMMITTEE AGENDA

**When:** Every Friday 3 PM BRT  
**Duration:** 60 minutes  
**Attendees:** Risk Officer (chair), CEO, CTO, CFO, General Counsel, Product Lead

---

## WEEKLY RISK COMMITTEE MEETING AGENDA

**Week of:** [Date]  
**Meeting Date:** [Date]  
**Location:** Zoom [link]  
**Recording:** [Yes/No]

---

### 1. QUICK STATUS CHECK (5 min)

**Risk Officer opens:**
- Any critical incidents this week?
- Any regulatory inquiries?
- Insurance claims?

**Response:** Go / No-go for full agenda

---

### 2. RISK METRICS REVIEW (10 min)

**Presented by:** Risk Officer

| Metric | Target | Actual | Trend | Status |
|--------|--------|--------|-------|--------|
| Uptime | >99.5% | [%] | [↑↓—] | [✓✗] |
| Alert Delivery | 100% | [%] | [↑↓—] | [✓✗] |
| Backtest Drift | <5% | [%] | [↑↓—] | [✓✗] |
| VaR | <2% | [%] | [↑↓—] | [✓✗] |
| Complaints | <2/wk | [#] | [↑↓—] | [✓✗] |

**Discussion:** Any concerning trends?

---

### 3. INCIDENT SUMMARY (10 min)

**If any incidents this week:**
```
Incident: [Title]
├─ Severity: P[1-4]
├─ Duration: X hours
├─ Root cause: [Brief]
├─ Status: [RESOLVED / PENDING]
└─ Action items: [Count]
```

**Follow-up:** Post-mortem scheduled?

---

### 4. NEW RISKS IDENTIFIED (10 min)

**Presented by:** Team leads

- Any new risks to add to register?
- Any risks changing severity?
- Any risk mitigation completed?

**Action:** Update risk register

---

### 5. REGULATORY & COMPLIANCE (10 min)

**Presented by:** General Counsel

- CVM inquiries or notices?
- LGPD compliance status?
- Insurance renewals due?
- Regulatory changes affecting us?

**Action:** Any legal response needed?

---

### 6. INSURANCE STATUS (5 min)

**Presented by:** CFO / Broker

- Any claims filed this month?
- Claims status?
- Upcoming renewals?
- Coverage gaps?

---

### 7. STRATEGIC DECISIONS (10 min)

**Presented by:** Risk Officer / CEO

- Major risk acceptance decision needed?
- Major control investment needed?
- Regulatory strategy?
- Business continuity plan update?

**Decision:** Board vote? CEO decision? Escalate?

---

### 8. ACTION ITEM REVIEW (5 min)

| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| [Action] | [Person] | [Date] | [ON TRACK / AT RISK / BLOCKED] |
| [Action] | [Person] | [Date] | [ON TRACK / AT RISK / BLOCKED] |

**Escalate:** Any blocked items?

---

### 9. Q&A & CLOSING (5 min)

- Questions from committee?
- Next meeting date/time?
- Urgent escalations?

**Meeting adjourned.**

---

**Minutes prepared by:** [Name]  
**Meeting recording:** [Link]  
**Next meeting:** [Date/Time]

---

---

# SECTION 7: QUARTERLY STRESS TEST TEMPLATE

---

## QUARTERLY STRESS TEST EXERCISE

**Quarter:** Q[2-4] 2026  
**Test Date:** [Date]  
**Duration:** [4 hours]  
**Facilitator:** Risk Officer

---

### OBJECTIVES

- Validate risk models under extreme scenarios
- Test incident response procedures
- Identify gaps in controls
- Build team muscle memory

---

### SCENARIO: MARKET CRASH (50% Drawdown)

**Scenario:** S&P 500 falls 50% in single trading day (like Oct 19, 1987)

**Assumptions:**
- All assets decline 50%
- Volatility spikes 400%
- Market stops trading
- Users panic

**Test Questions:**

| Question | Owner | Expected Answer | Actual Result |
|----------|-------|-----------------|----------------|
| How quickly detected? | DevOps | <5 min | [Result] |
| Margin calls triggered? | Quant | Yes, [X users] | [Result] |
| Alert system working? | Ops | Yes, 100% sent | [Result] |
| Liquidations fair? | Quant | Yes, <1% slippage | [Result] |
| Users notified? | Comms | Yes, <10 min | [Result] |
| System stable? | CTO | Yes, <1% errors | [Result] |
| Financial impact? | Finance | R$[X]M loss | [Result] |
| Company solvent? | Finance | Yes, capital > 0 | [Result] |

**Findings:**
- [Finding 1]
- [Finding 2]
- [Finding 3]

**Action Items:**
- [ ] [Action 1] - Owner: [Name], Due: [Date]
- [ ] [Action 2] - Owner: [Name], Due: [Date]

---

### SCENARIO: API PROVIDER DOWN (24+ Hours)

**Scenario:** Alpha Vantage + Polygon.io both fail; no market data

**Test Questions:**

| Question | Owner | Expected | Actual |
|----------|-------|----------|--------|
| Failover activated? | DevOps | <2 min | [Result] |
| Users can access portfolio? | Ops | Yes | [Result] |
| Margin calc halted? | Quant | Yes | [Result] |
| Trades rejected? | Ops | Yes | [Result] |
| Users informed? | Comms | Yes | [Result] |
| ETA to recovery? | DevOps | <4 hrs | [Result] |

---

### SCENARIO: DATA BREACH

**Scenario:** All user credentials + portfolio data leaked

**Test Questions:**

| Question | Owner | Expected | Actual |
|----------|-------|----------|--------|
| Breach detected? | Security | <1 hour | [Result] |
| Response team activated? | Risk Officer | Yes | [Result] |
| Forensics engaged? | Security | Yes, <2 hrs | [Result] |
| Users notified? | Comms | Yes, <24 hrs | [Result] |
| CVM notified? | Legal | Yes, <72 hrs | [Result] |
| Insurance claim filed? | Finance | Yes | [Result] |
| Account recovery plan? | Support | Yes | [Result] |

---

### SCENARIO: CVM CEASE-AND-DESIST

**Scenario:** CVM orders: Stop offering leverage products immediately

**Test Questions:**

| Question | Owner | Expected | Actual |
|----------|-------|----------|--------|
| Response drafted? | Legal | <2 hrs | [Result] |
| Operations team ready? | Ops | Yes | [Result] |
| User plan prepared? | Product | Yes | [Result] |
| System changes ready? | Backend | Yes | [Result] |
| Communication ready? | Comms | Yes | [Result] |
| Timeline to compliance? | Legal | <24 hrs | [Result] |
| Financial impact? | Finance | [Amount] | [Result] |
| Business continuity? | CEO | Plan in place | [Result] |

---

### FINDINGS & IMPROVEMENTS

**What worked well:**
1. [Item]
2. [Item]

**What needs improvement:**
1. [Item] → Fix: [Action]
2. [Item] → Fix: [Action]

**Action items (for next sprint):**
- [ ] [Action 1] - Owner: [Name], Due: [Date]
- [ ] [Action 2] - Owner: [Name], Due: [Date]

---

**Test conducted by:** [Name]  
**Report prepared:** [Date]  
**Results shared with:** Board, Team  
**Next test scheduled:** [Date]

---

---

# SECTION 8: COMPLIANCE CHECKLIST (ONGOING)

Print and check daily/weekly/monthly.

---

## DAILY COMPLIANCE CHECKLIST (Risk Officer)

- [ ] Review daily risk report (received @ 8 AM?)
- [ ] Check critical metrics dashboard
- [ ] Review any overnight alerts in Slack
- [ ] Check email for regulatory notices
- [ ] Verify all systems online (uptime >99.5%?)
- [ ] Confirm alert system working (test alert sent?)
- [ ] Review user complaints (any patterns?)
- [ ] Check security alerts (any attacks?)
- [ ] Verify insurance policies active (coverage check)
- [ ] Sign off on daily report (email to CEO)

**Time required:** 15-20 minutes  
**Frequency:** Every business day

---

## WEEKLY COMPLIANCE CHECKLIST (Risk Committee)

**Friday 3 PM Meeting:**
- [ ] Risk metrics reviewed (all targets met?)
- [ ] Incidents reviewed (any root causes pending?)
- [ ] Risk register updated (any new risks?)
- [ ] Regulatory status checked (any notices?)
- [ ] Insurance status checked (any claims?)
- [ ] Action items tracked (any overdue?)
- [ ] Board updates prepared (if needed)
- [ ] Minutes documented and shared

**Time required:** 60 minutes  
**Frequency:** Every Friday 3 PM

---

## MONTHLY COMPLIANCE CHECKLIST (Risk Officer + CFO)

**End of month:**
- [ ] Risk management report compiled (20+ metrics)
- [ ] Board summary prepared (1-pager)
- [ ] Insurance claims reviewed (if any)
- [ ] Regulatory changes assessed (any impact?)
- [ ] Risk register updated (quarterly review)
- [ ] Stress test results reviewed (if quarter-end)
- [ ] Compliance audit completed (controls working?)
- [ ] Team training completed (any gaps?)
- [ ] Incident post-mortems closed (all action items done?)
- [ ] Budgets reviewed (risk investment spend vs plan)

**Time required:** 4-6 hours  
**Frequency:** Last day of month

---

## QUARTERLY COMPLIANCE CHECKLIST (CEO + Board)

**Quarter-end (last day):**
- [ ] Quarterly risk report presented (all metrics)
- [ ] Board decision log updated (major decisions made)
- [ ] Incident summary (all Q incidents reviewed)
- [ ] Regulatory assessment (changes ahead?)
- [ ] Insurance renewal status (if due)
- [ ] Stress test results (all scenarios tested)
- [ ] Risk appetite reassessed (any changes?)
- [ ] Budget review (risk investment adequate?)
- [ ] Strategic risks reviewed (long-term threats)
- [ ] Board minutes documented

**Time required:** 2 hours  
**Frequency:** End of Q2, Q3, Q4 (and Q1 next year)

---

## ANNUAL COMPLIANCE CHECKLIST (CEO + Board + External Auditor)

**Year-end:**
- [ ] Annual risk report compiled (full year review)
- [ ] All incidents analyzed (trends identified?)
- [ ] Risk register reviewed (all 10 risks assessed)
- [ ] Insurance policies renewed (all 3 active?)
- [ ] External audit completed (any findings?)
- [ ] Compliance certification signed (CEO/CFO)
- [ ] Board oversight documented (meeting minutes)
- [ ] Regulatory filings completed (CVM, ANPD)
- [ ] Risk culture assessed (team trained?)
- [ ] Risk strategy 2027 drafted (next year plan)

**Time required:** 1-2 weeks  
**Frequency:** December 31 / January 1

---

# SECTION 9: QUICK REFERENCE - CONTACT TREE

Print and post in office. Update monthly.

---

## EMERGENCY CONTACT TREE

```
INCIDENT DETECTED
        ↓
    [ CALL ]
        ↓
P1 (Critical)?
├─ YES → On-Call Engineer (page immediately)
│        + Risk Officer (call)
│        + CEO (text)
│
└─ NO → Responsible Team Lead (call)
        + Risk Officer (email)
```

---

## CONTACT LIST

**ON-CALL ENGINEER:**
- Name: [Name]
- Phone: [+55 11 XXXX-XXXX]
- Email: [email]
- Backup: [Name] [Phone]

**RISK OFFICER:**
- Name: [Name]
- Phone: [+55 11 XXXX-XXXX]
- Email: [email]
- Hours: Mon-Fri 7 AM - 8 PM
- After-hours: [instructions]

**CEO:**
- Name: [Name]
- Phone: [+55 11 XXXX-XXXX]
- Email: [email]
- Assistant: [Name] [Phone]

**LEGAL (CVM SPECIALIST):**
- Name: [Name]
- Firm: [Name]
- Phone: [+55 11 XXXX-XXXX]
- Email: [email]
- Emergency: [secondary contact]

**INSURANCE BROKER:**
- Name: [Name]
- Company: [Name]
- Phone: [+55 11 XXXX-XXXX]
- Email: [email]
- Emergency: [secondary contact]

**SECURITY (INCIDENT RESPONSE):**
- Company: [Name]
- Phone: [+55 11 XXXX-XXXX]
- Email: [email]
- Available: 24/7/365

**CVM CONTACT:**
- Department: Superintendência de Protección
- Phone: [+55 11 XXXX-XXXX]
- Email: [email]
- Website: www.cvm.gov.br

**ANPD CONTACT (Data Protection):**
- Phone: [+55 61 XXXX-XXXX]
- Email: [email]
- Website: www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd

---

**Last updated:** [Date]  
**Next update due:** [Date]  
**Owner:** Risk Officer

---

---

# END OF OPERATIONAL TEMPLATES

All templates ready to use. Customize with your team's actual contacts and details.

For questions, contact Risk Officer: [email/phone]
