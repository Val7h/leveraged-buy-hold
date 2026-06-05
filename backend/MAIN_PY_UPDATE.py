"""
GUIA DE ATUALIZAÇÃO PARA main.py
=================================

Este arquivo mostra EXATAMENTE como atualizar backend/app/main.py
Copie e cole as seções abaixo no seu main.py

PASSOS:
1. Abrir backend/app/main.py
2. SUBSTITUIR as linhas 1-5 (imports) com a SEÇÃO 1 abaixo
3. ADICIONAR as linhas 16-24 (após app = FastAPI()) com a SEÇÃO 2 abaixo
4. MANTER todo o resto igual
5. Salvar arquivo

"""

# ============================================================================
# SEÇÃO 1: IMPORTS (substituir linhas 1-5)
# ============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables
from app.core.rate_limiter import apply_rate_limiter_to_app
from app.api.v1 import auth, assets, portfolio, backtest, simulator, alerts, watchlist, logos, moderation, moderation_admin_dashboard, billing
from app.api.v1 import user_consent


# ============================================================================
# SEÇÃO 2: APLICAÇÃO (após app = FastAPI(), antes dos middlewares)
# ============================================================================

app = FastAPI(
    title="Leveraged Buy & Hold — Sistema Quantitativo",
    description="Sistema de Buy & Hold Alavancado Adaptativo para investimentos defensivos de longo prazo via Quantfury",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ADICIONAR ESTAS LINHAS (após app = FastAPI()):
# ============================================================================
# Aplicar Rate Limiting middleware
if settings.ENABLE_RATE_LIMITING:
    apply_rate_limiter_to_app(app)
# ============================================================================


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ... rest of the file stays the same ...

@app.on_event("startup")
def startup():
    create_tables()


app.include_router(auth.router, prefix="/api/v1")
app.include_router(assets.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(backtest.router, prefix="/api/v1")
app.include_router(simulator.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(watchlist.router, prefix="/api/v1")
app.include_router(logos.router, prefix="/api/v1")
app.include_router(moderation.router, prefix="/api/v1")
app.include_router(moderation_admin_dashboard.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(user_consent.router, prefix="/api/v1")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "1.1.0",
        "features": ["consent", "stripe", "rate_limiting", "content_moderation"]
    }


# ============================================================================
# RESUMO DAS MUDANÇAS
# ============================================================================
"""
✅ Mudança 1: Adicionar import
   from app.core.rate_limiter import apply_rate_limiter_to_app

✅ Mudança 2: Chamar função após app = FastAPI()
   if settings.ENABLE_RATE_LIMITING:
       apply_rate_limiter_to_app(app)

✅ Mudança 3: Atualizar health endpoint para incluir rate_limiting

ISSO É TUDO QUE VOCÊ PRECISA FAZER EM main.py!
O resto da lógica está em:
  - app/core/rate_limiter.py (Rate Limiting)
  - app/core/content_filter.py (Content Moderation)
  - app/api/v1/billing.py (Stripe — já existe)
"""
