"""
Endpoints do RANKING DE APORTE.

Rotas (montadas SEM o prefixo /v1, conforme contrato com o frontend):
  GET    /api/ranking            → ranking recalculado (cache ~20min)
  GET    /api/market-bar         → barra de mercado (cache ~5min)
  GET    /api/ranking/universe   → universo curado + overrides persistidos
  POST   /api/ranking/universe   → adiciona ticker, persiste, retorna universo
  DELETE /api/ranking/universe   → remove ticker, persiste, retorna universo

Tudo blindado: qualquer erro vira JSON limpo, NUNCA derruba o app.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services import ranking_service as R
from app.quantitative import profiles

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ranking"])


@router.get("/api/ranking")
def get_ranking(
    force: bool = Query(False, description="Ignora o cache e recalcula"),
    profile: Optional[str] = Query(None, description="Perfil do assinante (conservador/moderado/agressivo)"),
):
    """Ranking por-perfil SEM re-fetch: o cache continua CANÔNICO (agressivo); o perfil do assinante é
    aplicado RE-DERIVANDO a alavancagem de cada ativo dos tetos já computados (apply_profile_to_ranking).
    profile None/agressivo → idêntico ao cache (zero regressão)."""
    try:
        prof = profiles.normalize_profile(profile)   # None → moderado (default seguro do assinante)
        return R.apply_profile_to_ranking(R.compute_ranking(force=force), prof)
    except Exception as e:
        logger.exception("Erro ao computar ranking")
        return {"error": str(e), "categories": {}}


class ScreenBody(BaseModel):
    tickers: List[str] = []
    # Perfil do ASSINANTE (borda): None → moderado (default seguro). As funções internas usam
    # agressivo como default (= comportamento atual), então aqui passamos o perfil explícito.
    profile: Optional[str] = None


@router.post("/api/ranking/screen")
def screen(body: ScreenBody):
    """Roda o MOTOR REAL de 3 camadas p/ os tickers pedidos (Screening/Watchlist).
    Mesmos números da aba Ranking p/ tickers do universo; _analyze ao vivo p/ o resto.
    market_state vem do REAL (regime do S&P), NUNCA hardcoded."""
    try:
        tickers = [t.strip() for t in (body.tickers or []) if t and t.strip()][:60]
        prof = profiles.normalize_profile(body.profile)   # borda do assinante: None → moderado
        return R.screen_assets(tickers, profile=prof)
    except Exception as e:
        logger.exception("Erro ao rodar screen do ranking")
        return {"error": str(e), "assets": [], "failed_tickers": [],
                "market_state": {"state": "NEUTRO", "multiplier": 3}}


@router.get("/api/market-bar")
def get_market_bar(force: bool = Query(False, description="Ignora o cache e recalcula")):
    try:
        return R.compute_market_bar(force=force)
    except Exception as e:
        logger.exception("Erro ao computar market-bar")
        return {"error": str(e), "items": []}


@router.get("/api/ranking/universe")
def get_universe():
    try:
        return {"categories": R.get_universe()}
    except Exception as e:
        logger.exception("Erro ao ler universo")
        return {"error": str(e), "categories": {}}


class UniverseAddBody(BaseModel):
    category: str
    ticker: str
    bucket: str = "ACELERADOR"
    name: str = ""


@router.post("/api/ranking/universe")
def add_universe(body: UniverseAddBody):
    try:
        name = body.name or body.ticker
        cats = R.add_ticker(body.category, body.ticker, body.bucket, name)
        return {"categories": cats}
    except Exception as e:
        logger.exception("Erro ao adicionar ticker ao universo")
        return {"error": str(e), "categories": {}}


@router.delete("/api/ranking/universe")
def delete_universe(
    category: str = Query(..., description="Categoria, ex: BR"),
    ticker: str = Query(..., description="Ticker, ex: XPTO3.SA"),
):
    try:
        cats = R.remove_ticker(category, ticker)
        return {"categories": cats}
    except Exception as e:
        logger.exception("Erro ao remover ticker do universo")
        return {"error": str(e), "categories": {}}
