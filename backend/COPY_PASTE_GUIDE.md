# GUIA COPY-PASTE: Integração Rápida (5 Minutos)

**Siga este guia para integrar tudo em menos de 5 minutos**

---

## PASSO 0: Preparação

Terminal:
```bash
cd C:\Users\Admin\leveraged-buy-hold\backend
```

---

## PASSO 1: Instalar Dependências (30 segundos)

Terminal:
```bash
pip install slowapi==0.1.9 stripe==11.0.0
```

**Esperado**: ✅ "Successfully installed slowapi stripe"

---

## PASSO 2: Criar `app/core/rate_limiter.py` (1 minuto)

Você já recebeu este arquivo, ele já está em:
```
C:\Users\Admin\leveraged-buy-hold\backend\app\core\rate_limiter.py
```

Verificar se existe:
```bash
ls app/core/rate_limiter.py
```

Se não existir, copie o conteúdo de `app/core/rate_limiter.py` manualmente.

---

## PASSO 3: Criar `app/core/content_filter.py` (1 minuto)

Você já recebeu este arquivo, ele já está em:
```
C:\Users\Admin\leveraged-buy-hold\backend\app\core\content_filter.py
```

Verificar se existe:
```bash
ls app/core/content_filter.py
```

Se não existir, copie o conteúdo de `app/core/content_filter.py` manualmente.

---

## PASSO 4: Atualizar `app/core/config.py` (1 minuto)

Abrir arquivo: `C:\Users\Admin\leveraged-buy-hold\backend\app\core\config.py`

**ENCONTRAR ISTO**:
```python
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/leveraged_bh"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    ALPHA_VANTAGE_API_KEY: str = ""
    FRED_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000"]'

    class Config:
```

**SUBSTITUIR A PARTE ANTES DE `class Config:` POR**:

```python
class Settings(BaseSettings):
    # ========== DATABASE ==========
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/leveraged_bh"

    # ========== AUTH ==========
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ========== EXTERNAL APIs ==========
    ALPHA_VANTAGE_API_KEY: str = ""
    FRED_API_KEY: str = ""

    # ========== ENVIRONMENT ==========
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000"]'

    # ========== RATE LIMITING (NEW) ==========
    ENABLE_RATE_LIMITING: bool = True
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_MESSAGES: str = "100/minute"
    RATE_LIMIT_SEARCH: str = "50/minute"
    RATE_LIMIT_GENERAL: str = "200/minute"

    # ========== STRIPE INTEGRATION (NEW) ==========
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLIC_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PREMIUM_PRICE_ID: str = "price_pro_monthly_usd_test"

    # ========== CONTENT MODERATION (NEW) ==========
    ENABLE_CONTENT_MODERATION: bool = True
    MIN_MODERATION_CONFIDENCE: float = 0.8

    class Config:
```

**Salvar arquivo**

---

## PASSO 5: Atualizar `app/main.py` (1 minuto)

Abrir arquivo: `C:\Users\Admin\leveraged-buy-hold\backend\app\main.py`

### 5A: Atualizar Imports

**ENCONTRAR ISTO** (linhas 1-6):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables
from app.api.v1 import auth, assets, portfolio, backtest, simulator, alerts, watchlist, logos, moderation, moderation_admin_dashboard, billing
from app.api.v1 import user_consent
```

**ADICIONAR ESTA LINHA APÓS `from app.core.database import create_tables`**:
```python
from app.core.rate_limiter import apply_rate_limiter_to_app
```

Resultado final:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables
from app.core.rate_limiter import apply_rate_limiter_to_app
from app.api.v1 import auth, assets, portfolio, backtest, simulator, alerts, watchlist, logos, moderation, moderation_admin_dashboard, billing
from app.api.v1 import user_consent
```

### 5B: Adicionar Rate Limiter Setup

**ENCONTRAR ISTO** (após `app = FastAPI(...)`):
```python
app = FastAPI(
    title="Leveraged Buy & Hold — Sistema Quantitativo",
    description="Sistema de Buy & Hold Alavancado Adaptativo para investimentos defensivos de longo prazo via Quantfury",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
```

**ADICIONAR ISTO ENTRE `app = FastAPI(...)` E `app.add_middleware(...)`**:

```python

# Apply Rate Limiting middleware
if settings.ENABLE_RATE_LIMITING:
    apply_rate_limiter_to_app(app)

```

Resultado final:
```python
app = FastAPI(
    title="Leveraged Buy & Hold — Sistema Quantitativo",
    description="Sistema de Buy & Hold Alavancado Adaptativo para investimentos defensivos de longo prazo via Quantfury",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Apply Rate Limiting middleware
if settings.ENABLE_RATE_LIMITING:
    apply_rate_limiter_to_app(app)

app.add_middleware(
    CORSMiddleware,
```

### 5C: Atualizar Health Endpoint

**ENCONTRAR ISTO** (linhas finais):
```python
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.1.0", "features": ["consent", "stripe"]}
```

**SUBSTITUIR POR**:
```python
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "1.1.0",
        "features": ["consent", "stripe", "rate_limiting", "content_moderation"]
    }
```

**Salvar arquivo**

---

## PASSO 6: Atualizar `requirements.txt` (30 segundos)

Abrir arquivo: `C:\Users\Admin\leveraged-buy-hold\backend\requirements.txt`

**ADICIONAR AO FINAL**:
```
slowapi==0.1.9
stripe==11.0.0
```

**Salvar arquivo**

---

## PASSO 7: Atualizar `.env` (1 minuto)

Abrir arquivo: `C:\Users\Admin\leveraged-buy-hold\backend\.env`

**ADICIONAR AO FINAL**:
```env

# ========== RATE LIMITING ==========
ENABLE_RATE_LIMITING=true
RATE_LIMIT_AUTH=5/minute
RATE_LIMIT_MESSAGES=100/minute
RATE_LIMIT_SEARCH=50/minute
RATE_LIMIT_GENERAL=200/minute

# ========== STRIPE INTEGRATION ==========
# Get keys from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghij
STRIPE_PUBLIC_KEY=pk_test_51234567890abcdefghij
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghij
STRIPE_PREMIUM_PRICE_ID=price_1234567890abcdefghij

# ========== CONTENT MODERATION ==========
ENABLE_CONTENT_MODERATION=true
MIN_MODERATION_CONFIDENCE=0.8
```

**Salvar arquivo**

---

## PASSO 8: Instalar Todas as Dependências (30 segundos)

Terminal:
```bash
pip install -r requirements.txt
```

**Esperado**: ✅ "Successfully installed..." (pode haver warnings, é normal)

---

## PASSO 9: Testar (1 minuto)

Terminal 1:
```bash
uvicorn app.main:app --reload
```

**Esperado**: ✅ "Application startup complete"

Terminal 2:
```bash
python rate_limiting_test.py
```

**Esperado**: ✅ Após 5 requests rápidos, recebe `❌ RATE LIMITED (429)`

---

## RESULTADO FINAL

Você terá:

✅ Rate limiting global automático  
✅ Content moderation disponível  
✅ Stripe integration ativa  
✅ Health endpoint atualizado  
✅ Todos os endpoints protegidos  

---

## PRÓXIMOS PASSOS (OPCIONAL)

### Adicionar Rate Limit a Rota Específica

Editar qualquer arquivo em `app/api/v1/`:

```python
from app.core.rate_limiter import RateLimitDecorators

@router.post("/login")
@RateLimitDecorators.auth  # ← Adicionar isto
async def login(username: str, password: str):
    return {"token": "xyz"}
```

### Adicionar Content Moderation a Rota

```python
from app.core.content_filter import moderate_content

@router.post("/messages")
async def send_message(content: str):
    result = moderate_content(content)
    if result['should_block']:
        raise HTTPException(400, detail="Conteúdo bloqueado")
    return {"status": "sent"}
```

### Customizar Palavras Banidas

Editar `app/core/content_filter.py`:

```python
BANNED_WORDS = [
    "insulto1",
    "minha_palavra_nova",  # ← Adicionar aqui
    "spam123",
]
```

---

## TROUBLESHOOTING RÁPIDO

| Problema | Solução |
|----------|---------|
| "No module named 'slowapi'" | `pip install slowapi==0.1.9` |
| "Rate limit not working" | Verificar `ENABLE_RATE_LIMITING=true` em .env |
| "Config not loading" | Verificar que config.py tem os novos campos |
| "Health endpoint 404" | Certificar que main.py foi editado corretamente |
| "Stripe error" | Verificar `STRIPE_SECRET_KEY` em .env |

---

## RESUMO FINAL

```
⏱️ Tempo: ~5 minutos
📦 Arquivos: 2 novos + 4 atualizados
✅ Dependências: 2 packages
🧪 Teste: python rate_limiting_test.py
🚀 Status: PRONTO PARA PRODUÇÃO
```

---

**PRONTO? Comece pelo PASSO 1!**
