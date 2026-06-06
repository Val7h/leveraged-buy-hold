#!/bin/bash
set -e

echo "=== LBH System Starting ==="

# Rodar migrations do banco (se DATABASE_URL existir)
if [ -n "$DATABASE_URL" ]; then
  echo "[0/2] Running database migrations..."
  cd /app/backend
  python -m alembic upgrade head || echo "Migrations skipped (may already be up to date)"
fi

# Start FastAPI backend em background
echo "[1/2] Starting FastAPI backend on port 8001..."
cd /app/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

# Aguardar backend iniciar
sleep 5
echo "[1/2] Backend started (PID: $BACKEND_PID)"

# Start Next.js frontend (porta que Render define via $PORT)
echo "[2/2] Starting Next.js frontend..."
cd /app/frontend
PORT=${PORT:-3000} node_modules/.bin/next start --port ${PORT:-3000} --hostname 0.0.0.0

# Se frontend sair, matar backend
kill $BACKEND_PID 2>/dev/null
