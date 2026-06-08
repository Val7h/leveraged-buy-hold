"""Unit tests for analytics endpoints 16-20 (final 5 endpoints)."""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
import json

from app.main import app
from app.core.database import get_db
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.position import Position


# Test fixtures
@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_db():
    """Mock database session."""
    return MagicMock()


@pytest.fixture
def sample_user():
    """Sample user for testing."""
    user = User(
        id=1,
        email="test@example.com",
        first_name="Test",
        last_name="User",
    )
    return user


@pytest.fixture
def sample_portfolio():
    """Sample portfolio for testing."""
    portfolio = Portfolio(
        id=1,
        user_id=1,
        name="Test Portfolio",
        initial_equity=100000.0,
        monthly_contribution=1000.0,
        currency="USD",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    return portfolio


@pytest.fixture
def sample_positions():
    """Sample positions for testing."""
    positions = [
        Position(
            id=1,
            portfolio_id=1,
            ticker="AAPL",
            shares=100,
            avg_price=150.0,
            leverage=1.0,
            is_active=True,
            created_at=datetime.utcnow(),
        ),
        Position(
            id=2,
            portfolio_id=1,
            ticker="MSFT",
            shares=80,
            avg_price=320.0,
            leverage=1.0,
            is_active=True,
            created_at=datetime.utcnow(),
        ),
        Position(
            id=3,
            portfolio_id=1,
            ticker="JPM",
            shares=120,
            avg_price=160.0,
            leverage=1.0,
            is_active=True,
            created_at=datetime.utcnow(),
        ),
    ]
    return positions


class TestEndpoint16SectorBreakdown:
    """Tests for GET /api/analytics/sector-breakdown (Endpoint 16)."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    def test_sector_breakdown_success(self, mock_fetch, client, sample_user, sample_portfolio, sample_positions):
        """Test successful sector breakdown analysis."""
        # Mock price data
        dates = pd.date_range(start="2024-01-01", periods=100, freq="D")
        mock_price_data = {
            "AAPL": pd.Series(np.random.normal(150, 10, 100), index=dates),
            "MSFT": pd.Series(np.random.normal(320, 20, 100), index=dates),
            "JPM": pd.Series(np.random.normal(160, 15, 100), index=dates),
        }
        mock_fetch.return_value = mock_price_data

        # Mock database
        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.get("/api/analytics/sector-breakdown?portfolio_id=1")

                assert response.status_code == 200
                data = response.json()
                assert "portfolio_id" in data
                assert "sectors" in data
                assert "sector_count" in data
                assert len(data["sectors"]) > 0

    def test_sector_breakdown_no_portfolio(self, client, sample_user):
        """Test error when portfolio not found."""
        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = None
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.get("/api/analytics/sector-breakdown?portfolio_id=999")
                assert response.status_code == 404


class TestEndpoint17GeographicBreakdown:
    """Tests for GET /api/analytics/geographic-breakdown (Endpoint 17)."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    def test_geographic_breakdown_success(self, mock_fetch, client, sample_user, sample_portfolio, sample_positions):
        """Test successful geographic breakdown analysis."""
        dates = pd.date_range(start="2024-01-01", periods=100, freq="D")
        mock_price_data = {
            "AAPL": pd.Series(np.random.normal(150, 10, 100), index=dates),
            "MSFT": pd.Series(np.random.normal(320, 20, 100), index=dates),
            "JPM": pd.Series(np.random.normal(160, 15, 100), index=dates),
        }
        mock_fetch.return_value = mock_price_data

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.get("/api/analytics/geographic-breakdown?portfolio_id=1")

                assert response.status_code == 200
                data = response.json()
                assert "portfolio_id" in data
                assert "geographic_breakdown" in data
                assert "country_count" in data
                assert "international_exposure_pct" in data

    def test_geographic_breakdown_no_positions(self, client, sample_user, sample_portfolio):
        """Test error when no active positions."""
        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = []
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.get("/api/analytics/geographic-breakdown?portfolio_id=1")
                assert response.status_code == 400


class TestEndpoint18PortfolioRebalancing:
    """Tests for POST /api/analytics/portfolio-rebalancing (Endpoint 18)."""

    def test_rebalancing_equal_weight(self, client, sample_user, sample_portfolio, sample_positions):
        """Test rebalancing to equal weight."""
        request_body = {
            "portfolio_id": 1,
            "method": "equal_weight",
            "max_transaction_cost_pct": 0.5,
            "consider_tax_efficiency": True,
            "only_suggest": True,
        }

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/portfolio-rebalancing",
                    json=request_body
                )

                assert response.status_code == 200
                data = response.json()
                assert "recommendation" in data
                assert "total_trades_needed" in data["recommendation"]
                assert "actions" in data["recommendation"]

    def test_rebalancing_target_allocation(self, client, sample_user, sample_portfolio, sample_positions):
        """Test rebalancing to target allocation."""
        request_body = {
            "portfolio_id": 1,
            "method": "target_allocation",
            "target_allocations": {"AAPL": 50, "MSFT": 30, "JPM": 20},
            "only_suggest": True,
        }

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/portfolio-rebalancing",
                    json=request_body
                )

                assert response.status_code == 200
                data = response.json()
                assert data["execution_status"] == "pending"

    def test_rebalancing_invalid_portfolio(self, client, sample_user):
        """Test error with invalid portfolio."""
        request_body = {
            "portfolio_id": 999,
            "method": "equal_weight",
        }

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = None
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/portfolio-rebalancing",
                    json=request_body
                )
                assert response.status_code == 404


class TestEndpoint19TaxEfficiency:
    """Tests for GET /api/analytics/tax-efficiency (Endpoint 19)."""

    def test_tax_efficiency_success(self, client, sample_user, sample_portfolio, sample_positions):
        """Test successful tax efficiency analysis."""
        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.get("/api/analytics/tax-efficiency?portfolio_id=1")

                assert response.status_code == 200
                data = response.json()
                assert "analysis" in data
                assert "tax_lots" in data["analysis"]
                assert "harvesting_opportunities" in data["analysis"]
                assert "tax_efficiency_score" in data["analysis"]

    def test_tax_efficiency_metrics(self, client, sample_user, sample_portfolio, sample_positions):
        """Test tax efficiency metrics are calculated."""
        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.get("/api/analytics/tax-efficiency?portfolio_id=1")

                assert response.status_code == 200
                data = response.json()
                analysis = data["analysis"]

                # Verify all required tax metrics
                assert "total_unrealized_gains" in analysis
                assert "total_unrealized_losses" in analysis
                assert "estimated_annual_tax_liability" in analysis
                assert "estimated_tax_rate_pct" in analysis
                assert "tax_efficiency_score" in analysis

    def test_tax_efficiency_no_portfolio(self, client, sample_user):
        """Test error when portfolio not found."""
        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = None
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.get("/api/analytics/tax-efficiency?portfolio_id=999")
                assert response.status_code == 404


class TestEndpoint20ExportReport:
    """Tests for POST /api/analytics/export-report (Endpoint 20)."""

    def test_export_report_pdf(self, client, sample_user, sample_portfolio, sample_positions):
        """Test PDF report export."""
        request_body = {
            "portfolio_id": 1,
            "report_type": "comprehensive",
            "format": "pdf",
            "include_sections": ["ytd_performance", "risk_analysis"],
            "include_charts": True,
        }

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/export-report",
                    json=request_body
                )

                assert response.status_code == 200
                data = response.json()
                assert data["format"] == "PDF"
                assert "file_url" in data
                assert data["includes_charts"] == True

    def test_export_report_excel(self, client, sample_user, sample_portfolio, sample_positions):
        """Test Excel report export."""
        request_body = {
            "portfolio_id": 1,
            "report_type": "performance",
            "format": "excel",
        }

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/export-report",
                    json=request_body
                )

                assert response.status_code == 200
                data = response.json()
                assert data["format"] == "EXCEL"

    def test_export_report_sections(self, client, sample_user, sample_portfolio, sample_positions):
        """Test report with auto-selected sections."""
        request_body = {
            "portfolio_id": 1,
            "report_type": "comprehensive",
            "format": "pdf",
        }

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/export-report",
                    json=request_body
                )

                assert response.status_code == 200
                data = response.json()
                assert len(data["sections_included"]) > 0

    def test_export_report_expiration(self, client, sample_user, sample_portfolio, sample_positions):
        """Test report expiration dates."""
        request_body = {
            "portfolio_id": 1,
            "report_type": "tax",
            "format": "json",
        }

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/export-report",
                    json=request_body
                )

                assert response.status_code == 200
                data = response.json()
                assert "expires_at" in data


# Integration tests
class TestEndpointsIntegration:
    """Integration tests for all 5 new endpoints."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    def test_all_endpoints_workflow(self, mock_fetch, client, sample_user, sample_portfolio, sample_positions):
        """Test complete workflow using all 5 new endpoints."""
        dates = pd.date_range(start="2024-01-01", periods=100, freq="D")
        mock_price_data = {
            "AAPL": pd.Series(np.random.normal(150, 10, 100), index=dates),
            "MSFT": pd.Series(np.random.normal(320, 20, 100), index=dates),
            "JPM": pd.Series(np.random.normal(160, 15, 100), index=dates),
        }
        mock_fetch.return_value = mock_price_data

        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                # Test all 5 endpoints in sequence
                endpoints = [
                    ("GET", "/api/analytics/sector-breakdown?portfolio_id=1", None),
                    ("GET", "/api/analytics/geographic-breakdown?portfolio_id=1", None),
                    ("POST", "/api/analytics/portfolio-rebalancing", {"portfolio_id": 1, "method": "equal_weight"}),
                    ("GET", "/api/analytics/tax-efficiency?portfolio_id=1", None),
                    ("POST", "/api/analytics/export-report", {"portfolio_id": 1, "report_type": "comprehensive", "format": "pdf"}),
                ]

                for method, endpoint, body in endpoints:
                    if method == "GET":
                        response = client.get(endpoint)
                    else:
                        response = client.post(endpoint, json=body)

                    assert response.status_code == 200, f"Failed for {method} {endpoint}"
                    data = response.json()
                    assert "portfolio_id" in data or "recommendation" in data or "analysis" in data


# Validation tests
class TestDataValidation:
    """Test data validation and response formats."""

    def test_sector_breakdown_response_format(self, client, sample_user, sample_portfolio, sample_positions):
        """Test sector breakdown response structure."""
        with patch("app.api.v1.analytics.fetch_multiple_price_history") as mock_fetch:
            dates = pd.date_range(start="2024-01-01", periods=100, freq="D")
            mock_fetch.return_value = {
                "AAPL": pd.Series(np.ones(100) * 150, index=dates),
                "MSFT": pd.Series(np.ones(100) * 320, index=dates),
                "JPM": pd.Series(np.ones(100) * 160, index=dates),
            }

            with patch("app.api.v1.analytics.get_db") as mock_db_get:
                mock_session = MagicMock()
                mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
                mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
                mock_db_get.return_value = mock_session

                with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                    mock_auth.return_value = sample_user

                    response = client.get("/api/analytics/sector-breakdown?portfolio_id=1")

                    assert response.status_code == 200
                    data = response.json()

                    # Validate response structure
                    assert isinstance(data["sectors"], list)
                    if data["sectors"]:
                        sector = data["sectors"][0]
                        assert "sector" in sector
                        assert "weight_pct" in sector
                        assert "volatility_pct" in sector

    def test_rebalancing_actions_structure(self, client, sample_user, sample_portfolio, sample_positions):
        """Test rebalancing actions are properly structured."""
        with patch("app.api.v1.analytics.get_db") as mock_db_get:
            mock_session = MagicMock()
            mock_session.query.return_value.filter.return_value.first.return_value = sample_portfolio
            mock_session.query.return_value.filter.return_value.all.return_value = sample_positions
            mock_db_get.return_value = mock_session

            with patch("app.api.v1.analytics.get_current_user") as mock_auth:
                mock_auth.return_value = sample_user

                response = client.post(
                    "/api/analytics/portfolio-rebalancing",
                    json={"portfolio_id": 1, "method": "equal_weight"}
                )

                assert response.status_code == 200
                data = response.json()
                recommendation = data["recommendation"]

                # Validate actions
                for action in recommendation["actions"]:
                    assert "ticker" in action
                    assert "current_weight_pct" in action
                    assert "target_weight_pct" in action
                    assert "trade_direction" in action
                    assert action["trade_direction"] in ["buy", "sell"]
