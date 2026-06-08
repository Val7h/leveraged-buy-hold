"""Unit tests for analytics endpoints."""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

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
    )
    return portfolio


@pytest.fixture
def sample_positions():
    """Sample positions for testing."""
    return [
        Position(
            id=1,
            portfolio_id=1,
            ticker="AAPL",
            shares=100,
            avg_price=150.0,
            leverage=1.0,
            is_active=True,
        ),
        Position(
            id=2,
            portfolio_id=1,
            ticker="MSFT",
            shares=50,
            avg_price=200.0,
            leverage=1.5,
            is_active=True,
        ),
    ]


@pytest.fixture
def mock_price_data():
    """Mock price data."""
    dates = pd.date_range(start="2024-01-01", end="2024-06-07", freq="D")
    return {
        "AAPL": pd.Series(
            np.random.uniform(140, 160, len(dates)),
            index=dates,
            name="AAPL"
        ),
        "MSFT": pd.Series(
            np.random.uniform(190, 210, len(dates)),
            index=dates,
            name="MSFT"
        ),
        "SPY": pd.Series(
            np.random.uniform(500, 550, len(dates)),
            index=dates,
            name="SPY"
        ),
    }


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 11: GET /api/portfolio/{portfolio_id}/ytd-performance
# ────────────────────────────────────────────────────────────────────────────────

class TestYTDPerformance:
    """Test cases for YTD performance endpoint."""

    @patch("app.api.v1.portfolio.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_ytd_performance_success(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        sample_portfolio,
        sample_positions,
        mock_price_data,
    ):
        """Test successful YTD performance calculation."""
        mock_get_db.return_value = mock_db
        mock_fetch_prices.return_value = mock_price_data

        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = sample_portfolio
        mock_db.query.return_value.filter.return_value.all.return_value = sample_positions

        # Mock authentication
        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            response = client.get("/api/v1/portfolio/1/ytd-performance")

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "portfolio_id" in data
            assert "ytd_return_pct" in data
            assert "ytd_volatility_pct" in data
            assert "ytd_sharpe_ratio" in data
            assert "ytd_max_drawdown_pct" in data
            assert "alpha_pct" in data
            assert "beta" in data
            assert "information_ratio" in data
            assert "daily_points" in data
            assert isinstance(data["daily_points"], list)

            # Verify numeric constraints
            assert isinstance(data["ytd_return_pct"], (int, float))
            assert isinstance(data["ytd_volatility_pct"], (int, float))
            assert data["ytd_volatility_pct"] >= 0

    @patch("app.core.database.get_db")
    def test_ytd_performance_portfolio_not_found(self, mock_get_db, client, mock_db):
        """Test YTD performance with non-existent portfolio."""
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = MagicMock(id=1)

            response = client.get("/api/v1/portfolio/999/ytd-performance")

            assert response.status_code == 404
            assert "Carteira não encontrada" in response.json()["detail"]

    @patch("app.api.v1.portfolio.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_ytd_performance_no_positions(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        sample_portfolio,
    ):
        """Test YTD performance with no active positions."""
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = sample_portfolio
        mock_db.query.return_value.filter.return_value.all.return_value = []

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            response = client.get("/api/v1/portfolio/1/ytd-performance")

            assert response.status_code == 400
            assert "posições ativas" in response.json()["detail"]


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 12: GET /api/metrics/volatility
# ────────────────────────────────────────────────────────────────────────────────

class TestVolatilityMetrics:
    """Test cases for volatility metrics endpoint."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_volatility_success(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        mock_price_data,
    ):
        """Test successful volatility calculation."""
        mock_get_db.return_value = mock_db
        mock_fetch_prices.return_value = mock_price_data

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            response = client.get(
                "/api/v1/analytics/metrics/volatility?tickers=AAPL,MSFT"
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "tickers" in data
            assert "metrics" in data
            assert "portfolio_volatility_pct" in data
            assert "correlation_matrix" in data
            assert "computed_at" in data

            # Verify metrics for each ticker
            assert "AAPL" in data["metrics"]
            assert "MSFT" in data["metrics"]

            # Verify periods
            for ticker_metrics in data["metrics"].values():
                assert isinstance(ticker_metrics, list)
                for metric in ticker_metrics:
                    assert "period" in metric
                    assert "volatility_pct" in metric
                    assert metric["volatility_pct"] >= 0

    @patch("app.core.database.get_db")
    def test_volatility_no_tickers(self, mock_get_db, client, mock_db):
        """Test volatility endpoint without ticker parameter."""
        mock_get_db.return_value = mock_db

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = MagicMock(id=1)

            response = client.get("/api/v1/analytics/metrics/volatility")

            assert response.status_code == 422  # Validation error


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 13: GET /api/metrics/sharpe-ratio
# ────────────────────────────────────────────────────────────────────────────────

class TestSharpeRatioMetrics:
    """Test cases for Sharpe ratio endpoint."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_sharpe_ratio_success(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        mock_price_data,
    ):
        """Test successful Sharpe ratio calculation."""
        mock_get_db.return_value = mock_db
        mock_fetch_prices.return_value = mock_price_data

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            response = client.get(
                "/api/v1/analytics/metrics/sharpe-ratio?tickers=AAPL,MSFT&period=1y"
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "period" in data
            assert "metrics" in data
            assert "portfolio_sharpe" in data
            assert "best_performer" in data
            assert "worst_performer" in data
            assert "computed_at" in data

            # Verify metrics
            assert isinstance(data["metrics"], list)
            for metric in data["metrics"]:
                assert "ticker" in metric
                assert "sharpe_ratio" in metric
                assert "sortino_ratio" in metric
                assert "calmar_ratio" in metric

    @patch("app.core.database.get_db")
    def test_sharpe_ratio_invalid_period(self, mock_get_db, client, mock_db):
        """Test Sharpe ratio with invalid period."""
        mock_get_db.return_value = mock_db

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = MagicMock(id=1)

            response = client.get(
                "/api/v1/analytics/metrics/sharpe-ratio?tickers=AAPL&period=invalid"
            )

            assert response.status_code == 422  # Validation error


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 14: POST /api/analytics/backtest-results
# ────────────────────────────────────────────────────────────────────────────────

class TestBacktestResults:
    """Test cases for backtest results endpoint."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_backtest_results_success(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        mock_price_data,
    ):
        """Test successful backtest results calculation."""
        mock_get_db.return_value = mock_db
        mock_fetch_prices.return_value = mock_price_data

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            request_data = {
                "portfolio_id": 1,
                "tickers": ["AAPL", "MSFT"],
                "start_date": "2024-01-01",
                "initial_capital": 100000.0,
                "monthly_contribution": 1000.0,
                "rebalancing": "monthly",
                "include_dividends": True,
            }

            response = client.post(
                "/api/v1/analytics/backtest-results",
                json=request_data,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "request" in data
            assert "results" in data
            assert "execution_time_seconds" in data
            assert "computed_at" in data

            # Verify results
            results = data["results"]
            assert "final_equity" in results
            assert "total_return_pct" in results
            assert "cagr_pct" in results
            assert "sharpe_ratio" in results
            assert "max_drawdown_pct" in results
            assert "equity_curve" in results
            assert "monthly_returns" in results
            assert "yearly_returns" in results

    @patch("app.core.database.get_db")
    def test_backtest_results_no_tickers(self, mock_get_db, client, mock_db):
        """Test backtest results with no tickers."""
        mock_get_db.return_value = mock_db

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = MagicMock(id=1)

            request_data = {
                "portfolio_id": 1,
                "tickers": [],
                "initial_capital": 100000.0,
                "monthly_contribution": 1000.0,
            }

            response = client.post(
                "/api/v1/analytics/backtest-results",
                json=request_data,
            )

            assert response.status_code == 400


# ────────────────────────────────────────────────────────────────────────────────
# Endpoint 15: GET /api/analytics/risk-analysis
# ────────────────────────────────────────────────────────────────────────────────

class TestRiskAnalysis:
    """Test cases for risk analysis endpoint."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_risk_analysis_success(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        sample_portfolio,
        sample_positions,
        mock_price_data,
    ):
        """Test successful risk analysis calculation."""
        mock_get_db.return_value = mock_db
        mock_fetch_prices.return_value = mock_price_data

        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = sample_portfolio
        mock_db.query.return_value.filter.return_value.all.return_value = sample_positions

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            response = client.get("/api/v1/analytics/risk-analysis?portfolio_id=1")

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "portfolio_id" in data
            assert "risk_level" in data
            assert "risk_score" in data
            assert "metrics" in data
            assert "scenarios" in data
            assert "recommendations" in data
            assert "computed_at" in data

            # Verify risk levels
            assert data["risk_level"] in ["low", "moderate", "high", "critical"]
            assert 0 <= data["risk_score"] <= 100

            # Verify metrics
            assert isinstance(data["metrics"], list)
            for metric in data["metrics"]:
                assert "name" in metric
                assert "value" in metric
                assert "unit" in metric
                assert "status" in metric

            # Verify scenarios
            assert isinstance(data["scenarios"], list)
            for scenario in data["scenarios"]:
                assert "name" in scenario
                assert "portfolio_impact_pct" in scenario
                assert "probability_pct" in scenario

    @patch("app.core.database.get_db")
    def test_risk_analysis_portfolio_not_found(self, mock_get_db, client, mock_db):
        """Test risk analysis with non-existent portfolio."""
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = MagicMock(id=1)

            response = client.get("/api/v1/analytics/risk-analysis?portfolio_id=999")

            assert response.status_code == 404
            assert "Carteira não encontrada" in response.json()["detail"]

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_risk_analysis_no_positions(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        sample_portfolio,
    ):
        """Test risk analysis with no active positions."""
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = sample_portfolio
        mock_db.query.return_value.filter.return_value.all.return_value = []

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            response = client.get("/api/v1/analytics/risk-analysis?portfolio_id=1")

            assert response.status_code == 400
            assert "posições ativas" in response.json()["detail"]


# ────────────────────────────────────────────────────────────────────────────────
# Integration Tests
# ────────────────────────────────────────────────────────────────────────────────

class TestAnalyticsIntegration:
    """Integration tests for analytics endpoints."""

    @patch("app.api.v1.analytics.fetch_multiple_price_history")
    @patch("app.core.database.get_db")
    def test_all_endpoints_data_consistency(
        self,
        mock_get_db,
        mock_fetch_prices,
        client,
        mock_db,
        sample_user,
        sample_portfolio,
        sample_positions,
        mock_price_data,
    ):
        """Test that all endpoints return consistent data types."""
        mock_get_db.return_value = mock_db
        mock_fetch_prices.return_value = mock_price_data
        mock_db.query.return_value.filter.return_value.first.return_value = sample_portfolio
        mock_db.query.return_value.filter.return_value.all.return_value = sample_positions

        with patch("app.core.security.get_current_user_or_demo") as mock_auth:
            mock_auth.return_value = sample_user

            # Test all endpoints are accessible and return valid JSON
            endpoints = [
                "/api/v1/portfolio/1/ytd-performance",
                "/api/v1/analytics/metrics/volatility?tickers=AAPL",
                "/api/v1/analytics/metrics/sharpe-ratio?tickers=AAPL",
                "/api/v1/analytics/risk-analysis?portfolio_id=1",
            ]

            for endpoint in endpoints:
                if "POST" not in endpoint:
                    response = client.get(endpoint)
                    assert response.status_code in [200, 400, 404, 422]
                    if response.status_code == 200:
                        data = response.json()
                        assert isinstance(data, dict)
                        assert "computed_at" in data or "execution_time_seconds" in data
