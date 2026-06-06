# 🔑 Setup Push Notifications VAPID Keys

Para ativar notificações push no seu aplicativo, você precisa gerar um par de chaves VAPID (Voluntary Application Server Identification).

## 1. Instale a biblioteca web-push

```bash
npm install web-push --save-dev
# ou
yarn add web-push --dev
```

## 2. Gere as chaves VAPID

Execute este comando no terminal (do seu projeto):

```bash
npx web-push generate-vapid-keys
```

Você receberá algo como:

```
Public Key: BKJ4GxCQ0...(long string)...
Private Key: KjZ8xHfQ0...(long string)...
```

## 3. Configure as variáveis de ambiente

### Frontend (.env.local):
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKJ4GxCQ0...(sua public key)
```

### Backend (.env):
```
VAPID_PUBLIC_KEY=BKJ4GxCQ0...(sua public key)
VAPID_PRIVATE_KEY=KjZ8xHfQ0...(sua private key)
VAPID_SUBJECT=mailto:seu-email@example.com
```

## 4. Deploy

Depois de adicionar as chaves:

1. **Frontend**: Redeploy no Render
2. **Backend**: Redeploy no Render

## Teste

Uma vez deployado:

1. Acesse a aplicação em produção
2. Clique no botão "Ativar notificações push" no NotificationBell
3. Autorize no browser
4. Para testar, crie uma notificação via API:

```bash
curl -X POST http://seu-backend/api/v1/notifications \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "type": "news",
    "title": "Teste de Notificação",
    "body": "Essa é uma notificação de teste"
  }'
```

## Troubleshooting

**Erro: "NEXT_PUBLIC_VAPID_PUBLIC_KEY is empty"**
- Adicione a public key ao .env.local do frontend

**Push não funciona**
- Verifique se o Service Worker está registrado (F12 → Application → Service Workers)
- Confirme que as permissões de notificação foram concedidas no browser
- Verifique os logs do backend para erros de VAPID validation
