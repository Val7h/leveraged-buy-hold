# 📅 DAILY STANDUP TEMPLATE - SPRINT 1

**Time:** 8 AM BRT (15 min) + 4 PM BRT (15 min, blockers only)  
**Format:** Zoom + Slack thread  
**Owner:** Dev Lead (moderates)  
**Attendees:** 9 specialists + CEO (optional)

---

## STANDUP FORMAT (15 MIN TOTAL)

### Format:
```
Each person: 1-2 minutes on 3 questions
Total time: 9 people × 1.5 min = 13.5 min
Buffer: 1.5 min

QUESTION 1: "What did you complete YESTERDAY?"
QUESTION 2: "What are you working on TODAY?"
QUESTION 3: "What's blocking you?"
```

---

## STANDUP ORDER (PRIORITY)

1. **Legal Lead** (2 min)
   - Critical path blocker for Frontend
   - Today's focus: CVM query template, ToS customization

2. **Dev Lead** (1 min)
   - Overall status
   - Any critical blockers

3. **Backend Engineer** (1 min)
   - Performance baseline status
   - Index deployment

4. **Frontend Expert** (1 min)
   - Lighthouse audit status
   - Disclaimer modal spec

5. **Finance Lead** (1 min)
   - Pricing model finalization
   - Stripe integration specs

6. **Growth Lead** (1 min)
   - Content calendar status
   - Launch messaging

7. **Risk Officer** (1 min)
   - Insurance RFQ status
   - Monitoring dashboard

8. **Quant Analyst** (1 min)
   - Risk profile implementation
   - Algorithm documentation

9. **Product Lead** (1 min)
   - Onboarding flow status
   - Feature prioritization

---

## DAILY STANDUP SCRIPT

**Owner (Dev Lead) reads:**

```
🕓 SPRINT 1 DAILY STANDUP — Day X of 14

Quick reminder:
- Goal: Beta launch June 19
- Critical path: Legal → Frontend → Launch
- Daily metrics: We track code commits, tests, bugs, velocity
- Blockers: If you're stuck, say NOW so we unblock you same day

Let's go around. LEGAL FIRST because you're critical path.

[Points to Legal]
```

---

## INDIVIDUAL STANDUP TEMPLATE

**Each person says (1-2 min):**

```
Hi, I'm [NAME].

Yesterday I:
- [Completed task 1]
- [Completed task 2]
- [Met dependency X]

Today I'm:
- [Task for today]
- [Will deliver X by EOD]

Blockers:
- [If any: explain + what do I need?]
```

**Example (Backend):**

```
Hi, I'm Backend Engineer.

Yesterday I:
- Setup database indexing strategy
- Identified N+1 query in equity curve
- Baselined performance (equity curve = 3.2s p90)

Today I'm:
- Apply 3 indexes (portfolio_id, is_active, ticker)
- Parallelize market data fetching (ThreadPoolExecutor)
- Re-baseline performance target <2s

Blockers:
- Waiting on Finance to finalize pricing (doesn't block me today)
- Will notify if DB migration hits issues
```

---

## BLOCKER ESCALATION

**If you say "I'm blocked":**

1. **Explain the blocker** (30 seconds)
   - "Waiting for Legal approval on ToS language"
   - "Can't deploy without Risk sign-off on fail-safes"
   - "Need Finance pricing finalized to build Stripe integration"

2. **What do you need?** (1 sentence)
   - "I need [person] to [action] by [time]"
   - "I need CEO decision on [thing]"
   - "I need [resource] to proceed"

3. **Dev Lead acts:**
   - Blocks if critical path: "I'll unlock you RIGHT NOW"
   - Blocks if medium: "You continue with [workaround], we fix by Friday"
   - Doesn't block: "Noted, we'll address next week"

**Example:**

```
Frontend: "I'm blocked because Legal hasn't approved disclaimer modal language"
Dev Lead: "Legal, can you approve today?"
Legal: "I'll have it by 12 PM, Frontend can start implementation after lunch"
Frontend: "Great, I'll start UI mockups meanwhile and integrate text later"
```

---

## DAILY METRICS (REPORTED EACH STANDUP)

```
Day X of 14:

Git Metrics:
- Commits today: __ (target: 2+ per person)
- PRs open: __ (target: 0-1)
- PRs merged: __ (target: 1-2/day)

Test Metrics:
- Code coverage: __% (target: 50%+ by D7, 70%+ by D14)
- New tests: __ (target: 3-5/day)
- Failed tests: __ (target: 0)

Quality Metrics:
- Critical bugs: __ (target: 0)
- High-priority bugs: __ (target: <2)
- Code review cycle: __ hours (target: <4h)

Performance Metrics:
- Equity curve p90: __ ms (target: <2000ms)
- Cache hit rate: __% (target: >80% by D8)
- Build time: __ seconds (target: <30s)

Productivity Metrics:
- Velocity: X story points (target: 2-3x today)
- Blockers: __ (target: 0, but track)
- Team health: 😊/😐/😕 (target: 😊)
```

**Dev Lead says:**

```
Metrics check:
- Code commits: X per person ✓
- Test coverage: X% (on track for 70%? YES/NO)
- Critical bugs: 0 ✓
- Blockers: [List any]

We're on pace. Keep going.
```

---

## WEEKLY REVIEW (FRIDAY 4 PM)

**Instead of standup, 30-minute review:**

1. **Sprint progress** (5 min)
   - What was delivered this week?
   - What's left for next week?
   - Are we on pace for June 19?

2. **Metrics** (5 min)
   - Code coverage
   - Performance targets met?
   - Quality metrics

3. **Blockers from week** (5 min)
   - What was hard?
   - How did we resolve?
   - Lessons learned

4. **Plan for next week** (10 min)
   - Who's doing what?
   - Any risks?
   - Do we need to adjust timeline?

5. **Team health** (5 min)
   - Burnout risk?
   - Morale?
   - Anything else?

---

## SLACK THREAD FORMAT

**Post in #sprint1 at 8:05 AM:**

```
🕓 DAILY STANDUP - June X, 2026

‼️ BLOCKERS (if any):
- Legal: Waiting on...
- Frontend: Can't proceed because...

✅ COMPLETED (yesterday):
- Backend: Applied 3 database indexes
- Frontend: Lighthouse audit complete
- Legal: CVM query template ready

📝 IN PROGRESS (today):
- Backend: Parallelize market data (target: 2s p90)
- Frontend: Disclaimer modal mockups
- Legal: ToS customization

⏱️ TIMELINE STATUS:
- On pace for June 19: YES / NO
- Critical path: Legal approval (D7) → Frontend (D8) → Launch (D14)
- Risk: Waiting on [X] by [date]

📊 METRICS:
- Commits today: __ 
- Test coverage: __% 
- Critical bugs: 0
- Velocity: __ story points
```

---

## WHEN SOMEONE IS SICK / ABSENT

**Send in #sprint1:**

```
@Channel: [Name] is out today. 

Their tasks:
- [Task 1]: Covered by [Person]
- [Task 2]: Blocked until tomorrow
- [Task 3]: Can wait until Friday

Standup runs as normal without them.
```

---

## STANDUP CHECKLIST (EVERY DAY)

- [ ] 8 AM: Zoom call starts on time
- [ ] Dev Lead: 9 people present? (Note absences)
- [ ] Each person: Answer 3 questions
- [ ] Dev Lead: Note all blockers
- [ ] Dev Lead: Unblock critical path same day
- [ ] Post in #sprint1 by 8:30 AM
- [ ] 4 PM: Blocker sync (if any blockers exist)
- [ ] Friday 4 PM: Weekly review instead of standup

**Owner:** Dev Lead  
**Time:** 15 minutes  
**Frequency:** Every day (except weekends)  
**Accountability:** If you miss standup, you're not communicating with team

---

## SAMPLE SPRINT 1 STANDUP (DAY 1 - JUNE 6)

**Time:** 9:15 AM (right after kickoff meeting)

```
Dev Lead: "Quick standup to start. Day 1 of 14. Who's ready?"

Legal Lead: "We have CVM query template ready. Sending to compliance@lbhsystem today. 
Frontend, you'll have ToS language by tomorrow 5 PM. 
We're creating Slack thread with all docs for you to track."

Dev Lead: "Great. Frontend, what do you need from us?"

Frontend: "I'm starting Lighthouse audit now. Backend, I'll need your baseline 
performance results by tomorrow morning so I know what to optimize."

Backend: "Database indexes go live tonight. Performance baseline by 8 AM tomorrow."

Finance: "Pricing model ready for review. Stripe specs tomorrow. Growth can start 
content copy tomorrow."

Growth: "We're ready. First blog post outline done. We'll have 6 outlines by EOD."

Risk: "Insurance RFQ sent to 3 providers. Daily monitoring dashboard starts tomorrow. 
We'll have our fail-safes spec by Friday."

Quant: "Algorithm documentation 70% done. Risk profiles ready for implementation."

Product: "Onboarding flows designed. Ready for Frontend integration tomorrow."

Dev Lead: "Excellent. No blockers on Day 1. We're on pace. See you all 4 PM for 
blocker sync (probably won't need it, but we'll try). Friday 4 PM is weekly review.

Commits, tests, bugs: Track in Github. Let's go. 💪"
```

---

## TIME ZONE REFERENCE

If team is distributed:

```
8 AM BRT = 
- 3 AM Pacific (US West)
- 6 AM Eastern (US East)
- 1 PM UTC
- 3 PM CEST (Europe)
- 6 PM IST (India)

Adjust time if needed. Goal: Include everyone if possible.
If not possible: Record + post in Slack within 1 hour.
```

---

**Template ready.** Use this every day for 14 days. Track progress. Stay aligned. 💪
