# syntax=docker/dockerfile:1.6
# LBH System — Next.js 14 standalone, multi-stage, non-root, HEALTHCHECK.

# ── deps ───────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
# libc6-compat is required by Next.js 14 standalone / sharp on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

# ── builder ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# wget for HEALTHCHECK; create dedicated non-root user.
RUN apk add --no-cache wget \
 && addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

# Copy Next.js standalone output with correct ownership.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# exec-form CMD: SIGTERM from Render reaches node directly, no PID-1 sh shim.
CMD ["node", "server.js"]
