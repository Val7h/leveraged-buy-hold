#!/usr/bin/env bash
# Sobe FastAPI (interno, 127.0.0.1:8001) + Next.js ($PORT, exposto) no mesmo container.
# Se qualquer um dos dois morrer, derruba o outro e sai → a Render reinicia o container.
set -uo pipefail

# 1) Prisma: aplica schema (idempotente). Cria a tabela notifications no 1º deploy.
#    --accept-data-loss não apaga dados; só permite alterações de schema sem prompt.
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>/dev/null || \
  echo "[start.sh] prisma db push falhou/sem DATABASE_URL — seguindo"

# 2) FastAPI (motor quant) — porta fixa interna, 1 worker p/ caber na memória da Render
( cd /app/backend && exec uvicorn app.main:app --host 127.0.0.1 --port "${BACKEND_PORT:-8001}" --workers 1 ) &
UVICORN_PID=$!

# 3) Next.js — escuta na porta injetada pela Render ($PORT, default 3000)
node server.js &
NODE_PID=$!

# 4) CRON in-process dos alertas (deploy único): aciona /api/v1/alerts/sweep periodicamente.
#    Subshell que NUNCA sai (não dispara o wait -n) e engole erros → não derruba o container.
( sleep 90
  while true; do
    node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/alerts/sweep',{method:'POST',headers:{'X-Internal-Token':process.env.BACKEND_INTERNAL_TOKEN||''}}).then(r=>r.text()).then(t=>console.log('[alert-sweep]',t)).catch(e=>console.log('[alert-sweep] skip',e.message))" 2>/dev/null || true
    sleep "${ALERT_SWEEP_SECONDS:-600}"
  done ) &

# 5) ETL CVM Dados Abertos (fundamentos B3) — baixa os ZIPs e popula o cache em disco.
#    Roda no boot (após uvicorn subir) e re-roda SEMANALMENTE (dado CVM muda trimestral).
#    Subshell blindado: nunca sai, engole erros → não derruba o container.
( sleep 120
  while true; do
    ( cd /app/backend && python -c "from app.services.cvm_fundamentals import refresh_cvm_cache; refresh_cvm_cache()" ) 2>&1 | sed 's/^/[cvm-refresh] /' || true
    sleep "${CVM_REFRESH_SECONDS:-604800}"
  done ) &

echo "[start.sh] uvicorn(pid=$UVICORN_PID) + next(pid=$NODE_PID) + alert-sweep + cvm-refresh no ar"

# Espera o primeiro processo terminar; encerra o outro e propaga o exit code.
wait -n
EXIT=$?
echo "[start.sh] um processo encerrou (exit=$EXIT) — derrubando o container"
kill "$UVICORN_PID" "$NODE_PID" 2>/dev/null || true
exit "$EXIT"
