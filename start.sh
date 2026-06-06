#!/bin/bash
set -e

echo "=== LBH System Starting ==="

# Start FastAPI backend in background
echo "[1/2] Starting FastAPI backend on port 8001..."
cd /app/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

# Wait for backend
sleep 5
echo "[1/2] Backend started (PID: $BACKEND_PID)"

# Start Next.js frontend
echo "[2/2] Starting Next.js frontend on port 3000..."
cd /app/frontend
node server.js

# If frontend exits, kill backend
kill $BACKEND_PID
