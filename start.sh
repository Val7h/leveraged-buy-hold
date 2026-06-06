#!/bin/bash
set -e

echo "=== LBH System Starting ==="
echo "NODE: $(node --version)"
echo "PYTHON: $(python --version)"
echo "PORT: ${PORT:-3000}"

# Start FastAPI backend em background
echo "[1/2] Starting FastAPI backend on port 8001..."
cd /app/backend

# Testar se o backend completo importa sem erro
python -c "from app.main import app; print('[OK] Full backend imports OK')" 2>&1 && BACKEND_MODULE="app.main:app" || BACKEND_MODULE="minimal_main:app"
echo "[1/2] Using module: $BACKEND_MODULE"

python -m uvicorn $BACKEND_MODULE --host 0.0.0.0 --port 8001 --log-level info &
BACKEND_PID=$!

sleep 5

if kill -0 $BACKEND_PID 2>/dev/null; then
  echo "[1/2] Backend OK (PID: $BACKEND_PID)"
else
  echo "[WARN] Backend may have failed, check logs above"
fi

# Next.js standalone server (não precisa de node_modules!)
echo "[2/2] Starting Next.js standalone on port ${PORT:-3000}..."
cd /app/frontend

export HOSTNAME=0.0.0.0
export PORT=${PORT:-3000}
exec node server.js
