# Multi-stage build: Frontend + Backend em uma imagem
# Stage 1: Build Frontend (Next.js)
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Backend + Runtime
FROM python:3.11-slim

WORKDIR /app

# Instalar Node.js runtime (para rodar Next.js)
RUN apt-get update && apt-get install -y \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Copiar backend
COPY backend/ ./backend/
WORKDIR /app/backend

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar frontend buildado
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json
COPY --from=frontend-builder /app/frontend/next.config.mjs /app/frontend/next.config.mjs

# Script de inicialização
RUN cat > /app/start.sh << 'EOF'
#!/bin/bash
set -e

# Inicia Backend em background
echo "Starting FastAPI backend..."
cd /app/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

# Aguarda backend estar pronto
sleep 3

# Inicia Frontend
echo "Starting Next.js frontend..."
cd /app/frontend
npm run start --port 3000

wait $BACKEND_PID
EOF

RUN chmod +x /app/start.sh

# Expõe portas
EXPOSE 3000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["/app/start.sh"]
