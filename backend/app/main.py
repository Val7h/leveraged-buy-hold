from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables
from app.api.v1 import auth, assets, portfolio, backtest, simulator, alerts, watchlist, logos, moderation, moderation_admin_dashboard, billing

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


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
