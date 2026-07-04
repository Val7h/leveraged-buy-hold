from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_or_demo as get_current_user
from app.models.user import User
from app.models.watchlist import WatchlistItem

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


def _serialize(i: WatchlistItem) -> dict:
    return {
        "id":               i.id,
        "ticker":           i.ticker,
        "added_at":         str(i.added_at) if i.added_at else None,
        "note":             i.note,
        "targetPrice":      i.target_price,
        "lastVerdict":      i.last_verdict,
        "lastSignalColor":  i.last_signal_color,
        "lastLeverage":     i.last_leverage,
        "signalAt":         str(i.signal_at) if i.signal_at else None,
    }


@router.get("")
def list_watchlist(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id)
        .order_by(WatchlistItem.added_at.desc())
        .all()
    )
    return [_serialize(i) for i in items]


@router.post("", status_code=201)
def add_to_watchlist(
    ticker: str,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticker = ticker.upper().strip()
    if not ticker:
        raise HTTPException(400, "Ticker inválido")
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == user.id,
        WatchlistItem.ticker == ticker,
    ).first()
    if existing:
        return {**_serialize(existing), "already_exists": True}
    item = WatchlistItem(
        user_id=user.id,
        ticker=ticker,
        note=note.strip() if note and note.strip() else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize(item)


class WatchlistUpdate(BaseModel):
    note: Optional[str] = None
    targetPrice: Optional[float] = None
    lastVerdict: Optional[str] = None
    lastSignalColor: Optional[str] = None
    lastLeverage: Optional[float] = None


@router.patch("/{item_id}", status_code=200)
def update_watchlist_item(
    item_id: int,
    payload: WatchlistUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(WatchlistItem).filter(
        WatchlistItem.id == item_id,
        WatchlistItem.user_id == user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item não encontrado")

    # Only update fields that were explicitly sent (None means "clear", omitted = untouched).
    data = payload.model_dump(exclude_unset=True)
    if "note" in data:
        item.note = data["note"].strip() if data["note"] else None
    if "targetPrice" in data:
        item.target_price = data["targetPrice"]
    if "lastVerdict" in data:
        item.last_verdict = data["lastVerdict"]
        item.signal_at = datetime.utcnow()
    if "lastSignalColor" in data:
        item.last_signal_color = data["lastSignalColor"]
    if "lastLeverage" in data:
        item.last_leverage = data["lastLeverage"]

    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.delete("/{item_id}", status_code=200)
def remove_from_watchlist(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(WatchlistItem).filter(
        WatchlistItem.id == item_id,
        WatchlistItem.user_id == user.id,
    ).first()
    if not item:
        raise HTTPException(404, "Item não encontrado")
    db.delete(item)
    db.commit()
    return {"message": "Removido"}


@router.get("/signals")
def get_watchlist_signals(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Analisa todos os ativos da watchlist em lote e retorna sinais de entrada.
    Agrupa em: opportunities (ENTRAR/ENTRAR FORTE), awaiting, avoid.
    """
    from app.services.market_data import screen_assets

    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).all()
    if not items:
        return {
            "signals": [], "opportunities": [], "awaiting": [], "avoid": [],
            "opportunity_count": 0, "checked_at": datetime.utcnow().isoformat(),
        }

    tickers = [i.ticker for i in items]
    results, _market, _failed = screen_assets(tickers, min_score=0)

    signals, opportunities, awaiting, avoid = [], [], [], []

    for r in results:
        tech = r.get("technicals") or {}
        signal = {
            "ticker":             r["ticker"],
            "company_name":       r.get("company_name"),
            "sector":             r.get("sector"),
            "current_price":      r.get("current_price"),
            "composite_score":    r.get("composite_score"),
            "entry_signal":       r.get("entry_signal"),
            "entry_signal_color": r.get("entry_signal_color"),
            "entry_leverage":     r.get("entry_leverage"),
            "entry_rationale":    r.get("entry_rationale"),
            "rsi_weekly":         tech.get("rsi_14_weekly"),
            "rsi":                tech.get("rsi_14"),
            "is_tokenized":       r.get("is_tokenized"),
            "underlying_ticker":  r.get("underlying_ticker"),
        }
        signals.append(signal)

        es = r.get("entry_signal", "")
        if es in ("ENTRAR FORTE", "ENTRAR", "ENTRAR (mercado em topo)"):
            opportunities.append(signal)
        elif es == "EVITAR":
            avoid.append(signal)
        else:
            awaiting.append(signal)

    return {
        "signals":           signals,
        "opportunities":     opportunities,
        "awaiting":          awaiting,
        "avoid":             avoid,
        "opportunity_count": len(opportunities),
        "checked_at":        datetime.utcnow().isoformat(),
    }
