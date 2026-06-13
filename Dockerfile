# syntax=docker/dockerfile:1.6
# LBH System — CONTAINER ÚNICO: Next.js 14 (standalone) + FastAPI (motor quant Python).
#   - Next.js escuta em $PORT (exposto pela Render)
#   - FastAPI escuta em 127.0.0.1:8001 (interno; o BFF do Next chama via localhost)
# Base node:20-slim (Debian bookworm) traz Python 3.11 — venv é portável entre stages.

# ── frontend deps ───────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
&& rm -rf /var/lib/apt/lists/*
COPY frontend/package*.json ./
COPY frontend/prisma ./prisma
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# ── frontend builder ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
&& rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ── python deps (venv) ───────────────────────────────────────────────────────────
# Mesma base node:20-slim → o venv usa /usr/bin/python3 e é portável ao runner.
FROM node:20-slim AS pydeps
ENV PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv python3-pip gcc libpq-dev \
&& rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── runner ───────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BACKEND_PORT=8001 \
    PATH="/opt/venv/bin:$PATH"

# Runtime: python3 (p/ rodar o venv), libpq5 (psycopg2), curl (healthcheck), bash (start.sh)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 libpq5 openssl ca-certificates curl bash \
&& rm -rf /var/lib/apt/lists/* \
&& groupadd -r nodejs -g 1001 \
&& useradd -r -g nodejs -u 1001 -s /sbin/nologin nextjs

# Python: venv com as deps + código do backend
COPY --from=pydeps /opt/venv /opt/venv
COPY --chown=nextjs:nodejs backend/ ./backend/

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma: schema + client + CLI (db push roda no start.sh)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Script que sobe os dois processos
COPY --chown=nextjs:nodejs start.sh ./start.sh
RUN chmod +x ./start.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
CMD curl -fsS http://localhost:${PORT:-3000}/api/health || exit 1

CMD ["bash", "./start.sh"]
