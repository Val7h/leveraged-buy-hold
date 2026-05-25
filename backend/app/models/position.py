from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    ticker = Column(String, nullable=False, index=True)
    company_name = Column(String)
    sector = Column(String)
    shares = Column(Float, default=0.0)
    avg_price = Column(Float, default=0.0)
    leverage = Column(Float, default=1.0)
    notional_value = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    is_seed   = Column(Boolean, default=False)  # Semente permanente — posição base nunca vendida
    is_cycle  = Column(Boolean, default=False)  # Ciclo — posição de rotação (vender quando sinal reverter)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    portfolio = relationship("Portfolio", back_populates="positions")
