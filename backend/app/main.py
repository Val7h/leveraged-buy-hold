# Sprint 1 (hybrid plan): FastAPI é stateless. Não carregar SQLAlchemy.
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

_sprint1_logger = logging.getLogger(__name__)

_CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS")
if _CORS_ORIGINS_ENV:
    SPRINT1_CORS_ORIGINS = [o.strip() for o in _CORS_ORIGINS_ENV.split(",") if o.strip()]
else:
    SPRINT1_CORS_ORIGINS = ["https://lbh-system.onrender.com"]

BACKEND_INTERNAL_TOKEN = os.getenv("BACKEND_INTERNAL_TOKEN")
INTERNAL_TOKEN_EXEMPT_PATHS = {"/api/health", "/docs", "/api/docs", "/api/redoc", "/api/openapi.json"}


class InternalTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS" or path in INTERNAL_TOKEN_EXEMPT_PATHS:
            return await call_next(request)
        if not BACKEND_INTERNAL_TOKEN:
            _sprint1_logger.warning(
                "BACKEND_INTERNAL_TOKEN not set — allowing request through (dev mode)"
            )
            return await call_next(request)
        provided = request.headers.get("X-Internal-Token")
        if provided != BACKEND_INTERNAL_TOKEN:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing X-Internal-Token"},
            )
        return await call_next(request)


sprint1_limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# TODO(sprint-2): FastAPI vira stateless — remover SQLAlchemy/text/engine/create_tables
# from sqlalchemy import text
from app.core.config import settings
# TODO(sprint-2): FastAPI vira stateless. Não importar database aqui.
# from app.core.database import create_tables, engine
from app.core.security_middleware import register_security_middleware
from app.observability import init_sentry, StructuredLoggingMiddleware

init_sentry()
# Stateless-safe routers (mantidos ativos): assets, backtest, simulator, analytics
from app.api.v1 import assets, backtest, simulator, analytics
# TODO(sprint-2): FastAPI vira stateless. Routers DB-dependentes desativados.
# from app.api.v1 import auth, portfolio, alerts, watchlist, logos, moderation, moderation_admin_dashboard, billing
# from app.api.v1 import user_consent
# from app.api.v1 import notifications
# from app.api.v1 import news
# from app.api.v1 import settings as settings_router
# from app.api.v1 import preferences

app = FastAPI(
    title="Leveraged Buy & Hold — Sistema Quantitativo",
    description="Sistema de Buy & Hold Alavancado Adaptativo para investimentos defensivos de longo prazo via Quantfury",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url=None if settings.is_production() else "/api/docs",  # Hide docs in production
    redoc_url=None if settings.is_production() else "/api/redoc",
)

# Register security middleware (must be added in reverse order)
register_security_middleware(app)

# Structured request logging (outermost so duration includes all middleware)
app.add_middleware(StructuredLoggingMiddleware)

# --- Sprint 1: rate limit (slowapi, in-memory, 60/min/IP) ---
app.state.limiter = sprint1_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# --- Sprint 1: X-Internal-Token gate ---
app.add_middleware(InternalTokenMiddleware)

# --- Sprint 1: CORS restrito (env CORS_ORIGINS, CSV) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=SPRINT1_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-Id", "X-Internal-Token"],
)


# TODO(sprint-2): FastAPI vira stateless. Migrations movem para serviço dedicado (Alembic job).
def _run_migrations_DISABLED():  # noqa: C901
    """Add new columns to existing tables (idempotent via IF NOT EXISTS)"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS risk_acknowledged BOOLEAN NOT NULL DEFAULT FALSE
            """))
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE
            """))
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS consent_logged_at TIMESTAMPTZ NULL
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type VARCHAR(50) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    body TEXT NOT NULL,
                    url VARCHAR(500),
                    read BOOLEAN NOT NULL DEFAULT FALSE,
                    status VARCHAR(50) NOT NULL DEFAULT 'sent',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    delivered_at TIMESTAMPTZ
                )
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications(user_id, created_at)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_notifications_user_status ON notifications(user_id, status)
            """))
            # Add new columns to existing notifications table if they don't exist
            conn.execute(text("""
                ALTER TABLE notifications
                ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'sent'
            """))
            conn.execute(text("""
                ALTER TABLE notifications
                ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    endpoint TEXT NOT NULL UNIQUE,
                    p256dh TEXT NOT NULL,
                    auth TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_push_subscriptions_user_id ON push_subscriptions(user_id)
            """))
            # Add email_frequency column to preferences_settings if it doesn't exist
            conn.execute(text("""
                ALTER TABLE preferences_settings
                ADD COLUMN IF NOT EXISTS email_frequency VARCHAR(50) DEFAULT 'daily'
            """))
            conn.commit()
    except Exception:
        # Tables may already exist — safe to ignore
        pass


# TODO(sprint-2): FastAPI vira stateless. Sem startup DB-touching.
# @app.on_event("startup")
# def startup():
#     import time
#     # Retry DB connection up to 5x (DB may not be ready on first deploy)
#     for attempt in range(1, 6):
#         try:
#             create_tables()
#             run_migrations()
#             print(f"[DB] Connected and tables ready (attempt {attempt})")
#             break
#         except Exception as e:
#             print(f"[DB] Attempt {attempt}/5 failed: {e}")
#             if attempt < 5:
#                 time.sleep(5)
#             else:
#                 print("[DB] Could not connect to database after 5 attempts - running without DB")


# Stateless-safe routers (ativos)
app.include_router(assets.router, prefix="/api/v1")
app.include_router(backtest.router, prefix="/api/v1")
app.include_router(simulator.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
# TODO(sprint-2): FastAPI vira stateless. Routers DB-dependentes desativados.
# app.include_router(auth.router, prefix="/api/v1")
# app.include_router(portfolio.router, prefix="/api/v1")
# app.include_router(alerts.router, prefix="/api/v1")
# app.include_router(watchlist.router, prefix="/api/v1")
# app.include_router(logos.router, prefix="/api/v1")
# app.include_router(moderation.router, prefix="/api/v1")
# app.include_router(moderation_admin_dashboard.router, prefix="/api/v1")
# app.include_router(billing.router, prefix="/api/v1")
# app.include_router(user_consent.router, prefix="/api/v1")
# app.include_router(notifications.router, prefix="/api/v1")
# app.include_router(news.router, prefix="/api/v1")
# app.include_router(settings_router.router)
# app.include_router(preferences.router, prefix="/api")

@app.api_route("/api/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "service": "lbh-backend"}
