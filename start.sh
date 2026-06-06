#!/bin/bash
set -e

echo "=== LBH System Starting ==="
echo "DATABASE_URL set: ${DATABASE_URL:+yes}"
echo "PORT: ${PORT:-3000}"

# Testar conexão com banco
if [ -n "$DATABASE_URL" ]; then
  echo "[0/2] Testing database connection..."
  cd /app/backend
  python -c "
from app.core.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('[DB] Connection OK!')
except Exception as e:
    print(f'[DB] Connection failed: {e}')
" || echo "[DB] Could not test connection"

  echo "[0/2] Running create_tables..."
  python -c "
from app.core.database import create_tables, Base
from app.models import user, portfolio, position, alert, watchlist, trade_history, notification, subscription
try:
    create_tables()
    print('[DB] Tables created OK!')
except Exception as e:
    print(f'[DB] Create tables error: {e}')
" || echo "[DB] Create tables failed"
fi

# Start FastAPI backend em background com log
echo "[1/2] Starting FastAPI backend on port 8001..."
cd /app/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --log-level info 2>&1 &
BACKEND_PID=$!

# Aguardar backend iniciar
sleep 8

# Verificar se está rodando
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo "[1/2] Backend running (PID: $BACKEND_PID)"
else
  echo "[WARN] Backend may have crashed, starting frontend anyway..."
fi

# Start Next.js frontend
echo "[2/2] Starting Next.js frontend..."
cd /app/frontend
exec node_modules/.bin/next start --port ${PORT:-3000} --hostname 0.0.0.0
