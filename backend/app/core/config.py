from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/leveraged_bh"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    ALPHA_VANTAGE_API_KEY: str = ""
    FRED_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000"]'

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        try:
            origins = json.loads(self.BACKEND_CORS_ORIGINS)
            # Always allow localhost for development
            if "http://localhost:3000" not in origins:
                origins.append("http://localhost:3000")
            return origins
        except Exception:
            return ["http://localhost:3000", "http://localhost:8000", "http://localhost:8001"]


settings = Settings()
