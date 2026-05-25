from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.position import Position
from app.models.trade_history import TradeHistory
from app.schemas.portfolio import (
    PortfolioCreate, PortfolioResponse, PositionCreate,
    PortfolioMetrics, ContributionSuggestion
)
from app.services.portfolio_service import calculate_portfolio_metrics, suggest_contributions

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def _log_trade(
    db: Session,
    portfolio_id: int,
    ticker: str,
    action: str,
    shares: float = 0.0,
    price: float = 0.0,
    leverage: float = 1.0,
    notes: str = None,
):
    """Registra uma operação no histórico."""
    db.add(TradeHistory(
        portfolio_id=portfolio_id,
        ticker=ticker,
        action=action,
        shares=shares,
        price=price,
        leverage=leverage,
        total_value=shares * price,
        notes=notes,
    ))


# ── Portfolios ────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_portfolio(data: PortfolioCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    portfolio = Portfolio(
        user_id=user.id,
        name=data.name,
        initial_equity=data.initial_equity,
        monthly_contribution=data.monthly_contribution,
        currency=data.currency,
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return {"id": portfolio.id, "name": portfolio.name}


@router.get("", response_model=List[dict])
def list_portfolios(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [{"id": p.id, "name": p.name, "currency": p.currency} for p in user.portfolios]


@router.get("/{portfolio_id}/metrics", response_model=PortfolioMetrics)
def get_metrics(portfolio_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    metrics = calculate_portfolio_metrics(portfolio, db)
    return metrics


@router.get("/{portfolio_id}/positions")
def get_positions(portfolio_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    metrics = calculate_portfolio_metrics(portfolio, db)
    return metrics.get("position_data", [])


# ── Positions ─────────────────────────────────────────────────────────────────

@router.post("/{portfolio_id}/positions", status_code=201)
def add_position(
    portfolio_id: int,
    data: PositionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")

    existing = db.query(Position).filter(
        Position.portfolio_id == portfolio_id,
        Position.ticker == data.ticker.upper(),
        Position.is_active == True,
    ).first()

    if existing:
        total_shares = existing.shares + data.shares
        existing.avg_price = (existing.shares * existing.avg_price + data.shares * data.avg_price) / total_shares
        existing.shares = total_shares
        existing.leverage = data.leverage
        _log_trade(db, portfolio_id, data.ticker.upper(), "COMPRA",
                   data.shares, data.avg_price, data.leverage, "Adição à posição existente")
        db.commit()
        return {"message": "Posição atualizada", "id": existing.id}

    position = Position(
        portfolio_id=portfolio_id,
        ticker=data.ticker.upper(),
        shares=data.shares,
        avg_price=data.avg_price,
        leverage=data.leverage,
        notional_value=data.shares * data.avg_price * data.leverage,
    )
    db.add(position)
    _log_trade(db, portfolio_id, data.ticker.upper(), "COMPRA",
               data.shares, data.avg_price, data.leverage)
    db.commit()
    db.refresh(position)
    return {"message": "Posição adicionada", "id": position.id}


@router.patch("/{portfolio_id}/positions/{position_id}/seed")
def toggle_seed(
    portfolio_id: int,
    position_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Alterna o flag 'semente permanente'. Semente e Ciclo são mutuamente exclusivos."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    pos = db.query(Position).filter(Position.id == position_id, Position.portfolio_id == portfolio_id, Position.is_active == True).first()
    if not pos:
        raise HTTPException(404, "Posição não encontrada")
    pos.is_seed = not pos.is_seed
    if pos.is_seed:
        pos.is_cycle = False
        _log_trade(db, portfolio_id, pos.ticker, "SEMENTE", pos.shares, pos.avg_price, pos.leverage,
                   "Marcado como Semente permanente 🔒")
    else:
        _log_trade(db, portfolio_id, pos.ticker, "AJUSTE", pos.shares, pos.avg_price, pos.leverage,
                   "Removido flag Semente")
    db.commit()
    return {"id": pos.id, "is_seed": pos.is_seed, "is_cycle": pos.is_cycle}


@router.patch("/{portfolio_id}/positions/{position_id}/cycle")
def toggle_cycle(
    portfolio_id: int,
    position_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Alterna o flag 'ciclo' (rotação). Semente e Ciclo são mutuamente exclusivos."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    pos = db.query(Position).filter(Position.id == position_id, Position.portfolio_id == portfolio_id, Position.is_active == True).first()
    if not pos:
        raise HTTPException(404, "Posição não encontrada")
    pos.is_cycle = not pos.is_cycle
    if pos.is_cycle:
        pos.is_seed = False
        _log_trade(db, portfolio_id, pos.ticker, "CICLO", pos.shares, pos.avg_price, pos.leverage,
                   "Marcado como Ciclo 🔄 (vender quando sinal reverter)")
    else:
        _log_trade(db, portfolio_id, pos.ticker, "AJUSTE", pos.shares, pos.avg_price, pos.leverage,
                   "Removido flag Ciclo")
    db.commit()
    return {"id": pos.id, "is_seed": pos.is_seed, "is_cycle": pos.is_cycle}


@router.put("/{portfolio_id}/positions/{position_id}")
def update_position(
    portfolio_id: int,
    position_id: int,
    data: PositionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    pos = db.query(Position).filter(Position.id == position_id, Position.portfolio_id == portfolio_id, Position.is_active == True).first()
    if not pos:
        raise HTTPException(404, "Posição não encontrada")

    shares_diff = data.shares - pos.shares
    if shares_diff > 0:
        action = "COMPRA"
        notes = f"Aumento de {shares_diff:.4f} cotas"
    elif shares_diff < 0:
        action = "VENDA"
        notes = f"Redução de {abs(shares_diff):.4f} cotas"
    else:
        action = "AJUSTE"
        notes = "Ajuste de preço médio / alavancagem"

    pos.shares = data.shares
    pos.avg_price = data.avg_price
    pos.leverage = data.leverage
    pos.notional_value = data.shares * data.avg_price * data.leverage
    _log_trade(db, portfolio_id, pos.ticker, action, data.shares, data.avg_price, data.leverage, notes)
    db.commit()
    return {"message": "Posição atualizada", "id": pos.id}


@router.delete("/{portfolio_id}/positions/{position_id}")
def remove_position(
    portfolio_id: int,
    position_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    pos = db.query(Position).filter(Position.id == position_id, Position.portfolio_id == portfolio_id).first()
    if not pos:
        raise HTTPException(404, "Posição não encontrada")
    _log_trade(db, portfolio_id, pos.ticker, "VENDA", pos.shares, pos.avg_price, pos.leverage,
               "Posição encerrada / removida da carteira")
    pos.is_active = False
    db.commit()
    return {"message": "Posição removida"}


# ── Trade History ──────────────────────────────────────────────────────────────

@router.get("/{portfolio_id}/history")
def get_history(
    portfolio_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    history = (
        db.query(TradeHistory)
        .filter(TradeHistory.portfolio_id == portfolio_id)
        .order_by(TradeHistory.executed_at.desc())
        .limit(500)
        .all()
    )
    return [
        {
            "id":          h.id,
            "ticker":      h.ticker,
            "action":      h.action,
            "shares":      h.shares,
            "price":       h.price,
            "leverage":    h.leverage,
            "total_value": h.total_value,
            "notes":       h.notes,
            "executed_at": h.executed_at.isoformat() if h.executed_at else None,
        }
        for h in history
    ]


# ── Suggestions ───────────────────────────────────────────────────────────────

@router.get("/{portfolio_id}/suggestions", response_model=List[ContributionSuggestion])
def get_suggestions(
    portfolio_id: int,
    available_capital: float = 1000.0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first()
    if not portfolio:
        raise HTTPException(404, "Carteira não encontrada")
    return suggest_contributions(portfolio_id, available_capital, user.risk_profile.value, db)
