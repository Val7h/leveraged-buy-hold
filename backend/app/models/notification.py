from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class NotificationType(str, enum.Enum):
    price_alert = "price_alert"
    signal = "signal"
    portfolio = "portfolio"
    news = "news"
    system = "system"
    weekly_recap = "weekly_recap"


class NotificationStatus(str, enum.Enum):
    queued = "queued"       # Waiting for batch send
    sent = "sent"           # Successfully delivered
    delivered = "delivered" # Read/interacted
    failed = "failed"       # Delivery failed
    dismissed = "dismissed" # User dismissed


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(NotificationType, native_enum=False), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    url = Column(String(500), nullable=True)     # deep link within app
    read = Column(Boolean, default=False, nullable=False, server_default="false")
    status = Column(Enum(NotificationStatus, native_enum=False), default=NotificationStatus.sent, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("idx_user_created", "user_id", "created_at"),
        Index("idx_user_status", "user_id", "status"),
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="push_subscriptions")
