"""
GUIA DE ATUALIZAÇÃO PARA config.py
===================================

Copie e cole a CLASSE SETTINGS abaixo em backend/app/core/config.py

PASSOS:
1. Abrir backend/app/core/config.py
2. SUBSTITUIR a classe Settings com a versão abaixo
3. Salvar arquivo

"""

from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # ========== DATABASE ==========
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/leveraged_bh"

    # ========== AUTH ==========
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ========== EXTERNAL APIs ==========
    ALPHA_VANTAGE_API_KEY: str = ""
    FRED_API_KEY: str = ""

    # ========== ENVIRONMENT ==========
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000"]'

    # ========== RATE LIMITING (NEW) ==========
    ENABLE_RATE_LIMITING: bool = True
    RATE_LIMIT_AUTH: str = "5/minute"           # Login attempts
    RATE_LIMIT_MESSAGES: str = "100/minute"     # Send messages
    RATE_LIMIT_SEARCH: str = "50/minute"        # Search/filtering
    RATE_LIMIT_GENERAL: str = "200/minute"      # General endpoints

    # ========== STRIPE INTEGRATION (NEW) ==========
    STRIPE_SECRET_KEY: str = ""                 # sk_test_xxxxx or sk_live_xxxxx
    STRIPE_PUBLIC_KEY: str = ""                 # pk_test_xxxxx or pk_live_xxxxx
    STRIPE_WEBHOOK_SECRET: str = ""             # whsec_xxxxx
    STRIPE_PREMIUM_PRICE_ID: str = "price_pro_monthly_usd_test"  # Price ID from Stripe

    # ========== CONTENT MODERATION (NEW) ==========
    ENABLE_CONTENT_MODERATION: bool = True
    MIN_MODERATION_CONFIDENCE: float = 0.8      # 80% confidence to block

    # ========== CONFIG ==========
    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        try:
            return json.loads(self.BACKEND_CORS_ORIGINS)
        except Exception:
            return ["http://localhost:3000"]


settings = Settings()


# ============================================================================
# COMO ATUALIZAR .env
# ============================================================================
"""
Adicione estas variáveis ao seu arquivo .env:

# Rate Limiting
ENABLE_RATE_LIMITING=true
RATE_LIMIT_AUTH=5/minute
RATE_LIMIT_MESSAGES=100/minute
RATE_LIMIT_SEARCH=50/minute
RATE_LIMIT_GENERAL=200/minute

# Stripe (obter em https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghij
STRIPE_PUBLIC_KEY=pk_test_51234567890abcdefghij
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghij
STRIPE_PREMIUM_PRICE_ID=price_1234567890abcdefghij

# Content Moderation
ENABLE_CONTENT_MODERATION=true
MIN_MODERATION_CONFIDENCE=0.8
"""


# ============================================================================
# RESUMO DAS MUDANÇAS
# ============================================================================
"""
Novos campos adicionados à classe Settings:

1. ENABLE_RATE_LIMITING (bool)
2. RATE_LIMIT_AUTH (str)
3. RATE_LIMIT_MESSAGES (str)
4. RATE_LIMIT_SEARCH (str)
5. RATE_LIMIT_GENERAL (str)
6. STRIPE_SECRET_KEY (str)
7. STRIPE_PUBLIC_KEY (str)
8. STRIPE_WEBHOOK_SECRET (str)
9. STRIPE_PREMIUM_PRICE_ID (str)
10. ENABLE_CONTENT_MODERATION (bool)
11. MIN_MODERATION_CONFIDENCE (float)

Todos têm valores defaults seguros, então não quebrará nada.
"""
