from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class AlertType(str, enum.Enum):
    rsi_oversold = "rsi_oversold"
    rsi_weekly_oversold = "rsi_weekly_oversold"   # RSI semanal ≤ threshold (critério de entrada)
    stochastic_oversold = "stochastic_oversold"
    drawdown = "drawdown"
    opportunity_score = "opportunity_score"
    leverage_increase = "leverage_increase"
    price_target = "price_target"
    entry_signal = "entry_signal"                 # sinal de entrada ENTRAR/ENTRAR FORTE


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False, index=True)
    alert_type = Column(Enum(AlertType, native_enum=False), nullable=False)
    threshold = Column(Float, nullable=False)
    current_value = Column(Float)
    message = Column(String)
    is_active = Column(Boolean, default=True)
    is_triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")
