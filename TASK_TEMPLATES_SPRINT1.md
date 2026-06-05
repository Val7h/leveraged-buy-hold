# TAREFAS SPRINT 1 - Templates por Especialista
## Copy-paste para seu sistema de tasks (Jira, Linear, Asana, etc.)

---

## 📋 LEGAL OFFICER

### Task L1: ToS + Privacy Policy v1.0
- **Descrição:** Redigir Termos de Serviço e Política de Privacidade
- **Subtarefas:**
  - [ ] Pesquisar regulação CVM (Brasil) + SEC (USA) + GDPR (EU)
  - [ ] Rascunho: Disclosure de risco de alavancagem (claro, honesto)
  - [ ] Draft ToS: Seções principais (proibições, limitações, propriedade)
  - [ ] Draft Privacy: Coleta, armazenamento, compartilhamento de dados
  - [ ] Self-review checklist
  - [ ] Compartilhar com Risk Officer para revisão
- **Entrega:** Dia 7 (Dia 7 = 11 de Junho)
- **Formato:** `.md` ou `.pdf` (Legal vai dar ao Design para finalizar)
- **Dependências:** Product: Jurisdição (Dia 1)
- **Critério de Sucesso:** 
  - Texto assinável em <2 minutos
  - 100% cobertura de riscos legais de leverage
  - Compliance com LGPD + GDPR + regulação brasileira

---

### Task L2: Risk Disclaimer Framework
- **Descrição:** Criar popup modal de aceitação de risco (legal foundation)
- **Subtarefas:**
  - [ ] Rascunho: Título + 3-4 bullets de risco principal
  - [ ] Checkbox: "Li e entendo os riscos. Aceito o disclaimer."
  - [ ] Especificar: Onde armazenar aceito? (DB, audit trail?)
  - [ ] I18n: PT-BR + EN
  - [ ] Revisar com Risk Officer
  - [ ] Revisar com Product Manager
- **Entrega:** Dia 5 (Dia 5 = 9 de Junho)
- **Dependências:** Product: Decisão sobre jurisdição (Dia 1)
- **Implementação:** Frontend (Dia 5-7)
- **Critério de Sucesso:**
  - Modal sem jargão legal (entendível por leigos)
  - Popup bloqueador (sem aceitar, não acessa app)
  - Todos que aceitam são registrados (audit trail)

---

### Task L3: Data Privacy Audit (LGPD + GDPR)
- **Descrição:** Validar compliance com privacidade de dados
- **Subtarefas:**
  - [ ] LGPD checklist: Consentimento, direito esquecimento, portabilidade
  - [ ] GDPR checklist: DPA, processamento legal, direitos Data Subject
  - [ ] Criptografia: Senhas (bcrypt?), API keys (vault?), dados em trânsito (TLS?)
  - [ ] Retenção: Quanto tempo guardar dados? Quando deletar?
  - [ ] LOPD (Brasil) review
  - [ ] Compilar findings + recomendações
- **Entrega:** Dia 10
- **Formato:** Spreadsheet (sim/não/parcial para cada item)
- **Dependências:** Backend (describe encryption current state)
- **Critério de Sucesso:**
  - 0 gaps críticos
  - Plano de correção para gaps médios
  - Documentação assinável por legal

---

### Task L4: Contato CVM (Brasil)
- **Descrição:** Verificar regulação de leverage + pricing
- **Subtarefas:**
  - [ ] Pesquisar: CVM requer registro para "plataforma de leverage"?
  - [ ] Email formal: Descrever produto, perguntar regulatory requirement
  - [ ] Timeline: Quanto leva um registro (se necessário)?
  - [ ] Custo: Há taxas de registro?
  - [ ] Alternativa: Se CVM bloqueia, podemos servir só EUA?
- **Entrega:** Dia 3 (resposta pode vir depois)
- **Dependências:** Product: Decisão sobre target countries
- **Critério de Sucesso:**
  - Resposta formal da CVM (ou 3 tentativas)
  - Documento com regulatory path forward

---

---

## ⚠️ RISK OFFICER

### Task R1: Risk Matrix H2 2026
- **Descrição:** Identificar e priorizar riscos empresariais
- **Subtarefas:**
  - [ ] Brainstorm: 15-20 riscos (market, tech, regulatory, financial)
  - [ ] Score cada um: Likelihood (1-5) × Impact (1-5) → Priority
  - [ ] Top 5: Detalhar mitigações
  - [ ] Ownership: Atribuir responsável para cada
  - [ ] Review cadence: Semanal? Mensal?
- **Entrega:** Dia 3
- **Formato:** Spreadsheet (Risk | Desc | L | I | Priority | Mitigation | Owner)
- **Dependências:** None
- **Critério de Sucesso:**
  - >50% dos riscos tem mitigação clara
  - Product revisa e aprova prioridades

---

### Task R2: Model Validation (Backtest vs. Live)
- **Descrição:** Validar que scoring engine é preditivo na realidade
- **Subtarefas:**
  - [ ] Coletar histórico: Últimos 3 meses de live trades
  - [ ] Calcular: O que backtest previu vs. o que realmente aconteceu?
  - [ ] Drift analysis: Score prediz returns >60% do tempo?
  - [ ] Identificar: Parâmetros problemáticos (RSI 14? Stoch %K?)
  - [ ] Recomendação: Calibração necessária?
- **Entrega:** Dia 8
- **Formato:** Technical report + gráficos
- **Dependências:** Backend: Acesso a dados live + backtest
- **Critério de Sucesso:**
  - <5% drift (modelo explica 95%+ da realidade)
  - Recomendações claras para ajuste

---

### Task R3: Leverage Stress Tests
- **Descrição:** Simular crises históricas com modelo atual
- **Subtarefas:**
  - [ ] Cenário 1: GFC 2008 (S&P -57%, volatilidade +200%)
  - [ ] Cenário 2: COVID 2020 (S&P -34%, volatilidade +300%)
  - [ ] Cenário 3: Bear 2022 (S&P -30%, volatilidade flat)
  - [ ] Calcular: Max drawdown, VaR 95/99%, liquidation risk
  - [ ] Conservador vs. Balanceado vs. Agressivo
  - [ ] Recomendação: Ajustar Kelly fractions?
- **Entrega:** Dia 10
- **Formato:** Spreadsheet + summary
- **Dependências:** Quant: Parâmetros atuais
- **Critério de Sucesso:**
  - Todas 3 crises simuladas
  - Margem de segurança documentada por risk profile

---

### Task R4: Quantfury Counterparty Risk Assessment
- **Descrição:** Validar que broker é confiável
- **Subtarefas:**
  - [ ] Pesquisa: Solvência de Quantfury (regulação, capital)
  - [ ] Contato: Email compliance Quantfury → verificar liquidação de emergência
  - [ ] Documentar: Segregação de contas, hedge contra insolvência?
  - [ ] SLA: Que latência podemos esperar?
  - [ ] Contingency: Se Quantfury cair, plan B?
- **Entrega:** Dia 5 (contato), dia 10 (resposta)
- **Critério de Sucesso:**
  - Documento assinável confirmando solvência
  - Plano de contingência se broker falhar

---

---

## 💰 FINANCE OFFICER

### Task F1: Pricing Strategy (3 Options Analysis)
- **Descrição:** Desenvolver e validar 3 modelos de precificação
- **Subtarefas:**
  
  **Opção A - SaaS Subscription:**
  - [ ] Tier Free: Features (5 ativos, sem backtest)
  - [ ] Tier Pro: $29/mês → Feature set
  - [ ] Tier Premium: $99/mês → Feature set
  - [ ] Enterprise: Custom pricing
  - [ ] Justificativa: Comparable analysis (fintech SaaS)

  **Opção B - Performance Fee (Hedge Fund Model):**
  - [ ] Estrutura: 2% AUM + 20% de ganhos acima de SPY
  - [ ] Minimo aportado: $100k+
  - [ ] Regulatory risk assessment
  - [ ] Justificativa: Alinhamento de incentivos

  **Opção C - Hybrid (SaaS + Performance):**
  - [ ] Tier básico: $19/mês
  - [ ] Upside sharing: 10% acima de benchmark
  - [ ] Justificativa: Market differentiation

  **Validação para todos:**
  - [ ] Interview 20 beta testers (Day 4-5) → WTP (Willingness to Pay)
  - [ ] Feedback analysis
  
- **Entrega:** Dia 7
- **Formato:** Spreadsheet com 3 colunas (Opção A/B/C)
- **Dependências:** Product: Decision day 8
- **Critério de Sucesso:**
  - Uma opção tem >70% de "sim eu pagaria" from beta testers
  - Regulatory path clear para opção recomendada

---

### Task F2: 30/60/90 Day Financial Projections
- **Descrição:** Projetar receita em 3 cenários
- **Subtarefas:**
  - [ ] Pessimistic: 10 users @ $29 (40% activation)
  - [ ] Base case: 50 users @ $49 (blend)
  - [ ] Optimistic: 200 users @ $49 (viral)
  - [ ] Incluir: Churn assumptions (10%, 5%, 2%)
  - [ ] Gráfico: Receita cumulativa
- **Entrega:** Dia 7
- **Formato:** Spreadsheet + chart
- **Critério de Sucesso:**
  - Break-even point identificado em cada cenário
  - Months to break-even: <12 months (base case)

---

### Task F3: Burn Rate & Runway Analysis
- **Descrição:** Validar quanto tempo temos de cash
- **Subtarefas:**
  - [ ] Current costs: Render, Vercel, Quantfury API (se houver), others
  - [ ] Payroll: 10 pessoas × salary médio (ou estimate)
  - [ ] Total monthly burn
  - [ ] Current runway: ? months (current capital / monthly burn)
  - [ ] Target runway: 12-18 months (investment decision)
  - [ ] Gap analysis: Quanto falta de funding?
- **Entrega:** Dia 7
- **Formato:** Spreadsheet
- **Dependências:** DevOps: Atual infrastructure costs
- **Critério de Sucesso:**
  - Runway claro
  - Funding strategy (self-funded, seed, bootstrap)

---

### Task F4: Unit Economics (CAC, LTV, Payback)
- **Descrição:** Validar que business model é viável
- **Subtarefas:**
  - [ ] CAC estimate: Quanto custa adquirir 1 usuário? (Growth input)
  - [ ] ARPU: Average Revenue Per User (qual pricing + % de uptake?)
  - [ ] Churn rate: Monthly churn assumption
  - [ ] LTV calc: ARPU / Monthly Churn
  - [ ] LTV:CAC ratio: Target >3:1
  - [ ] Payback period: LTV pay CAC in < X months?
- **Entrega:** Dia 9
- **Formato:** Spreadsheet + analysis
- **Dependências:** Growth: CAC estimates, Quant/Finance: Churn assumptions
- **Critério de Sucesso:**
  - LTV:CAC >3:1 for profitability
  - Payback <6 months (healthy SaaS)

---

### Task F5: Cost Optimization Audit
- **Descrição:** Identificar economia possível
- **Subtarefas:**
  - [ ] Infrastructure: Render vs. Railway vs. AWS (costs)
  - [ ] Database: PostgreSQL hosting (Render, Neon, AWS)
  - [ ] Caching: Redis (local or managed)?
  - [ ] APIs: Quantfury costs, yfinance (free?)
  - [ ] Tools: Sentry, Datadog, monitoring (trials?)
  - [ ] Recommendation: Top 3 areas para economizar + amounts
- **Entrega:** Dia 6
- **Formato:** Spreadsheet + summary
- **Dependências:** DevOps: Current setup details
- **Critério de Sucesso:**
  - Top 5 otimizações identificadas
  - Potencial savings: >20% of infrastructure costs

---

---

## 🎓 QUANT LEAD

### Task Q1: Backtest vs. Live Validation
- **Descrição:** Validar que backtest prediz realidade (model drift)
- **Subtarefas:**
  - [ ] Histórico: Últimos 3 meses de trades ao vivo
  - [ ] Compare: O que backtest previu (score, leverage) vs. resultado real
  - [ ] Análise: Para cada ativo, score explica return?
  - [ ] Overfitting check: Modelo memorizou histórico?
  - [ ] Recomendações: Ajustar RSI, Stoch, pesos?
- **Entrega:** Dia 10
- **Formato:** Jupyter notebook + summary report
- **Dependências:** Backend: Acesso BD live + backtest
- **Critério de Sucesso:**
  - Drift <5% (modelo explica >95% da realidade)
  - Recomendações claras e testáveis

---

### Task Q2: Leverage Algorithm Deep Dive
- **Descrição:** Validar Kelly Criterion + VaR implementação
- **Subtarefas:**
  - [ ] Kelly math: (p*b - q) / b (verificar implementação)
  - [ ] Current: Usando full Kelly, half Kelly, quarter Kelly?
  - [ ] VaR cálculo: 95%, 99% — método correto?
  - [ ] Compare: Nossa leverage vs. market best practices
  - [ ] Sensitivity: Se mudar Kelly, impacto em Sharpe?
- **Entrega:** Dia 8
- **Formato:** Technical memo + Excel
- **Critério de Sucesso:**
  - Kelly implementação verificada
  - Recomendação: manter ou ajustar?

---

### Task Q3: Scoring Engine Audit
- **Descrição:** Validar que score 0-100 prediz returns
- **Subtarefas:**
  - [ ] Verificar pesos: 60% quality, 40% opportunity — ótimo?
  - [ ] Backtest: Para cada quintil de score, qual foi return?
  - [ ] High score assets: Foram os com melhor return?
  - [ ] Regression: Score explica quanto da variância?
  - [ ] Recomendação: Ajustar pesos? (ex: 70% quality, 30% opportunity)
- **Entrega:** Dia 10
- **Formato:** Matplotlib charts + recommendation
- **Critério de Sucesso:**
  - Score explica >60% do variance em returns
  - Ajustes de pesos documentados e testados

---

### Task Q4: Technical Indicator Calibration
- **Descrição:** Validar período ideal para RSI, Stoch, etc.
- **Subtarefas:**
  - [ ] RSI: Testar 7, 10, 14, 21 períodos → qual dá melhor Sharpe?
  - [ ] Stocástico %K: Testar 14, 21, 28
  - [ ] BB: Testar 1.5σ vs. 2σ
  - [ ] MM200: Testar 150, 200, 250
  - [ ] Dataset: 10 anos de S&P 500 (SPY)
  - [ ] Output: Recomendação para cada parâmetro
- **Entrega:** Dia 10
- **Formato:** Backtest results + summary table
- **Critério de Sucesso:**
  - Cada parâmetro otimizado para Sharpe ratio
  - Recomendação assinada por Quant

---

### Task Q5: Monte Carlo Model Validation
- **Descrição:** Validar GBM assumptions para simulador
- **Subtarefas:**
  - [ ] GBM: Logarithmic returns são normalmente distribuídos? (test)
  - [ ] Volatility: Realizada vs. histórica (match?)
  - [ ] Correlation: Matriz de correlação ativos (assunções simplistas?)
  - [ ] Alternative: Testar bootstrap (non-parametric)
  - [ ] Compare: GBM vs. Bootstrap — qual melhor?
  - [ ] Recomendação: Usar GBM, Bootstrap ou hybrid?
- **Entrega:** Dia 8
- **Formato:** Stats analysis + recommendation
- **Critério de Sucesso:**
  - GBM assumptions validated ou alternativa proposta
  - Simulações 1000x são representativas

---

### Task Q6: Quantfury API Data Quality
- **Descrição:** Validar qualidade de dados do broker
- **Subtarefas:**
  - [ ] Latency: Qual é delay entre broker quote vs. nossa API?
  - [ ] Continuidade: Missing bars? (check daily closes)
  - [ ] Splits/Dividends: Tratamento correto?
  - [ ] Accuracy: Compare com Yahoo Finance (sanity check)
  - [ ] SLA: Documentar % uptime esperado
- **Entrega:** Dia 7
- **Formato:** Data quality scorecard
- **Dependências:** Backend: Acesso logs Quantfury
- **Critério de Sucesso:**
  - Data SLA documentado
  - Issues escalados para DevOps/Risk

---

---

## 🚀 BACKEND LEAD

### Task B1: Backtest Query Performance Optimization
- **Descrição:** Fazer backtest queries rodar <2s p90
- **Subtarefas:**
  - [ ] Baseline: Atual latência de `/api/v1/backtest`?
  - [ ] Profiling: Qual query é lenta? (EXPLAIN ANALYZE)
  - [ ] Índices: Adicionar em `ticker`, `date`, `user_id`
  - [ ] Query optimization: Cache intermediários?
  - [ ] Caching: Redis para resultados?
  - [ ] Load test: 100 concurrent users → p90 latency?
  - [ ] Target: <2s p90, <5s p99
- **Entrega:** Dia 8
- **Formato:** Benchmark report + code changes
- **Dependências:** DevOps: Database índices, Redis setup
- **Critério de Sucesso:**
  - p90 latency <2s
  - Backtest "feels instant" to user

---

### Task B2: JWT + Rate Limiting Implementation
- **Descrição:** Melhorar segurança de API com rate limiting por tier
- **Subtarefas:**
  - [ ] JWT refresh tokens: Implement `/api/v1/auth/refresh`
  - [ ] Rate limits: Free (10 req/min), Pro (100 req/min), Premium (unlimited)
  - [ ] Middleware: Middleware to check rate limit per user
  - [ ] Error response: 429 Too Many Requests
  - [ ] Documentation: Swagger docs updated
  - [ ] Test: Manual test all tiers
- **Entrega:** Dia 5
- **Formato:** Code + Swagger docs
- **Critério de Sucesso:**
  - JWT refresh working
  - Rate limiting enforced per tier
  - Zero false positives

---

### Task B3: Analytics API Endpoints
- **Descrição:** Adicionar endpoints para Growth medir engagement
- **Subtarefas:**
  - [ ] `GET /api/v1/analytics/cohort` → User retention by signup date
  - [ ] `GET /api/v1/analytics/feature-usage` → Screen/Backtest/Simulator counts
  - [ ] `POST /api/v1/portfolio/export` → CSV/JSON export
  - [ ] `GET /api/v1/news/{ticker}` → News feed (optional: integrate API)
  - [ ] Swagger: Auto-document todas
  - [ ] Test: Manual e unit tests
- **Entrega:** Dia 10
- **Formato:** Code + tests
- **Critério de Sucesso:**
  - Todas 4 endpoints working
  - Growth pode medir engagement
  - >80% test coverage

---

### Task B4: Monitoring + Logging Setup
- **Descrição:** Setup Sentry + centralized logging
- **Subtarefas:**
  - [ ] Sentry: Configure for error tracking (FastAPI integration)
  - [ ] Logging: Centralize logs (CloudWatch, Datadog, ou local ELK)
  - [ ] Metrics: Request latency, error rate, DB query time
  - [ ] Alerts: Email if error rate >5% or downtime
  - [ ] Dashboard: Basic stats (ops visibility)
  - [ ] Test: Trigger fake error → verify alert
- **Entrega:** Dia 7
- **Formato:** Config files + dashboard link
- **Critério de Sucesso:**
  - Zero errors go unnoticed
  - PM alerted to issues in real-time

---

### Task B5: VaR Daily Computation Job
- **Descrição:** Compute VaR 95/99% para todos users daily
- **Subtarefas:**
  - [ ] Job: Scheduled task (4 PM ET, market close)
  - [ ] Compute: VaR 95%, VaR 99% per user portfolio
  - [ ] Store: Save in `portfolio_metrics` table
  - [ ] API: `GET /api/v1/portfolio/{id}/var-history`
  - [ ] Alert: Email user if VaR critical (>50% portfolio)
  - [ ] Test: Verify job runs on schedule
- **Entrega:** Dia 6
- **Formato:** Code + job scheduler
- **Dependências:** Risk: VaR computation specs
- **Critério de Sucesso:**
  - VaR computed daily by 4:15 PM ET
  - API returns historical VaR data

---

### Task B6: Risk Disclaimer Endpoint
- **Descrição:** Backend endpoint para Legal disclaimer acceptance
- **Subtarefas:**
  - [ ] Endpoint: `POST /api/v1/user/accept-disclaimer`
  - [ ] Payload: `{ disclaimer_version: string }`
  - [ ] Store: `User.disclaimer_accepted_at` timestamp
  - [ ] Auth: Only authenticated users
  - [ ] Response: Success → return JWT token
  - [ ] Fallback: If not accepted, force redirect to `/disclaimer` page
  - [ ] Test: Unit tests
- **Entrega:** Dia 5
- **Formato:** Code
- **Dependências:** Legal: Disclaimer version numbering
- **Critério de Sucesso:**
  - Disclaimer acceptance stored
  - Non-accepted users blocked from features

---

### Task B7: Database Optimization
- **Descrição:** Melhorar performance e confiabilidade DB
- **Subtarefas:**
  - [ ] Current schema review: Any missing columns? Constraints?
  - [ ] Índices: Que índices faltam? (ticker, date, user_id)
  - [ ] EXPLAIN ANALYZE: Identificar slow queries
  - [ ] Denormalization: Materialized views para heavy queries?
  - [ ] Partitioning: Se dados >1GB, particionar por date?
  - [ ] Backups: Daily snapshots automated + restore test
  - [ ] Recomendação: Top 3 otimizações + priority
- **Entrega:** Dia 8
- **Formato:** Analysis report + SQL scripts
- **Critério de Sucesso:**
  - All slow queries identified
  - Backup strategy automated

---

---

## 🎨 FRONTEND LEAD

### Task FE1: Risk Disclaimer Modal
- **Descrição:** Implementar popup obrigatório de risco
- **Subtarefas:**
  - [ ] Page: `/pages/disclaimer.tsx` (or route)
  - [ ] Content: HTML from Legal (esperar Dia 7)
  - [ ] Action: Accept button → `POST /api/v1/user/accept-disclaimer`
  - [ ] UX: Full-screen modal, easy to understand text
  - [ ] i18n: PT-BR + EN (use next-i18n-router)
  - [ ] Logic: Block all routes unless accepted
  - [ ] Storage: localStorage backup (offline safety)
  - [ ] A/B test ready: flag para 2 variações
  - [ ] Test: Accesibility (WCAG), mobile
- **Entrega:** Dia 7
- **Formato:** Code + component
- **Dependências:** Legal: Content (Dia 7), Backend: Endpoint (Dia 5)
- **Critério de Sucesso:**
  - Modal blocks app access
  - Content understandable by non-technical users

---

### Task FE2: Portfolio Export Feature
- **Descrição:** Download carteira em múltiplos formatos
- **Subtarefas:**
  - [ ] UI: Button "Download Portfolio" em dashboard
  - [ ] Formats: CSV, JSON, PDF (com gráficos)
  - [ ] Content: Todas posições, métricas, equity curve
  - [ ] Integration: POST /api/v1/portfolio/export
  - [ ] UX: Loading state, success notification
  - [ ] Test: Verify file downloads correctly
  - [ ] Accessibility: Button labeled properly
- **Entrega:** Dia 8
- **Formato:** React component
- **Dependências:** Backend: Export endpoint (Dia 8)
- **Critério de Sucesso:**
  - CSV downloads e abre no Excel
  - PDF has charts + metrics

---

### Task FE3: Mobile Responsive Redesign
- **Descrição:** Tornar app 100% mobile-friendly
- **Subtarefas:**
  - [ ] Audit: Qual página falha no mobile? (iPhone 12, iPad)
  - [ ] Charts: Switch to TradingView Lightweight Charts? (melhor mobile)
  - [ ] Layout: TailwindCSS responsive (sm, md, lg breakpoints)
  - [ ] Navigation: Hamburger menu para mobile
  - [ ] Touch targets: Buttons >44px (accessibility)
  - [ ] Images: Next/Image optimization (sizes, srcset)
  - [ ] Test: iOS Safari, Chrome Android
  - [ ] Lighthouse: Target >85 mobile, >90 desktop
- **Entrega:** Dia 10
- **Formato:** Code changes
- **Critério de Sucesso:**
  - App fully usable on mobile
  - Lighthouse mobile >85

---

### Task FE4: Frontend Performance Optimization
- **Descrição:** Melhorar velocidade + bundle size
- **Subtarefas:**
  - [ ] Baseline: Run Lighthouse → export report
  - [ ] Bundle: next/bundle-analyzer → identifcar bloat
  - [ ] Code split: Lazy load Backtest, Simulator (heavy)
  - [ ] Images: Audit unoptimized images → use Next/Image
  - [ ] Caching: SWR for API calls, 1 min revalidation
  - [ ] CSS: Remove unused styles (PurgeCSS)
  - [ ] Target: Lighthouse >80 mobile, >90 desktop
- **Entrega:** Dia 6
- **Formato:** Lighthouse report + code changes
- **Critério de Sucesso:**
  - Lighthouse mobile >80
  - Bundle size <500KB (gzipped)

---

### Task FE5: Analytics + Settings Pages
- **Descrição:** Adicionar páginas para user insights
- **Subtarefas:**
  
  **Analytics Page:**
  - [ ] `/pages/analytics.tsx` → Feature usage, portfolio evolution
  - [ ] Charts: Screening vs. Backtest vs. Simulator usage (monthly)
  - [ ] Portfolio value over time (equity curve)
  - [ ] Top performers (ativos que geraram mais gain)
  
  **Settings Page:**
  - [ ] `/pages/settings.tsx` → User preferences
  - [ ] Risk profile picker (Conservador/Balanceado/Agressivo)
  - [ ] Alert preferences: RSI threshold, Score threshold, email/in-app
  - [ ] Export: Download all data
  - [ ] Delete account: GDPR right to deletion
  
  **Components:**
  - [ ] Reusable: Card, StatBlock, Toggle
  - [ ] Forms: Validation + error handling
  
- **Entrega:** Dia 9
- **Formato:** React pages + components
- **Critério de Sucesso:**
  - Analytics page shows engagement clearly
  - Settings allow user control

---

### Task FE6: Email Templates + Notification Center
- **Descrição:** Integração notificações em-app + email
- **Subtarefas:**
  - [ ] Notification Center: `/components/NotificationCenter.tsx`
  - [ ] UI: Bell icon (top-right), dropdown list
  - [ ] Types: Alert (RSI <30), Score (>80), News, System
  - [ ] Email templates: Handlebars (ou Jinja2 if using Python)
  - [ ] API: `GET /api/v1/notifications` → list
  - [ ] Mark as read: `POST /api/v1/notifications/{id}/read`
  - [ ] Test: Send fake notification
- **Entrega:** Dia 9
- **Formato:** Components + templates
- **Critério de Sucesso:**
  - Notifications appear in-app
  - Emails send correctly

---

### Task FE7: Accessibility Audit (WCAG 2.1 AA)
- **Descrição:** Garantir app é acessível para todos
- **Subtarefas:**
  - [ ] Color contrast: All text >4.5:1 ratio (WCAG AA)
  - [ ] Keyboard navigation: Tab through all elements
  - [ ] Screen reader: Test com NVDA (Windows)
  - [ ] Alt text: Todas imagens/charts têm descrição
  - [ ] Form labels: <label> linked to <input>
  - [ ] ARIA: role, aria-label where needed
  - [ ] Test: axe DevTools Chrome extension
  - [ ] Report: Issues + fixes
- **Entrega:** Dia 5
- **Formato:** Audit report + code fixes
- **Dependências:** Design review (if color changes needed)
- **Critério de Sucesso:**
  - 0 critical issues in axe report
  - WCAG AA compliant

---

---

## 📈 GROWTH OFFICER

### Task G1: Growth Playbook v1.0
- **Descrição:** Estratégia de acquisition + retention
- **Subtarefas:**
  - [ ] ICP (Ideal Customer Profile): Demographics, income, tech-savvy?
  - [ ] Pain point: O que problema resolvemos? (leverage, diversification?)
  - [ ] Channels: Organic (Reddit, Twitter, blog), Paid (LinkedIn?), Partnerships
  - [ ] Messaging: 30-second elevator pitch
  - [ ] Validation: Interview 5 beta testers → feedback
  - [ ] Prioritize: Top 3 channels to focus Q3
  - [ ] Output: 1-page strategy document
- **Entrega:** Dia 4
- **Formato:** Markdown 1-pager
- **Dependências:** Finance: Pricing decision for messaging
- **Critério de Sucesso:**
  - Strategy is actionable
  - Top 3 channels identified

---

### Task G2: CAC + LTV Framework
- **Descrição:** Validar unit economics
- **Subtarefas:**
  - [ ] CAC assumptions: Quanto custa 1 user? (starting estimate)
  - [ ] ARPU: Average Revenue Per User (based on pricing)
  - [ ] Churn: Monthly churn rate assumption (10%, 5%?)
  - [ ] LTV formula: ARPU / monthly churn
  - [ ] Ratio: LTV:CAC (target >3:1)
  - [ ] Payback: Months to recover CAC (target <6)
  - [ ] Sensitivity: What if price changes? What if churn 10%?
- **Entrega:** Dia 7
- **Formato:** Spreadsheet + chart
- **Dependências:** Finance: Pricing, Churn assumptions
- **Critério de Sucesso:**
  - LTV:CAC >3:1 (healthy)
  - Payback <6 months

---

### Task G3: Landing Page (Conversion Optimized)
- **Descrição:** Homepage redesign para conversão
- **Subtarefas:**
  - [ ] Current: Audit existing / → conversion rate?
  - [ ] Value prop: 1-liner que explica benefício (em <10 words)
  - [ ] CTA: "Sign Up Free" or "Get Started" — prominent
  - [ ] Copy: 3 benefits, 1 social proof, testimonial if possible
  - [ ] Design: Frontend collaboration (specs Dia 1)
  - [ ] SEO: Meta title, description, og tags
  - [ ] A/B test: 2 versions → measure CTR
  - [ ] Copywriting: Test 2 headlines
- **Entrega:** Dia 10
- **Formato:** HTML/React page
- **Dependências:** Design, Product: value prop messaging
- **Critério de Sucesso:**
  - >3% CTR (sign-up rate)
  - Conversion funnel clear

---

### Task G4: User Onboarding Flow
- **Descrição:** Implementar onboarding para activate users
- **Subtarefas:**
  - [ ] Email sequence: Welcome (D0), Tips (D1), Motivation (D3)
  - [ ] In-app tutorial: 3 slides (Screening, Backtest, Simulator)
  - [ ] First action: Guidance para 1º screening completo
  - [ ] Engagement metric: % Users who do backtest by Day 7
  - [ ] Target: >50% of signups activate
  - [ ] Fallback: Email reminder se usuário não loga em D2
- **Entrega:** Dia 8
- **Formato:** Onboarding spec + email templates
- **Dependências:** Frontend: In-app tutorial components
- **Critério de Sucesso:**
  - >50% users complete 1 backtest
  - Onboarding emails have >25% open rate

---

### Task G5: Acquisition Channels Deep Dive
- **Descrição:** Testar e priorizar canais de aquisição
- **Subtarefas:**
  - [ ] Organic: Reddit /r/investing, Twitter quant community, Bluesky, Medium
  - [ ] Content: Write "How I Used Leverage to Beat SPY" (case study, anonymized)
  - [ ] Partnerships: Reach out 5 quant blogs for guest posts
  - [ ] Paid: Budget $500/month test → Google Ads, LinkedIn ads
  - [ ] Landing page: Setup UTM params para track source
  - [ ] Recommendation: Qual canal tem lowest CAC?
- **Entrega:** Dia 9
- **Formato:** Channel analysis + recommendation
- **Critério de Sucesso:**
  - CAC known for 2+ channels
  - Organic post published + shared

---

### Task G6: Retention + Churn Analysis
- **Descrição:** Medir e melhorar retention
- **Subtarefas:**
  - [ ] Current churn: What % of users churn per month? (from data)
  - [ ] Cohort analysis: Group by signup date, track retention 30/60/90 days
  - [ ] Churn survey: Email to churned users → why did you leave?
  - [ ] Win-back: Campaign para re-engage with 50% discount offer
  - [ ] Loyalty: Referral program ideas (refer → both get 1 month free)
  - [ ] Target: <5% monthly churn
- **Entrega:** Dia 10
- **Formato:** Cohort analysis + survey results
- **Dependências:** Backend: Analytics endpoints
- **Critério de Sucesso:**
  - Churn rate known
  - Top churn reasons identified
  - Win-back campaign planned

---

### Task G7: Referral Program Design
- **Descrição:** Viral loop para user acquisition
- **Subtarefas:**
  - [ ] Mechanic: Refer friend → both get 1 month free
  - [ ] Limit: Cap 3 free months per user (prevent abuse)
  - [ ] Tracking: Referral codes + UTM params
  - [ ] Dashboard: User can see referral status + earnings
  - [ ] Incentive: Maybe affiliate commission $X per paid referral?
  - [ ] Cost: Assume ~$30 CAC per referral (cost/benefit)
  - [ ] Test: Launch with 100 users, measure share rate
- **Entrega:** Dia 9
- **Formato:** Specs + implementation plan
- **Dependências:** Backend: Tracking implementation
- **Critério de Sucesso:**
  - >10% of users refer someone
  - CAC from referral <$30

---

---

## ⚙️ DEVOPS / INFRASTRUCTURE LEAD

### Task D1: Production Readiness Checklist
- **Descrição:** Validar que stack é production-ready
- **Subtarefas:**
  - [ ] SSL/TLS: HTTPS everywhere (Vercel auto, Render auto)
  - [ ] Backups: PostgreSQL backups automated (daily), tested recovery
  - [ ] DR plan: RTO 1 hour, RPO 15 min (if DB fails)
  - [ ] Load test: Simular 1000 concurrent users → latency p90/p99
  - [ ] Failover: DB replica (standby) or backup strategy
  - [ ] Secrets: No hardcoded API keys in repo (use env vars)
  - [ ] Health checks: `/health` endpoint monitoring DB + external services
- **Entrega:** Dia 8
- **Formato:** Checklist + report
- **Critério de Sucesso:**
  - All items ✓
  - DR plan documented

---

### Task D2: Infrastructure Cost Audit
- **Descrição:** Reducir custos 20% if possible
- **Subtarefas:**
  - [ ] Breakdown: Render cost, Vercel cost, DB hosting, Quantfury API
  - [ ] Alternatives: Railway vs. Render (features + cost), AWS?
  - [ ] Database: PostgreSQL where hosted? Can self-host?
  - [ ] Caching: Redis needed? (cost-benefit)
  - [ ] Recommendation: Save $X/month with priority ranking
- **Entrega:** Dia 6
- **Formato:** Cost breakdown spreadsheet + recommendations
- **Dependências:** Finance: Budget decisions
- **Critério de Sucesso:**
  - 20% cost reduction identified (or justified why not possible)

---

### Task D3: Monitoring + Alerting Infrastructure
- **Descrição:** Setup observability stack
- **Subtarefas:**
  - [ ] Sentry: Error tracking integration (FastAPI)
  - [ ] Logs: Centralized logging (CloudWatch, Datadog, ELK)
  - [ ] Metrics: Request latency, error rate, DB query time
  - [ ] Alerts: Slack/Email if error rate >5% or 5+ min downtime
  - [ ] Dashboard: Simple status page (operations visibility)
  - [ ] Test: Trigger fake error → verify alert workflow
- **Entrega:** Dia 7
- **Formato:** Config files + screenshot dashboard
- **Critério de Sucesso:**
  - Errors are detected and alerted within 2 min
  - PM has visibility into system health

---

### Task D4: Database Scaling Strategy
- **Descrição:** Plan para dados crescentes
- **Subtarefas:**
  - [ ] Current size: DB size now? (GB)
  - [ ] Growth: 1000 users in 12 months = ? GB
  - [ ] Connection pool: Max connections per plan
  - [ ] Read replicas: Cost-benefit (needed?)
  - [ ] Backup: Daily full backup + hourly WAL (log shipping)
  - [ ] Recommendation: Upgrade plan when?
- **Entrega:** Dia 5
- **Formato:** Analysis + scaling roadmap
- **Critério de Sucesso:**
  - Scaling path clear for 12 months

---

### Task D5: CI/CD Pipeline Hardening
- **Descrição:** Melhorar reliability de deployments
- **Subtarefas:**
  - [ ] GitHub Actions: Run tests on every PR
  - [ ] Staging: Deploy PRs to staging for manual testing
  - [ ] Production: Require "Passing" status to merge
  - [ ] Secrets: Rotate API keys, no hardcoded values
  - [ ] Rollback: Document how to revert a deployment
  - [ ] Version control: Tag releases (v1.0.0, v1.0.1)
- **Entrega:** Dia 4
- **Formato:** GitHub Actions config + docs
- **Critério de Sucesso:**
  - 0 production deployments without tests passing

---

### Task D6: DDoS + Security Hardening
- **Descrição:** Proteger infrastructure contra ataques
- **Subtarefas:**
  - [ ] WAF: Cloudflare rules (if not using, setup)
  - [ ] Rate limiting: Backend rate limiting already done (Task B2)
  - [ ] CORS: Strict policy (only frontend domain allowed)
  - [ ] Headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
  - [ ] HTTPS: Enforce redirect (HTTP → HTTPS)
  - [ ] Vulnerability scan: Quick scan com OWASP ZAP (optional)
- **Entrega:** Dia 9
- **Formato:** Config files + security checklist
- **Critério de Sucesso:**
  - No obvious security holes
  - Headers properly set

---

---

## 🎯 PRODUCT MANAGER (Você)

### Task PM1: Sprint 1 Kickoff Meeting
- **Descrição:** Launch sprint com clarity
- **Subtarefas:**
  - [ ] Schedulde: Monday 9 AM
  - [ ] Attendees: All 9 specialists
  - [ ] Agenda: Briefing, dependencies, blockers (90 min)
  - [ ] Recording: Save for async folks
  - [ ] Next steps: Confirm everyone understands their task
- **Entrega:** Dia 1
- **Formato:** Meeting notes + recording link
- **Critério de Sucesso:**
  - Zero unclear expectations
  - All 9 specialists can start immediately

---

### Task PM2: Decision — Pricing Model
- **Descrição:** Escolher entre 3 opções de pricing
- **Subtarefas:**
  - [ ] Input: Finance recommendation (Dia 7)
  - [ ] Input: Beta tester feedback (Dia 7)
  - [ ] Decision: Which option A/B/C?
  - [ ] Rationale: Documento why (5 bullets)
  - [ ] Communication: Email all-hands Dia 9
  - [ ] Next: Hand off to backend/frontend for implementation
- **Entrega:** Dia 8
- **Formato:** 1-page decision doc + email
- **Critério de Sucesso:**
  - Pricing chosen + communicated
  - Team ready to implement

---

### Task PM3: Decision — Growth Channels
- **Descrição:** Priorize top 2-3 acquisition channels
- **Subtarefas:**
  - [ ] Input: Growth recommendation (Dia 9)
  - [ ] Data: CAC estimates by channel
  - [ ] Decision: Top 2 channels to launch Q3
  - [ ] Budget: Allocate marketing budget
  - [ ] Timeline: When do we start?
- **Entrega:** Dia 10
- **Formato:** Decision doc
- **Critério de Sucesso:**
  - Growth team has clear marching orders

---

### Task PM4: Decision — Leverage Model Adjustments
- **Descrição:** Decidir se mudamos Kelly, RSI, etc.
- **Subtarefas:**
  - [ ] Input: Quant validation report (Dia 10)
  - [ ] Impact: Como mudança afeta estratégia?
  - [ ] Risk: What's the downside?
  - [ ] Decision: Implement changes? Shadow test first?
  - [ ] Timeline: When deploy to production?
- **Entrega:** Dia 12
- **Formato:** Decision doc + risk assessment
- **Critério de Sucesso:**
  - Changes (if any) deployed safely

---

### Task PM5: Risk Matrix Synthesis
- **Descrição:** Priorize top 5 riscos + ownership
- **Subtarefas:**
  - [ ] Input: Risk matrix (Dia 3)
  - [ ] Top 5: Which are most likely + impactful?
  - [ ] Mitigation: Who owns each? Timeline?
  - [ ] Cadence: Weekly risk stand-up (Fridays?)
  - [ ] Escalation: What's your escalation path if risk materializes?
- **Entrega:** Dia 4
- **Formato:** Risk summary + mitigation plan
- **Critério de Sucesso:**
  - Top 5 risks have clear owners + plans

---

### Task PM6: Roadmap H2 2026 (5 Sprints)
- **Descrição:** Macro roadmap para próximos meses
- **Subtarefas:**
  
  **Sprint 1 (June 5-19): Compliance, Pricing, Performance**
  - Compliance 100%, Pricing decided, Backtest <2s
  
  **Sprint 2 (June 19 - July 3): Growth Launch, APIs**
  - Launch 2 acquisition channels, analytics endpoints live
  
  **Sprint 3 (July 3-17): Mobile + Analytics**
  - Mobile >85 Lighthouse, advanced portfolio analytics
  
  **Sprint 4 (July 17-31): Advanced Features**
  - Predictive models, automated rebalancing (if time)
  
  **Sprint 5 (July 31 - Aug 14): Enterprise + Partnerships**
  - Enterprise features, integrate with wealth managers?
  
  - [ ] Create Gantt chart
  - [ ] Identify key dependencies
  - [ ] Assign themes to each sprint
  - [ ] Share with team
- **Entrega:** Dia 8
- **Formato:** Figma Gantt + markdown roadmap
- **Critério de Sucesso:**
  - H2 roadmap clear + shared
  - Team sees path to profitability

---

### Task PM7: Daily Standups (Async)
- **Descrição:** Monitor progress diariamente
- **Subtarefas:**
  - [ ] Slack thread #lbh-sprint-updates
  - [ ] Format: "Yesterday ✓, Today 🎯, Blockers 🚧"
  - [ ] Cadence: 9 AM + 6 PM
  - [ ] Action: If blocker, reach out 1:1 immediately
- **Entrega:** Daily (ongoing)
- **Critério de Sucesso:**
  - Zero surprises (issues caught early)

---

### Task PM8: Mid-Sprint Sync (Dia 7)
- **Descrição:** Review progress + adjust if needed
- **Subtarefas:**
  - [ ] Checkpoint: Each specialist → on track? Behind?
  - [ ] Blockers: Anything I can unblock?
  - [ ] Adjust: Do we need to reduce scope?
  - [ ] 1:1 calls: 15-20 min per specialization
- **Entrega:** Dia 7
- **Formato:** Call notes
- **Critério de Sucesso:**
  - Issues identified + solved

---

### Task PM9: Sprint Review + Retro
- **Descrição:** Celebrate wins + learn for Sprint 2
- **Subtarefas:**
  - [ ] Demo: Each specialist shows 2-3 deliverables (5 min each)
  - [ ] Metrics: Success criteria met? % complete?
  - [ ] Retro: What went well? What slowed us?
  - [ ] Adjustments: Sprint 2 learnings
  - [ ] Awards: Celebrate MVP contributor
- **Entrega:** Dia 14 (Friday)
- **Formato:** Meeting (120 min)
- **Critério de Sucesso:**
  - Sprint 1 documented + Sprint 2 ready

---

---

## SUMÁRIO DE TIMING

**Critical Paths (Finish by Day X to unblock others):**

1. **Product: Jurisdiction decision (Dia 1)** → Legal can proceed ToS
2. **Legal: Disclaimer modal (Dia 5)** → Frontend can integrate
3. **Finance: Pricing recommendation (Dia 7)** → Growth/Backend can proceed
4. **Quant: Backtest validation (Dia 10)** → Product decides leverage changes
5. **Backend: Performance optimization (Dia 8)** → Product can demo

**Dependency Order:**
Product (decisions) → Finance/Growth (business model) → Backend/Frontend (implementation) → Quant/Risk (validation)

---

*Templates created: June 5, 2026*  
*Sprint end: June 19, 2026*
