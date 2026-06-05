"""
Rate Limiting Middleware usando slowapi
Implementação de rate limiting por IP com diferentes limites por endpoint
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from fastapi import Request
from app.core.config import settings

# Inicializar limiter global
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"] if settings.ENABLE_RATE_LIMITING else None,
    storage_uri="memory://",  # Pode ser alterado para Redis em prod
)

# Dicionário de limites por tipo de operação
RATE_LIMITS = {
    "auth": settings.RATE_LIMIT_AUTH,              # 5/minute — login attempts
    "messages": settings.RATE_LIMIT_MESSAGES,      # 100/minute — enviar mensagens
    "search": settings.RATE_LIMIT_SEARCH,          # 50/minute — buscas
    "general": settings.RATE_LIMIT_GENERAL,        # 200/minute — endpoints gerais
    "billing": "50/minute",                         # 50/minute — operações de pagamento
    "moderation": "30/minute",                      # 30/minute — reports
}


def get_rate_limit_handler():
    """Retorna o handler para RateLimitExceeded"""

    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        """
        Handler customizado para rate limit exceeded.
        Retorna JSON estruturado com retry info.
        """
        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limit_exceeded",
                "message": "Muitos requests. Tente novamente em 1 minuto.",
                "retry_after": 60,
                "details": str(exc.detail) if exc.detail else "Rate limit exceeded"
            }
        )

    return rate_limit_handler


def apply_rate_limiter_to_app(app):
    """
    Aplicar rate limiter à app FastAPI.

    Usage:
    ```python
    from app.core.rate_limiter import apply_rate_limiter_to_app

    app = FastAPI()
    apply_rate_limiter_to_app(app)
    ```
    """
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        get_rate_limit_handler()
    )


# Decoradores prontos para usar nas rotas
class RateLimitDecorators:
    """
    Decoradores pré-configurados para diferentes tipos de endpoints.

    Usage em rotas:
    ```python
    @router.post("/login")
    @RateLimitDecorators.auth
    async def login(...):
        pass
    ```
    """

    @staticmethod
    def auth(func):
        """Rate limit para autenticação: 5/minute"""
        return limiter.limit(RATE_LIMITS["auth"])(func)

    @staticmethod
    def messages(func):
        """Rate limit para mensagens: 100/minute"""
        return limiter.limit(RATE_LIMITS["messages"])(func)

    @staticmethod
    def search(func):
        """Rate limit para buscas: 50/minute"""
        return limiter.limit(RATE_LIMITS["search"])(func)

    @staticmethod
    def general(func):
        """Rate limit geral: 200/minute"""
        return limiter.limit(RATE_LIMITS["general"])(func)

    @staticmethod
    def billing(func):
        """Rate limit para operações de pagamento: 50/minute"""
        return limiter.limit(RATE_LIMITS["billing"])(func)

    @staticmethod
    def moderation(func):
        """Rate limit para reports de moderação: 30/minute"""
        return limiter.limit(RATE_LIMITS["moderation"])(func)

    @staticmethod
    def custom(limit: str):
        """Rate limit customizado"""
        def decorator(func):
            return limiter.limit(limit)(func)
        return decorator


# Exemplo de uso em decorador manual (alternativa)
def rate_limit_auth(func):
    """Decorator: rate limit 5 requests/minute para auth"""
    return limiter.limit(RATE_LIMITS["auth"])(func)


def rate_limit_messages(func):
    """Decorator: rate limit 100 requests/minute para messages"""
    return limiter.limit(RATE_LIMITS["messages"])(func)


def rate_limit_search(func):
    """Decorator: rate limit 50 requests/minute para search"""
    return limiter.limit(RATE_LIMITS["search"])(func)


def rate_limit_general(func):
    """Decorator: rate limit 200 requests/minute para endpoints gerais"""
    return limiter.limit(RATE_LIMITS["general"])(func)


def rate_limit_billing(func):
    """Decorator: rate limit 50 requests/minute para billing"""
    return limiter.limit(RATE_LIMITS["billing"])(func)


def rate_limit_moderation(func):
    """Decorator: rate limit 30 requests/minute para moderation"""
    return limiter.limit(RATE_LIMITS["moderation"])(func)
