#!/bin/bash
# Script para deletar 3 serviços LBH antigos e criar 1 novo no Render

set -e

echo "⚠️  Este script deletará 3 serviços e criará 1 novo no Render"
echo "Você precisa do seu Render API token (https://dashboard.render.com/account/api-tokens)"
echo ""

read -p "Cole seu Render API token: " API_TOKEN

if [ -z "$API_TOKEN" ]; then
    echo "❌ Token não fornecido"
    exit 1
fi

# IDs dos serviços a deletar (você precisa substituir pelos seus)
# Vá em https://dashboard.render.com e copie os IDs

echo ""
echo "📋 Serviços a deletar:"
echo "1. lbh-frontend"
echo "2. lbh-backend"
echo "3. lbh-db"
echo ""

read -p "Cole o ID do lbh-frontend: " FRONTEND_ID
read -p "Cole o ID do lbh-backend: " BACKEND_ID
read -p "Cole o ID do lbh-db: " DB_ID

# Deletar frontend
echo "🗑️  Deletando lbh-frontend..."
curl -X DELETE "https://api.render.com/v1/services/$FRONTEND_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  || echo "⚠️  Erro ao deletar frontend"

sleep 2

# Deletar backend
echo "🗑️  Deletando lbh-backend..."
curl -X DELETE "https://api.render.com/v1/services/$BACKEND_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  || echo "⚠️  Erro ao deletar backend"

sleep 2

# Deletar db
echo "🗑️  Deletando lbh-db..."
curl -X DELETE "https://api.render.com/v1/services/$DB_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  || echo "⚠️  Erro ao deletar db"

echo ""
echo "✅ Deletados!"
echo ""
echo "Agora crie um novo serviço manualmente:"
echo "1. Dashboard.render.com → New +"
echo "2. Web Service"
echo "3. Conecte seu repositório (Val7h/leveraged-buy-hold)"
echo "4. Nome: lbh-system"
echo "5. Build Command: deixe em branco"
echo "6. Start Command: /app/start.sh"
echo "7. Environment: NEXT_PUBLIC_API_URL=http://localhost:8001"
echo "8. Deploy!"
