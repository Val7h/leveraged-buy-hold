#!/bin/bash
# Teste completo de produção - rodar após deploy v1.1.0
BASE_BACK="https://lbh-backend.onrender.com"
BASE_FRONT="https://lbh-frontend.onrender.com"

echo "=============================================="
echo "  LBH SYSTEM - TESTE COMPLETO DE PRODUCAO"
echo "=============================================="
echo ""

PASS=0
FAIL=0

check() {
  if echo "$2" | grep -q "$3"; then
    echo "  PASS: $1"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $1 | Esperado: $3 | Recebido: $2"
    FAIL=$((FAIL+1))
  fi
}

echo "--- BACKEND ---"
R=$(curl -sk --max-time 10 $BASE_BACK/api/health)
check "Health v1.1.0" "$R" "1.1.0"

R=$(curl -sk --max-time 10 $BASE_BACK/api/openapi.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('consent' in str(list(d['paths'].keys())))")
check "Consent route existe" "$R" "True"

EMAIL="test_$(date +%s)@lbhsystem.com"
R=$(curl -sk --max-time 15 -X POST $BASE_BACK/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test123!\",\"full_name\":\"Prod Test\",\"risk_profile\":\"balanced\"}")
check "Register usuario" "$R" '"id"'

TOKEN=$(curl -sk --max-time 15 -X POST $BASE_BACK/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=Test123!" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
check "Login JWT token" "$TOKEN" "eyJ"

NOW=$(python3 -c "from datetime import datetime,timedelta; print((datetime.now()-timedelta(seconds=30)).isoformat()+'Z')")
R=$(curl -sk --max-time 15 -X POST $BASE_BACK/api/v1/user/consent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"acceptRisk\":true,\"acceptTerms\":true,\"timestamp\":\"$NOW\"}")
check "Consent endpoint" "$R" '"success":true'

echo ""
echo "--- FRONTEND ---"
for PAGE in "/" "/login" "/pricing" "/dashboard"; do
  CODE=$(curl -sk --max-time 15 -o /dev/null -w "%{http_code}" $BASE_FRONT$PAGE)
  check "Pagina $PAGE" "$CODE" "200"
done

echo ""
echo "=============================================="
echo "  RESULTADO: $PASS passou | $FAIL falhou"
echo "=============================================="
