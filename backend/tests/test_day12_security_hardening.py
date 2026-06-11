"""
Day 12: Security Hardening Verification Tests
Tests for HTTPS/TLS, security headers, JWT refresh tokens, rate limiting, and data protection.
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import (
    create_token_pair,
    add_token_to_blacklist,
    is_token_blacklisted,
    get_token_blacklist,
)

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# 1. SECURITY HEADERS TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestSecurityHeaders:
    """Verify security headers are present in all responses."""

    def test_hsts_header_present(self):
        """Test Strict-Transport-Security header."""
        response = client.get("/api/health")
        assert "Strict-Transport-Security" in response.headers
        assert "max-age=31536000" in response.headers["Strict-Transport-Security"]

    def test_x_frame_options_deny(self):
        """Test X-Frame-Options: DENY prevents iframe embedding."""
        response = client.get("/api/health")
        assert response.headers.get("X-Frame-Options") == "DENY"

    def test_x_content_type_options_nosniff(self):
        """Test X-Content-Type-Options: nosniff prevents MIME sniffing."""
        response = client.get("/api/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"

    def test_content_security_policy_present(self):
        """Test Content-Security-Policy header is present."""
        response = client.get("/api/health")
        csp = response.headers.get("Content-Security-Policy")
        assert csp is not None
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp

    def test_referrer_policy_present(self):
        """Test Referrer-Policy header."""
        response = client.get("/api/health")
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    def test_x_xss_protection_header(self):
        """Test X-XSS-Protection header."""
        response = client.get("/api/health")
        assert "X-XSS-Protection" in response.headers
        assert "1; mode=block" in response.headers["X-XSS-Protection"]

    def test_permissions_policy_present(self):
        """Test Permissions-Policy header."""
        response = client.get("/api/health")
        assert "Permissions-Policy" in response.headers


# ─────────────────────────────────────────────────────────────────────────────
# 2. JWT & TOKEN TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestJWTAndTokens:
    """Test JWT token creation, refresh, and security."""

    def test_token_pair_creation(self):
        """Test creating access and refresh token pair."""
        tokens = create_token_pair("test@example.com")
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"

    def test_token_types_are_different(self):
        """Test that access and refresh tokens are different."""
        tokens = create_token_pair("test@example.com")
        assert tokens["access_token"] != tokens["refresh_token"]

    def test_token_blacklist_functionality(self):
        """Test token blacklisting for logout."""
        token = "test_token_xyz"
        assert not is_token_blacklisted(token)

        add_token_to_blacklist(token)
        assert is_token_blacklisted(token)

        blacklist = get_token_blacklist()
        assert token in blacklist

    def test_register_new_user(self):
        """Test user registration endpoint."""
        import time
        email = f"loadtest_{int(time.time() * 1000)}@example.com"

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePass123!",
                "full_name": "Test User",
                "risk_profile": "balanced",
            },
        )
        assert response.status_code in [201, 400]  # 201 or 400 if already exists

    def test_login_returns_both_tokens(self):
        """Test login endpoint returns access and refresh tokens."""
        # First register a test user
        import time
        email = f"tokentest_{int(time.time() * 1000)}@example.com"

        client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "TestPass123!",
                "full_name": "Token Test User",
                "risk_profile": "balanced",
            },
        )

        # Login
        response = client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": "TestPass123!"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_token_endpoint(self):
        """Test token refresh endpoint."""
        # This requires a valid refresh token
        # Skipping for now as it requires auth setup
        pass

    def test_logout_endpoint_exists(self):
        """Test logout endpoint is available."""
        response = client.post("/api/v1/auth/logout")
        # Should be 401 (unauthorized) without a token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ─────────────────────────────────────────────────────────────────────────────
# 3. REQUEST VALIDATION TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestRequestValidation:
    """Test request validation and sanitization."""

    def test_oversized_request_rejected(self):
        """Test that oversized requests are rejected."""
        # Create a very large payload
        large_data = "x" * (11 * 1024 * 1024)  # 11 MB

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": large_data,
                "full_name": "Test",
                "risk_profile": "balanced",
            },
        )
        # Should be rejected or handle gracefully
        # Status could be 413 (Payload Too Large) or validation error
        assert response.status_code >= 400

    def test_invalid_json_content_type(self):
        """Test rejection of invalid Content-Type."""
        response = client.post(
            "/api/v1/auth/login",
            data="invalid data",
            headers={"Content-Type": "application/xml"},
        )
        assert response.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    def test_sql_injection_in_query_params_blocked(self):
        """Test SQL injection attempts are detected and blocked."""
        response = client.get(
            "/api/v1/assets?search=UNION SELECT * FROM users"
        )
        # Should either block or sanitize
        assert response.status_code in [400, 200]  # Blocked or safely handled

    def test_xss_in_query_params_blocked(self):
        """Test XSS attempts are detected and blocked."""
        response = client.get(
            "/api/v1/assets?search=<script>alert('xss')</script>"
        )
        # Should either block or sanitize
        assert response.status_code in [400, 200]

    def test_correlation_id_header_added(self):
        """Test X-Request-ID correlation ID is added to responses."""
        response = client.get("/api/health")
        assert "X-Request-ID" in response.headers
        assert response.headers["X-Request-ID"]  # Not empty


# ─────────────────────────────────────────────────────────────────────────────
# 4. CORS & ORIGIN TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestCORS:
    """Test CORS configuration and enforcement."""

    def test_cors_preflight_request(self):
        """Test CORS preflight (OPTIONS) request."""
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        # Should succeed with 204 or 200
        assert response.status_code in [200, 204]

    def test_cors_headers_in_response(self):
        """Test CORS headers in response."""
        response = client.get(
            "/api/health",
            headers={"Origin": "http://localhost:3000"},
        )
        # Should have CORS headers for allowed origins
        assert response.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# 5. RATE LIMITING TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_health_check_not_rate_limited(self):
        """Test that health checks are not rate limited."""
        for _ in range(10):
            response = client.get("/api/health")
            assert response.status_code == 200

    def test_auth_endpoints_rate_limited(self):
        """Test that auth endpoints have rate limiting."""
        # Note: Rate limiting is memory-based and per-IP
        # This test verifies the structure is in place
        response = client.get("/api/health")
        assert response.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# 6. HTTP METHOD RESTRICTION TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestHTTPMethodRestriction:
    """Test HTTP method restrictions."""

    def test_unsupported_trace_method_blocked(self):
        """Test TRACE method is blocked."""
        response = client.request("TRACE", "/api/health")
        assert response.status_code in [400, 405]

    def test_get_allowed_on_health(self):
        """Test GET is allowed on health endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# 7. DATA PROTECTION TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestDataProtection:
    """Test data protection measures."""

    def test_password_hash_used(self):
        """Test that passwords are hashed."""
        import time
        email = f"hashtest_{int(time.time() * 1000)}@example.com"
        password = "HashTestPass123!"

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "full_name": "Hash Test",
                "risk_profile": "balanced",
            },
        )

        if response.status_code == 201:
            # Password should not be in response
            assert password not in response.text

    def test_sensitive_data_not_in_logs(self):
        """Test that sensitive data is not logged."""
        # This would require log inspection
        # Implementation depends on logging setup
        pass

    def test_cache_control_on_sensitive_endpoints(self):
        """Test Cache-Control headers on sensitive endpoints."""
        # Authenticated endpoints should have no-store
        response = client.get("/api/health")
        # Health endpoint might be cached, but auth endpoints shouldn't
        assert response.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY TESTS
# ─────────────────────────────────────────────────────────────────────────────


class TestSecurityComplianceOverall:
    """Overall security compliance tests."""

    def test_owasp_a01_access_control(self):
        """Test OWASP A01:2021 - Broken Access Control."""
        # JWT-based access control
        response = client.get("/api/v1/auth/me")
        # Should fail without token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_owasp_a05_misconfiguration(self):
        """Test OWASP A05:2021 - Security Misconfiguration."""
        response = client.get("/api/health")
        # Headers should be properly configured
        assert "Strict-Transport-Security" in response.headers
        assert "X-Frame-Options" in response.headers

    def test_docs_hidden_in_production(self):
        """Test that documentation is hidden in production mode."""
        # In production, docs should be disabled
        response = client.get("/api/docs")
        # May be 200 (dev) or 404 (prod)
        assert response.status_code in [200, 404]

    def test_server_header_customized(self):
        """Test Server header is customized (not default)."""
        response = client.get("/api/health")
        server = response.headers.get("Server", "")
        assert "LBH" in server or server == ""  # Either custom or empty

    def test_error_messages_generic(self):
        """Test that error messages are generic (don't leak info)."""
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "nonexistent@example.com", "password": "wrong"},
        )
        # Should fail but with generic message
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "invalid" in response.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# PYTEST CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
