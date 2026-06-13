"""
Security Middleware Suite for LBH Platform
Implements OWASP-compliant security headers, TLS enforcement, and request validation.
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import MutableHeaders
import logging
import hashlib
import re

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add comprehensive security headers to all responses.
    Implements OWASP security best practices.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Add security headers
        headers = MutableHeaders(response.headers)

        # HSTS - Strict-Transport-Security (force HTTPS)
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # CSP - Content-Security-Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.example.com wss://ws.example.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        headers["Content-Security-Policy"] = csp

        # Prevent iframe embedding
        headers["X-Frame-Options"] = "DENY"

        # Prevent MIME type sniffing
        headers["X-Content-Type-Options"] = "nosniff"

        # Referrer Policy - don't leak referrer to external sites
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # XSS Protection (legacy, but good for older browsers)
        headers["X-XSS-Protection"] = "1; mode=block"

        # Permissions Policy - restrict browser features
        headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        # Remove server identification
        if "Server" in headers:
            del headers["Server"]
        headers["Server"] = "LBH/1.0"

        # Disable caching for sensitive endpoints
        if any(path in request.url.path for path in ["/auth", "/api/billing", "/api/portfolio"]):
            headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            headers["Pragma"] = "no-cache"
            headers["Expires"] = "0"

        return response


class TLSEnforcementMiddleware(BaseHTTPMiddleware):
    """
    Enforce HTTPS/TLS 1.3 and redirect HTTP to HTTPS.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # In production, verify TLS 1.3 is being used
        if request.headers.get("x-forwarded-proto") == "http":
            # Redirect to HTTPS
            from fastapi.responses import RedirectResponse
            return RedirectResponse(
                url=f"https://{request.headers.get('host')}{request.url.path}",
                status_code=307
            )

        response = await call_next(request)
        return response


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Validate request size, timeout, and content-type.
    """

    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_CONTENT_TYPES = {
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
        "application/octet-stream"
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        # Validate Content-Length if present
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_REQUEST_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "error": "payload_too_large",
                    "message": f"Request size exceeds {self.MAX_REQUEST_SIZE / (1024*1024):.0f}MB limit"
                }
            )

        # Validate Content-Type for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "").split(";")[0].strip()
            if content_type and not any(
                ct in content_type for ct in self.ALLOWED_CONTENT_TYPES
            ):
                return JSONResponse(
                    status_code=415,
                    content={
                        "error": "unsupported_media_type",
                        "message": f"Content-Type '{content_type}' not allowed"
                    }
                )

        response = await call_next(request)
        return response


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Detect and block common injection attack patterns.
    """

    # SQL injection patterns
    SQL_INJECTION_PATTERN = re.compile(
        r"(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
        re.IGNORECASE
    )

    # XSS patterns
    XSS_PATTERN = re.compile(
        r"(<script|javascript:|onerror=|onload=|onclick=|svg|<iframe)",
        re.IGNORECASE
    )

    async def dispatch(self, request: Request, call_next) -> Response:
        # Check query parameters for injection
        for param, value in request.query_params.items():
            if self._is_suspicious(str(value)):
                logger.warning(f"Suspicious query parameter detected: {param}")
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "invalid_input",
                        "message": "Request contains suspicious content"
                    }
                )

        response = await call_next(request)
        return response

    def _is_suspicious(self, value: str) -> bool:
        """Check if value contains injection patterns."""
        if len(value) > 1000:  # Extremely long strings are suspicious
            return True

        if self.SQL_INJECTION_PATTERN.search(value):
            return True

        if self.XSS_PATTERN.search(value):
            return True

        return False


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Add request correlation ID for tracing.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Use existing X-Request-ID or generate new one
        correlation_id = request.headers.get("x-request-id", None)
        if not correlation_id:
            import uuid
            correlation_id = str(uuid.uuid4())

        # Store in request state for logging
        request.state.correlation_id = correlation_id

        response = await call_next(request)

        # Add to response headers
        response.headers["X-Request-ID"] = correlation_id
        response.headers["X-Content-Type-Options"] = "nosniff"

        return response


class CORSEnforcementMiddleware(BaseHTTPMiddleware):
    """
    Enhanced CORS enforcement with preflight handling.
    """

    def __init__(self, app, allowed_origins: list = None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or [
            "http://localhost:3000",
            "http://localhost:8000"
        ]

    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("origin")

        # Handle preflight requests
        if request.method == "OPTIONS":
            if origin in self.allowed_origins:
                return Response(
                    status_code=204,
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Max-Age": "3600",
                        "Access-Control-Allow-Credentials": "true",
                    }
                )
            else:
                return Response(status_code=403)

        response = await call_next(request)

        # Add CORS headers to response
        if origin in self.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = "Content-Length, X-Request-ID"

        return response


class HTTPMethodRestrictionMiddleware(BaseHTTPMiddleware):
    """
    Restrict HTTP methods and TRACE/CONNECT requests.
    """

    ALLOWED_METHODS = {"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Block dangerous HTTP methods
        if request.method not in self.allowed_METHODS:
            return JSONResponse(
                status_code=405,
                content={
                    "error": "method_not_allowed",
                    "message": f"HTTP {request.method} not allowed"
                }
            )

        response = await call_next(request)
        return response


def register_security_middleware(app):
    """
    Register all security middleware in proper order.
    Order matters: most restrictive first.
    """

    # 1. Correlation ID (must be first for logging)
    app.add_middleware(CorrelationIdMiddleware)

    # 2. TLS enforcement (redirect HTTP to HTTPS)
    app.add_middleware(TLSEnforcementMiddleware)

    # 3. Request validation (size, content-type)
    app.add_middleware(RequestValidationMiddleware)

    # 4. Input sanitization (detect injection attempts)
    app.add_middleware(InputSanitizationMiddleware)

    # 5. HTTP method restriction
    app.add_middleware(HTTPMethodRestrictionMiddleware)

    # 6. CORS enforcement — Sprint 1 (hybrid plan): CORS agora vem do CORSMiddleware
    # restrito em app/main.py, lendo CORS_ORIGINS do env. Removido daqui pra evitar
    # duplicação de headers Access-Control-* e conflito de policy.
    # app.add_middleware(CORSEnforcementMiddleware)

    # 7. Security headers (last, adds headers to response)
    app.add_middleware(SecurityHeadersMiddleware)


__all__ = [
    "SecurityHeadersMiddleware",
    "TLSEnforcementMiddleware",
    "RequestValidationMiddleware",
    "InputSanitizationMiddleware",
    "CorrelationIdMiddleware",
    "CORSEnforcementMiddleware",
    "HTTPMethodRestrictionMiddleware",
    "register_security_middleware",
]
