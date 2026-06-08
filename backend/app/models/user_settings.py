"""
User Settings Models
- UserProfile: Extended user profile information
- SecuritySettings: 2FA and security preferences
- PreferencesSettings: User preferences (notifications, language, theme)
- APIKey: API authentication keys for integrations
- ActivityLog: Immutable audit log of user actions
- UserSession: Device/browser session tracking
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, Index, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import secrets
from app.core.database import Base


class TwoFAMethod(str, enum.Enum):
    """2FA methods supported"""
    totp = "totp"  # Time-based One-Time Password
    sms = "sms"    # SMS verification
    email = "email"  # Email verification


class ActivityType(str, enum.Enum):
    """Types of user activities to log"""
    login = "login"
    logout = "logout"
    password_change = "password_change"
    two_fa_enabled = "two_fa_enabled"
    two_fa_disabled = "two_fa_disabled"
    api_key_created = "api_key_created"
    api_key_revoked = "api_key_revoked"
    api_key_rotated = "api_key_rotated"
    profile_updated = "profile_updated"
    email_changed = "email_changed"
    session_created = "session_created"
    session_terminated = "session_terminated"
    account_deletion_requested = "account_deletion_requested"
    account_deletion_cancelled = "account_deletion_cancelled"
    account_deleted = "account_deleted"


class UserProfile(Base):
    """Extended user profile information"""
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Profile information
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    country = Column(String, nullable=True)
    timezone = Column(String, default="UTC")

    # Preferences
    language = Column(String, default="pt_BR")
    theme = Column(String, default="light")  # light, dark, auto

    # Privacy
    is_profile_public = Column(Boolean, default=False)
    show_portfolio_summary = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="profile")


class SecuritySettings(Base):
    """Security preferences and 2FA configuration"""
    __tablename__ = "security_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # 2FA Configuration
    two_fa_enabled = Column(Boolean, default=False)
    two_fa_method = Column(Enum(TwoFAMethod, native_enum=False), nullable=True)
    totp_secret = Column(String, nullable=True)  # Encrypted TOTP secret for authenticator apps
    backup_codes = Column(Text, nullable=True)  # Encrypted backup codes (comma-separated)

    # Account recovery
    recovery_email = Column(String, nullable=True)

    # Session settings
    require_mfa_on_login = Column(Boolean, default=False)
    idle_timeout_minutes = Column(Integer, default=30)

    # Account deletion
    scheduled_deletion_date = Column(DateTime(timezone=True), nullable=True)
    deletion_reason = Column(Text, nullable=True)
    deletion_confirmed = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    two_fa_enabled_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="security_settings")


class EmailFrequency(str, enum.Enum):
    """Email notification frequency options"""
    immediate = "immediate"  # Send immediately
    daily = "daily"          # Daily digest
    weekly = "weekly"        # Weekly digest
    never = "never"          # Disable email notifications


class PreferencesSettings(Base):
    """User preferences for notifications and general settings"""
    __tablename__ = "preferences_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Notification preferences
    email_alerts = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    sms_alerts = Column(Boolean, default=False)
    marketing_emails = Column(Boolean, default=False)

    # Email frequency preference
    email_frequency = Column(Enum(EmailFrequency, native_enum=False), default=EmailFrequency.daily)

    # Daily digest preferences
    daily_digest = Column(Boolean, default=False)
    daily_digest_time = Column(String, default="09:00")  # HH:MM format

    # Portfolio alerts
    price_alerts = Column(Boolean, default=True)
    milestone_alerts = Column(Boolean, default=True)

    # Data sharing
    allow_analytics = Column(Boolean, default=True)
    allow_improvements = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="preferences_settings")


class APIKey(Base):
    """API keys for programmatic access"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Key information
    name = Column(String, nullable=False)
    key_hash = Column(String, nullable=False, unique=True, index=True)  # SHA256 hash of the actual key
    last_four = Column(String(4), nullable=False)  # Last 4 characters for identification

    # Permissions
    permissions = Column(String, default="read")  # read, write, admin (comma-separated)

    # Usage tracking
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    last_used_ip = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")

    # Indexes for common queries
    __table_args__ = (
        Index("idx_user_id_active", "user_id", "is_active"),
        Index("idx_key_hash_active", "key_hash", "is_active"),
    )

    @staticmethod
    def generate_key():
        """Generate a new API key"""
        return secrets.token_urlsafe(32)


class ActivityLog(Base):
    """Immutable audit log of user activities"""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Activity information
    activity_type = Column(Enum(ActivityType, native_enum=False), nullable=False, index=True)
    description = Column(String, nullable=False)

    # Context information
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    resource_type = Column(String, nullable=True)  # e.g., "portfolio", "alert"
    resource_id = Column(Integer, nullable=True)

    # Additional metadata
    extra_metadata = Column(Text, nullable=True)  # JSON metadata

    # Immutable timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="activity_logs")

    # Indexes for querying
    __table_args__ = (
        Index("idx_user_id_created", "user_id", "created_at"),
        Index("idx_activity_type_created", "activity_type", "created_at"),
        Index("idx_user_activity_type", "user_id", "activity_type"),
    )


class UserSession(Base):
    """Track user sessions across devices/browsers"""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Session identification
    session_token = Column(String, unique=True, nullable=False, index=True)  # JWT or session ID
    refresh_token = Column(String, nullable=True)

    # Device information
    device_name = Column(String, nullable=False)  # e.g., "Chrome on Windows", "Safari on iOS"
    device_type = Column(String, nullable=False)  # desktop, mobile, tablet
    browser = Column(String, nullable=True)
    os_name = Column(String, nullable=True)

    # Network information
    ip_address = Column(String, nullable=False, index=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)

    # Session metadata
    user_agent = Column(String, nullable=True)
    is_trusted = Column(Boolean, default=False)
    is_current = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    terminated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")

    # Indexes
    __table_args__ = (
        Index("idx_user_id_current", "user_id", "is_current"),
        Index("idx_user_id_created", "user_id", "created_at"),
    )
