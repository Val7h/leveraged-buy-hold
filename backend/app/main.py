from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import create_tables, engine
from app.api.v1 import auth, assets, portfolio, backtest, simulator, alerts, watchlist, logos, moderation, moderation_admin_dashboard, billing
from app.api.v1 import user_consent
from app.api.v1 import notifications
from app.api.v1 import news
from app.api.v1 import settings
from app.api.v1 import analytics

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
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def run_migrations():  # noqa: C901
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
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)
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
            conn.commit()
    except Exception:
        # Tables may already exist — safe to ignore
        pass


@app.on_event("startup")
def startup():
    import time
    # Retry DB connection up to 5x (DB may not be ready on first deploy)
    for attempt in range(1, 6):
        try:
            create_tables()
            run_migrations()
            print(f"[DB] Connected and tables ready (attempt {attempt})")
            break
        except Exception as e:
            print(f"[DB] Attempt {attempt}/5 failed: {e}")
            if attempt < 5:
                time.sleep(5)
            else:
                print("[DB] Could not connect to database after 5 attempts - running without DB")


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
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(news.router, prefix="/api/v1")
app.include_router(settings.router)
app.include_router(analytics.router, prefix="/api/v1")

@app.api_route("/api/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok", "version": "1.2.0", "features": ["consent", "stripe", "db-persistence"]}
