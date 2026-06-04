"""
Logo API endpoints. Uses FMP Search API with secure backend key.

Endpoints:
  GET /api/v1/logos/search/{ticker} - Get logo URL for ticker via FMP
  GET /api/v1/logos/cache-stats     - Get cache statistics
  POST /api/v1/logos/clear-cache    - Clear expired cache
"""

import os
import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/logos", tags=["logos"])

# FMP API key (backend secret, not exposed to frontend)
FMP_API_KEY = os.getenv("FMP_API_KEY", "")

# In-memory cache (in production, use Redis)
LOGO_CACHE: dict[str, dict] = {}
CACHE_EXPIRY_HOURS = 24


class LogoResponse(BaseModel):
    """Logo lookup response."""
    ticker: str
    name: Optional[str] = None
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
    source: str  # "fmp", "cache", "failed"
    cached: bool = False
    expires_at: Optional[datetime] = None


@router.get("/search/{ticker}", response_model=LogoResponse)
async def search_logo(ticker: str = Query(..., description="Ticker symbol (e.g., AAPL, PETR4)")) -> LogoResponse:
    """
    Search for company logo using FMP API with secure backend key.

    Uses in-memory cache to avoid repeated API calls.
    Falls back to empty if FMP key not configured.

    Args:
        ticker: Stock ticker (any market)

    Returns:
        LogoResponse with logo_url and company info
    """
    ticker = ticker.upper().strip()

    # Validate ticker
    if not ticker or len(ticker) > 20:
        raise HTTPException(status_code=400, detail="Invalid ticker")

    # Check cache first
    if ticker in LOGO_CACHE:
        cached_entry = LOGO_CACHE[ticker]
        if cached_entry["expires_at"] > datetime.utcnow():
            logger.info(f"Logo cache hit: {ticker}")
            return LogoResponse(
                ticker=ticker,
                name=cached_entry.get("name"),
                logo_url=cached_entry.get("logo_url"),
                image_url=cached_entry.get("image_url"),
                source="cache",
                cached=True,
                expires_at=cached_entry["expires_at"],
            )
        else:
            # Expired, remove from cache
            del LOGO_CACHE[ticker]

    # If no FMP key, return empty response
    if not FMP_API_KEY:
        logger.warning("FMP_API_KEY not configured, returning empty logo")
        return LogoResponse(
            ticker=ticker,
            source="failed",
            cached=False,
        )

    # Call FMP Search API
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            url = "https://financialmodelingprep.com/api/v3/search"
            params = {
                "query": ticker,
                "limit": 1,
                "apikey": FMP_API_KEY,
            }

            logger.info(f"Calling FMP search for {ticker}")
            response = await client.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            if not data:
                logger.info(f"FMP returned no results for {ticker}")
                return LogoResponse(
                    ticker=ticker,
                    source="failed",
                    cached=False,
                )

            # Extract first result
            result = data[0]
            logo_url = result.get("image", "")
            company_name = result.get("name", "")

            # Cache the result
            expires_at = datetime.utcnow() + timedelta(hours=CACHE_EXPIRY_HOURS)
            LOGO_CACHE[ticker] = {
                "name": company_name,
                "logo_url": logo_url,
                "image_url": logo_url,
                "expires_at": expires_at,
            }

            logger.info(f"FMP search successful for {ticker}: {company_name}")
            return LogoResponse(
                ticker=ticker,
                name=company_name,
                logo_url=logo_url,
                image_url=logo_url,
                source="fmp",
                cached=False,
                expires_at=expires_at,
            )

    except httpx.HTTPError as e:
        logger.error(f"FMP API error for {ticker}: {str(e)}")
        return LogoResponse(
            ticker=ticker,
            source="failed",
            cached=False,
        )
    except Exception as e:
        logger.error(f"Unexpected error searching logo for {ticker}: {str(e)}")
        return LogoResponse(
            ticker=ticker,
            source="failed",
            cached=False,
        )


@router.get("/cache-stats")
async def cache_stats() -> dict:
    """Get cache statistics."""
    now = datetime.utcnow()
    cached = sum(1 for entry in LOGO_CACHE.values() if entry["expires_at"] > now)
    expired = len(LOGO_CACHE) - cached

    return {
        "total_cached": len(LOGO_CACHE),
        "valid_entries": cached,
        "expired_entries": expired,
        "cache_hours": CACHE_EXPIRY_HOURS,
    }


@router.post("/clear-cache")
async def clear_cache() -> dict:
    """Clear expired cache entries."""
    now = datetime.utcnow()
    initial_size = len(LOGO_CACHE)

    expired_keys = [k for k, v in LOGO_CACHE.items() if v["expires_at"] <= now]
    for key in expired_keys:
        del LOGO_CACHE[key]

    return {
        "initial_size": initial_size,
        "final_size": len(LOGO_CACHE),
        "cleared": len(expired_keys),
    }
