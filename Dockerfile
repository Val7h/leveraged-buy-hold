# LBH System — Frontend only (API routes via Next.js)
FROM node:18-slim AS builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Runtime
FROM node:18-slim AS runner

WORKDIR /app

# Copy standalone Next.js output
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "PORT=${PORT:-3000} node server.js"]
