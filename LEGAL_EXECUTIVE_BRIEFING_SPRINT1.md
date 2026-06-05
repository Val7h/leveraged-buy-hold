# LBH SYSTEM - BRIEFING JURÍDICO EXECUTIVO
## Sprint 1: Compliance para Alavancagem (Jun 5-19, 2026)

**Preparado por:** Legal / Compliance  
**Data:** 5 de Junho de 2026  
**Status:** 🔴 CRÍTICO - Decisões necessárias HOJE  
**Decisão final:** 8 de Junho (D3) | **Launch window:** 12-17 de Junho (D7-D12)

---

## 1. SUMÁRIO EXECUTIVO (5 min de leitura)

### The Bottom Line
**LBH System NÃO pode lançar leverage publicamente sem:**
1. ✅ Resolver incerteza CVM sobre "consultoria" (resposta esperada em 30-45 dias)
2. ✅ Publicar Risk Disclaimer Modal (compliance + UX)
3. ✅ Completar Terms of Service + Privacy Policy (LGPD obrigatório)
4. ✅ Implementar consent logging (evidência legal de consentimento)
5. ✅ Limitar alavancagem a 2.5x (risk mitigation)

### Risk Map (Probabilidade × Impacto)

| Risco | Prob | Impacto | Mitigation | Timeline |
|-------|------|---------|-----------|----------|
| 🥇 **CVM: "precisa licença"** | 40-60% | 🔴 SHUTDOWN ops | Ask now via email | D1 (hoje) |
| 🥈 **User lawsuit (loss capital)** | 30-50% | 🔴 R$500k-5M liability | Risk docs + insurance | D7-D14 |
| 🥉 **LGPD violation / breach** | 20-30% | 🔴 ANPD fine R$50M | Privacy policy + security | D7 + ongoing |

**GO/NO-GO Recomendado:** Scenario B (phased launch)
- **Agora (D10):** Lançar features análise (sem leverage)
- **Depois (D24):** Leverage quando legal docs finalizados

---

## 2. ANÁLISE REGULATÓRIA CRÍTICA

### 2.1 CVM - O Risco #1 (40-60% probabilidade)

**Pergunta:** Plataforma de screening com score de leverage = "consultoria de investimentos"?

| Aspecto | LBH System | CVM Risk |
|---------|-----------|----------|
| Recomendação de ativo | ❌ Não (screener público) | ✅ SAFE |
| Score com range (0-100) | ✅ Sim (0-100) | ⚠️ CINZENTO |
| Recomendação leverage | ✅ Sim ("se score > 85 → use 3x") | ❌ RISCO |
| Monte Carlo simulation | ✅ Sim (mostra cenários) | ❌ RISCO |
| Alertas RSI < 30 | ✅ Sim (gatilho ação) | ❌ RISCO |
| Gestão de carteira | ❌ Não (usuário decide) | ✅ SAFE |

**Classificação:** CINZENTO (Gray Zone)

**Consequência se CVM diz "é consultoria":**
- Multa: 10-50% do patrimônio de usuários prejudicados
- Bloqueio imediato da plataforma
- Responsabilidade civil + criminal
- Reputação destruída

**Ação Imediata (D1 - TODAY):**
```
EMAIL para: consultapublica@cvm.gov.br
Subject: "Regulatory Query: Investment Screening Platform Scope"

Body:
"Our platform ('LBH System') provides:

1. Stock screening with scoring (0-100, not personalized)
2. Risk metrics (VaR, Sharpe, Beta)
3. Backtesting historical (S&P 500, past 20 years)
4. Leverage recommendation table: IF user_score > 85 THEN leverage = 3x (OPTIONAL)
5. Monte Carlo simulation (possible scenarios, 95% confidence)

Question: Does item #4 ('leverage recommendation table') or #5 ('scenario simulation') 
constitute 'consultoria de investimentos' under CVM Instruction 400?

Context: Users make ALL trading decisions. We provide analysis tools only. Not personalized advice.

Please advise on compliance requirements and safe harbor thresholds.

Company: [LBH System Name]
Contact: [legal@lbhsystem.com]"
```

**Timeline espera:** 30-45 dias  
**Contingência:** Se não responder até D30, proceder com "Option C" (Hybrid approach)

---

### 2.2 ALAVANCAGEM - Limite Regulatório

**Problema identificado:** Nossas tabelas usam até 4x; regulação permite 2.5x

| Broker | Máx Leverage | Nota |
|--------|-------------|------|
| B3 (ações) | 2.5x | Margem padrão |
| Quantfury | 3.0-5.0x | Não é broker regulado (API) |
| **Nossas tabelas** | 4.0x | 🔴 RISCO |

**Risco Matemático:**
- Drawdown histórico (2008): -57% (S&P 500)
- Com 4x leverage: -228% = ruína total + margin call
- Com 2.5x leverage: -142% = still catastrophic, mas mitigado

**Recomendação:** 
```
DECISÃO NECESSÁRIA D5:
Cap leverage at 2.5x (or 3.0x if Quantfury approves)
Effort: 2h backend change + scoring table update
```

---

### 2.3 LGPD - Lei Geral de Proteção de Dados

**Aplicabilidade:** SIM (100%) - Usuários brasileiros + dados pessoais

**Dados coletados:**
- Nome, email, CPF, perfil de risco
- Histórico de trades (simulado)
- IP, user-agent, device info
- Consentimentos (risk disclaimers, leverage acceptance)

**Obrigações legais:**
1. ✅ **Privacy Policy** - Obrigatória (LGPD Art. 14)
2. ✅ **Consent mechanism** - Explicit opt-in required
3. ✅ **Right to export data** - Must provide within 15 days (LGPD Art. 18)
4. ✅ **Right to deletion** - Must delete upon request (LGPD Art. 17)
5. ✅ **Data retention limits** - Max 2 years (unless legal requirement)
6. ✅ **Security measures** - TLS, hashing, access controls

**Penalidades por violação:**
- ANPD fine: até 2% do faturamento (max R$50M)
- Multa por pessoa afetada: até R$5,000
- Bloqueio de dados pelo ANPD

**Status:**
- ❌ Privacy Policy: Não publicada ainda (template pronto)
- ✅ TLS 1.3: Likely already deployed (Vercel/Railway)
- ✅ Password hashing: Likely bcrypt (FastAPI standard)
- ❌ Data export endpoint: TODO (Q2)
- ❌ Account deletion flow: TODO (Q3)

---

## 3. DOCUMENTOS LEGAIS OBRIGATÓRIOS

### 3.1 Priority Matrix (What to do first)

| Doc | Obrigatório? | Blocker para launch? | Timeline |
|-----|------------|-------------------|----------|
| **Risk Disclaimer Modal** | ✅ YES | ✅ YES | D7 (5 dias) |
| **Terms of Service** | ✅ YES | ✅ YES | D7 (5 dias) |
| **Privacy Policy** | ✅ YES (LGPD) | ✅ YES | D7 (5 dias) |
| **Risk Disclosure** | ✅ YES | ⚠️ NICE-TO-HAVE | D14 (nice) |
| **Leverage Consent Form** | ⚠️ Maybe | ⚠️ NICE-TO-HAVE | D10+ (optional) |
| **Data Processing Agreement** | ⚠️ Needed if 3rd party | ⚠️ NICE-TO-HAVE | Q3 |

### 3.2 RISK DISCLAIMER MODAL (Most Critical UX)

**When:** Appears FIRST TIME user accesses leverage features  
**Flow:**
1. User logs in
2. Clicks "Leverage Settings" tab
3. Modal appears: "⚠️ AVISO DE RISCO"
4. User must READ full text (can't skip)
5. Check 2 boxes:
   - ☑ "Li e entendo os riscos de alavancagem"
   - ☑ "Aceito liquidação automática de posição"
6. Click "Aceitar e continuar"
7. Backend logs: timestamp, IP, user_agent, version, acceptance_status

**Template:**

```markdown
# ⚠️ AVISO CRÍTICO DE RISCO - ALAVANCAGEM

Você está acessando funcionalidades de ALAVANCAGEM. Leia atentamente antes de usar.

## RISCOS PRINCIPAIS

### 1. Risco de Liquidação
- Sua posição pode ser fechada INSTANTANEAMENTE se o capital cair abaixo de 50%
- Você NÃO será notificado antes da liquidação
- Perderá seu investimento RAPIDAMENTE em mercados em queda

### 2. Amplificação de Perdas
- 1x: Se S&P cai 10% → você perde 10%
- 2x: Se S&P cai 10% → você perde 20%
- 3x: Se S&P cai 10% → você perde 30%

### 3. Histórico ≠ Futuro
- Backtest mostra 20 anos de dados (2004-2024)
- 2008 teve -57% em 1 ano
- Futuro pode ser PIOR

### 4. Sistema não é garantido
- Alertas podem falhar (atraso, falha de conexão)
- Servidor pode cair durante margin call
- Gaps de preço (abrir gap 20% da noite para o dia)

### 5. Você NÃO pode usar leverage se:
- Está recebendo conselho de investimento personalized (não somos advisors)
- Você é menor de 18 anos
- Você não entende risco

## TERMOS

Ao clicar em "Aceitar", você:
- ✅ Reconhece todos os riscos acima
- ✅ Aceita perder TUDO seu investimento
- ✅ Não culpará a plataforma por perdas (limitação de responsabilidade)
- ✅ Confirma ser investidor adulto e sofisticado

---

☑️ Li e entendo os riscos de alavancagem
☑️ Aceito que minha posição pode ser liquidada sem notificação

[Botão] ACEITAR E CONTINUAR
[Link] Ler documentação completa (Risk Disclosure)
[Link] Contato: legal@lbhsystem.com
```

**Implementation:**
- File: `frontend/src/components/RiskDisclaimerModal.tsx`
- Backend endpoint: `POST /api/compliance/accept-disclaimer`
- DB table: `compliance.disclaimer_acceptances`
  - user_id, accepted_at, version, ip_address, user_agent

---

### 3.3 TERMS OF SERVICE (ToS) - Estrutura

**Objetivo:** Estabelecer direitos/obrigações legalmente vinculantes

**Seções obrigatórias:**

```markdown
# TERMOS DE SERVIÇO - LBH SYSTEM

## 1. ACEITAÇÃO E VIGÊNCIA
- Ao usar a plataforma, você aceita estes termos
- Vigência: [data] até rescisão por qualquer parte
- Modificações: 30 dias de aviso prévio antes de alterações

## 2. SERVIÇOS FORNECIDOS
- Screening de ações (análise pública)
- Scorecard de risco (VaR, Sharpe, Beta)
- Backtesting (simulação histórica)
- Monte Carlo simulation (cenários possíveis)
- Alerts (RSI, volatilidade, etc)

### 2.1 O QUE NÃO FAZEMOS
- ❌ Não gerenciamos sua carteira (você executa trades)
- ❌ Não somos consultores de investimento (não damos recomendação personalizada)
- ❌ Não garantimos resultados (passado ≠ futuro)
- ❌ Não oferecemos conta de margem (você usa broker próprio)

## 3. RISCOS E LIMITAÇÕES
- Você assume 100% do risco de investimento
- Nós não somos responsáveis por perdas (veja seção 7 - Limitação de Responsabilidade)
- Leverage amplifica ganhos E perdas
- Liquidação pode ocorrer sem aviso
- Sistema pode cair / alertas podem falhar

## 4. CONSENTIMENTO E CAPACIDADE
Você confirma:
- Ter 18+ anos
- Ser investidor sofisticado (entende leverage)
- Não está recebendo consultoria personalizada
- Aceita ler TODOS os disclaimers antes de usar leverage

## 5. PRIVACIDADE E DADOS
Sua privacidade é governada pela Privacy Policy (link).
Dados coletados e armazenados conforme LGPD.

## 6. DIREITOS DE PROPRIEDADE INTELECTUAL
- Screener, scoring model, UI = propriedade LBH System
- Você pode usar para seu benefício pessoal apenas
- Proibido: copiar, vender, distribuir sem permissão

## 7. LIMITAÇÃO DE RESPONSABILIDADE ⭐ CRÍTICO
**EM NENHUMA CIRCUNSTÂNCIA SEREMOS RESPONSÁVEIS POR:**
- Perda de capital (mesmo que 100%)
- Lucros cessantes
- Danos indiretos ou punitivos
- Falha de sistema / downtime
- Atraso de alertas
- Erro de dados / bugs

**Nossa responsabilidade máxima:** Reembolso de taxas pagas (valor pequeno)

**Exceção:** Violação de dados pessoais (LGPD breach) → responsabilidade ilimitada

## 8. RESCISÃO
- Você pode deletar conta a qualquer momento
- Nós podemos rescindir se violar estes termos
- Após rescisão: dados deletados em 30 dias (ou conforme LGPD)

## 9. LEI APLICÁVEL
- Lei brasileira (CVM, LGPD, CDC)
- Foro: São Paulo, Brasil

## 10. CONTATO
legal@lbhsystem.com | +55 11 XXXX-XXXX
```

**Tamanho:** 2-3 páginas (formato A4)  
**Revisão:** Legal counsel antes de publicar  
**Versionamento:** v1.0 (effective date: junho 2026)

---

### 3.4 PRIVACY POLICY (LGPD)

**Objetivo:** Cumprir LGPD Art. 14 (transparency requirement)

```markdown
# POLÍTICA DE PRIVACIDADE - LBH SYSTEM
## Conforme Lei Geral de Proteção de Dados (LGPD)

**Effective:** [data] | **Versão:** 1.0

### 1. TITULAR E RESPONSÁVEL PELOS DADOS
- **Empresa:** LBH System [Legal Name]
- **CNPJ:** [XXXX]
- **Endereço:** [Endereço Brasil]
- **Email:** legal@lbhsystem.com

### 2. DADOS COLETADOS

| Tipo de Dado | Fonte | Propósito | Retenção |
|----|----|----|----|
| Nome, Email, CPF | User signup | Identificação, account management | Até 2 anos após delete |
| Data Nascimento | Risk assessment form | Confirmar 18+ anos | Até 2 anos |
| Perfil de Risco | Risk questionnaire | Personalizar screening | Até 2 anos |
| Histórico trades (sim) | User actions | Analytics, performance | Até 2 anos |
| IP, User-Agent | Server logs | Security, fraud detection | 90 dias |
| Disclaimers assinados | Compliance log | Legal defense | 5 anos (legal hold) |

### 3. BASE LEGAL PARA COLETA
- **Consentimento (Art. 7, I):** Quando você faz signup → Privacy Policy link
- **Contrato (Art. 7, V):** Para executar serviço de screening
- **Obrigação Legal (Art. 7, II):** AML/KYC (Anti-Money Laundering)
- **Interesse Legítimo (Art. 7, IX):** Fraud detection, security

### 4. COMPARTILHAMENTO DE DADOS

**NÃO compartilhamos com 3º party, EXCETO:**

| 3º Party | O que compartilham | Motivo | Base Legal |
|----------|------------------|--------|-----------|
| Quantfury | (user_id, symbol, quantity) | Execute trades | Contrato |
| Financial Modeling Prep | Nenhum (read-only API) | Dados stock prices | Contrato |
| Stripe/Pagar.me | Email, amount, payment method | Processar pagamento | Contrato |
| ANPD (se investigação) | All data | Legal compliance | Obrigação legal |

**Nunca vendemos dados para advertising ou marketing.**

### 5. DIREITOS DO USUÁRIO (LGPD Art. 18)

Você tem direito a:
- ✅ **Acessar dados (acesso):** `GET /api/user/data/export` → JSON em 15 dias
- ✅ **Corrigir dados (retificação):** Atualizar perfil via Settings
- ✅ **Deletar dados (direito ao esquecimento):** `DELETE /api/user/account` → 30 dias
- ✅ **Portar dados (portabilidade):** JSON export em formato aberto
- ✅ **Revogar consentimento:** Opt-out de emails em qualquer hora
- ✅ **Contestar processamento:** Email legal@lbhsystem.com

**Exercer direitos:** Legal@lbhsystem.com (resposta em 15 dias)

### 6. RETENÇÃO DE DADOS

| Tipo | Retenção | Justificativa |
|------|----------|---|
| Conta ativa | Enquanto ativo | Serviço |
| Após delete | 30 dias | GDPR compliance window |
| Logs de disclaimer | 5 anos | CVM / legal hold |
| Logs de IP | 90 dias | Security |
| Histórico trades | 2 anos | ANPD compliance |

**Exceção:** Se investigação legal pendente → retenção estendida

### 7. SEGURANÇA

- 🔒 TLS 1.3 (todas as conexões)
- 🔒 Passwords: bcrypt (not reversible)
- 🔒 Database: Encrypted at rest (if cloud provider supports)
- 🔒 Access: Role-based (admins only see aggregated data)
- 🔒 Auditoria: Logs de quem acessou dados pessoais

### 8. COOKIES E TRACKING

- ✅ Session cookies: Necessários (login)
- ✅ Analytics: Google Analytics (anonymized)
- ❌ Tracking pixels: Não usamos
- ❌ Ads cookies: Não usamos

### 9. MUDANÇAS NESTA POLÍTICA

- Aviso: 30 dias antes de alterações significativas
- Consentimento: Re-agreement necessário se mudar base legal
- Histórico: Versões antigas disponíveis em legacy/

### 10. CONTATO E RECLAMAÇÃO

**Dúvidas:** legal@lbhsystem.com  
**Reclamação ANPD:** Denúncia em www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
```

**Tamanho:** 2-3 páginas  
**Revisão:** Legal counsel + Data Protection Officer (if required)

---

## 4. DATABASE SCHEMA - Compliance Logging

```sql
-- Table 1: Disclaimer Acceptances
CREATE TABLE compliance.disclaimer_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disclaimer_version VARCHAR(10) NOT NULL,  -- "v1.0", "v1.1"
  accepted_at TIMESTAMP NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  accepted BOOLEAN NOT NULL,  -- true = checked both boxes
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, disclaimer_version)  -- One acceptance per version per user
);

-- Table 2: Leverage Consent Log
CREATE TABLE compliance.leverage_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_leverage_requested NUMERIC(3, 1),  -- 1.0, 2.5, 3.0
  consent_given BOOLEAN NOT NULL,
  consent_date TIMESTAMP NOT NULL DEFAULT now(),
  version VARCHAR(10) NOT NULL,  -- ToS version
  ip_address INET,
  
  UNIQUE(user_id, max_leverage_requested)
);

-- Table 3: Terms Updates Log
CREATE TABLE compliance.terms_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(50),  -- "tos", "privacy_policy", "risk_disclosure"
  version VARCHAR(10),  -- "v1.0", "v1.1"
  effective_date DATE NOT NULL,
  content_hash VARCHAR(64),  -- SHA256 of document
  change_summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Table 4: Opt-In/Out Log
CREATE TABLE compliance.user_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50),  -- "email_alerts", "leverage", "data_retention"
  status VARCHAR(10),  -- "opt_in", "opt_out"
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_disclaimer_user ON compliance.disclaimer_acceptances(user_id);
CREATE INDEX idx_leverage_user ON compliance.leverage_consents(user_id);
CREATE INDEX idx_consent_log_user ON compliance.user_consent_log(user_id);
```

**Migrations:**
1. Create schema: `CREATE SCHEMA IF NOT EXISTS compliance;`
2. Create tables (above)
3. Add to `users` table: `disclaimer_accepted_at` timestamp

**API Endpoints needed:**
- `POST /api/compliance/accept-disclaimer`
- `GET /api/compliance/my-acceptances` (retrieve user's history)
- `POST /api/compliance/consent-leverage`
- `POST /api/user/data/export` (LGPD right to data access)
- `DELETE /api/user/account` (LGPD right to deletion)

---

## 5. RISK DISCLOSURE (Comprehensive)

**Objetivo:** Educação do usuário sobre 5 principais riscos

### 5.1 Market Risk
- Historical drawdown (2008): -57% em 1 ano
- Expected (annually): 10-20% normal
- Tail risk (99th percentile): -40% possible
- **Mitigation:** Diversification, stop-loss alerts

### 5.2 Leverage Risk
- 2.5x leverage: turns -10% to -25%
- 4x leverage: turns -10% to -40%
- Margin call can liquidate ENTIRE position in minutes
- **Mitigation:** Conservative leverage cap (2.5x max), position sizing

### 5.3 Model Risk
- VaR 95% = 1 in 20 chance of worse outcome
- Past performance ≠ future (2008, COVID, 2020 COVID, 2022 inflation)
- Model assumptions may break (correlation, volatility)
- **Mitigation:** Regular backtest review (quarterly), stress testing

### 5.4 System Risk
- Alerts may fail (email bounce, browser notification blocked)
- Website downtime (server crash, DDoS, cloud provider issue)
- Data loss (backup failure, ransomware - unlikely but possible)
- **Mitigation:** 99.9% uptime SLA (documented), automated backups

### 5.5 Liquidity Risk
- Selling large position may move market (low liquidity stocks)
- Gap risk: Market opens at -20% from previous close
- Halts: Trading can be halted (circuit breaker)
- **Mitigation:** Screen only high-liquidity stocks (avg daily volume > 1M shares)

---

## 6. COMPLIANCE GO/NO-GO CHECKLIST

### MUST-HAVE (Non-negotiable for launch)

#### Tier 1: Documents (D7 - June 12)
- [ ] **Risk Disclaimer Modal**
  - Code: `src/components/RiskDisclaimerModal.tsx` done
  - Backend: `/api/compliance/accept-disclaimer` done
  - DB: `compliance.disclaimer_acceptances` table done
  - Testing: Verify checkbox logic, logging works
  - Go-live: Can deploy

- [ ] **Terms of Service**
  - Draft: Template (section 3.3 above) ✅
  - Customize: Company name, contact email, dates
  - Review: Legal counsel (RFQ sent today)
  - Publish: `/legal/tos.pdf`
  - Version control: Commit to repo with v1.0 tag

- [ ] **Privacy Policy**
  - Draft: Template (section 3.4 above) ✅
  - Customize: Data types specific to LBH, retention periods
  - Review: Data Protection Officer or lawyer
  - Publish: `/legal/privacy_policy.pdf`
  - LGPD compliance: Verified against Art. 14, 18

#### Tier 2: Regulatory (D1-D8)
- [ ] **CVM Regulatory Query**
  - Email sent: consultapublica@cvm.gov.br (TODAY)
  - Question: Does scoring system constitute "consultoria"? (section 2.1)
  - Timeline: Expect response in 30-45 days
  - Contingency: If no response by D30, proceed with "hybrid" approach (Option C)

- [ ] **Leverage Cap Decision**
  - Current: 4.0x (risky)
  - Recommendation: 2.5x (CVM safe harbor)
  - Decision: Product + CEO sign-off
  - Implementation: 2h backend change
  - Testing: Verify scoring tables updated

- [ ] **Consent Logging**
  - DB schema: Done (section 4 above)
  - Migrations: Create schema, tables
  - API endpoints: Implement 4 endpoints (above)
  - Testing: Verify consent data logged with IP, user-agent, timestamp

#### Tier 3: Technical (D5-D7)
- [ ] **TLS 1.3 in Production**
  - Verify: `curl -I https://api.lbhsystem.com` → TLS 1.3
  - Likely already done (Vercel/Railway enforce)

- [ ] **Password Hashing**
  - Code review: Verify bcrypt or argon2 (not plain text)
  - File: `app/core/security.py`

### NICE-TO-HAVE (Can defer to Phase 2)

- [ ] **Version control for legal docs**
  - Approach: `/legal/versions.md` tracks all changes
  - Updates: 30 days notice before new version takes effect
  - Archive: Old versions preserved

- [ ] **LGPD Rights implementation**
  - Data export: `GET /api/user/data/export` (Phase 2, D14)
  - Account deletion: `DELETE /api/user/account` (Phase 2, D24)

- [ ] **Insurance**
  - E&O (Errors & Omissions): R$2-5k/year
  - Cyber liability: R$1-3k/year
  - RFQ sent to brokers by D10

- [ ] **Data Processing Agreement (DPA)**
  - For 3rd parties (Quantfury, FMP, Stripe)
  - Timeline: Q3 2026

---

## 7. TOP 3 LEGAL RISKS & MITIGATION

### Risk #1: CVM Demands License (40-60% probability)

**Scenario:**
- CVM responds to regulatory query: "Your scoring system = consultoria de investimentos"
- Demands: License under Instruction 400
- Timeline: 30-45 days
- Impact: Can't legally launch leverage without license

**Mitigation Options (Ranked by Ease):**

**Option A: Remove "Recommendation" (EASIEST - 1 hour)**
- Change copy: Instead of "Score 85 → use 3x", say "Your options: 1x, 2x, 3x, 4x (choose yourself)"
- Result: No explicit recommendation = likely safe
- Downside: Less helpful UX, lower conversion

**Option B: Get CVM License (HARDEST - 3-6 months)**
- Requirements: Compliance officer, segregated account, insurance, business plan
- Cost: R$50-200k upfront + R$20-50k/year
- Timeline: 3-6 months (CVM application queue)
- Upside: Legal to recommend, premium positioning
- Downside: Slow, expensive, may not approve

**Option C: Hybrid (RECOMMENDED - NOW + ongoing)**
- **Immediate (D1-D5):** Reword scoring model language
  - "Based on your risk profile, leverage levels 1x-3x are considered" (neutral)
  - NOT: "We recommend 3x leverage for you" (explicit recommendation)
  - Subtle language = legally safer
  
- **Short-term (D8-D30):** 
  - Send CVM query (Option A above)
  - Have lawyer review scoring language
  - Expect 30-day response
  
- **If CVM says "OK":** Proceed confidently with leverage
  
- **If CVM says "Need license":** Pivot to Option A (remove recommendation)

**Evidence to keep (legal defense):**
1. Original CVM query email (timestamped)
2. CVM response (when received)
3. Legal counsel review memo (signed, dated)
4. Compliance checklist (completed items)
5. Version history of scoring model (git commit log)

---

### Risk #2: User Lawsuit (30-50% probability)

**Scenario:**
- User deposits R$100k
- Uses 3x leverage, market crashes -20%
- Account liquidated, user loses R$100k
- User sues: "Platform hid risks, didn't notify me"
- Damages: R$500k-5M (depending on court, number of users)

**4-Tier Mitigation:**

**Tier 1: Documentation (START NOW - D1)**
- ✅ Risk Disclaimer Modal (signed)
- ✅ Terms of Service (limiting liability)
- ✅ Privacy Policy (LGPD compliance)
- ✅ Risk Disclosure (detailed, 5+ pages)
- ✅ Consent logging (IP, timestamp, version)
- **Why:** If lawsuit → "User acknowledged all risks in writing"

**Tier 2: Technical (D1-D7)**
- ✅ Position monitoring (real-time margin level)
- ✅ Alert system (email when margin ratio < 70%)
- ✅ Fail-safe (auto-liquidate if margin ratio < 50%)
- ✅ Audit logs (every trade, every alert sent)
- **Why:** Proves we tried to prevent loss

**Tier 3: Insurance (D10-D30)**
- E&O (Errors & Omissions): R$2-5k/year
- Covers: Legal defense costs, settlements, judgments
- Covers: Up to R$500k-2M per claim
- **Why:** Financial protection if lawsuit happens

**Tier 4: Operational (D7-D12)**
- In-app education: "Understanding leverage" video/guide
- Onboarding quiz: Verify user understands 3x = 3x losses
- Regular alerts: Weekly email reminding of margin call risk
- **Why:** Extra evidence we educated user

**Pre-Lawsuit Checklist (if user complains):**
1. ✅ Pull user's acceptance logs (verify signed disclaimer)
2. ✅ Check alert logs (verify we sent warnings)
3. ✅ Review margin history (verify position was liquidated correctly)
4. ✅ Check Terms of Service version (verify user accepted current version)
5. ✅ Verify leverage cap was enforced (no unauthorized leverage)
6. ✅ Legal review: Send logs + disclaimer to counsel
7. ✅ Insurance notification: Inform E&O carrier immediately

---

### Risk #3: LGPD Violation (20-30% probability)

**Scenario:**
- Data breach: Hacker steals user data (emails, CPF, IP history)
- ANPD investigates: "You didn't encrypt data at rest?"
- Fine: 2% of revenue (max R$50M) + reputational damage

**4-Phase Mitigation:**

**Phase 1: Immediate (D1-D7)**
- ✅ Privacy Policy published (transparency)
- ✅ TLS 1.3 enforced (encryption in transit)
- ✅ Password hashing verified (bcrypt/argon2)
- ✅ Minimal data collection (only what's needed)

**Phase 2: Short-term (D8-D30)**
- ✅ Data encryption at rest (if using Supabase/Postgres)
- ✅ Access control: Role-based (admins only see aggregated data)
- ✅ Audit logs: Every data access logged + reviewed monthly
- ✅ Data retention policy enforced (delete after 2 years)

**Phase 3: Medium-term (D31-D90)**
- ✅ Data export endpoint (LGPD Art. 18)
- ✅ Account deletion workflow (LGPD Art. 17)
- ✅ Subprocessor audit (who has access to Quantfury, FMP data?)
- ✅ DPA (Data Processing Agreements) with 3rd parties

**Phase 4: Ongoing**
- Monthly: Audit who accessed personal data
- Quarterly: Security review (penetration test)
- Annually: LGPD compliance audit

**If Breach Happens:**
1. ✅ Notify ANPD within 48h (mandatory, LGPD Art. 16)
2. ✅ Notify affected users (email, clear explanation)
3. ✅ Public statement (transparency builds trust)
4. ✅ Incident investigation (what happened, how to prevent)
5. ✅ Notify insurance carrier
6. ✅ Legal counsel review (liability assessment)

---

## 8. BUDGET & TIMELINE

### Year 1 Budget (R$)

| Item | Cost | Priority |
|------|------|----------|
| Legal Consulting (30-day review) | R$10-20k | 🔴 CRITICAL (D5) |
| Insurance (E&O + Cyber) | R$30-50k | 🟡 HIGH (D30) |
| Privacy audit / LGPD review | R$10-15k | 🟡 HIGH (Q3) |
| **SUBTOTAL** | **R$50-85k** | |
| Ongoing (monthly monitoring) | R$5-10k | 🟢 NICE-TO-HAVE |
| **TOTAL YEAR 1** | **R$50-150k** | |

### Sprint 1 Timeline (June 5-19)

| Date | Task | Owner | Status |
|------|------|-------|--------|
| **D1 (Jun 5)** | Send CVM regulatory query | Legal | 🔴 TODAY |
| **D1 (Jun 5)** | Schedule legal consulting calls (3 firms) | Legal + Finance | 🔴 TODAY |
| **D2-D3 (Jun 6-7)** | Draft ToS + Privacy Policy customizations | Legal | 📝 IN PROGRESS |
| **D4-D5 (Jun 8-9)** | Legal review meeting + decisions | CEO + Legal | 📅 SCHEDULED |
| **D5 (Jun 9)** | Backend: Implement consent logging | Backend | 📝 READY TO START |
| **D6-D7 (Jun 10-11)** | Frontend: Deploy RiskDisclaimerModal | Frontend | 📝 READY TO START |
| **D7 (Jun 12)** | Publish ToS + Privacy Policy + RiskDisclosure | Legal | 📋 READY |
| **D8 (Jun 13)** | Internal legal review meeting (2h) | All | 📅 SCHEDULED |
| **D10-D12 (Jun 15-17)** | **GO/NO-GO DECISION** | CEO + Product | 🚀 DECISION POINT |
| **D12+ (Jun 17+)** | Launch leverage (if approved) | Product | 🎯 TARGET |

---

## 9. DECISION FRAMEWORK (For CEO/Product)

### DECISION 1: CVM Risk Tolerance
**Question:** How much regulatory uncertainty is acceptable?

**Option A: Conservative** (Risk-averse)
- Launch without leverage (analysis features only)
- Timeline: D10 launch (analysis, no leverage)
- Delay leverage to Q3 (after CVM response)
- Pros: Zero regulatory risk
- Cons: Delayed monetization

**Option B: Balanced** (Recommended)
- Launch leverage with full documentation
- Timeline: D12 launch (full feature)
- Monitor CVM response (30-45 days)
- If CVM says "need license" → pivot to "analysis only" mode
- Pros: Get market feedback, generate revenue
- Cons: 40% risk CVM says "license needed" (recoverable)

**Option C: Aggressive** (Risk-tolerant)
- Launch leverage immediately with minimal documentation
- Assume CVM won't respond
- Pros: Maximum speed
- Cons: 🔴 LEGAL LIABILITY if CVM cracks down

**Recommendation:** **Option B (Balanced)**

---

### DECISION 2: Leverage Cap
**Question:** How much leverage to allow?

| Cap | Risk | Market Advantage | Recommendation |
|-----|------|---------|---|
| 2.5x | Low (regulated) | Conservative | ✅ RECOMMENDED |
| 3.0x | Medium | Competitive | ⚠️ If Quantfury approves |
| 4.0x | High (ruin risk) | Aggressive | ❌ NOT RECOMMENDED |

**Recommendation:** **2.5x leverage (matching B3 standard)**

---

### DECISION 3: Launch Date
**Question:** When to go live with leverage?

**Option A: D10 (June 15) - Phased**
- Analysis features: Live (no leverage)
- Leverage: Live D12 (if docs approved)
- Pros: Early market entry, separate risk
- Cons: Confuses users (feature toggle)

**Option B: D12 (June 17) - Full**
- All features live together
- Requires: All Tier 1 checklist complete
- Pros: Simpler UX, complete product
- Cons: Longer development (5 days, aggressive)

**Option C: D24+ (July) - Safe**
- Wait for CVM response
- Maximize legal certainty
- Pros: Best legal position
- Cons: 3-week delay, market timing loss

**Recommendation:** **Option B (D12 full launch)**
- If all Tier 1 checklist complete by D11

---

## 10. REGULATORY CONTACTS & RESOURCES

### BRASIL

**CVM (Comissão de Valores Mobiliários)**
- Email: consultapublica@cvm.gov.br
- Website: www.cvm.gov.br
- Phone: +55 21 3131-8888
- Use: Regulatory queries, instruction clarifications

**ANPD (Autoridade Nacional de Proteção de Dados)**
- Website: www.gov.br/cidadania
- Use: LGPD compliance, data breach reporting

**ANBIMA (Associação Brasileira de Analistas)**
- Website: www.anbima.org.br
- Email: compliance@anbima.org.br
- Use: Industry best practices, compliance guidance

### USA

**SEC (Securities and Exchange Commission)** *(if expanding to US)*
- Website: www.sec.gov
- Use: Investment advisor registration, compliance

---

## 11. KEY DELIVERABLES (This Sprint)

✅ **Done (by Jun 5):**
1. Regulatory assessment document (this file)
2. Risk disclosure template
3. Privacy policy template
4. ToS template
5. Compliance checklist
6. DB schema (consent logging)

📝 **In Progress (Jun 5-12):**
1. Risk Disclaimer Modal component (Frontend)
2. Consent logging API (Backend)
3. Customized ToS + Privacy Policy (Legal)
4. CVM regulatory query email (Legal)
5. Legal consulting RFQ (Finance)

⏳ **Planned (Jun 12-19):**
1. Legal review meeting + decisions
2. Final ToS + Privacy Policy published
3. Risk disclosure finalized
4. Consent logging tested
5. Launch decision made

---

## 12. EXECUTIVE SUMMARY (1-PAGE REFERENCE)

**TL;DR:**

1. **CVM Risk:** 40-60% chance CVM says your scoring = "consultoria" = need license
   - **Action:** Email CVM today (section 2.1)
   - **Impact:** If license needed → 3-6 month delay or feature pivot

2. **Alavancagem:** Cap at 2.5x (not 4x) to match regulatory standard
   - **Action:** Product approval needed (D5)
   - **Impact:** 2h backend change

3. **Legal Docs:** ToS + Privacy Policy + Risk Disclaimer Modal = MUST HAVE
   - **Action:** Draft by D7, review by lawyer
   - **Impact:** Blocking launch unless complete

4. **LGPD:** Mandatory Privacy Policy + consent logging
   - **Action:** Implement consent logging (D7)
   - **Impact:** Legal defense if user lawsuit

5. **Launch Plan:** Balanced approach (Option B)
   - Analysis features: D10
   - Leverage features: D12 (if all legal docs approved)
   - CVM response monitored (may require pivot in Q3)

6. **Budget:** R$50-150k year 1 (consulting, insurance, ongoing)

7. **Decision Point:** June 8 (D3) → GO/NO-GO approval needed

---

**Status:** 🟡 ON TRACK (if all D1-D5 decisions made)  
**Risk Level:** 🔴 CRITICAL (leverage + regulation) → Mitigable with proper docs  
**Recommendation:** PROCEED (with Tier 1 legal docs) + Monitor CVM response

---

*Prepared by: Legal/Compliance Team*  
*Date: June 5, 2026*  
*Next review: June 8, 2026 (legal review meeting)*
