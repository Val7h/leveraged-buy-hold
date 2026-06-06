# Stage 1: Build Next.js (standalone mode)
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime + Node.js binary (copiado do stage 1)
FROM python:3.11-slim

WORKDIR /app

# Dependências sistema para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar Node.js binary do stage 1 (sem instalar via apt!)
COPY --from=frontend-builder /usr/local/bin/node /usr/local/bin/node

# Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend source
COPY backend/ ./backend/

# Next.js standalone output (self-contained, inclui tudo necessário)
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Start script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
