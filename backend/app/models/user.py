from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class RiskProfile(str, enum.Enum):
    conservative = "conservative"
    balanced = "balanced"
    aggressive = "aggressive"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    risk_profile = Column(Enum(RiskProfile, native_enum=False), default=RiskProfile.balanced)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Consent fields (legal compliance)
    risk_acknowledged = Column(Boolean, default=False, nullable=False, server_default="false")
    terms_accepted = Column(Boolean, default=False, nullable=False, server_default="false")
    consent_logged_at = Column(DateTime(timezone=True), nullable=True)

    portfolios = relationship("Portfolio", back_populates="owner")
    alerts = relationship("Alert", back_populates="user")
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    push_subscriptions = relationship("PushSubscription", back_populates="user", cascade="all, delete-orphan")

    # User settings relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    security_settings = relationship("SecuritySettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    preferences_settings = relationship("PreferencesSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
