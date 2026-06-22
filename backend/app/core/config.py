from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/leveraged_bh"

    # Security - JWT & Tokens
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Short-lived access token
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # Longer-lived refresh token
    TOKEN_ALGORITHM: str = "HS256"

    # TLS & HTTPS
    HTTPS_ONLY: bool = True
    TLS_MIN_VERSION: str = "TLSv1.3"
    HSTS_MAX_AGE: int = 31536000  # 1 year in seconds

    # Rate Limiting
    ENABLE_RATE_LIMITING: bool = True
    RATE_LIMIT_AUTH: str = "5/minute"           # Login attempts
    RATE_LIMIT_MESSAGES: str = "100/minute"     # Messages
    RATE_LIMIT_SEARCH: str = "50/minute"        # Searches
    RATE_LIMIT_GENERAL: str = "200/minute"      # General endpoints
    RATE_LIMIT_BILLING: str = "50/minute"       # Billing operations
    RATE_LIMIT_API: str = "1000/hour"           # API overall

    # Session & Cookie Security
    SESSION_TIMEOUT_MINUTES: int = 30           # Inactivity timeout
    ABSOLUTE_TIMEOUT_HOURS: int = 24            # Max session duration
    COOKIE_SECURE: bool = True                  # HTTPS only
    COOKIE_HTTP_ONLY: bool = True               # No JS access
    COOKIE_SAME_SITE: str = "strict"            # CSRF protection

    # Request Validation
    MAX_REQUEST_SIZE_MB: int = 10
    REQUEST_TIMEOUT_SECONDS: int = 30

    # Data Encryption
    ENCRYPT_SENSITIVE_DATA: bool = True
    ENCRYPTION_KEY: str = ""  # Set via environment

    # Security Headers
    CSP_ENABLED: bool = True
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    CORS_ALLOW_HEADERS: List[str] = ["Content-Type", "Authorization"]

    # External APIs
    ALPHA_VANTAGE_API_KEY: str = ""
    FRED_API_KEY: str = ""

    # Environment & Configuration
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000"]'
    DEMO_MODE: bool = False

    # OAuth
    GOOGLE_CLIENT_ID: str = ""

    # Payment Processing
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # JSON structured logging
    MASK_SENSITIVE_LOGS: bool = True

    # Monitoring & Observability
    ENABLE_METRICS: bool = True
    ENABLE_TRACING: bool = True

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        try:
            origins = json.loads(self.BACKEND_CORS_ORIGINS)
            # Always allow localhost for development
            if self.ENVIRONMENT == "development":
                if "http://localhost:3000" not in origins:
                    origins.append("http://localhost:3000")
            return origins
        except Exception:
            return ["http://localhost:3000", "http://localhost:8000", "http://localhost:8001"]

    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT.lower() == "production"

    def get_security_headers(self) -> dict:
        """Get computed security headers."""
        return {
            "Strict-Transport-Security": f"max-age={self.HSTS_MAX_AGE}; includeSubDomains",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        }


settings = Settings()

# Fail-LOUD (não crash) se em produção a SECRET_KEY ainda for o PLACEHOLDER — assim o JWT
# seria assinável por qualquer um que conheça o default público. Aviso em vez de derrubar o
# boot porque a auth VIVA é o BFF Node/jose (AUTH_SECRET); esta SECRET_KEY do FastAPI hoje é
# vestigial (routers de auth desativados). Se reativar auth no FastAPI, vire isto um raise.
if settings.is_production() and settings.SECRET_KEY == "change-this-secret-key-in-production":
    import logging as _lg
    _lg.getLogger(__name__).critical(
        "[CONFIG] SECRET_KEY é o PLACEHOLDER público em produção — rotacione e defina SECRET_KEY "
        "no ambiente antes de reativar qualquer auth do FastAPI."
    )
