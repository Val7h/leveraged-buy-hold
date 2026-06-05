# Guia de Integração: Rate Limiting + Content Moderation + Stripe

## PASSO 1: Atualizar requirements.txt

Adicionar ao final de `backend/requirements.txt`:

```
slowapi==0.1.9
stripe==11.0.0
```

Depois executar:
```bash
pip install -r requirements.txt
```

---

## PASSO 2: Atualizar config.py

Abrir `backend/app/core/config.py` e adicionar ao final da classe `Settings`:

```python
STRIPE_SECRET_KEY: str = ""
STRIPE_PUBLIC_KEY: str = ""
STRIPE_WEBHOOK_SECRET: str = ""
STRIPE_PREMIUM_PRICE_ID: str = "price_pro_monthly_usd_test"

# Rate limiting config
ENABLE_RATE_LIMITING: bool = True
RATE_LIMIT_AUTH: str = "5/minute"
RATE_LIMIT_MESSAGES: str = "100/minute"
RATE_LIMIT_SEARCH: str = "50/minute"
RATE_LIMIT_GENERAL: str = "200/minute"
```

Exemplo completo em `config.py` abaixo.

---

## PASSO 3: Criar middleware de Rate Limiting

Copiar o arquivo `rate_limiter.py` para `backend/app/core/rate_limiter.py`

---

## PASSO 4: Atualizar main.py

Copiar as linhas para `backend/app/main.py` (veja seção CÓDIGO MAIN.PY abaixo)

---

## PASSO 5: Atualizar .env

```env
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghij
STRIPE_PUBLIC_KEY=pk_test_51234567890abcdefghij
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghij
STRIPE_PREMIUM_PRICE_ID=price_1234567890abcdefghij
```

Obter chaves em: https://dashboard.stripe.com/apikeys

---

## PASSO 6: Criar rotas de Rate Limiting

Copiar arquivo `rate_limiting_demo.py` para testar endpoints

---

## RESUMO DE INTEGRAÇÃO

| Componente | Local | Status |
|-----------|-------|--------|
| Modelos (ContentReport, Subscription) | models/ | JA EXISTEM |
| Rate Limiting | app/core/rate_limiter.py | NOVO |
| Stripe API | api/v1/billing.py | JA EXISTE |
| Content Moderation | api/v1/moderation.py | JA EXISTE |
| main.py updates | app/main.py | UPDATE |
| config updates | app/core/config.py | UPDATE |

---

## ENDPOINTS DISPONÍVEIS

### Rate Limiting
- Automático em todas as rotas via middleware
- Customizável por rota com decorator `@limiter.limit()`

### Content Moderation
- `POST /api/v1/moderation/report` — Reportar conteúdo
- `GET /api/v1/moderation/reports` — Admin: listar reports
- `POST /api/v1/moderation/reports/{id}/review` — Admin: revisar report

### Stripe
- `POST /api/v1/billing/create-subscription` — Criar trial
- `GET /api/v1/billing/subscription` — Status de subscription
- `POST /api/v1/billing/cancel-subscription` — Cancelar
- `POST /api/v1/billing/webhook` — Stripe webhook

---

## TESTE RÁPIDO

```bash
# 1. Instalar slowapi
pip install slowapi stripe

# 2. Atualizar main.py

# 3. Testar rate limit
python rate_limiting_demo.py
```

Esperado: Após 5 requests em 1 minuto, retorna 429 (Too Many Requests)

---

## TROUBLESHOOTING

### "RateLimitExceeded not found"
→ Adicionar import em main.py: `from slowapi.errors import RateLimitExceeded`

### Stripe webhook não funciona
→ Verificar STRIPE_WEBHOOK_SECRET em .env
→ Webhook deve ser criado em Dashboard Stripe: Settings > Webhooks

### Rate limit muito restritivo
→ Ajustar em config.py: `RATE_LIMIT_GENERAL: str = "500/minute"`
