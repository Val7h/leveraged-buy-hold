# Sentry Setup — LBH System

Guia rápido para habilitar monitoramento de erros via Sentry quando o DSN estiver disponível.

> **Status atual:** NÃO instalado. Execute os 5 passos abaixo quando tiver o DSN do projeto Sentry.

---

## Pré-requisitos

1. Criar conta gratuita em https://sentry.io (50k eventos/mês no plano free).
2. Criar um novo projeto do tipo **Next.js**.
3. Copiar o **DSN** gerado (formato: `https://xxxx@oNNN.ingest.sentry.io/NNNNNN`).

---

## Passo 1 — Rodar o wizard oficial

Na raiz do frontend, com terminal interativo:

```bash
cd C:/Users/Admin/leveraged-buy-hold/frontend
npx @sentry/wizard@latest -i nextjs
```

O wizard vai:
- Instalar `@sentry/nextjs`
- Criar `sentry.client.config.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts`
- Atualizar `next.config.js` envolvendo a config com `withSentryConfig`
- Criar/atualizar `.sentryclirc` e `instrumentation.ts`

Aceite todas as opções padrão (source maps, tunneling se necessário).

## Passo 2 — Adicionar variáveis de ambiente no Render

No dashboard do Render → serviço `lbh-system` → **Environment**, adicione:

```
SENTRY_DSN=https://xxxx@oNNN.ingest.sentry.io/NNNNNN
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oNNN.ingest.sentry.io/NNNNNN
SENTRY_ORG=seu-org-slug
SENTRY_PROJECT=lbh-system
SENTRY_AUTH_TOKEN=sntrys_...   # opcional, para upload de source maps no build
```

Para desenvolvimento local, replicar em `.env.local` (NÃO commitar).

## Passo 3 — Ajustar sample rates

Editar `sentry.client.config.ts` e `sentry.server.config.ts`:

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,           // 10% das transações (ajustar conforme volume)
  replaysSessionSampleRate: 0.0,   // desligar replays até definir LGPD
  replaysOnErrorSampleRate: 1.0,   // mas capturar replay quando der erro
  environment: process.env.NODE_ENV,
});
```

## Passo 4 — Criar rota de teste

Criar `frontend/src/app/api/v1/test/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function GET() {
  throw new Error("Sentry test error — pode ignorar");
  return NextResponse.json({ ok: true });
}
```

## Passo 5 — Validar em produção

Após deploy:

```bash
curl https://lbh-system.onrender.com/api/v1/test
```

O erro deve aparecer no dashboard Sentry em até 60s. Depois disso, **remover a rota de teste** e fazer novo deploy.

---

## Pós-instalação

- Configurar **alertas** no Sentry (Slack, e-mail) para erros novos e regressões.
- Definir **release tracking** no pipeline (a CLI `sentry-cli releases new $VERSION` no build).
- Revisar política de **PII scrubbing** antes de habilitar Session Replay.
