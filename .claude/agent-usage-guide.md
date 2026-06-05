# LBH System - Agent Usage Guide

## 🎯 Quick Start: How to Use Your Agent Team

### The Team at a Glance

```
CEO (You)
│
├─ 📱 PM (Product Manager)
│  └─ Focuses on: What to build, user needs, prioritization
│
├─ 🏗️  Dev Lead (Engineering Director)
│  └─ Focuses on: How to build, architecture, scalability
│
├─ 💻 Backend Architect
│  └─ Focuses on: APIs, databases, performance
│
├─ 🎨 Frontend Engineer
│  └─ Focuses on: UI/UX, responsiveness, components
│
├─ 📊 Data Engineer
│  └─ Focuses on: Data pipelines, ETL, analytics
│
├─ 📈 Quant Analyst
│  └─ Focuses on: Algorithms, backtesting, risk models
│
├─ 💰 Finance Director
│  └─ Focuses on: Portfolio risk, compliance, leverage
│
└─ ⚖️  Legal Counsel
   └─ Focuses on: Compliance, ToS, regulatory
```

---

## 🚀 How to Request Work from Each Agent

### 1. **Product Manager** - "What should we build?"

**When to use**:
- You have a user problem to solve
- You want to define new features
- You need market analysis
- You're prioritizing next steps

**How to request**:

```
I need you to act as the PM. 

User request: "Users want to set price alerts for stocks"

Please analyze:
1. Is this aligned with our product vision?
2. What are the requirements?
3. Which teams need to be involved?
4. What's the market opportunity?
5. Success metrics & timeline?
```

**Example Response** (PM analyzes):
- Requirements: Real-time alert system, mobile notifications, customizable thresholds
- Teams: Dev Lead (architecture), Backend (WebSocket), Frontend (UI), Finance (risk), Legal (ToS)
- Market fit: High (users asked for this 3+ times)
- Success metric: 50%+ of beta users setting >1 alert
- Timeline: 2 weeks (MVP)

---

### 2. **Dev Lead** - "How do we build this?"

**When to use**:
- PM approved a feature
- You need technical architecture
- You're hitting a technical blocker
- You want scalability assessment

**How to request**:

```
I need you to act as the Dev Lead.

Feature: Real-time market price alerts for users

The PM wants this in 2 weeks. Please assess:
1. Architecture: WebSocket vs polling trade-offs?
2. Scalability: Can handle 1000 concurrent alert subscriptions?
3. Team capacity: Do we have bandwidth?
4. Tech debt: Should we refactor existing code first?
5. Risks: What could go wrong?
```

**Example Response** (Dev Lead reviews):
- WebSocket recommended (lower latency, better scalability)
- Capacity: Need to upgrade Render plan for 1000 concurrent connections
- Team: Frontend can handle UI in 3 days, Backend needs 5 days for real-time logic
- Risk: Database subscription queries could become bottleneck
- Recommendation: Build MVP with polling first (simpler), upgrade to WebSocket later

---

### 3. **Backend Architect** - "Design the API"

**When to use**:
- Dev Lead approved architecture
- You need API endpoint design
- You have performance concerns
- You're optimizing database queries

**How to request**:

```
I need you to act as the Backend Architect.

Feature: Real-time price alerts (approved by Dev Lead)

Current system:
- FastAPI backend with PostgreSQL
- Current endpoints: /api/v1/portfolio/*, /api/v1/assets/*

Please design:
1. New alert endpoints (create, update, delete, check)
2. Database schema changes
3. Caching strategy (which data to cache?)
4. WebSocket endpoint design (/ws/alerts?)
5. Error handling & edge cases
```

**Example Response** (Backend designs):
```
Endpoints:
- POST /api/v1/alerts (create alert)
- GET /api/v1/alerts (list user alerts)
- PATCH /api/v1/alerts/{id} (update alert)
- DELETE /api/v1/alerts/{id} (delete alert)

Database schema:
CREATE TABLE alerts (
  id UUID,
  user_id UUID,
  ticker VARCHAR,
  condition VARCHAR (e.g., "price > 150"),
  status VARCHAR (active/triggered),
  created_at TIMESTAMP,
  triggered_at TIMESTAMP
);

WebSocket:
- Client subscribes: {type: "subscribe", tickers: ["AAPL", "TSLA"]}
- Server sends: {type: "alert", ticker: "AAPL", price: 150.5, condition: "triggered"}

Cache:
- Cache recent prices (Redis, 5min TTL)
- Prevents repeated database lookups for frequent checks
```

---

### 4. **Frontend Engineer** - "Build the UI"

**When to use**:
- Backend designed the API
- You need UI component design
- You want responsive, accessible design
- You're optimizing for mobile

**How to request**:

```
I need you to act as the Frontend Engineer.

Feature: Real-time price alerts UI

Backend designed endpoints:
- POST /api/v1/alerts (create)
- GET /api/v1/alerts (list)
- DELETE /api/v1/alerts/{id}

Please design:
1. Alert creation form (what fields?)
2. Alert list component (how to show active/triggered?)
3. Notification UI (toast, badge, modal?)
4. Mobile responsiveness (< 3s load time)
5. Accessibility (keyboard nav, ARIA labels)
```

**Example Response** (Frontend sketches):
- Create form: ticker autocomplete, condition dropdown, enable toggle
- List: Cards with ticker logo, price, condition, status badge, delete button
- Notification: Toast in bottom-right with price + condition
- Mobile: Single column, larger touch targets, swipe to delete
- Accessibility: ARIA labels on all form fields, keyboard-navigable list

---

### 5. **Data Engineer** - "Build the pipeline"

**When to use**:
- You need to ingest data from external sources
- You want to aggregate historical data
- You're scaling to handle more data
- You need analytics/reporting

**How to request**:

```
I need you to act as the Data Engineer.

Requirements:
- Real-time market data for 430+ stocks (yfinance)
- Historical data: 10 years for backtesting
- Update frequency: Daily at 16:00 (market close)
- Query performance: <100ms for equity curves

Current bottleneck:
- Equity curve query slow for >5yr data (takes >1s)

Please propose:
1. ETL pipeline architecture
2. Data warehouse design
3. Indexes to speed up equity curve queries
4. Monitoring & alerting for pipeline health
```

**Example Response** (Data Engineer designs):
- ETL: yfinance → PostgreSQL (daily cron job)
- Warehouse: Historical prices in partitioned table (by year)
- Indexes: Composite index (ticker, date) on prices
- Materialized view: Pre-compute equity curves for popular date ranges (1y, 5y, 10y)
- Monitoring: Alert if pipeline takes >30min or fails

---

### 6. **Quant Analyst** - "Validate the algorithm"

**When to use**:
- You want to backtest a new strategy
- You're optimizing algorithm parameters
- You need risk assessment
- You want to validate against real data

**How to request**:

```
I need you to act as the Quant Analyst.

Current composite score algorithm:
- Quality (60%): Beta, drawdown, dividend, Sharpe, volatility, fundamentals
- Opportunity (40%): RSI, stochastic, MA200, Bollinger bands

Question: Should we weight quality vs opportunity differently?

Please:
1. Backtest current weights (60/40) on 10yr data
2. Try alternative weights (50/50, 70/30)
3. Compare Sharpe ratios & max drawdowns
4. Test robustness across market regimes (bull/bear/crash)
5. Recommend optimal weights
```

**Example Response** (Quant analyzes):
- Current (60/40): Sharpe 1.34, Max DD -32%
- Alternative (70/30): Sharpe 1.41, Max DD -28% ← Better
- Test 2008 crisis: 70/30 significantly outperforms (predicted drawdown better)
- Recommendation: Use 70/30 weights (5% Sharpe improvement, safer max DD)

---

### 7. **Finance Director** - "Assess the risk"

**When to use**:
- You're making leverage recommendations
- You want risk assessment (VaR, CVaR)
- You need margin call validation
- You want portfolio performance analysis

**How to request**:

```
I need you to act as the Finance Director.

New feature: Recommended leverage now based on composite score
- Score 90+: 3.0x
- Score 80-90: 2.0x
- Score 70-80: 1.5x
- Score <70: 1.0x

Concerns:
1. Could users get over-leveraged?
2. What's the margin call risk?
3. Should we adjust leverage limits per user risk profile?

Please assess:
1. Risk metrics (VaR, CVaR) for each leverage level
2. Margin call probability in crash scenarios
3. User protection mechanisms (hard limits, warnings)
4. Regulatory compliance (if any)
```

**Example Response** (Finance analyzes):
- 3.0x leverage: VaR 95% = -7.2% daily, CVaR = -12.5%
- Margin call risk: 2.1% probability in 20% market crash
- Recommendation: Hard cap 2.5x max (slightly below score 90+), add user warnings
- User profiles: Conservative → 1.5x max, Aggressive → 2.5x max
- Compliance: Brazilian rules allow up to 5x, we're well below limits

---

### 8. **Legal Counsel** - "Review compliance"

**When to use**:
- You're releasing a new feature
- You have user data/privacy questions
- You want to ensure regulatory compliance
- You need to draft user agreements

**How to request**:

```
I need you to act as the Legal Counsel.

New feature: Real-time price alerts
- Users receive notifications when stock hits target price
- We store: user_id, ticker, condition, created_at, triggered_at

Legal review needed:
1. Do we need to disclose alert system limitations?
2. User liability if they miss an alert?
3. Privacy implications of storing alert history?
4. Compliance with Brazilian CVM rules?

Please provide:
1. Risk assessment
2. Required disclosures/warnings
3. Updated ToS language (if needed)
4. Privacy policy updates
```

**Example Response** (Legal reviews):
- Disclosures needed: Alerts not guaranteed (network delays, system outages)
- Liability: User responsible for their trading decisions, not our alerts
- Privacy: Store alert history <30 days, encrypt sensitive data
- CVM compliance: Alerts must include risk disclaimer ("past performance ≠ future results")
- ToS update: Add section on alert system limitations & user responsibility

---

## 📋 Real-World Example: Building a Feature End-to-End

### Scenario: User wants "Copy Top Performers" feature

**Step 1: PM analyzes market opportunity**

```
Task: PM, analyze copy-trading feature feasibility

User feedback: 3+ users asked to copy top-performing portfolios

Provide:
1. Market analysis (is this a real opportunity?)
2. Feature requirements definition
3. User journey mapping
4. Success metrics
```

**PM Response**:
- Market: Very large (copy-trading is $50B+ industry)
- Requirements: Users select top portfolio to copy, auto-rebalance when original rebalances
- Success: 30%+ of users copy at least one portfolio
- Timeline: High-complexity feature, 4-6 weeks

**Step 2: Dev Lead assesses feasibility**

```
Task: Dev Lead, architecture review

PM approved "Copy Top Performers" feature.

Assess:
1. Architecture: How to sync copy portfolios with original?
2. Risks: What if original deleverages during margin call?
3. Scalability: Can handle 1000 concurrent syncs?
4. Timeline: Is 4 weeks realistic?
```

**Dev Lead Response**:
- Architecture: Scheduled job (daily) syncs copied portfolios with original
- Risk: Significant (margin call scenarios, slippage differences)
- Scalability: Need to optimize sync logic
- Timeline: 4 weeks is tight, recommend 6 weeks with proper testing

**Step 3: Backend designs sync algorithm**

```
Task: Backend Architect, design portfolio sync API

Feature: Copy Top Performers (syncs daily)

Design:
1. Endpoint to initiate portfolio copy (/api/v1/portfolio/copy)
2. Sync job that checks original portfolio & rebalances copy
3. Error handling (what if copy has insufficient capital?)
4. Audit trail (track all syncs for compliance)
```

**Backend Response**:
```
POST /api/v1/portfolio/{id}/copy
- Endpoint: Copy original portfolio to new portfolio
- Input: {source_portfolio_id, target_portfolio_id, sync_enabled: true}

Sync Job (daily at market close):
1. Query original portfolio positions
2. Calculate position ratio (e.g., AAPL 30% of portfolio)
3. Rebalance copy portfolio to match ratios
4. Handle constraints (capital limits, leverage limits)
5. Log sync results (changes made, any failures)

Error handling:
- If copy lacks capital: Reduce position sizes proportionally
- If leverage limit exceeded: Alert user, skip sync
- If original in margin call: Pause syncing
```

**Step 4: Frontend builds copy interface**

```
Task: Frontend Engineer, design copy UI

Feature: Copy Top Performers

Design:
1. Discovery page: Show top performers ranked by Sharpe ratio
2. Copy action: Button to create copy portfolio
3. Settings: Control sync frequency, pause/resume
4. Sync history: Show past syncs & changes made
```

**Frontend Response**:
- Top performers: Cards with portfolio name, Sharpe ratio, AUM, copy button
- Copy modal: Confirm copy settings, destination portfolio selection
- Settings page: Toggle auto-sync, set max sync frequency
- History tab: Timeline of syncs with detailed changes (added/removed/modified positions)

**Step 5: Quant validates strategy impact**

```
Task: Quant Analyst, validate copy-trading strategy

Feature: Users copy top-performing portfolios

Analyze:
1. Does copying degrade original portfolio performance?
2. Does slippage/timing hurt copied portfolio?
3. Backtest: What if 100 users copy same portfolio?
```

**Quant Response**:
- Original performance: Minimal impact (copy doesn't trade, just rebalances same weights)
- Slippage: Estimated 0.05-0.1% per sync (acceptable)
- Scale: 100 concurrent copies manageable (no market impact at our scale)
- Risk: High if original gets margin called (copies need fail-safe)

**Step 6: Finance assesses risk**

```
Task: Finance Director, risk assessment

Feature: Copy Top Performers (now validated by Quant)

Assess:
1. Does copying introduce new leverage risks?
2. What if original has 3x leverage, copy only 1.5x approved?
3. Compliance: Is copy-trading allowed in Brazil?
```

**Finance Response**:
- Leverage risk: Copy portfolio inherits original's leverage (need warnings)
- Compliance: CVM allows copy-trading with proper disclosures
- Recommendation: Hard cap copies at conservative leverage (1.5x max), warn users about tracking error
- Disclosures: "Past performance ≠ future results", "slippage 0.05%", "may not match exactly"

**Step 7: Legal drafts terms**

```
Task: Legal Counsel, draft copy-trading terms

Feature: Copy Top Performers now approved by Finance & Quant

Provide:
1. ToS addendum for copy-trading feature
2. Risk disclosures
3. Liability limitations
4. User acknowledgments
```

**Legal Response**:
```
Terms of Service - Copy Trading Addendum:

1. DISCLAIMERS
- Copying does not guarantee same returns
- Subject to slippage, timing differences, market conditions
- Past performance ≠ future results

2. RISKS
- Copied portfolio may underperform original
- If original in margin call, copy sync pauses
- Market conditions may prevent exact replication

3. LIABILITY
- We not liable for underperformance vs original
- We not liable for slippage/timing differences
- User responsible for copy portfolio decisions

4. USER ACKNOWLEDGMENT
- User confirms understanding of risks
- User authorizes daily rebalancing
- User can disable copy anytime

5. COMPLIANCE
- Compliant with CVM copy-trading rules
- No performance guarantees implied
```

---

## 🔗 Agent Communication Template

Use this to request work from agents:

```
**TO**: [Agent Name]
**FROM**: You/CEO
**PRIORITY**: P1 (Critical) / P2 (High) / P3 (Medium) / P4 (Low)
**DUE DATE**: [Date]

**TASK**: [Clear description]

**CONTEXT**:
- Current state: [What's the situation?]
- Dependencies: [What needs to be done first?]
- Constraints: [Time, budget, technical limits?]

**DELIVERABLES**:
1. [What you need]
2. [What you need]
3. [What you need]

**QUESTIONS**:
- [Specific questions if any]

**NOTES**:
- [Any additional context]
```

---

## 📞 When to Escalate

| Issue | First Contact | If Blocked | Escalate To |
|-------|---------------|-----------|------------|
| Feature question | PM | Need tech input | Dev Lead |
| Technical blocker | Dev Lead | Need architecture | Backend/Frontend as needed |
| Performance issue | Dev Lead | Need data analysis | Data Engineer |
| Algorithm underperforms | Quant | Need risk assessment | Finance Director |
| Regulatory question | Legal | Need product input | PM + Finance |
| User complaint | PM | High-value user | CEO |
| Financial risk | Finance | Need algorithm input | Quant |

---

## 📊 Checking Agent Status

Each agent maintains a status/capacity:

```
PM
├─ Current Load: 70% (2 active projects)
├─ Capacity: Available for 1 more P1 task
└─ Next Sync: 2026-06-10

Dev Lead
├─ Current Load: 80% (monitoring production, planning sprint)
├─ Capacity: Available for architecture review
└─ Next Sync: 2026-06-08

Backend Architect
├─ Current Load: 60% (logo endpoint complete, API docs in progress)
├─ Capacity: Available for new endpoint design
└─ Next Sync: 2026-06-07

[... and so on for each agent]
```

---

## 🎓 Best Practices

### DO ✅
- Be specific: "Optimize equity curve query <100ms" not "make it faster"
- Provide context: Include relevant code, metrics, constraints
- Set clear deadlines: "Due 2026-06-15" not "ASAP"
- Ask for actionable output: Code, diagrams, recommendations (not just analysis)
- Follow up: Let agent know what happened with their recommendation

### DON'T ❌
- Be vague: "Fix the system" → unclear what needs fixing
- Change requirements mid-task: Scope creep delays delivery
- Skip dependencies: "Can you do X before getting Y's input?"
- Ignore escalation path: Talk to right person first
- Ghost agents: Update them on decisions & outcomes

---

**Created**: 2026-06-05  
**Version**: 1.0  
**Next Review**: When first feature complete
