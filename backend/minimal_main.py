"""
Backend mínimo para testar se o Docker + proxy Next.js funciona.
Não depende de banco de dados nem de imports complexos.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="LBH System API - Minimal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "mode": "minimal", "db": os.getenv("DATABASE_URL", "not set")[:30]}

@app.get("/api/v1/portfolio")
def portfolio():
    return []

@app.get("/api/v1/assets/market-state")
def market_state():
    return {
        "state": "NORMAL",
        "multiplier": 1.5,
        "description": "Mercado estável",
        "signals": {
            "rsi_semanal_spy": 52.0,
            "distancia_ma200_pct": 5.2,
            "distancia_topo_52s_pct": -8.5
        }
    }

@app.get("/api/v1/assets/screen")
def screen():
    return {"assets": [], "market_state": {"state": "NORMAL", "multiplier": 1.5}}

@app.get("/api/v1/watchlist")
def watchlist():
    return []

@app.get("/api/v1/alerts")
def alerts():
    return []
