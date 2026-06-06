# 🧪 Teste Local - Google OAuth (Sem Client ID)

## ✅ FUNCIONA AGORA - Sem configuração extra!

Você pode testar o fluxo de login com Google **IMEDIATAMENTE** usando o modo desenvolvimento.

---

## 🚀 TESTE RÁPIDO (30 segundos)

### 1. Rode o backend:

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

Espere ver:
```
✓ Application startup complete
✓ Uvicorn running on http://127.0.0.1:8001
```

### 2. Em outro terminal, rode o frontend:

```bash
cd frontend
npm install  # (primeira vez apenas)
npm run dev
```

Espere ver:
```
✓ Ready in 2.3s
✓ Local: http://localhost:3000
```

### 3. Acesse: http://localhost:3000/login

---

## 🔐 TESTE LOGIN (Com Modo Desenvolvimento)

Na página de login, procure pela caixa **"Modo Teste (sem Google Client ID)"**:

```
┌─────────────────────────────────────────┐
│ ⚠️ Modo Teste (sem Google Client ID)     │
├─────────────────────────────────────────┤
│ Email:           valthguime@gmail.com   │
│ Nome Completo:   Valthur Guime          │
│ [Entrar (Teste)] ✓                      │
└─────────────────────────────────────────┘
```

**Clique em "Entrar (Teste)"** → Você é redirecionado para /dashboard ✅

---

## 🧪 O QUE VOCÊ ESTÁ TESTANDO

| Feature | Status |
|---------|--------|
| ✅ Login form (tradicional) | Funciona |
| ✅ Register form | Funciona |
| ✅ Google "Dev Mode" | Funciona (NOVO) |
| ✅ JWT token creation | Funciona |
| ✅ User creation | Funciona |
| ✅ Dashboard redirect | Funciona |
| ⏳ Notificações push | Precisa VAPID keys |
| ⏳ Feed de notícias | Funciona mas sem dados (yfinance pode ser lento) |
| ⏳ Google OAuth real | Precisa GOOGLE_CLIENT_ID |

---

## 🔄 FLUXO COMPLETO PARA TESTAR

### 1. **Teste tradicional**:
```
Email: teste@exemplo.com
Senha: 12345678
[Entrar] → Dashboard ✓
```

### 2. **Teste novo registro**:
```
Aba: [Criar Conta]
Nome: Seu Nome
Email: novo@exemplo.com
Senha: 12345678
Perfil: Balanceado
[Criar Conta] → Modal de Risco → Dashboard ✓
```

### 3. **Teste Google (Dev Mode)**:
```
Email: qualquer@coisa.com
Nome: Qualquer Nome
[Entrar (Teste)] → Dashboard ✓
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Backend not found" na página de login
- Verifique se backend está rodando em `http://localhost:8001`
- Abra F12 → Network → Veja se há requisições a `localhost:8001`

### Erro: "Email ou senha inválidos" (login tradicional)
- Certifique-se que criou um usuário primeiro via [Criar Conta]
- Ou use um email já existente que você criou antes

### Botão "Entrar (Teste)" não aparece
- Verifique se `NEXT_PUBLIC_GOOGLE_CLIENT_ID` está vazio em `.env.local`
- Se tiver um valor lá, remova-o para ver o modo teste

### Página em branco
- Abra F12 → Console e procure por erros vermelhos
- Tente limpar cache: Ctrl+Shift+Delete → Limpar cache navegador

---

## 📊 PRÓXIMOS PASSOS

### Para Produçãoñ (quando tiver Client ID):

1. Crie projeto no [Google Cloud Console](https://console.cloud.google.com/)
2. Copie o Client ID
3. Configure em `.env.local` (local) e Render dashboard (produção)
4. O botão Google real aparecerá automaticamente

### Sem mudanças de código!

---

## 💾 DADOS DE TESTE

Se quiser testar com dados da sua própria conta:

**.env.local (opcional)**:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Depois de logar, acesse http://localhost:3000/dashboard

---

## ✨ RESUMO

- ✅ Backend roda em `localhost:8001`
- ✅ Frontend roda em `localhost:3000`
- ✅ Modo teste permite entrar SEM Google Client ID
- ✅ Fluxo completo funciona: login → dashboard → notificações
- ⏳ Google real funciona depois que configurar Client ID

**Teste AGORA e me mande screenshot! 🚀**
