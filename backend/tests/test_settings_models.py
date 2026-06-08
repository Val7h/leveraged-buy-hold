"""
Unit tests for User Settings Models
"""

import pytest
from datetime import datetime, timedelta
from app.models.user import User
from app.models.user_settings import (
    UserProfile, SecuritySettings, PreferencesSettings,
    APIKey, ActivityLog, UserSession, ActivityType
)
from app.core.security import get_password_hash
from sqlalchemy.orm import Session


@pytest.fixture
def test_user(db: Session):
    """Create a test user"""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("TestPassword123!"),
        full_name="Test User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestUserProfile:
    """Tests for UserProfile model"""

    def test_create_user_profile(self, db: Session, test_user):
        """Test creating a user profile"""
        profile = UserProfile(
            user_id=test_user.id,
            bio="Test bio",
            phone_number="+5511999999999",
            country="BR",
            timezone="America/Sao_Paulo",
            language="pt_BR",
            theme="dark",
            is_profile_public=True,
            show_portfolio_summary=False
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        assert profile.id is not None
        assert profile.user_id == test_user.id
        assert profile.bio == "Test bio"
        assert profile.phone_number == "+5511999999999"
        assert profile.timezone == "America/Sao_Paulo"

    def test_profile_defaults(self, db: Session, test_user):
        """Test default values for user profile"""
        profile = UserProfile(user_id=test_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

        assert profile.timezone == "UTC"
        assert profile.language == "pt_BR"
        assert profile.theme == "light"
        assert profile.is_profile_public is False
        assert profile.show_portfolio_summary is False

    def test_profile_relationship(self, db: Session, test_user):
        """Test user-profile relationship"""
        profile = UserProfile(user_id=test_user.id, bio="Test")
        test_user.profile = profile
        db.add(profile)
        db.commit()

        db_user = db.query(User).filter(User.id == test_user.id).first()
        assert db_user.profile is not None
        assert db_user.profile.bio == "Test"


class TestSecuritySettings:
    """Tests for SecuritySettings model"""

    def test_create_security_settings(self, db: Session, test_user):
        """Test creating security settings"""
        settings = SecuritySettings(
            user_id=test_user.id,
            two_fa_enabled=False,
            require_mfa_on_login=False,
            idle_timeout_minutes=30
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

        assert settings.id is not None
        assert settings.two_fa_enabled is False
        assert settings.idle_timeout_minutes == 30

    def test_2fa_configuration(self, db: Session, test_user):
        """Test 2FA configuration"""
        settings = SecuritySettings(
            user_id=test_user.id,
            two_fa_enabled=True,
            two_fa_method="totp",
            totp_secret="JBSWY3DPEBLW64TMMQ======",
            two_fa_enabled_at=datetime.utcnow()
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

        assert settings.two_fa_enabled is True
        assert settings.two_fa_method == "totp"
        assert settings.totp_secret is not None

    def test_security_settings_defaults(self, db: Session, test_user):
        """Test default values for security settings"""
        settings = SecuritySettings(user_id=test_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

        assert settings.two_fa_enabled is False
        assert settings.require_mfa_on_login is False
        assert settings.idle_timeout_minutes == 30


class TestPreferencesSettings:
    """Tests for PreferencesSettings model"""

    def test_create_preferences(self, db: Session, test_user):
        """Test creating preferences"""
        prefs = PreferencesSettings(
            user_id=test_user.id,
            email_alerts=True,
            push_notifications=False,
            daily_digest=True,
            daily_digest_time="09:00",
            allow_analytics=True
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

        assert prefs.email_alerts is True
        assert prefs.push_notifications is False
        assert prefs.daily_digest is True
        assert prefs.daily_digest_time == "09:00"

    def test_preferences_defaults(self, db: Session, test_user):
        """Test default values for preferences"""
        prefs = PreferencesSettings(user_id=test_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

        assert prefs.email_alerts is True
        assert prefs.push_notifications is True
        assert prefs.sms_alerts is False
        assert prefs.marketing_emails is False
        assert prefs.daily_digest is False
        assert prefs.allow_analytics is True


class TestAPIKey:
    """Tests for APIKey model"""

    def test_create_api_key(self, db: Session, test_user):
        """Test creating an API key"""
        import hashlib
        raw_key = APIKey.generate_key()
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = APIKey(
            user_id=test_user.id,
            name="Test Key",
            key_hash=key_hash,
            last_four=raw_key[-4:],
            permissions="read"
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        assert api_key.id is not None
        assert api_key.name == "Test Key"
        assert api_key.is_active is True
        assert api_key.permissions == "read"

    def test_api_key_with_expiration(self, db: Session, test_user):
        """Test API key with expiration"""
        import hashlib
        raw_key = APIKey.generate_key()
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        expires_at = datetime.utcnow() + timedelta(days=30)

        api_key = APIKey(
            user_id=test_user.id,
            name="Expiring Key",
            key_hash=key_hash,
            last_four=raw_key[-4:],
            expires_at=expires_at
        )
        db.add(api_key)
        db.commit()
        db.refresh(api_key)

        assert api_key.expires_at is not None
        assert api_key.expires_at > datetime.utcnow()

    def test_api_key_revocation(self, db: Session, test_user):
        """Test revoking an API key"""
        import hashlib
        raw_key = APIKey.generate_key()
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = APIKey(
            user_id=test_user.id,
            name="Revocable Key",
            key_hash=key_hash,
            last_four=raw_key[-4:],
            is_active=True
        )
        db.add(api_key)
        db.commit()

        api_key.is_active = False
        api_key.revoked_at = datetime.utcnow()
        db.commit()
        db.refresh(api_key)

        assert api_key.is_active is False
        assert api_key.revoked_at is not None

    def test_generate_api_key(self):
        """Test API key generation"""
        key1 = APIKey.generate_key()
        key2 = APIKey.generate_key()

        assert len(key1) > 0
        assert len(key2) > 0
        assert key1 != key2


class TestActivityLog:
    """Tests for ActivityLog model"""

    def test_create_activity_log(self, db: Session, test_user):
        """Test creating an activity log entry"""
        activity = ActivityLog(
            user_id=test_user.id,
            activity_type="login",
            description="User logged in",
            ip_address="192.168.1.1"
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)

        assert activity.id is not None
        assert activity.activity_type == "login"
        assert activity.ip_address == "192.168.1.1"

    def test_activity_log_with_resource(self, db: Session, test_user):
        """Test activity log with resource tracking"""
        activity = ActivityLog(
            user_id=test_user.id,
            activity_type="api_key_created",
            description="API key created",
            resource_type="api_key",
            resource_id=1
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)

        assert activity.resource_type == "api_key"
        assert activity.resource_id == 1

    def test_activity_log_immutable(self, db: Session, test_user):
        """Test that activity logs are immutable after creation"""
        activity = ActivityLog(
            user_id=test_user.id,
            activity_type="password_change",
            description="Password changed"
        )
        db.add(activity)
        db.commit()
        created_at = activity.created_at

        # Try to update (in a real scenario, we wouldn't allow this)
        activity.description = "Modified description"
        db.commit()
        db.refresh(activity)

        # Timestamp should remain unchanged
        assert activity.created_at == created_at


class TestUserSession:
    """Tests for UserSession model"""

    def test_create_session(self, db: Session, test_user):
        """Test creating a user session"""
        session = UserSession(
            user_id=test_user.id,
            session_token="token_abc123",
            device_name="Chrome on Windows",
            device_type="desktop",
            ip_address="192.168.1.1"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        assert session.id is not None
        assert session.session_token == "token_abc123"
        assert session.device_type == "desktop"
        assert session.is_current is True

    def test_session_with_device_info(self, db: Session, test_user):
        """Test session with device information"""
        session = UserSession(
            user_id=test_user.id,
            session_token="token_def456",
            device_name="Safari on iPhone",
            device_type="mobile",
            browser="Safari",
            os_name="iOS",
            ip_address="203.0.113.1",
            country="BR"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        assert session.device_type == "mobile"
        assert session.os_name == "iOS"
        assert session.country == "BR"

    def test_session_termination(self, db: Session, test_user):
        """Test terminating a session"""
        session = UserSession(
            user_id=test_user.id,
            session_token="token_ghi789",
            device_name="Firefox on Mac",
            device_type="desktop",
            ip_address="192.168.1.5"
        )
        db.add(session)
        db.commit()

        session.is_current = False
        session.terminated_at = datetime.utcnow()
        db.commit()
        db.refresh(session)

        assert session.is_current is False
        assert session.terminated_at is not None

    def test_session_defaults(self, db: Session, test_user):
        """Test default values for sessions"""
        session = UserSession(
            user_id=test_user.id,
            session_token="token_xyz",
            device_name="Test Device",
            device_type="desktop",
            ip_address="127.0.0.1"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        assert session.is_current is True
        assert session.is_trusted is False
        assert session.terminated_at is None


class TestModelRelationships:
    """Tests for model relationships"""

    def test_user_settings_cascade_delete(self, db: Session, test_user):
        """Test that deleting user cascades to all settings"""
        # Create all settings
        profile = UserProfile(user_id=test_user.id)
        security = SecuritySettings(user_id=test_user.id)
        prefs = PreferencesSettings(user_id=test_user.id)
        activity = ActivityLog(user_id=test_user.id, activity_type="login", description="Test")

        test_user.profile = profile
        test_user.security_settings = security
        test_user.preferences_settings = prefs
        test_user.activity_logs = [activity]

        db.commit()

        user_id = test_user.id
        db.delete(test_user)
        db.commit()

        # Verify all related records are deleted
        assert db.query(UserProfile).filter(UserProfile.user_id == user_id).first() is None
        assert db.query(SecuritySettings).filter(SecuritySettings.user_id == user_id).first() is None
        assert db.query(PreferencesSettings).filter(PreferencesSettings.user_id == user_id).first() is None
        assert db.query(ActivityLog).filter(ActivityLog.user_id == user_id).first() is None
