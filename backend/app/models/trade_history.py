from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base


class TradeHistory(Base):
    __tablename__ = "trade_history"

    id           = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    ticker       = Column(String, nullable=False, index=True)
    action       = Column(String, nullable=False)   # COMPRA | VENDA | AJUSTE | SEMENTE | CICLO
    shares       = Column(Float, default=0.0)
    price        = Column(Float, default=0.0)
    leverage     = Column(Float, default=1.0)
    total_value  = Column(Float, default=0.0)       # shares * price
    notes        = Column(Text, nullable=True)
    executed_at  = Column(DateTime(timezone=True), server_default=func.now())
