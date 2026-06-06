#!/bin/bash
set -e

echo "=== LBH System Starting ==="
echo "NODE: $(node --version)"
echo "PYTHON: $(python --version)"
echo "PORT: ${PORT:-3000}"

# Start FastAPI backend em background
echo "[1/2] Starting FastAPI backend on port 8001..."
cd /app/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --log-level info &
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

exec node server.js
