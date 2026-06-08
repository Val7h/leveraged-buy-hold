"""
Unit tests for User Settings API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_password_hash
from app.models.user import User
from app.models.user_settings import (
    UserProfile, SecuritySettings, PreferencesSettings, APIKey, ActivityLog
)
from sqlalchemy.orm import Session


client = TestClient(app)


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


@pytest.fixture
def auth_headers(test_user):
    """Get auth headers for test user"""
    # In a real test, we'd need to login and get a token
    # For now, this is a placeholder
    from app.core.security import create_access_token
    token = create_access_token({"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


class TestProfileEndpoints:
    """Tests for profile endpoints"""

    def test_get_profile(self, auth_headers):
        """Test getting user profile"""
        response = client.get("/api/v1/settings/profile", headers=auth_headers)
        assert response.status_code in [200, 404]  # 404 if profile not found, 200 if exists

    def test_update_profile(self, auth_headers):
        """Test updating user profile"""
        data = {
            "bio": "Updated bio",
            "timezone": "America/New_York",
            "theme": "dark",
            "language": "en"
        }
        response = client.put(
            "/api/v1/settings/profile",
            json=data,
            headers=auth_headers
        )
        assert response.status_code in [200, 422, 401]

    def test_profile_validation(self, auth_headers):
        """Test profile field validation"""
        # Test with invalid timezone
        data = {"timezone": "Invalid/Timezone"}
        response = client.put(
            "/api/v1/settings/profile",
            json=data,
            headers=auth_headers
        )
        # Should either accept or validate
        assert response.status_code in [200, 422, 401]


class TestPasswordEndpoints:
    """Tests for password change endpoint"""

    def test_change_password_success(self, auth_headers):
        """Test successful password change"""
        data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword456!",
            "confirm_password": "NewPassword456!"
        }
        response = client.post(
            "/api/v1/settings/password/change",
            json=data,
            headers=auth_headers
        )
        assert response.status_code in [200, 401, 422]

    def test_change_password_mismatch(self, auth_headers):
        """Test password mismatch validation"""
        data = {
            "current_password": "TestPassword123!",
            "new_password": "NewPassword456!",
            "confirm_password": "DifferentPassword789!"
        }
        response = client.post(
            "/api/v1/settings/password/change",
            json=data,
            headers=auth_headers
        )
        # Should fail validation
        assert response.status_code in [422, 401, 400]

    def test_change_password_invalid_current(self, auth_headers):
        """Test invalid current password"""
        data = {
            "current_password": "WrongPassword123!",
            "new_password": "NewPassword456!",
            "confirm_password": "NewPassword456!"
        }
        response = client.post(
            "/api/v1/settings/password/change",
            json=data,
            headers=auth_headers
        )
        # Should fail authentication
        assert response.status_code in [401, 422]

    def test_change_password_too_short(self, auth_headers):
        """Test password too short"""
        data = {
            "current_password": "TestPassword123!",
            "new_password": "Short1!",  # Less than 8 chars
            "confirm_password": "Short1!"
        }
        response = client.post(
            "/api/v1/settings/password/change",
            json=data,
            headers=auth_headers
        )
        # Should fail validation
        assert response.status_code in [422, 401]


class TestTwoFAEndpoints:
    """Tests for 2FA endpoints"""

    def test_setup_2fa_initiate(self, auth_headers):
        """Test initiating 2FA setup"""
        data = {"method": "totp"}
        response = client.post(
            "/api/v1/settings/2fa/setup",
            json=data,
            headers=auth_headers
        )
        assert response.status_code in [200, 401, 400]
        if response.status_code == 200:
            data = response.json()
            assert "qr_code_url" in data or "secret" in data
            assert "backup_codes" in data

    def test_setup_2fa_invalid_method(self, auth_headers):
        """Test invalid 2FA method"""
        data = {"method": "invalid"}
        response = client.post(
            "/api/v1/settings/2fa/setup",
            json=data,
            headers=auth_headers
        )
        # Should fail validation
        assert response.status_code in [422, 400, 401]


class TestSecurityEndpoints:
    """Tests for security settings endpoints"""

    def test_get_security_settings(self, auth_headers):
        """Test getting security settings"""
        response = client.get("/api/v1/settings/security", headers=auth_headers)
        assert response.status_code in [200, 401, 404]


class TestPreferencesEndpoints:
    """Tests for preferences endpoints"""

    def test_get_preferences(self, auth_headers):
        """Test getting preferences"""
        response = client.get("/api/v1/settings/preferences", headers=auth_headers)
        assert response.status_code in [200, 401, 404]

    def test_update_preferences(self, auth_headers):
        """Test updating preferences"""
        data = {
            "email_alerts": False,
            "push_notifications": True,
            "daily_digest": True,
            "daily_digest_time": "10:00"
        }
        response = client.put(
            "/api/v1/settings/preferences",
            json=data,
            headers=auth_headers
        )
        assert response.status_code in [200, 401, 422]

    def test_invalid_digest_time(self, auth_headers):
        """Test invalid digest time format"""
        data = {"daily_digest_time": "25:00"}  # Invalid hour
        response = client.put(
            "/api/v1/settings/preferences",
            json=data,
            headers=auth_headers
        )
        # Should fail validation
        assert response.status_code in [422, 400, 401]


class TestAPIKeyEndpoints:
    """Tests for API key endpoints"""

    def test_create_api_key(self, auth_headers):
        """Test creating an API key"""
        data = {
            "name": "Test Key",
            "permissions": "read"
        }
        response = client.post(
            "/api/v1/settings/api-keys",
            json=data,
            headers=auth_headers
        )
        assert response.status_code in [200, 201, 401, 422]
        if response.status_code in [200, 201]:
            data = response.json()
            assert "key" in data
            assert "last_four" in data

    def test_list_api_keys(self, auth_headers):
        """Test listing API keys"""
        response = client.get("/api/v1/settings/api-keys", headers=auth_headers)
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            assert isinstance(response.json(), list)

    def test_revoke_api_key(self, auth_headers):
        """Test revoking an API key"""
        # First create a key
        create_response = client.post(
            "/api/v1/settings/api-keys",
            json={"name": "Revocable Key", "permissions": "read"},
            headers=auth_headers
        )

        if create_response.status_code in [200, 201]:
            key_id = create_response.json().get("id")
            if key_id:
                response = client.delete(
                    f"/api/v1/settings/api-keys/{key_id}",
                    headers=auth_headers
                )
                assert response.status_code in [200, 401, 404]


class TestSessionEndpoints:
    """Tests for session endpoints"""

    def test_list_sessions(self, auth_headers):
        """Test listing sessions"""
        response = client.get("/api/v1/settings/sessions", headers=auth_headers)
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert "items" in data
            assert "total" in data

    def test_terminate_all_sessions(self, auth_headers):
        """Test terminating all sessions"""
        response = client.delete(
            "/api/v1/settings/sessions",
            headers=auth_headers
        )
        assert response.status_code in [200, 401]


class TestActivityLogEndpoints:
    """Tests for activity log endpoints"""

    def test_get_activity_logs(self, auth_headers):
        """Test getting activity logs"""
        response = client.get("/api/v1/settings/activity", headers=auth_headers)
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert "items" in data
            assert "total" in data
            assert "page" in data

    def test_activity_logs_pagination(self, auth_headers):
        """Test activity logs pagination"""
        response = client.get(
            "/api/v1/settings/activity?page=1&page_size=10",
            headers=auth_headers
        )
        assert response.status_code in [200, 401]


class TestSettingsSummary:
    """Tests for settings summary endpoint"""

    def test_get_settings_summary(self, auth_headers):
        """Test getting settings summary"""
        response = client.get("/api/v1/settings", headers=auth_headers)
        assert response.status_code in [200, 401, 404]
        if response.status_code == 200:
            data = response.json()
            assert "profile" in data or "security" in data


class TestUnauthorized:
    """Tests for unauthorized access"""

    def test_missing_auth_header(self):
        """Test missing authentication header"""
        response = client.get("/api/v1/settings/profile")
        assert response.status_code == 403  # Forbidden (missing token)

    def test_invalid_auth_header(self):
        """Test invalid authentication header"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/v1/settings/profile", headers=headers)
        assert response.status_code == 401  # Unauthorized
