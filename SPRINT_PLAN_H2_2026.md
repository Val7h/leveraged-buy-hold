# SPRINT PLAN - LBH System H2 2026
## Roadmap Executivo + Distribuição de Trabalho (Paralelo)

**Status MVP:** v1.0 em produção (Render + Vercel)  
**Data:** Junho 2026 | **Sprint Duração:** 2 semanas × 5 sprints (H2)  
**Tema:** Consolidação → Monetização → Crescimento

---

## OBJETIVO H2 2026
1. **Compliance 100%** → Operações legais seguras
2. **Modelo de Receita** → Runway para 12-18 meses
3. **Growth Playbook** → Aquisição e retenção estruturados
4. **Performance Excellence** → Backend otimizado (<2s queries)
5. **Roadmap Q1 2027** → Features diferenciadas

---

# BRIEFS POR ESPECIALISTA

## 1. LEGAL OFFICER
**Objetivo:** Compliance completo para operações em tempo real

**Tarefas (Próximas 2 semanas):**
- [ ] **ToS/Privacy Policy (v1.0)** 
  - Risco de investimento alavancado (disclosure claro)
  - GDPR compliant
  - Menção: USA, Brasil, EU
  - Data delivery: **Dia 7**
  - Formato: `.md` → Design finalizará

- [ ] **Risk Disclaimer Framework**
  - Popup na primeira login (aceitar antes de usar)
  - Conteúdo em PT-BR + EN
  - Stored no DB (audit trail)
  - Implementação: Frontend entrega **Dia 5**

- [ ] **Terms of Service Structure**
  - Proibições: HFT, arbitrage, API abuse
  - Limitações de responsabilidade
  - Jurisdição: Delaware/Brasil
  - Review com especialista de crypto/fintech

- [ ] **Data Privacy Audit**
  - Checklist LGPD (Brasil) + GDPR
  - Encryption at rest/transit
  - Retention policies
  - Requestor: Risk Officer

**Métricas de Sucesso:**
- ToS assinável em <2 min (UX)
- 100% coverage de riscos legais
- Zero apontamentos em audit interno

**Dependências:**
- Frontend: Integração popup (Dia 5)
- Risk Officer: Revisão final (Dia 6)
- Product: Decisão sobre jurisdição (Dia 1)

**Riscos/Bloqueadores:**
- Consultoria externa pode atrashar (contatar agora)
- Brasil → COMISSÃO DE VALORES MOBILIÁRIOS (CVM) verificar se é necessário

---

## 2. RISK OFFICER
**Objetivo:** Framework de risco empresarial + compliance quantitativo

**Tarefas (Próximas 2 semanas):**
- [ ] **Risk Matrix H2 2026**
  - Identificar 15-20 riscos críticos
  - Score: Likelihood × Impact × Mitigation
  - Template: [RISK | Cenário | Probabilidade | Impacto | Mitigação]
  - Delivery: **Dia 3**

- [ ] **Model Validation Framework**
  - Validar scoring engine (backtest vs. live)
  - RSI/Stochastic calibração
  - Kelly/VaR cálculos internos
  - Comparar com Sharpe ratio real
  - Report: **Dia 8**

- [ ] **Leverage Stress Tests**
  - Simular GFC 2008 (drawdown -57%)
  - COVID 2020 (volatilidade +400%)
  - Bear 2022 (queda -30%)
  - Output: P&L máximo, margem de segurança
  - Cenários: Conservador, Balanceado, Agressivo

- [ ] **Counterparty Risk (Quantfury)**
  - Verificar solvência/regulação do broker
  - Liquidação de emergência
  - Documento: Risk Assessment Quantfury
  - Contato: Compliance Quantfury (2-3 dias)

- [ ] **VaR 95/99% Daily Monitoring**
  - Setup automático (backend) - request ao Backend Lead
  - Alert se VaR > threshold
  - Dashboard para executivo

**Métricas de Sucesso:**
- Risk matrix 100% documentada
- Model validation com <5% drift vs. live
- Stress tests cobrindo 3 crises históricas

**Dependências:**
- Backend Lead: Implementar VaR monitoring
- Quant Lead: Revisar cálculos Kelly
- Finance: Cobertura de hedge (se aplicável)

**Riscos/Bloqueadores:**
- Dados históricos Quantfury podem ser limitados
- Regulação brasileira em evolução (CVM)

---

## 3. FINANCE OFFICER
**Objetivo:** Modelo de receita + runway financeiro validado

**Tarefas (Próximas 2 semanas):**
- [ ] **Pricing Strategy (3 opções)**
  
  **Opção A: Subscription SaaS**
  - Free: 5 ativos screened, sem backtest
  - Pro: $29/mês → Acesso completo, 10 ativos simultâneos
  - Premium: $99/mês → Unlimited, API access, alerts
  - Enterprise: Custom
  - Validation: Pesquisa com 20 beta testers (Dia 5)

  **Opção B: Performance Fee (Tipo hedge fund)**
  - 2% AUM (assets under management)
  - 20% dos ganhos acima de benchmark (SPY)
  - Minimo: $100k aportado
  - Risco: Regulação

  **Opção C: Hybrid (SaaS + Performance)**
  - Tier básico $19/mês
  - Performance fee 15% acima de S&P 500

  Decision deadline: **Dia 7** (PM)

- [ ] **30/60/90 Day Cash Flow**
  - Cenário pessimista (10 users @ $29)
  - Cenário base (50 users @ $49 blend)
  - Cenário otimista (200 users @ $49)
  - Break-even análise (users needed)
  - Output: Spreadsheet com projeções

- [ ] **Burn Rate & Runway**
  - Custos atuais: Render, Vercel, Quantfury data?
  - Equipe: 10 pessoas (salários)
  - Runway current: ? meses
  - Target runway: 12-18 meses (investment)
  - Options: Bootstrapping vs. Seed round

- [ ] **Financial Model Deck**
  - P&L template 12 meses (base scenario)
  - Unit economics (CAC, LTV)
  - Path to profitability
  - Pitch deck para investidores (se aplicável)
  - Format: Spreadsheet + slides

- [ ] **Cost Optimization Audit**
  - Onde podemos economizar?
  - Quantfury → caching local possível?
  - Database → índices, compressão
  - Hosting → Render vs. Railway vs. AWS
  - Report: Top 5 otimizações + savings

**Métricas de Sucesso:**
- Pricing strategy decidida + comunicada
- Break-even point claro
- Runway visualizado por cenário

**Dependências:**
- Product: Decisão sobre pricing (Dia 7)
- Growth: Estimativa de CAC
- Backend: Custos de infra atualizados

**Riscos/Bloqueadores:**
- Regulação brasileira → pode exigir registro (CVM)
- Hedge fund model pode ser bloqueado legalmente

---

## 4. QUANT LEAD
**Objetivo:** Validação + otimização do motor quantitativo

**Tarefas (Próximas 2 semanas):**
- [ ] **Backtesting Accuracy Report**
  - Comparar backtest vs. live returns (últimos 3 meses)
  - Drift analysis: Model vs. Realidade
  - Identificar overfitting
  - Calibração de parâmetros (RSI, Stoch periods)
  - Output: Technical report, **Dia 10**

- [ ] **Leverage Algorithm Deep Dive**
  - Kelly Criterion vs. actual used
  - VaR 95/99% comparison
  - Half-Kelly vs. Full Kelly decisão
  - Parameter sensitivity analysis
  - Recomendação para ajuste

- [ ] **Scoring Engine Audit**
  - Validar pesos: 60% quality / 40% opportunity
  - Backtester: Qual score explica melhor returns?
  - Beta stability (rolling window)
  - Dividend yield → forward yield ou trailing?
  - Output: Recomendação de ajuste

- [ ] **Indicator Tuning**
  - RSI 14 period → ótimo? Testar 7, 10, 14, 21
  - Estocástico Lento %K → period ideal
  - Bandas de Bollinger → 2σ ou 1.5σ?
  - MM200 → still relevant? Testar 150, 200, 250
  - Dataset: 10 anos de S&P 500

- [ ] **Monte Carlo Model Validation**
  - GBM assumptions hold? → Historical volatility vs. realized
  - Bootstrap alternative (non-parametric)
  - Correlation structure → simplistic?
  - Output: 1000 simulations, percentile analysis
  - Decision: Use GBM, Bootstrap ou híbrido?

- [ ] **Quantfury API Data Quality Check**
  - Latency de dados → delay vs. live quotes?
  - Missing bars? (check continuidade)
  - Dividend/split handling
  - Report: Data quality score (SLA)

**Métricas de Sucesso:**
- <5% drift model vs. live
- Scoring engine explicando >60% variance
- Indicator tuning recomendações documentadas

**Dependências:**
- Backend: Acesso a histórico live vs. backtest
- Risk Officer: Validação de stress tests
- Data Engineer (se temos): Quantfury API logging

**Riscos/Bloqueadores:**
- Dados históricos podem ter gaps
- Quantfury latency pode ser issue

---

## 5. BACKEND LEAD (Python/FastAPI)
**Objetivo:** Performance + Escalabilidade + APIs para Growth

**Tarefas (Próximas 2 semanas):**
- [ ] **Performance Optimization (Equity Curves)**
  - Identificar slow queries (benchmark: <2s)
  - Profile: `/api/v1/backtest` endpoint
  - Indexes PostgreSQL: ticker, date, user_id
  - Query result caching (Redis?)
  - Target: 90th percentile <2s, 99th <5s
  - Metrics: LoadTest com 100 concurrent users
  - Delivery: **Dia 8**

- [ ] **API Rate Limiting + Authentication**
  - Implement JWT refresh tokens (security)
  - Rate limit por user: Free (10 req/min), Pro (100 req/min), Premium (unlimited)
  - Endpoint: `/api/v1/auth/refresh`
  - Error handling: 429 Too Many Requests
  - Doc: **Dia 5**

- [ ] **New API Endpoints (Growth enablers)**
  - `GET /api/v1/analytics/cohort` → User retention by signup date
  - `GET /api/v1/analytics/feature-usage` → Screening vs. Backtest vs. Simulator
  - `POST /api/v1/portfolio/export` → CSV + JSON export
  - `GET /api/v1/news/tickers/{ticker}` → News feed integration
  - Swagger docs auto-generated
  - **Dia 10**

- [ ] **Monitoring + Logging Infrastructure**
  - Setup: Sentry (error tracking)
  - Log aggregation: CloudWatch / ELK / Datadog (trial)
  - Metrics: Request latency, error rate, DB query time
  - Alert: E-mail para PM se error rate > 5%
  - Dashboard: Stats básicos
  - **Dia 7**

- [ ] **Database Optimization**
  - Current schema review
  - Missing indexes? (EXPLAIN ANALYZE)
  - Denormalization opportunities (materialized views)?
  - Partition strategy (if needed)
  - Backup automation (daily snapshots)
  - Report: Top 3 optimization recommendations

- [ ] **VaR/CVaR Daily Computation**
  - Automatic job: 4 PM ET (market close)
  - Compute VaR 95/99% per user portfolio
  - Store in `portfolio_metrics` table
  - API: `GET /api/v1/portfolio/{id}/var-history`
  - **Dia 6**

- [ ] **Risk Disclosure Popup Integration**
  - Endpoint: `POST /api/v1/user/accept-disclaimer`
  - Store: `User.disclaimer_accepted_at`
  - Response: JWT token só gerado se True
  - Fallback: Force redirect to `/disclaimer` if not accepted
  - **Dia 5**

**Métricas de Sucesso:**
- Backtest queries: <2s p90
- Zero 5xx errors (99.9% uptime)
- VaR computed daily by 4:15 PM ET

**Dependências:**
- Risk Officer: VaR specs
- Legal: Disclaimer endpoint specs
- Growth: Analytics endpoint specs
- DevOps/Infrastructure: Monitoring setup

**Riscos/Bloqueadores:**
- Large backtest payloads → timeout
- Quantfury rate limits → cache strategy needed
- Database schema → migration risk

---

## 6. FRONTEND LEAD (Next.js/React)
**Objetivo:** UI/UX Excellence + Compliance Integration + Mobile

**Tarefas (Próximas 2 semanas):**
- [ ] **Risk Disclaimer Modal (Popup)**
  - Page: `/pages/disclaimer.tsx`
  - Content: HTML from Legal (day 7)
  - Action: Accept button → `POST /api/v1/user/accept-disclaimer`
  - Store: localStorage (`disclaimerAccepted`)
  - Logic: Block all routes if not accepted
  - A/B Test ready: 2 versions
  - **Dia 7**

- [ ] **Portfolio Export Feature**
  - Button: "Download Portfolio"
  - Formats: CSV, JSON, PDF (charts)
  - Content: All positions, metrics, equity curve
  - Integration: Backend `/api/v1/portfolio/export`
  - **Dia 8**

- [ ] **Mobile Responsive Redesign**
  - Audit: Which components fail on mobile?
  - Charts → TradingView Lightweight Charts? (better mobile)
  - Layout: Breakpoints TailwindCSS (sm, md, lg)
  - Navigation: Hamburger menu (responsive)
  - Test: iPhone 12, iPad, Android
  - Lighthouse: Target >85 Mobile score
  - **Dia 10**

- [ ] **Performance Optimization (Frontend)**
  - Lighthouse audit: Current state
  - Bundle size: next/bundle-analyzer
  - Code split: Lazy load Backtest, Simulator (heavy)
  - Image optimization: Next/Image for all charts/logos
  - Caching: SWR for API calls
  - Target: Lighthouse >80 mobile, >90 desktop
  - **Dia 6**

- [ ] **New Screens (Analytics + Settings)**
  - Page: `/pages/analytics.tsx` → Feature usage, portfolio evolution
  - Page: `/pages/settings.tsx` → Risk profile, alert preferences, data export
  - Forms: Validation + error handling
  - Components: Reusable card, stat block, toggle
  - **Dia 9**

- [ ] **Email Template + Notification Center**
  - Alert emails: RSI < 30, Score > threshold
  - In-app notifications: Bell icon top-right
  - Layout: `/components/NotificationCenter.tsx`
  - Backend API: `GET /api/v1/notifications`
  - Mark as read: `POST /api/v1/notifications/{id}/read`
  - **Dia 9**

- [ ] **Accessibility Audit (WCAG 2.1 AA)**
  - Color contrast check
  - Keyboard navigation
  - Screen reader test (NVDA)
  - Alt text for images
  - Form labels, ARIA attributes
  - Report: Issues + fixes
  - **Dia 5**

**Métricas de Sucesso:**
- Mobile Lighthouse >85
- Disclaimer acceptance <100ms latency
- Export feature used by >50% of Pro users (after launch)

**Dependências:**
- Legal: Risk Disclaimer content (Dia 7)
- Backend: Export endpoint (Dia 8)
- Design: Specs for Analytics page (Dia 1)
- Product: Priority of features

**Riscos/Bloqueadores:**
- Recharts vs. TradingView (performance)
- Large equity curves can slow rendering
- SSR hydration issues with date/time

---

## 7. GROWTH OFFICER
**Objetivo:** Playbook de aquisição + retenção + LTV

**Tarefas (Próximas 2 semanas):**
- [ ] **Growth Playbook v1.0**
  - Channel strategy: Organic (Reddit, Twitter), Paid (LinkedIn ads?), Partnerships
  - Messaging: What pain point does LBH solve?
  - ICP (Ideal Customer Profile): Demographics, income, risk appetite
  - Validation: Interview 5 beta testers → qualitative feedback
  - Output: 1-pager Growth Strategy
  - **Dia 4**

- [ ] **CAC & LTV Framework**
  - Pricing decision input (from Finance)
  - CAC assumptions: $X per user
  - LTV calculation: (ARPU × Lifetime) - CAC
  - Retention curves: Month 1, 3, 6, 12
  - Payback period: Target <6 months
  - Sensitivity analysis: Price changes
  - **Dia 7**

- [ ] **Landing Page (Conversion Optimized)**
  - Current: Generic /
  - Redesign: Value prop clear, CTA prominent
  - A/B test: Version A vs. B (CTR benchmark)
  - Copy: 30-second elevator pitch
  - SEO basics: Meta tags, schema, keywords
  - Design: Frontend collaboration
  - **Dia 10**

- [ ] **User Onboarding Flow**
  - Current: Registration → Dashboard
  - New: Welcome email, in-app tutorial (3 slides), first screening action
  - Engagement metric: Users who complete 1 full backtest (Day 7)
  - Output: Onboarding sequence spec
  - **Dia 8**

- [ ] **Acquisition Channels Deep Dive**
  - Organic: Reddit /r/investing, Twitter threads, Medium blog posts
  - Content: "How Leverage Changed My Returns" (case study)
  - Partnerships: With quant blogs, fintech newsletters
  - Paid: Budget $500/month test → Google Ads, LinkedIn (awareness)
  - Recommendation: Top 2 channels to focus
  - **Dia 9**

- [ ] **Retention + Churn Analysis**
  - Current churn rate: ? (from analytics)
  - Cohort analysis: Signup date → 30/60/90 retention
  - Churn reasons: Survey non-active users
  - Win-back campaign: Email to churned users (discount 50% off)
  - Loyalty: Referral program ideas
  - Target: <5% monthly churn
  - **Dia 10**

- [ ] **Viral Loop / Referral Program**
  - Mechanic: Refer friend → both get 1 month free
  - Limit: Cap at 3 free months per user
  - Tracking: UTM params + referral codes
  - Reporting: Dashboard for Growth team
  - Cost: ~$30 CAC per referral
  - **Dia 9**

**Métricas de Sucesso:**
- Growth strategy documented
- CAC / LTV ratio > 3:1 (healthy)
- Landing page conversion >3%

**Dependências:**
- Product: Pricing decision (Dia 7)
- Finance: Unit economics validation
- Frontend: Landing page implementation
- Backend: Analytics endpoints

**Riscos/Bloqueadores:**
- Regulatory → cannot advertise leverage to everyone (must be qualified investors?)
- Brazil: CVM restrictions on financial product marketing
- CAC may be high (B2B/fintech is expensive)

---

## 8. DEVOPS / INFRASTRUCTURE LEAD
**Objetivo:** Escalabilidade + Reliability + Cost Optimization

**Tarefas (Próximas 2 semanas):**
- [ ] **Production Readiness Checklist**
  - [ ] SSL/TLS (HTTPS) ✓ (Vercel auto, Render auto)
  - [ ] Database backups: Automated daily, tested recovery
  - [ ] Disaster recovery: RTO 1 hour, RPO 15 min
  - [ ] Load testing: Can handle 1000 concurrent users?
  - [ ] Failover strategy: DB replica (standby)
  - [ ] Secrets management: .env, API keys (not in repo)
  - **Dia 8**

- [ ] **Infrastructure Cost Audit**
  - Current: Render (backend), Vercel (frontend), PostgreSQL (where?)
  - Breakdown: Render cost/month, Vercel, DB, Quantfury API
  - Alternatives: Railway vs. Render, self-hosted option?
  - Optimization: Caching layer (Redis)?
  - Recommendation: Save 20-30% if possible
  - **Dia 6**

- [ ] **Monitoring + Alerting Setup**
  - Backend: Sentry for errors
  - Uptime: UptimeRobot or similar (5-min checks)
  - Metrics: Prometheus + Grafana (or Datadog trial)
  - Alerts: Slack webhook if error rate >5%, downtime >5 min
  - Dashboard: Public status page (statuspage.io)?
  - **Dia 7**

- [ ] **Database Scaling Strategy**
  - Current size: ? GB
  - Growth projection: ? GB in 12 months (1000 users)
  - Connection pool: Max connections (Render/Railway limit)
  - Read replicas: If needed (cost-benefit)
  - Backup strategy: Nightly full, hourly WAL
  - **Dia 5**

- [ ] **CI/CD Pipeline Hardening**
  - GitHub Actions: Test on every PR?
  - Deployment: Automated to staging, manual to prod
  - Rollback: Easy revert if needed
  - Secrets: No hardcoded API keys in repo
  - Status: "Passing" requirement before merge
  - **Dia 4**

- [ ] **DDoS / Security Hardening**
  - Cloudflare / WAF rules (if not using)
  - Rate limiting (backend already)
  - CORS policy: Strict (only frontend domain)
  - Headers: HSTS, CSP, X-Frame-Options
  - Penetration test: Vulnerability scan (optional)
  - **Dia 9**

**Métricas de Sucesso:**
- 99.5% uptime SLA
- RTO <1 hour, RPO <15 min
- Infrastructure cost reduced by 20%

**Dependências:**
- Backend Lead: App performance metrics
- Finance: Budget approval for scaling
- Security: DDoS strategy approval

**Riscos/Bloqueadores:**
- Database scaling can be expensive (need decision point)
- Render/Vercel performance at scale (unknown)

---

## 9. PRODUCT MANAGER (Você)
**Objetivo:** Decisões críticas + Roadmap H2 + Synthesis

**Tarefas (Próximas 2 semanas):**
- [ ] **Sprint 1 Kickoff Meeting**
  - When: Monday 9 AM
  - Attendees: All 9 specialists
  - Agenda: Briefing, dependencies, blockers
  - Format: 90 min
  - **Dia 1**

- [ ] **Daily Standups (Async)**
  - Format: Slack thread #lbh-sprint-updates
  - Content: Yesterday ✓, Today 🎯, Blockers 🚧
  - Cadence: 9 AM + 6 PM (both time zones)
  - **Weekly**

- [ ] **Mid-Sprint Sync (Dia 7)**
  - Review progress vs. plan
  - Identify blockers early
  - Adjust sprint if needed
  - **30 min per speciality**

- [ ] **Decision: Pricing Strategy**
  - Input: Finance officer recommendation (Dia 7)
  - Options: A (SaaS), B (Performance fee), C (Hybrid)
  - Validation: Beta tester feedback
  - Decision deadline: **Dia 8**
  - Communication: All-hands email (Dia 9)

- [ ] **Decision: Leverage Model Updates**
  - Input: Quant lead validation (Dia 10)
  - Changes: Kelly adjustment? Indicator tuning?
  - Risk: What's the impact of changes?
  - Testing: Shadow test new model vs. live
  - Decision deadline: **Dia 12**
  - Deployment: Staging first, gradual rollout to prod

- [ ] **Decision: Growth Channel Priority**
  - Input: Growth officer recommendation (Dia 9)
  - Budget: $X/month allocation
  - Timeline: Which channels launch first?
  - Measurement: Weekly tracking of CAC
  - Decision deadline: **Dia 10**

- [ ] **Risk Matrix Synthesis**
  - Input: Risk officer matrix (Dia 3)
  - Top 5 risks: Prioritize mitigation
  - Ownership: Assign to each specialist
  - Review cadence: Weekly risk stand-up
  - **Dia 4**

- [ ] **Roadmap H2 2026 (5 Sprints Ahead)**
  - Sprint 1: Compliance, Pricing, Performance ← **CURRENT**
  - Sprint 2: Growth launch, API enhancements
  - Sprint 3: Mobile optimization, new features
  - Sprint 4: Advanced analytics, predictive models
  - Sprint 5: Enterprise features, partnerships
  - Visual: Gantt chart, dependency map
  - **Dia 8**

- [ ] **Sprint Review + Retro (Dia 14)**
  - Demo: Each specialist shows 2-3 deliverables
  - Metrics: Success criteria met? % complete
  - Retro: What went well? What slowed us?
  - Adjust Sprint 2 plan based on learnings
  - **Format: 2 hours**

**Métricas de Sucesso:**
- 100% sprint completion
- Zero critical blockers unresolved
- Clear roadmap documented for H2
- Pricing decision made + communicated

**Dependências:**
- All specialists: Daily input

**Risks/Blockers:**
- Regulatory changes (CVM) may block pricing
- Quantfury API limitations may force pivots

---

# DEPENDENCY MAP

```
SPRINT 1 (Weeks 1-2)

┌─────────────────────────────────────────────────────────────────┐
│ PARALLEL TRACKS (No blocking on each other)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LEGAL                    RISK                 QUANT             │
│  ├─ ToS/Privacy (D7)      ├─ Risk Matrix (D3)  ├─ Backtest     │
│  ├─ Disclaimer (D5)       ├─ Model Valid (D8)  │   validation   │
│  └─ Privacy Audit         ├─ Stress Tests      └─ Scoring      │
│                           └─ Quantfury Check      tuning (D10)  │
│                                                                  │
│  FINANCE                  BACKEND               FRONTEND        │
│  ├─ Pricing (3 opts)      ├─ Performance (D8)   ├─ Disclaimer   │
│  ├─ 30/60/90 forecast     ├─ Rate Limit (D5)    │   modal (D7)  │
│  ├─ Runway analysis       ├─ Analytics API      ├─ Mobile UX    │
│  └─ Cost Audit (D6)       ├─ VaR Daily (D6)     └─ Perf opt.   │
│                           └─ Monitoring (D7)                    │
│                                                                  │
│  GROWTH                   DEVOPS                                │
│  ├─ Growth Playbook       ├─ Prod Readiness                    │
│  ├─ CAC/LTV (D7)          ├─ Cost Audit (D6)                   │
│  ├─ Landing Page (D10)    ├─ Monitoring (D7)                   │
│  └─ Onboarding Flow       └─ CI/CD Hardening                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

DEPENDENCIES BY DAY:

Day 1:  Product: Jurisdiction decision → Legal
Day 3:  Risk matrix available → Product reviews
Day 4:  Growth playbook available → Product input
Day 5:  
  - Disclaimer ready → Frontend integration
  - Disclaimer popup ready → Backend integration
  - Accessibility audit ready → Frontend fixes
Day 6:
  - Cost audit → Finance reviews
  - Monitoring setup → DevOps
  - Performance audit → Frontend implements
Day 7:
  - ToS/Privacy → Legal review + deployment
  - CAC/LTV validation → Finance reviews
  - Pricing recommendation → Product DECIDES
  - Backend monitoring ready
Day 8:
  - Model validation report → Quant+Risk discuss
  - Backtest export → Frontend implements
  - Roadmap H2 ready → Product shares
Day 9:
  - Growth channels recommendation → Product reviews
  - Analytics screens → Frontend implements
Day 10:
  - Indicator tuning → Product considers
  - Landing page → Growth+Frontend iterate
  - Retention analysis → Growth presents
Day 12:
  - Product decides on leverage model
Day 14:
  - Sprint review + retro
  - Sprint 2 planning

CRITICAL PATH:
Product → Finance (Pricing) → Growth (CAC assumptions) → Backend (APIs for tracking)

DECISION GATES (PM involvement required):
- Day 8:   Pricing model decision
- Day 10:  Growth channel priority
- Day 12:  Leverage model adjustments
- Day 14:  Sprint 2 resource allocation
```

---

# SUCCESS CRITERIA - SPRINT 1 END

## COMPLIANCE ✓
- [ ] ToS + Privacy Policy signed off by Legal
- [ ] Risk Disclaimer modal live in production
- [ ] Data privacy audit completed (0 gaps)
- [ ] Counterparty risk (Quantfury) documented

## BUSINESS ✓
- [ ] Pricing model selected + rationale documented
- [ ] Financial projections (break-even, runway)
- [ ] Growth strategy (channels, CAC, LTV)

## PRODUCT ✓
- [ ] Performance: Backtest queries <2s p90
- [ ] Mobile UX: Lighthouse >85 mobile
- [ ] Risk monitoring: VaR daily computed + alerts

## RISK ✓
- [ ] Risk matrix (top 20 risks documented)
- [ ] Model validation: <5% drift vs. live
- [ ] Stress tests: 3 crises + recommendations

---

# SPRINT 2 PREVIEW (Weeks 3-4)

Once Sprint 1 closes, Sprint 2 will focus on:
- **Execution:** Implement pricing tier selection
- **Growth:** Launch 2 acquisition channels
- **Features:** Advanced portfolio analytics, export, news feed
- **Optimization:** Database indexing, frontend code splitting
- **Compliance:** Legal reviews feedback implementation

---

# CALENDAR (Todos os especialistas)

**WEEK 1 (June 5-12, 2026):**
| Date | Evento | Owner | Attendees |
|------|--------|-------|-----------|
| Mon 06/05 | Sprint 1 Kickoff | PM | All 9 |
| Tue 06/06 | Mid-sprint check | PM | Check daily |
| Thu 06/08 | Risk Matrix review | PM + Risk | Decision point |
| Fri 06/12 | End of Week 1 | PM | Async update |

**WEEK 2 (June 13-19, 2026):**
| Date | Evento | Owner | Attendees |
|------|--------|-------|-----------|
| Mon 06/13 | Decision sync (Pricing) | PM | Execs |
| Wed 06/15 | Growth channel review | PM + Growth | Decision |
| Thu 06/17 | Tech review (Performance) | PM + Backend | Validation |
| Fri 06/19 | Sprint Review + Retro | PM | All 9 |

---

# ROLES & ESCALATION

**Critical Blockers → Escalate to PM immediately:**
- Regulatory show-stopper (CVM, SEC)
- Technical issue preventing deployment
- Team capacity issue
- Vendor/counterparty risk

**PM Reviews Daily:**
- Async Slack updates (9 AM + 6 PM)
- Risk matrix evolution
- Cost/timeline impacts

**Weekly Sync Meetings:**
- Risk stand-up (15 min, Risk Officer + PM)
- Technical stand-up (15 min, Backend + Frontend + DevOps)

---

*Last updated: June 5, 2026*  
*Next review: June 19, 2026 (End of Sprint 1)*
