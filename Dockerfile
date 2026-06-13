# syntax=docker/dockerfile:1.6
# LBH System — Next.js 14 standalone + Prisma, node:20-slim (Debian glibc).

# ── deps ───────────────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
&& rm -rf /var/lib/apt/lists/*
COPY frontend/package*.json ./
COPY frontend/prisma ./prisma
# --legacy-peer-deps tolera peer dep mismatches (radix-ui + zod + @react-oauth/google)
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# ── builder ────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
&& rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ── runner ─────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Runtime deps: openssl (Prisma engine), curl (HEALTHCHECK)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
&& rm -rf /var/lib/apt/lists/* \
&& groupadd -r nodejs -g 1001 \
&& useradd -r -g nodejs -u 1001 -s /sbin/nologin nextjs

# Copy Next.js standalone output with correct ownership.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma: schema + generated client engines.
# CLI removido do runtime — migrations rodam fora do startup (ver scripts/migrate.sh).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
