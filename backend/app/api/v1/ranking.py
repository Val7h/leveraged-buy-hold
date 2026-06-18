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
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services import ranking_service as R

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ranking"])


@router.get("/api/ranking")
def get_ranking(force: bool = Query(False, description="Ignora o cache e recalcula")):
    try:
        return R.compute_ranking(force=force)
    except Exception as e:
        logger.exception("Erro ao computar ranking")
        return {"error": str(e), "categories": {}}


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
