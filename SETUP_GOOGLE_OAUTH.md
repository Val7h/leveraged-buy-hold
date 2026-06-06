# 🔐 Setup Google OAuth Login

Para ativar login com Google, você precisa criar um projeto no Google Cloud Console.

## 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto: **LBH System** (ou similar)
3. Aguarde a criação

## 2. Habilitar Google+ API

1. Busque por **"Google+ API"** na barra de pesquisa
2. Clique em **"Google+ API"**
3. Clique em **"Habilitar"**

## 3. Criar OAuth 2.0 Credentials

1. Vá para **"Credenciais"** no menu esquerdo
2. Clique em **"+ Criar credenciais"**
3. Selecione **"ID do cliente OAuth 2.0"**
4. Tipo: **"Aplicativo da Web"**
5. Nome: **"LBH Frontend"**

### Authorized JavaScript origins (adicione ambos):
- `http://localhost:3000`
- `https://lbh-frontend.onrender.com`

### Authorized redirect URIs:
- `http://localhost:3000/login`
- `https://lbh-frontend.onrender.com/login`

6. Clique em **"Criar"**
7. Copie o **Client ID** (você vai precisar)

## 4. Configurar Variáveis de Ambiente

### Frontend (.env.local):
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu_client_id_aqui
```

### Backend (.env):
```
GOOGLE_CLIENT_ID=seu_client_id_aqui
```

## 5. Deploy

Depois de adicionar as credenciais:

### Frontend (Render):
```bash
git add .
git commit -m "setup: add Google OAuth client ID"
git push
```

No dashboard do Render, adicione a variável de ambiente:
- Key: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Value: `seu_client_id_aqui`

### Backend (Render):
No dashboard do Render, adicione a variável de ambiente:
- Key: `GOOGLE_CLIENT_ID`
- Value: `seu_client_id_aqui`

## 6. Teste

1. Acesse https://lbh-frontend.onrender.com/login
2. Clique em **"Sign in with Google"**
3. Autorize com sua conta Google
4. Você será redirecionado para /dashboard se bem-sucedido

## Troubleshooting

**Erro: "GOOGLE_CLIENT_ID not set"**
- Adicione a variável de ambiente ao backend no Render

**Erro: "Invalid Google token"**
- Verifique se o GOOGLE_CLIENT_ID no backend é idêntico ao NEXT_PUBLIC_GOOGLE_CLIENT_ID do frontend
- Confirme que os URIs autorizados estão corretos no Console

**Botão Google não aparece**
- Verifique se @react-oauth/google foi instalado: `npm install @react-oauth/google`
- Confirme que NEXT_PUBLIC_GOOGLE_CLIENT_ID está definido

**CORS error**
- Certifique-se de que o backend tem CORS configurado para o domínio do frontend
- Verifique em `backend/app/main.py`: `allow_origins`

## Referências

- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [@react-oauth/google Docs](https://www.npmjs.com/package/@react-oauth/google)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
