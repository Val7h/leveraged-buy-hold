# 🚀 HANDOFF — Continuação do LBH System

**Para nova sessão Claude:** leia este arquivo INTEIRO antes de qualquer ação.

---

## 📊 Estado atual (junho 2026)

**Projeto:** LBH System — SaaS de simulação/backtest de Buy & Hold alavancado para investidor brasileiro.

**Produção:** https://lbh-system.onrender.com (Render Hobby $7/mo)
**Repo:** Val7h/leveraged-buy-hold (master branch)
**Último commit estável:** `72bd142` (fix CSP/nonce + force-dynamic)

---

## ✅ O que já está PRONTO e funcionando

### Stack
- Next.js 14.2.35 (App Router, TypeScript strict, ignoreBuildErrors=false)
- Prisma + Supabase Postgres (us-east-2) — DATABASE_URL configurado no Render
- JWT em cookie httpOnly (jose + bcrypt 12 rounds)
- Upstash Redis ready (lib/cache.ts), fallback in-memory
- Logger estruturado JSON (lib/logger.ts)
- Rate limit em camadas (middleware + handler)

### Features operacionais
- ✅ Auth real: register, login, logout, /me
- ✅ Persistência real: Portfolio + Positions + Watchlists + Alerts
- ✅ Yahoo Finance: RSI Wilder + MA200 + beta/dividend reais via quoteSummary
- ✅ Página /conta completa: perfil, senha, dados (LGPD export/delete), preferências email
- ✅ Forgot/Reset password (token sha256, expira 1h)
- ✅ Páginas legais: /termos /privacidade /lgpd /disclaimer
- ✅ Compliance CVM (labels OPORTUNIDADE/NEUTRO/DESFAVORÁVEL)
- ✅ Compliance LGPD (CookieBanner + ConsentCheckbox + opt-out marketing)
- ✅ Paywall (model Subscription) — stub do Asaas em /api/v1/billing/upgrade (501)
- ✅ Pricing R$ 0 / R$ 59 / R$ 159 (Free / Pro / Premium)
- ✅ 5 templates de email Resend-ready (stub até RESEND_API_KEY chegar)
- ✅ Sanitização XSS: regex Unicode `/^[\p{L}\p{N}\s.'-]{1,120}$/u` em fullName
- ✅ CSP hardened: nonce + strict-dynamic (SEM unsafe-inline) — propagação ATIVA
- ✅ /api/reset com Clear-Site-Data (resolve cache/SW antigo)
- ✅ Service Worker = kill-switch (autodestrói)

### Banco Supabase (current state)
- 5 users + 4 portfolios reais (residuais de testes E2E)
- Tabelas: users, portfolios, positions, watchlists, watchlist_items, alerts,
  subscriptions, email_preferences, password_reset_tokens

---

## ⏳ Bloqueadores externos pra cobrar R$ 59

```
🟡 CNPJ — usuário JÁ TEM CNPJ ativo
🟡 Contadora vai adicionar CNAE 6203-1/00 (desenvolvimento software não-customizável)
🟡 Razão social / CNPJ / endereço fiscal → preencher CONTROLLER_NAME em lib/legal/versions.ts
🟡 Domínio alavanca.com.br (Registro.br, R$ 40/ano)
🟡 Conta Resend (free, 3k emails/mês) — só setar RESEND_API_KEY no Render
🟡 Asaas integração (4h dev depois do CNPJ liberado)
🟡 Sentry + UptimeRobot + PostHog (4-6h dev — observabilidade)
```

---

## 📋 Auditoria externa (executada nessa sessão)

6 auditores Tier-1 deram nota geral **61/100** (vermelho em 5/6 áreas).
Após sprint de correção:

### ✅ Críticos técnicos resolvidos
1. Next.js 14.0.3 → 14.2.35 (CVE middleware bypass corrigida)
2. ignoreBuildErrors=false (TS strict + ESLint no build)
3. Preço sincronizado R$ 19 → R$ 59 (CDC Art. 37)
4. Trust chips falsos "1.200+ backtests" removidos
5. Reset de senha real implementado
6. XSS stored em fullName sanitizado
7. CSP sem unsafe-inline + nonce propagado corretamente
8. Spinner infinito "Verificando sessão..." resolvido (era CSP bloqueando hydration)

### ⏳ Não-técnicos pendentes (auditoria)
- Decisão CVM: registrar CNPI OU descaracterizar (remover sinais OPORTUNIDADE + alavancagem recomendada)
- DPO real em domínio válido
- Observabilidade (Sentry/UptimeRobot/PostHog)
- Testes de billing (cobertura zero hoje)

---

## 🔑 Credenciais e env vars importantes

### Render Service
- ID: `srv-d8i81pa8qa3s73e64j40`
- Token: `rnd_h6Nakrt15pVwkog48pZkpYHJug1z`

### Supabase (pooler us-east-2)
- DATABASE_URL: `postgresql://postgres.cvlrelzztgucqdhdykyo:MGNlQ1u9ondyHY29@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15`
- DIRECT_DATABASE_URL (session mode porta 5432): `postgresql://postgres.cvlrelzztgucqdhdykyo:MGNlQ1u9ondyHY29@aws-1-us-east-2.pooler.supabase.com:5432/postgres`

### Env vars setadas no Render
- DATABASE_URL, DIRECT_DATABASE_URL (Supabase)
- AUTH_SECRET, JWT_SECRET (96 chars random, mesmos valores)
- SESSION_COOKIE_NAME=`lbh_session`
- NODE_ENV=production

### Env vars pendentes
- RESEND_API_KEY (quando criar conta Resend)
- UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (cache compartilhado)
- SENTRY_DSN (monitoring)
- POSTHOG_KEY (analytics)

---

## 🛠️ Scripts úteis no repo

- `e2e_5_users.js` — Simula 5 personas fazendo fluxo completo
- `e2e_conta.js` — Testa /conta (perfil, senha, LGPD export/delete)
- `teste_maior.js` — Bateria completa pós-fix CSP (validação + carga)

Rodar: `cd /c/Users/Admin/leveraged-buy-hold && node <script>.js`

---

## 📁 Arquivos críticos (NÃO mexer sem entender)

- `frontend/src/middleware.ts` — CSP nonce + rate limit. Propaga nonce via REQUEST headers (não só response).
- `frontend/src/app/layout.tsx` — tem `export const dynamic = "force-dynamic"` (necessário para nonce funcionar).
- `frontend/src/app/page.tsx` — landing com Promise.race + timeout 3.5s + botão escape.
- `frontend/src/components/layout/AppShell.tsx` — mesmo padrão Promise.race.
- `frontend/src/lib/db.ts` — Prisma com stub gracioso quando DATABASE_URL ausente.
- `frontend/src/lib/auth.ts` — JWT sign/verify (jose), getCurrentUser, rate limit.
- `frontend/prisma/schema.prisma` — schema completo (User, Portfolio, Subscription, EmailPreference, PasswordResetToken).
- `Dockerfile` — node:20-slim (Debian), multi-stage, copia Prisma binaries + schema explicitamente.

---

## 🚦 Próximos passos sugeridos (em ordem)

1. **Rodar teste_maior.js** — validar produção pós-fix CSP (100% esperado)
2. **Aguardar contadora** — CNAE 6203-1/00 adicionado
3. **Preencher CONTROLLER_NAME** em `lib/legal/versions.ts` quando ela responder
4. **Comprar alavanca.com.br** (10 min, R$ 40/ano)
5. **Criar conta Resend + setar RESEND_API_KEY** (5 min)
6. **Decisão CNPI vs descaracterizar** (jurídico — pode adiar)
7. **Instalar Sentry + UptimeRobot + PostHog** (~4h dev)
8. **Integrar Asaas** quando CNPJ + decisão CVM estiverem prontos (~4h dev)

---

## 💬 Memória sobre o usuário (Valth)

- Brasileiro, investidor, prefere PT-BR
- Tem CNPJ ativo, espera contadora confirmar CNAE
- Quer começar barato (R$ 44/mês inicial), escalar conforme MRR
- Aceita risco controlado em segurança no início
- NÃO quer cobrar antes de estar regulado
- Trabalhou em paralelo via Claude mobile (commits 8c3b3ec + 8407d75 com logger.ts + rate-limit Redis)

---

## 🔧 Como retomar

Cole no Claude nova sessão:

> Continuando projeto LBH System. Leia o arquivo
> `C:\Users\Admin\leveraged-buy-hold\HANDOFF.md` para contexto completo.
> Estado atual: produção live, fix CSP/nonce aplicado (commit 72bd142),
> aguardando contadora. Quero [SUA TAREFA AQUI].

Pronto. Próxima sessão começa com 95% menos contexto e 100% do estado.
