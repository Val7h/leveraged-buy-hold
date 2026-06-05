"""
Test suite for Content Moderation System
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.moderation import ContentReport, ContentModerationLog, ReportStatus, ReportReason
from app.core.security import get_password_hash, create_access_token
from app.services.content_moderation import check_content_for_violations

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create test database and tables"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create test client with test database"""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create test user"""
    user = User(
        email="testuser@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db):
    """Create admin user"""
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpass123"),
        full_name="Admin User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_token(test_user):
    """Generate user token"""
    return create_access_token(data={"sub": test_user.email})


@pytest.fixture
def admin_token(admin_user):
    """Generate admin token"""
    return create_access_token(data={"sub": admin_user.email})


class TestContentChecking:
    """Test content violation checking"""

    def test_check_clean_content(self, client, user_token):
        """Test that clean content is not flagged"""
        response = client.get(
            "/api/v1/content/check",
            params={"text": "Hello world, this is a nice message"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        assert response.json()["flagged"] == False

    def test_check_content_with_banned_word(self, client, user_token):
        """Test that content with banned words is flagged"""
        response = client.get(
            "/api/v1/content/check",
            params={"text": "You should viagra casino"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["flagged"] == True
        assert data["reason"] == "banned_word"
        assert len(data["detected_words"]) > 0

    def test_check_content_requires_auth(self, client):
        """Test that check endpoint requires authentication"""
        response = client.get(
            "/api/v1/content/check",
            params={"text": "Hello world"},
        )
        assert response.status_code == 403


class TestContentReporting:
    """Test content reporting"""

    def test_create_report(self, client, user_token, test_user):
        """Test creating a content report"""
        response = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
                "description": "This user is harassing me",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["message_id"] == "msg_12345"
        assert data["reason"] == "harassment"
        assert data["status"] == "open"
        assert data["reporter_id"] == test_user.id

    def test_create_report_requires_auth(self, client):
        """Test that report endpoint requires authentication"""
        response = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
            },
        )
        assert response.status_code == 403

    def test_create_multiple_reports_same_message(self, client, user_token, db):
        """Test that multiple users can report same message"""
        # User 1 reports
        response1 = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
                "description": "Report 1",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response1.status_code == 201

        # Add another user and have them report same message
        user2 = User(
            email="testuser2@example.com",
            hashed_password=get_password_hash("pass123"),
        )
        db.add(user2)
        db.commit()

        token2 = create_access_token(data={"sub": user2.email})

        response2 = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "spam",
                "description": "Report 2",
            },
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert response2.status_code == 201

        # Check both reports exist
        reports = db.query(ContentReport).filter(
            ContentReport.message_id == "msg_12345"
        ).all()
        assert len(reports) == 2


class TestModerationStatus:
    """Test moderation status checking"""

    def test_unreported_message_status(self, client):
        """Test status of message with no reports"""
        response = client.get("/api/v1/content/moderation-status/msg_nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_reported"

    def test_reported_message_status(self, client, user_token, db):
        """Test status of reported message"""
        # Create report
        client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )

        # Check status
        response = client.get("/api/v1/content/moderation-status/msg_12345")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "open"
        assert data["reason"] == "harassment"


class TestAdminListReports:
    """Test admin listing reports"""

    def test_list_reports_requires_admin(self, client, user_token):
        """Test that regular users cannot list reports"""
        response = client.get(
            "/api/v1/content/admin/reports",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403

    def test_list_reports_admin(self, client, admin_token, user_token, db):
        """Test admin can list reports"""
        # Create some reports
        for i in range(3):
            client.post(
                "/api/v1/content/report",
                json={
                    "message_id": f"msg_{i}",
                    "reason": "spam" if i % 2 == 0 else "harassment",
                },
                headers={"Authorization": f"Bearer {user_token}"},
            )

        # List all reports
        response = client.get(
            "/api/v1/content/admin/reports",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) == 3

    def test_filter_reports_by_status(self, client, admin_token, user_token, db):
        """Test filtering reports by status"""
        # Create report
        report_response = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        report_id = report_response.json()["id"]

        # Filter by open status
        response = client.get(
            "/api/v1/content/admin/reports?status=open",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) >= 1

        # Filter by dismissed status (should be empty)
        response = client.get(
            "/api/v1/content/admin/reports?status=dismissed",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) == 0


class TestAdminActions:
    """Test admin moderation actions"""

    def test_take_action_requires_admin(self, client, user_token, db):
        """Test that regular users cannot take actions"""
        # Create report first
        report = ContentReport(
            message_id="msg_12345",
            reporter_id=1,
            reason="harassment",
            status=ReportStatus.open,
        )
        db.add(report)
        db.commit()

        response = client.put(
            "/api/v1/content/admin/reports/1/action",
            json={"action": "delete", "reason": "policy violation"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403

    def test_delete_action(self, client, admin_token, user_token, db, admin_user):
        """Test deleting content"""
        # Create report
        report_response = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        report_id = report_response.json()["id"]

        # Take delete action
        response = client.put(
            f"/api/v1/content/admin/reports/{report_id}/action",
            json={"action": "delete", "reason": "Harassment policy violation"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["success"] == True

        # Verify report status updated
        report = db.query(ContentReport).filter(ContentReport.id == report_id).first()
        assert report.status == ReportStatus.deleted
        assert report.reviewed_by == admin_user.id

    def test_dismiss_action(self, client, admin_token, user_token, db):
        """Test dismissing a report"""
        # Create report
        report_response = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        report_id = report_response.json()["id"]

        # Dismiss report
        response = client.put(
            f"/api/v1/content/admin/reports/{report_id}/dismiss",
            params={"reason": "Content review determined no violation occurred"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["success"] == True


class TestModerationLogs:
    """Test moderation action logging"""

    def test_list_logs_requires_admin(self, client, user_token):
        """Test that regular users cannot view logs"""
        response = client.get(
            "/api/v1/content/admin/logs",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403

    def test_action_creates_log(self, client, admin_token, user_token, db):
        """Test that actions create log entries"""
        # Create report
        report_response = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_12345",
                "reason": "harassment",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        report_id = report_response.json()["id"]

        # Take action
        client.put(
            f"/api/v1/content/admin/reports/{report_id}/action",
            json={"action": "delete", "reason": "Harassment violation"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Check logs
        response = client.get(
            "/api/v1/content/admin/logs",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) > 0
        assert logs[0]["action"] == "deleted"


class TestStatistics:
    """Test moderation statistics"""

    def test_statistics_requires_admin(self, client, user_token):
        """Test that regular users cannot view stats"""
        response = client.get(
            "/api/v1/content/admin/statistics",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403

    def test_get_statistics(self, client, admin_token, user_token, db):
        """Test getting moderation statistics"""
        # Create reports with different statuses
        report_response = client.post(
            "/api/v1/content/report",
            json={
                "message_id": "msg_1",
                "reason": "harassment",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        report_id = report_response.json()["id"]

        # Delete one
        client.put(
            f"/api/v1/content/admin/reports/{report_id}/action",
            json={"action": "delete", "reason": "Violation"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Get stats
        response = client.get(
            "/api/v1/content/admin/statistics",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_reports"] >= 1
        assert stats["deleted_reports"] >= 1


# Unit tests for content checking
class TestContentViolationDetection:
    """Test content violation detection logic"""

    def test_clean_content(self):
        """Test clean content detection"""
        result = check_content_for_violations("This is a clean message")
        assert result["flagged"] == False

    def test_spam_detection(self):
        """Test spam word detection"""
        result = check_content_for_violations("Click here to win viagra")
        assert result["flagged"] == True
        assert result["reason"] == "banned_word"

    def test_multiple_violations(self):
        """Test multiple violation detection"""
        result = check_content_for_violations("Buy viagra and casino")
        assert result["flagged"] == True
        assert len(result["detected_words"]) > 1

    def test_case_insensitive(self):
        """Test case-insensitive detection"""
        result = check_content_for_violations("VIAGRA CASINO")
        assert result["flagged"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
