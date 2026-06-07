from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.security import get_current_user_or_demo as get_current_user
from app.models.user import User
from app.models.alert import Alert, AlertType
from app.schemas.analysis import AlertCreate, AlertResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertResponse])
def list_alerts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Alert).filter(Alert.user_id == user.id, Alert.is_active == True).all()


@router.post("", response_model=AlertResponse, status_code=201)
def create_alert(data: AlertCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        alert_type = AlertType(data.alert_type)
    except ValueError:
        raise HTTPException(400, f"Tipo de alerta inválido: {data.alert_type}")

    alert = Alert(
        user_id=user.id,
        ticker=data.ticker.upper(),
        alert_type=alert_type,
        threshold=data.threshold,
        message=data.message or f"Alerta {data.alert_type} ativado para {data.ticker}",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user.id).first()
    if not alert:
        raise HTTPException(404, "Alerta não encontrado")
    alert.is_active = False
    db.commit()
    return {"message": "Alerta removido"}


@router.post("/check")
def check_alerts(
    tickers: List[str],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.services.market_data import analyze_asset

    triggered = []
    active_alerts = db.query(Alert).filter(
        Alert.user_id == user.id,
        Alert.is_active == True,
        Alert.is_triggered == False,
        Alert.ticker.in_([t.upper() for t in tickers]),
    ).all()

    for alert in active_alerts:
        try:
            analysis = analyze_asset(alert.ticker)
            if not analysis:
                continue

            tech = analysis.get("technicals", {})
            current_val = None

            if alert.alert_type == AlertType.rsi_oversold:
                current_val = tech.get("rsi_14")
                triggered_condition = current_val is not None and current_val <= alert.threshold
            elif alert.alert_type == AlertType.rsi_weekly_oversold:
                current_val = tech.get("rsi_14_weekly") or tech.get("rsi_14")
                triggered_condition = current_val is not None and current_val <= alert.threshold
            elif alert.alert_type == AlertType.stochastic_oversold:
                current_val = tech.get("stoch_k")
                triggered_condition = current_val is not None and current_val <= alert.threshold
            elif alert.alert_type == AlertType.opportunity_score:
                current_val = analysis.get("opportunity_score")
                triggered_condition = current_val is not None and current_val >= alert.threshold
            elif alert.alert_type == AlertType.entry_signal:
                entry = analysis.get("entry_signal", "")
                current_val = tech.get("rsi_14_weekly") or tech.get("rsi_14")
                triggered_condition = entry in (
                    "ENTRAR FORTE", "ENTRAR", "ENTRAR (mercado em topo)",
                    "OPORTUNIDADE FORTE", "OPORTUNIDADE", "OPORTUNIDADE (mercado em topo)",
                )
            else:
                triggered_condition = False

            alert.current_value = current_val
            if triggered_condition:
                alert.is_triggered = True
                alert.triggered_at = datetime.utcnow()
                triggered.append({
                    "ticker": alert.ticker,
                    "type": alert.alert_type.value,
                    "message": alert.message,
                    "value": current_val,
                    "threshold": alert.threshold,
                })

            db.commit()
        except Exception as e:
            logger.error(f"[ALERTS] Error checking {alert.ticker}: {e}")
            continue

    return {"triggered": triggered, "checked": len(active_alerts)}


@router.delete("/triggered")
def dismiss_triggered_alerts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Remove todos os alertas já disparados do usuário."""
    count = db.query(Alert).filter(
        Alert.user_id == user.id,
        Alert.is_triggered == True,
    ).update({"is_active": False})
    db.commit()
    return {"dismissed": count}
