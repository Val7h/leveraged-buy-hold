from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base


class WatchlistItem(Base):
    __tablename__ = "watchlist"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker            = Column(String, nullable=False)
    added_at          = Column(DateTime(timezone=True), server_default=func.now())

    # Sentinela — nota/tese do usuário + alvo de entrada
    note              = Column(Text, nullable=True)
    target_price      = Column(Float, nullable=True)

    # Cache do último sinal do motor (atualizado no PATCH /watchlist/:id/signal)
    last_verdict      = Column(String, nullable=True)   # e.g. "COMPRAR FORTE"
    last_signal_color = Column(String, nullable=True)   # green | yellow | red | gray
    last_leverage     = Column(Float, nullable=True)
    signal_at         = Column(DateTime(timezone=True), nullable=True)
