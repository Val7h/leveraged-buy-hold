# PLANO FINANCEIRO - LBH SYSTEM
## Sprint 1: Business Model + Pricing + Unit Economics

**Data:** 5 de Junho de 2026  
**Estágio:** MVP com 3 features completas  
**Status:** Revenue = $0 (não monetizado)  
**Autoria:** Financeiro / CFO  

---

## EXECUTIVE SUMMARY

### Recomendação Executiva (Top-Level)

**Modelo de Negócio Recomendado:** Freemium + SMB Pro Tier  
**Preço Recomendado:** Free (com limitações) + Pro $19/mês (pequenos investidores) + Enterprise TBD  
**Runway Estimado:** 18-24 meses (com burn otimizado)  
**Break-even:** 8-12 meses com 500+ PRO users ativos  

---

## PARTE 1: ANÁLISE DE MERCADO & ICP

### 1.1 Definição de Ideal Customer Profile (ICP)

#### Primary ICP: Investidor Individual Defensivo (Brazil-focused)

| Atributo | Valor |
|----------|-------|
| **Idade** | 28-55 |
| **Localização** | Brasil (São Paulo, Rio) + USA (tech-savvy expats) |
| **Patrimônio Investível** | $10k - $500k USD |
| **Perfil** | Buy & Hold, defensivo, baixa frequência trading |
| **Painel de dor** | Falta timing, leverage arriscada, sem ferramentas quant |
| **Sensibilidade preço** | Média-alta (bootstrapped) |
| **CAC esperado** | $20-50 (referral) / $100-200 (ads) |

#### Secondary ICP: Micro-SMB Asset Manager (1-5 clientes)

| Atributo | Valor |
|----------|-------|
| **Tipo** | Consultores de investimento, RIAs pequenas |
| **Patrimônio sob gestão** | $500k - $10M USD |
| **Painel de dor** | Ferramentas Bloomberg/E-Trade caras; sem backtesting quantitativo |
| **Sensibilidade preço** | Baixa (fee-based, pode passar custos) |
| **CAC esperado** | $200-500 (direto) |

---

### 1.2 TAM / SAM / SOM Estimation

#### Total Addressable Market (TAM) — Brasil + Expats USA

**Investidores individuais B3 (Brasil):**
- 2.2M contas ativas (B3, 2024)
- 15% com patrimônio >$10k USD ≈ **330k investidores potenciais**
- Disposição a pagar por ferramentas: ~5% = **16,500 potenciais clientes**

**Investidores USA (ações defensivas defensivas, não-profissionais):**
- ~50M contas Fidelity/Schwab com patrimônio $10k-500k
- 8% interessados em leverage adaptativo ≈ **4M potencial**
- Disposição a pagar: 2% = **80,000 potenciais**

**TAM Combinado (conservador):** ~100,000 investidores individuais dispostos a pagar

**Segmento SMB/RIA:**
- ~15,000 pequenas RIAs/consultores Brasil + USA
- 20% potencial user = 3,000 contas

**TAM Total: ~103,000 contas possíveis**

---

#### Serviceable Addressable Market (SAM) — 3 anos

**Go-to-market realista:**
- Inicial: Brasil + expats tech-savvy (Reddit, Twitter, blogs quant)
- Y1: Brasil (+ México via Spanish expansion)
- Y2-3: USA expansion via content + partnerships
- Retenção: 60% ao fim de Y1 (típico SaaS B2C fintech)

**SAM Y1:** 5,000-8,000 possíveis users
**SAM Y2-3:** 15,000-25,000 possíveis users

---

#### Serviceable Obtainable Market (SOM) — Realista 3 anos

**SOM Y1:** 500-1,000 usuários ativos (5-10% de SAM)
- **Free tier:** 300-600 users (virality)
- **Pro tier:** 200-400 users (paid)

**SOM Y2:** 3,000-5,000 usuarios
- **Free:** 1,500-2,500
- **Pro:** 1,000-1,500
- **Enterprise:** 50-100

**SOM Y3:** 8,000-12,000 usuários
- **Free:** 4,000-6,000
- **Pro:** 2,500-3,500
- **Enterprise:** 300-500

---

## PARTE 2: TOP 2 BUSINESS MODEL OPTIONS

### Option A: FREEMIUM (Recomendado)

#### Modelo

| Tier | Free | Pro | Enterprise |
|------|------|-----|------------|
| **Screening Assets** | 5 ativos/mês | Ilimitado | Ilimitado |
| **Backtest** | 1/mês, 5 anos máx | 10/mês, 20 anos | Ilimitado |
| **Monte Carlo** | Não | 5/mês | Ilimitado |
| **API Access** | Não | Não | Sim (base price) |
| **Alerts** | 3 por portfólio | 20 por portfólio | 100+ customizado |
| **Portfolio Limit** | 1 | 5 | Ilimitado |
| **Export/Reports** | CSV (básico) | PDF + Excel | White-label API |
| **Support** | Community | Email (48h) | Dedicated |
| **Preço** | $0 | $19/mês | $299+/mês (negociado) |

#### Racional

- **Maximiza virality:** Usuários grátis crescem organicamente
- **Monetização clara:** 20-30% conversion esperada (típico fintech SaaS)
- **Escalável:** Sem suporte pessoal até Enterprise
- **Reduz CAC:** Viral loop incentiva referral

#### Projeção de Receita (SOM-based)

**Year 1 (500 PRO users médios):**
- 300 users × $19 × 10 meses (média ramp) = $57,000 MRR plateau

**Year 2 (1,500 PRO users):**
- 1,500 × $19 = $28,500 MRR
- + 100 Enterprise × $299 = $29,900 MRR
- **Total: $58,400 MRR**

**Year 3 (3,500 PRO users):**
- 3,500 × $19 = $66,500 MRR
- + 300 Enterprise × $399 = $119,700 MRR
- **Total: $186,200 MRR ($2.23M ARR)**

#### Pros
- ✅ Network effects (viral) — grátis usuários trazem friends
- ✅ Low CAC — viral loop reduce acquisition costs
- ✅ Product-market fit validation — free users validate product
- ✅ Escalável sem hiring — suporte mínimo até Pro tier
- ✅ Pricing psychology — $19 é low-friction para niche

#### Cons
- ⚠️ Dependente de conversion rate — se <10%, fails
- ⚠️ Free user churn — 50%+ churn normal se não engajados
- ⚠️ Server costs scale — com users grátis, infra cresce também
- ⚠️ Support burden — Community-driven precisa moderation
- ⚠️ Competitor bundling — Outros SaaS podem copiar + undersell

---

### Option B: PREMIUM (Alta barreira)

#### Modelo

| Tier | Standard | Professional |
|------|----------|--------------|
| **Screening** | Ilimitado | Ilimitado |
| **Backtest** | 20/mês, 20 anos | Ilimitado |
| **Monte Carlo** | Ilimitado | Ilimitado |
| **API** | Não | Sim |
| **Support** | Email (24h) | Dedicated + Slack |
| **Preço** | $49/mês | $199/mês |

#### Racional

- **No freemium complexity** — Cobro tudo desde início
- **Premium positioning** — "Professional tool" psychology
- **Higher LTV** — Usuários pagam mais antes de churn
- **Simple operations** — Sem necessidade segregar features

#### Projeção de Receita

**Year 1 (150 Standard + 30 Professional):**
- 150 × $49 = $7,350 MRR
- 30 × $199 = $5,970 MRR
- **Total: $13,320 MRR**

**Year 2 (400 Standard + 100 Professional):**
- 400 × $49 = $19,600 MRR
- 100 × $199 = $19,900 MRR
- **Total: $39,500 MRR**

**Year 3 (900 Standard + 250 Professional):**
- 900 × $49 = $44,100 MRR
- 250 × $199 = $49,750 MRR
- **Total: $93,850 MRR**

#### Pros
- ✅ Simpler operations — sem tier segmentation headaches
- ✅ Higher ARPU — $49+ vs $19
- ✅ Profitability sooner — menos users = break-even Y2
- ✅ Premium brand — Posiciona como "professional tool"

#### Cons
- ❌ Low virality — Sem free users spread palavra
- ❌ Higher CAC — Precisa ads/content + sales, não viral
- ❌ Slower growth — Dependente de marketing spend
- ❌ User acquisition hard — <100 users Y1 realista
- ❌ Churn risk — Usuários insatisfeitos churn rápido sem community feedback

---

## PARTE 3: RECOMENDAÇÃO & COMPARAÇÃO

### Decision Matrix

| Métrica | Freemium (A) | Premium (B) |
|---------|-------------|-----------|
| **Y1 MRR** | $57k (plateau 10mo) | $13.3k |
| **Y2 MRR** | $58.4k | $39.5k |
| **Y3 MRR** | $186k | $93.8k |
| **Y1 CAC** | $20-40 (viral) | $100-200 (ads) |
| **Y1 LTV** | $250-350 (20 mo avg lifetime) | $400-600 |
| **LTV:CAC Ratio** | 7-10:1 (healthy) | 3-4:1 (healthy) |
| **Break-even** | Mo 8-12 (500 PRO) | Mo 14-18 (400 combined) |
| **Risk Level** | Medium (conversion dependent) | Medium (CAC dependent) |
| **Simplicity** | Medium | High |

---

### RECOMENDAÇÃO: FREEMIUM (Option A)

**Porque:**

1. **Virality primeiro** — LBH System é específico, niche. Precisa boca-a-boca.
   - Free users são marketing unpaid
   - 300 free users referindo = 30-50 PRO users grátis/mês

2. **Product-market fit discovery** — Com free users, você vê:
   - Quem usa (demography)
   - Como usam (behavior analytics)
   - O que quebra (bug reports)
   - Sem pressão de CAC economics

3. **Year 1 revenue beat** — $57k MRR vs $13k premium
   - Mes 10 financeiro é positivo
   - Enough runway para Year 2 investment

4. **Scaling advantage** — Y3 MRR é 2x ($186k vs $94k)
   - Compounds viral network effects

**Caveat:** Conversion <10% kills Freemium. Mitigation: Teste conversion com beta users (antes de full launch).

---

## PARTE 4: UNIT ECONOMICS

### Scenario: Freemium Model (Recommended)

#### 4.1 Customer Acquisition Cost (CAC)

**Organic/Viral (75% of new users):**
- Referral from free users
- Cost-per-acquisition: ~$0 (viral)
- Conversion rate: 5-10% free → PRO

**Paid (Ads, Content, SEO) (25% of new users):**
- Google Ads, Reddit sponsored, Blog sponsorships
- CPC: $0.50-1.50 (fintech competitive)
- Conversion rate: 0.5-2% ad click → PRO
- Implied CAC: $50-300 per PRO user

**Blended CAC:**
- Y1: (75% × $0 + 25% × $150) = **$37.50 per PRO user**
- Y2: (80% × $0 + 20% × $150) = **$30 per PRO user** (more viral)
- Y3: (85% × $0 + 15% × $150) = **$22.50 per PRO user** (mature viral)

---

#### 4.2 Lifetime Value (LTV)

**Assumptions:**
- Average PRO user lifetime: 24 months (2 years)
  - Typical SaaS churn: 3-5% MoM → 40-60 month lifetime
  - But fintech + leverage products: Higher risk → 24-36 months realistic
- Average PRO ARPU: $19/mês (no upsell Y1)
- Gross margin: 80% (SaaS-standard, low COGS)

**LTV Calculation:**

```
LTV = ARPU × Lifetime Months × Gross Margin
    = $19 × 24 months × 80%
    = $365.20 per PRO user
```

**With expansion (upsell to higher tiers):**
```
LTV (with $299 Enterprise upsell 10% penetration):
    = ($19 × 24 × 0.9) + ($299 × 12 × 0.1) × 0.8
    = ($412.80) + ($358.80)
    = $771.60 per PRO user
```

**Conservative LTV (with 30% churn risk):**
```
LTV = $365 × (1 - 0.30) = $256 per PRO user
```

---

#### 4.3 CAC Payback Period

```
Payback = CAC / (ARPU × Gross Margin)
        = $37.50 / ($19 × 0.80)
        = $37.50 / $15.20
        = 2.5 months
```

**Interpretation:** Break-even on CAC spend in 2.5 months. Industry best-practice is <12 months, so **2.5mo is excellent**.

---

#### 4.4 Cohort Unit Economics (First Year)

**Cohort: 100 new PRO users Month 1**

| Métrica | Valor |
|---------|-------|
| **CAC per user** | $37.50 |
| **Total CAC spend** | $3,750 |
| **MRR (Month 1)** | $1,900 (100 × $19) |
| **Gross margin** | $1,520 (80% of MRR) |
| **Payback period** | 2.5 months |
| **MRR Month 3** | $1,520 (25% churn assumed) |
| **CAGR MRR (Mo 1-12)** | -40% (churn decay) |
| **Avg MRR (Mo 1-12)** | $1,200 |
| **12-mo revenue** | $14,400 |
| **12-mo COGS** | $2,880 |
| **12-mo Gross profit** | $11,520 |
| **LTV realization Y1** | $115 per user ($11.5k/100 users) |

---

### 4.5 Profitability Analysis (Full Platform)

**Year 1 P&L (Freemium, no paid marketing):**

| Line Item | Amount |
|-----------|--------|
| **MRR (month 10)** | $57,000 |
| **ARR (annualized)** | $684,000 |
| **---** | --- |
| **COGS** | -$136,800 (20% of revenue) |
| **Gross profit** | $547,200 |
| **Gross margin** | 80% |
| **---** | --- |
| **OpEx** | |
| Engineering (1 FTE)| -$120,000 |
| Infrastructure (Render, Postgres, Cache) | -$48,000 |
| Operations/Admin (0.5 FTE) | -$40,000 |
| **Subtotal OpEx** | -$208,000 |
| **---** | --- |
| **EBITDA (Year 1)** | $339,200 |
| **EBITDA Margin** | 50% |
| **---** | --- |
| **Taxes (Brazil 34% corp tax)** | -$115,328 |
| **Net profit** | $223,872 |

---

## PARTE 5: RUNWAY & BURN ANALYSIS

### 5.1 Monthly Burn Estimate

**Assumptions:**
- Team: 1 founder (you, unpaid) + 1 FTE engineer ($10k/mo)
- Infrastructure: Render/Railway/Vercel ($400/mo prod + dev)
- Services: Sentry, Datadog, Domain, Payment gateway ($300/mo)
- Marketing/Community (organic first): $0 Y1Q1, ramp to $5k/mo
- Legal/Compliance: $2k one-time + $500/mo ongoing

**Monthly Burn (Steady State):**

| Category | Amount |
|----------|--------|
| Salaries (1 eng) | $10,000 |
| Infrastructure | $400 |
| Services | $300 |
| Marketing (Q2 onwards) | $2,500 |
| Legal/Admin | $500 |
| **Total Monthly Burn** | **$13,700** |

**Special Cases:**
- Q1 (pre-launch): $13k/mo (no marketing)
- Q2-4: $13.7k/mo (marketing ramp)

---

### 5.2 Runway Calculation

**Scenario: Starting with $50k (1 founder's savings)**

```
Runway = Cash available / Monthly burn
       = $50,000 / $13,700
       = 3.6 months
```

**Problem:** 3.6 months is tight. **Must achieve revenue before month 4.**

**If revenue hits Month 8-10 (realistic Freemium ramp):**
- Months 1-3: $50k covers burn ($13.7k × 3 = $41.1k)
- Month 4-10: Need funding or revenue

**Recommendation:** Raise **$100k pre-seed** to extend runway to 9 months.
- Y1 revenue ($57k MRR month 10) = break-even by month 12

---

### 5.3 Runway with Different Funding Scenarios

| Scenario | Initial Cash | Burn/mo | Runway (months) | Break-even |
|----------|--------------|---------|-----------------|------------|
| **Bootstrapped** | $50k | $13.7k | 3.6 | Impossible |
| **Friends & Family** | $150k | $13.7k | 10.9 | Month 10 ✓ |
| **Pre-seed $200k** | $200k | $13.7k | 14.6 | Month 10 ✓ |
| **Pre-seed $300k** | $300k | $13.7k | 21.9 | Month 10 (cushion) |

**Recommendation:** Target **$150k Friends & Family round** (month 1-2).
- Covers burn until revenue month 10
- Extends to month 10+ growth
- ~20% dilution typical (founder keeps 80%)

---

## PARTE 6: FINANCIAL FORECASTS (18 MONTHS)

### 6.1 Revenue Projections

**Freemium Model, 18-month horizon**

#### Users Projection

| Month | Free Users | PRO Users | Enterprise | Total Users |
|-------|-----------|-----------|-----------|------------|
| 1 (Jun) | 100 | 10 | 0 | 110 |
| 3 (Aug) | 300 | 35 | 0 | 335 |
| 6 (Nov) | 1,000 | 150 | 2 | 1,152 |
| 9 (Feb) | 2,500 | 300 | 5 | 2,805 |
| 12 (May) | 4,500 | 500 | 10 | 5,010 |
| 15 (Aug) | 6,500 | 750 | 15 | 7,265 |
| 18 (Nov) | 8,000 | 1,000 | 25 | 9,025 |

#### MRR / ARR Projection

| Month | PRO MRR | Enterprise MRR | Total MRR | ARR (annualized) |
|-------|---------|----------------|-----------|-----------------|
| 1 | $190 | $0 | $190 | $2,280 |
| 3 | $665 | $0 | $665 | $7,980 |
| 6 | $2,850 | $600 | $3,450 | $41,400 |
| 9 | $5,700 | $1,500 | $7,200 | $86,400 |
| 12 | $9,500 | $3,000 | $12,500 | $150,000 |
| 15 | $14,250 | $4,500 | $18,750 | $225,000 |
| 18 | $19,000 | $7,500 | $26,500 | $318,000 |

---

### 6.2 P&L Forecast (18 months)

| Month | Revenue | COGS (20%) | Gross Profit | OpEx | EBITDA | EBITDA % |
|-------|---------|-----------|--------------|------|--------|----------|
| 1 | $190 | -$38 | $152 | -$13,700 | -$13,548 | -7,131% |
| 3 | $1,995 | -$399 | $1,596 | -$14,000 | -$12,404 | -621% |
| 6 | $10,350 | -$2,070 | $8,280 | -$14,500 | -$6,220 | -60% |
| 9 | $21,600 | -$4,320 | $17,280 | -$15,000 | $2,280 | 11% |
| 12 | $37,500 | -$7,500 | $30,000 | -$15,500 | $14,500 | 39% |
| 15 | $56,250 | -$11,250 | $45,000 | -$16,000 | $29,000 | 52% |
| 18 | $79,500 | -$15,900 | $63,600 | -$16,500 | $47,100 | 59% |

**Key Milestones:**
- **Month 6:** 75% of break-even revenue
- **Month 9:** EBITDA positive (first time)
- **Month 12:** $14.5k/mo EBITDA (healthy)
- **Month 18:** 59% EBITDA margin (SaaS gold standard)

---

### 6.3 Cash Flow Projection (with funding)

**Assumption: $150k F&F funding, month 1**

| Month | Revenue | OpEx (excl salary) | Burn | Cum. Cash Flow | Runway Remaining |
|-------|---------|-------------------|------|---|---|
| 1 (start) | - | - | - | $150,000 | 11.0 |
| 2 | $190 | $13,700 | $13,700 | $136,490 | 10.0 |
| 3 | $1,995 | $13,700 | $11,705 | $124,785 | 9.1 |
| 6 | $10,350 | $14,500 | $4,150 | $103,285 | 7.1 |
| 9 | $21,600 | $15,000 | -$6,600 | $109,885 | 7.6 |
| 12 | $37,500 | $15,500 | -$22,000 | $131,885 | 9.6 |
| 18 | $79,500 | $16,500 | -$63,000 | $211,000 | 12.8 |

**Interpretation:** With $150k funding + organic revenue growth, you reach:
- **Month 9:** Cash flow positive (payback funding)
- **Month 12:** 9.6 months new runway (self-sustaining)
- **Month 18:** $211k cash (profitable, can self-fund Series A)

---

## PARTE 7: RISKS & SENSITIVITIES

### 7.1 Sensitivity Table: PRO Conversion Rate

If conversion from Free → PRO varies:

| Conversion Rate | Month 12 PRO Users | Month 12 MRR | Break-even Month |
|-----------------|-------------------|------------|------------------|
| 5% (pessimistic) | 200 | $3,800 | Month 18+ (not viable) |
| **10% (base case)** | **500** | **$9,500** | **Month 12** |
| 15% (optimistic) | 750 | $14,250 | Month 10 |
| 20% (very high) | 1,000 | $19,000 | Month 8 |

**Mitigation if conversion <10%:**
- Improve onboarding (reduce friction for free → pro)
- Add more features to free tier to drive engagement
- Test pricing ($15 vs $19 vs $29)
- Pivot to Premium model (Option B)

---

### 7.2 Sensitivity Table: CAC (Paid Marketing)

If you spend on ads starting month 3:

| Monthly Ad Spend | Year 1 PRO Users | Year 1 Revenue | Year 1 EBITDA | Payback |
|-----------------|-----------------|--|--|--|
| $0 (organic only) | 500 | $57k | $28k | Month 9 |
| $2,000/mo | 700 | $80k | $15k | Month 11 |
| $5,000/mo | 1,000 | $114k | -$22k | Month 14+ |

**Insight:** Organic growth beats paid marketing at Stage 1. Only add ads if:
- Organic growth plateaus <5 users/week
- Conversion >15%
- Paid CAC ROI <12 months

---

### 7.3 Key Risk Factors

#### Risk 1: Regulatory (CVM Brazil)
- **Scenario:** CVM says leverage features illegal/restricted
- **Probability:** 30% (regulatory risk high in Brazil)
- **Impact:** Product pivot needed (lose leverage differentiator)
- **Mitigation:**
  - Contact CVM month 1 (consultoria legal)
  - Disclaimer modal + risk acknowledgment (legal mitigates)
  - Have Plan B: "Backtesting + risk analysis tool" (no real leverage)
  - USA pivot if Brazil blocked

#### Risk 2: User Churn >50%
- **Scenario:** Free users don't convert or churn fast
- **Probability:** 40% (product-market fit unknown)
- **Impact:** Revenue below projections, extend runway needed
- **Mitigation:**
  - Measure cohort retention weekly
  - A/B test onboarding
  - Monthly NPS surveys
  - Iterate features based on feedback

#### Risk 3: Infrastructure Costs Scale Unexpectedly
- **Scenario:** Backtest/Monte Carlo queries expensive as users grow
- **Probability:** 20% (typical optimization issue)
- **Impact:** COGS increases to 35%+ (erosion of margins)
- **Mitigation:**
  - Profile backtest query month 2
  - Implement Redis caching month 3
  - Use read replicas if DB overloaded
  - May need pre-compute some results

#### Risk 4: Competitor Launch
- **Scenario:** Bloomberg, Tastyworks, or TradingView add leveraged backtesting
- **Probability:** 50% (high in fintech)
- **Impact:** CAC increases, conversion decreases
- **Mitigation:**
  - Build 6-12 month moat (community, brand, data)
  - Focus on niche (defensive assets, Brazil market)
  - Move fast to Pro/Enterprise features competitors ignore

#### Risk 5: Pricing Resistance
- **Scenario:** Users balk at $19/mo, want free forever
- **Probability:** 35% (price sensitivity in Brazil)
- **Impact:** Conversion 5% instead of 10%
- **Mitigation:**
  - Test $9/mo vs $19/mo in beta
  - Annual pricing option ($180/yr = 20% discount)
  - Free trial upgrade (14 days full access)
  - Geographic pricing (lower in Brazil: 15 BRL~$3 USD)

---

### 7.4 Upside Scenarios

#### Scenario 1: Viral Success (5% free → 20% pro conversion)
- Month 12 PRO users: 1,000 (2x base case)
- Month 12 MRR: $19,000
- Break-even: Month 8
- Enables Series A $500k-$1M

#### Scenario 2: SMB/RIA Traction (50+ Enterprise deals)
- Month 12 Enterprise ARPU: $500 (not $299)
- Month 12 Enterprise MRR: $25,000 (vs $3k base)
- Total MRR: $44,000 (not $12.5k)
- Pre-Series A valuation: $10M+

#### Scenario 3: Strategic Partnership (TradingView, Quantfury API)
- Co-marketing = free CAC
- Users from partner install base
- Month 12 PRO: 1,500+
- Potential acquisition by partner

---

## PARTE 8: DETAILED MONTHLY BURN BREAKDOWN

### Salaries

| Role | Monthly | Notes |
|------|---------|-------|
| 1 FTE Engineer | $10,000 | Assumes $120k/yr salary (junior-mid level) |
| Founder (you) | $0 | Bootstrapped |
| **Total** | **$10,000** | Add 0.5 FTE ops/community month 6 (+$5k) |

---

### Infrastructure

| Service | Monthly | Usage Notes |
|---------|---------|-------------|
| Render (Backend) | $150 | Web service, auto-scaling |
| Railway (Postgres) | $150 | Managed DB with backups |
| Vercel (Frontend) | $50 | Next.js hosting |
| CloudFlare DNS | $0 | Free tier |
| **Subtotal** | **$350** | Scale to $500-1k if traffic >10k users |

---

### Services & Tools

| Service | Monthly | Purpose |
|---------|---------|---------|
| Sentry (error tracking) | $100 | Real-time crash monitoring |
| Datadog trial | $0 | Upgrade to $200/mo month 6 if needed |
| Domain + SSL | $20 | lbh-system.com |
| Stripe/payment processing | $0 | 2.2% + $0.30 per transaction (variable COGS) |
| **Subtotal** | **$120** | Upgrade to $300/mo post-launch |

---

### Marketing

| Category | Monthly | Timeline |
|----------|---------|----------|
| Q1 (Jun-Aug) | $0 | Organic only (reddit, Twitter, blogs) |
| Q2 (Sep-Nov) | $2,500 | Start ads + content marketing |
| Q3 (Dec-Feb) | $3,000 | Increase ad spend, partnerships |
| Q4 (Mar-May) | $4,000 | Scale what works |
| **Avg/Year** | **$2,375** | Adjust based on ROI |

**Organic channels (free):**
- Reddit r/investing, r/brazil, r/algotrading
- Twitter/X + personal brand
- Blog posts (SEO, strategy content)
- Product Hunt launch (month 4-5)

---

### Legal & Compliance

| Item | Cost | Timeline |
|------|------|----------|
| ToS + Privacy Policy | $500 (template) | Month 1 |
| Risk Disclaimer review | $1,500 (lawyer) | Month 1 |
| LGPD compliance checklist | $500 (consultant) | Month 2 |
| CVM consultation | $2,000 (if needed) | Month 1 |
| Monthly legal retainer | $500 | Month 2+ |
| **Total Year 1** | **$5,500** | One-time $5k + $500/mo |

---

## PARTE 9: BREAK-EVEN ANALYSIS

### 9.1 User Numbers for Break-even

**Target: Monthly OpEx = Monthly Gross Profit**

```
OpEx (steady state) = $15,500/mo
Gross margin = 80% (revenue side)

Needed gross profit = $15,500
Required revenue = $15,500 / 0.80 = $19,375/mo

With 10% free → pro conversion:
Users needed = $19,375 / $19 = 1,020 PRO users
```

**Break-even at ~1,000 PRO users.**

---

### 9.2 Timeline to Break-even

**Freemium Model:**
- Month 0: Start with $150k funding
- Month 3-6: Reach 50-150 PRO users
- Month 6-9: Reach 300-400 PRO users (70-80% of break-even)
- Month 9-12: Reach 500-1,000 PRO users
- **Month 12: Break-even**

**If paid ads inefficient (CAC >$100):**
- Month 18-24: Break-even

---

## PARTE 10: KEY METRICS & DASHBOARD

### Metrics to Track Daily/Weekly

| Metric | Current | Target Y1 | Dashboard |
|--------|---------|-----------|-----------|
| **Signups (Free)** | 0 | 4,500 | Mixpanel/Amplitude |
| **Free → Pro Conversion %** | 0% | 10% | Manual weekly |
| **Free User Churn %** | - | <10% MoM | Mixpanel |
| **Pro User Churn %** | - | <5% MoM | Mixpanel |
| **Pro MRR** | $0 | $9,500 | Stripe dashboard |
| **CAC (blended)** | - | $37.50 | Manual calculation |
| **LTV (estimated)** | - | $365 | Manual calculation |
| **Payback period** | - | <3 months | Manual |
| **Gross margin %** | - | 80% | Revenue tracking |
| **Burn rate** | - | $13.7k/mo | Bank dashboard |
| **Runway months** | - | 11+ | Manual (monthly) |

---

## PARTE 11: RECOMMENDATIONS FOR PM

### Sprint 1 Action Items (Finance)

**Day 1-2:**
- [ ] Review this document with Legal + Risk (regulatory validation)
- [ ] Confirm CVM doesn't block pricing model (Brazil-specific)

**Day 5-7:**
- [ ] Decide: Freemium (Option A) vs Premium (Option B)
- [ ] Approve pricing: Free ($0) + Pro ($19) + Enterprise ($299)

**Day 8-10:**
- [ ] Growth team starts CAC/LTV modeling
- [ ] Backend/DevOps confirms infra costs realistic
- [ ] Legal confirms COGS model (payment processing fees)

**Day 12-14:**
- [ ] Roadmap: "When do we launch paid tier?" (week 1-2 after beta)
- [ ] Setup: Stripe + receipt/invoice system
- [ ] Beta: Test conversion rate with 50-100 power users

---

### Go/No-Go Criteria

| Criteria | Success | Failure |
|----------|---------|---------|
| **Regulatory clarity** | CVM clarifies leverage OK | CVM blocks/unclear |
| **Unit economics viable** | LTV:CAC >3:1 | LTV:CAC <2:1 |
| **Conversion testable** | >5% in beta | <2% in beta |
| **Break-even timeline** | Month 12-15 | Month 18+ |
| **Runway adequate** | 10+ months | <6 months |

---

## PARTE 12: CLOSING SUMMARY

### The Bottom Line

| Question | Answer |
|----------|--------|
| **Best business model?** | Freemium (Option A) |
| **Best pricing?** | Free + Pro $19/mo + Enterprise $299+/mo |
| **Year 1 revenue potential?** | $57k MRR (month 10) = $684k ARR |
| **Break-even?** | Month 12 (~500 PRO users) |
| **Funding needed?** | $150k F&F (covers burn 11 months) |
| **Key risk?** | User conversion rate <10% or regulatory block |
| **Most important metric?** | Free → Pro conversion % (track weekly) |
| **Series A ready when?** | Month 12-15 with $50k+ MRR + 80%+ churn <5% |

---

## Appendix A: Definitions

- **MRR:** Monthly Recurring Revenue (predictable monthly revenue)
- **ARR:** Annual Recurring Revenue (MRR × 12)
- **CAC:** Customer Acquisition Cost (total marketing spend / new customers)
- **LTV:** Lifetime Value (total profit from average customer over lifetime)
- **Payback Period:** Months to recover CAC from customer revenue
- **Churn %:** % of users who cancel each month
- **Burn rate:** Monthly operating expense (operating at loss)
- **Runway:** Months of operation before cash runs out
- **ARPU:** Average Revenue Per User
- **Gross Margin:** (Revenue - COGS) / Revenue
- **EBITDA:** Earnings before interest, tax, depreciation, amortization

---

## Appendix B: Assumptions Summary

**User Growth:** Conservative S-curve (slow → fast → plateau)  
**Conversion:** 10% free → pro (fintech benchmark ~8-12%)  
**Churn:** 5% MoM pro, 10% MoM free (high for free tiers)  
**ARPU:** $19/mo (fixed, no expansion Y1)  
**Gross Margin:** 80% (payment processing ~2.2% + infrastructure ~18%)  
**Team:** 1 founder + 1 engineer (no VC-scale hiring)  
**Organic growth:** No paid ads Q1, $2-5k/mo spend Q2+  
**Market TAM:** ~100k Brazilian + USA individual investors  
**ICP:** Defensive asset investors, buy & hold, no leverage trading  

---

**Document Version:** 1.0  
**Last Updated:** June 5, 2026  
**Approvals:** [Finance], [Legal], [Product], [Growth]  
**Next Review:** June 19, 2026 (End of Sprint 1)

---

*Prepared for LBH System Sprint 1 | Financial Planning*
