"""
Unit tests for User Settings Pydantic schemas validation
"""

import pytest
from pydantic import ValidationError
from app.schemas.settings import (
    UpdateProfileRequest, ProfileResponse,
    ChangePasswordRequest, PasswordChangeResponse,
    Setup2FARequest, Verify2FARequest,
    UpdatePreferencesRequest, PreferencesResponse,
    CreateAPIKeyRequest, APIKeyResponse,
    ActivityLogResponse, SessionResponse
)
from datetime import datetime


class TestProfileRequestSchema:
    """Tests for UpdateProfileRequest validation"""

    def test_valid_profile_update(self):
        """Test valid profile update"""
        data = {
            "bio": "Test bio",
            "phone_number": "+5511999999999",
            "country": "BR",
            "timezone": "America/Sao_Paulo"
        }
        request = UpdateProfileRequest(**data)
        assert request.bio == "Test bio"
        assert request.phone_number == "+5511999999999"

    def test_bio_max_length(self):
        """Test bio max length validation"""
        data = {"bio": "x" * 501}  # 501 chars, max is 500
        with pytest.raises(ValidationError):
            UpdateProfileRequest(**data)

    def test_invalid_phone_number(self):
        """Test invalid phone number format"""
        data = {"phone_number": "invalid"}
        with pytest.raises(ValidationError):
            UpdateProfileRequest(**data)

    def test_valid_phone_numbers(self):
        """Test valid phone number formats"""
        valid_numbers = [
            "+5511999999999",
            "+1234567890",
            "5511999999999"
        ]
        for number in valid_numbers:
            data = {"phone_number": number}
            request = UpdateProfileRequest(**data)
            assert request.phone_number == number

    def test_invalid_theme(self):
        """Test invalid theme value"""
        data = {"theme": "neon"}
        with pytest.raises(ValidationError):
            UpdateProfileRequest(**data)

    def test_valid_themes(self):
        """Test valid theme values"""
        for theme in ["light", "dark", "auto"]:
            data = {"theme": theme}
            request = UpdateProfileRequest(**data)
            assert request.theme == theme

    def test_empty_update(self):
        """Test empty update (all optional)"""
        request = UpdateProfileRequest()
        assert request.bio is None
        assert request.phone_number is None


class TestChangePasswordSchema:
    """Tests for ChangePasswordRequest validation"""

    def test_valid_password_change(self):
        """Test valid password change"""
        data = {
            "current_password": "CurrentPass123!",
            "new_password": "NewPass456!",
            "confirm_password": "NewPass456!"
        }
        request = ChangePasswordRequest(**data)
        assert request.current_password == "CurrentPass123!"

    def test_password_mismatch(self):
        """Test mismatched passwords"""
        data = {
            "current_password": "CurrentPass123!",
            "new_password": "NewPass456!",
            "confirm_password": "DifferentPass789!"
        }
        with pytest.raises(ValidationError) as exc_info:
            ChangePasswordRequest(**data)
        assert "Passwords do not match" in str(exc_info.value)

    def test_same_new_and_current(self):
        """Test new password same as current"""
        data = {
            "current_password": "SamePassword123!",
            "new_password": "SamePassword123!",
            "confirm_password": "SamePassword123!"
        }
        with pytest.raises(ValidationError) as exc_info:
            ChangePasswordRequest(**data)
        assert "different from current password" in str(exc_info.value)

    def test_password_too_short(self):
        """Test password too short"""
        data = {
            "current_password": "Short1!",  # 7 chars, min is 8
            "new_password": "NewPass456!",
            "confirm_password": "NewPass456!"
        }
        with pytest.raises(ValidationError):
            ChangePasswordRequest(**data)

    def test_empty_password(self):
        """Test empty password"""
        data = {
            "current_password": "",
            "new_password": "NewPass456!",
            "confirm_password": "NewPass456!"
        }
        with pytest.raises(ValidationError):
            ChangePasswordRequest(**data)


class TestSetup2FASchema:
    """Tests for 2FA setup validation"""

    def test_valid_totp_setup(self):
        """Test valid TOTP setup"""
        data = {"method": "totp"}
        request = Setup2FARequest(**data)
        assert request.method == "totp"

    def test_valid_sms_setup(self):
        """Test valid SMS setup with phone"""
        data = {
            "method": "sms",
            "phone_number": "+5511999999999"
        }
        request = Setup2FARequest(**data)
        assert request.method == "sms"

    def test_invalid_method(self):
        """Test invalid 2FA method"""
        data = {"method": "invalid_method"}
        with pytest.raises(ValidationError):
            Setup2FARequest(**data)


class TestVerify2FASchema:
    """Tests for 2FA verification validation"""

    def test_valid_verification(self):
        """Test valid 2FA verification"""
        data = {
            "setup_id": "setup_123456",
            "code": "123456"
        }
        request = Verify2FARequest(**data)
        assert request.code == "123456"

    def test_code_too_short(self):
        """Test code too short"""
        data = {
            "setup_id": "setup_123456",
            "code": "12345"  # 5 digits, needs 6
        }
        with pytest.raises(ValidationError):
            Verify2FARequest(**data)

    def test_code_too_long(self):
        """Test code too long"""
        data = {
            "setup_id": "setup_123456",
            "code": "1234567"  # 7 digits, max is 6
        }
        with pytest.raises(ValidationError):
            Verify2FARequest(**data)

    def test_non_numeric_code(self):
        """Test non-numeric code"""
        data = {
            "setup_id": "setup_123456",
            "code": "abcdef"
        }
        with pytest.raises(ValidationError):
            Verify2FARequest(**data)


class TestPreferencesSchema:
    """Tests for PreferencesSettings validation"""

    def test_valid_preferences(self):
        """Test valid preferences update"""
        data = {
            "email_alerts": True,
            "push_notifications": False,
            "daily_digest": True,
            "daily_digest_time": "09:00"
        }
        request = UpdatePreferencesRequest(**data)
        assert request.email_alerts is True
        assert request.push_notifications is False

    def test_invalid_digest_time_format(self):
        """Test invalid digest time format"""
        data = {"daily_digest_time": "25:00"}  # Invalid hour
        with pytest.raises(ValidationError):
            UpdatePreferencesRequest(**data)

    def test_valid_digest_times(self):
        """Test valid digest times"""
        valid_times = ["00:00", "09:00", "23:59"]
        for time in valid_times:
            data = {"daily_digest_time": time}
            request = UpdatePreferencesRequest(**data)
            assert request.daily_digest_time == time

    def test_empty_preferences(self):
        """Test empty update (all optional)"""
        request = UpdatePreferencesRequest()
        assert request.email_alerts is None
        assert request.push_notifications is None


class TestAPIKeyRequestSchema:
    """Tests for CreateAPIKeyRequest validation"""

    def test_valid_api_key_creation(self):
        """Test valid API key creation"""
        data = {
            "name": "Test Key",
            "permissions": "read"
        }
        request = CreateAPIKeyRequest(**data)
        assert request.name == "Test Key"
        assert request.permissions == "read"

    def test_api_key_with_expiration(self):
        """Test API key with expiration"""
        data = {
            "name": "Temporary Key",
            "permissions": "write",
            "expires_in_days": 30
        }
        request = CreateAPIKeyRequest(**data)
        assert request.expires_in_days == 30

    def test_api_key_empty_name(self):
        """Test API key with empty name"""
        data = {
            "name": "",
            "permissions": "read"
        }
        with pytest.raises(ValidationError):
            CreateAPIKeyRequest(**data)

    def test_api_key_permissions(self):
        """Test multiple permissions"""
        data = {
            "name": "Multi Key",
            "permissions": "read,write"
        }
        request = CreateAPIKeyRequest(**data)
        assert request.permissions == "read,write"

    def test_api_key_invalid_permissions(self):
        """Test invalid permissions"""
        data = {
            "name": "Test Key",
            "permissions": "invalid"
        }
        with pytest.raises(ValidationError):
            CreateAPIKeyRequest(**data)

    def test_api_key_expiration_range(self):
        """Test expiration day range"""
        # Valid
        data = {"name": "Key", "permissions": "read", "expires_in_days": 365}
        request = CreateAPIKeyRequest(**data)
        assert request.expires_in_days == 365

        # Too long
        data = {"name": "Key", "permissions": "read", "expires_in_days": 366}
        with pytest.raises(ValidationError):
            CreateAPIKeyRequest(**data)


class TestActivityLogResponseSchema:
    """Tests for ActivityLogResponse"""

    def test_valid_activity_log(self):
        """Test valid activity log response"""
        data = {
            "id": 1,
            "user_id": 1,
            "activity_type": "login",
            "description": "User logged in",
            "ip_address": "192.168.1.1",
            "created_at": datetime.utcnow()
        }
        response = ActivityLogResponse(**data)
        assert response.id == 1
        assert response.activity_type == "login"

    def test_activity_log_with_resource(self):
        """Test activity log with resource"""
        data = {
            "id": 2,
            "user_id": 1,
            "activity_type": "api_key_created",
            "description": "API key created",
            "resource_type": "api_key",
            "resource_id": 1,
            "created_at": datetime.utcnow()
        }
        response = ActivityLogResponse(**data)
        assert response.resource_type == "api_key"


class TestSessionResponseSchema:
    """Tests for SessionResponse"""

    def test_valid_session_response(self):
        """Test valid session response"""
        data = {
            "id": 1,
            "user_id": 1,
            "device_name": "Chrome on Windows",
            "device_type": "desktop",
            "ip_address": "192.168.1.1",
            "is_current": True,
            "is_trusted": False,
            "created_at": datetime.utcnow(),
            "last_activity_at": datetime.utcnow()
        }
        response = SessionResponse(**data)
        assert response.device_name == "Chrome on Windows"
        assert response.is_current is True

    def test_session_with_optional_fields(self):
        """Test session with optional fields"""
        data = {
            "id": 2,
            "user_id": 1,
            "device_name": "Safari on iPhone",
            "device_type": "mobile",
            "browser": "Safari",
            "os_name": "iOS",
            "country": "BR",
            "ip_address": "203.0.113.1",
            "is_current": False,
            "is_trusted": True,
            "created_at": datetime.utcnow(),
            "last_activity_at": datetime.utcnow()
        }
        response = SessionResponse(**data)
        assert response.os_name == "iOS"
        assert response.country == "BR"
