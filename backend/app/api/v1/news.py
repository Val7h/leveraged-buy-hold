"""Market news endpoint — aggregates from multiple tickers via yfinance"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import yfinance as yf
from datetime import datetime, timezone
import re

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/news", tags=["news"])

# Default tickers to pull news from (broad market + crypto)
DEFAULT_TICKERS = ["SPY", "QQQ", "BTC-USD", "ETH-USD", "MSFT", "AAPL", "NVDA"]

# Category tags
CATEGORY_MAP = {
    r"bitcoin|btc|crypto|ethereum|eth|blockchain": "Cripto",
    r"fed|inflation|rate|gdp|recession|economy|macro": "Macro",
    r"earnings|revenue|profit|eps|quarterly": "Resultados",
    r"etf|index|s&p|nasdaq|dow": "Índices",
    r"oil|gold|commodity|silver|crude": "Commodities",
    r"tech|ai|artificial|chip|semiconductor": "Tecnologia",
    r"brazil|brl|bovespa|ibov|petrobras|vale": "Brasil",
}


def _classify(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for pattern, category in CATEGORY_MAP.items():
        if re.search(pattern, text):
            return category
    return "Mercado"


def _format_article(raw: dict, source_ticker: str) -> Optional[dict]:
    try:
        content = raw.get("content", {})
        if not content:
            return None

        title = content.get("title", "").strip()
        if not title:
            return None

        summary = content.get("summary", "") or ""
        pub_date = content.get("pubDate", "") or ""
        url = content.get("canonicalUrl", {}).get("url", "") if isinstance(content.get("canonicalUrl"), dict) else ""
        provider = content.get("provider", {}).get("displayName", "Reuters") if isinstance(content.get("provider"), dict) else "Reuters"

        # Thumbnail
        thumbnail = ""
        thumb_data = content.get("thumbnail", {})
        if isinstance(thumb_data, dict):
            resolutions = thumb_data.get("resolutions", [])
            if resolutions:
                thumbnail = resolutions[0].get("url", "")

        return {
            "id": raw.get("id", ""),
            "title": title,
            "summary": summary[:300] + "…" if len(summary) > 300 else summary,
            "url": url,
            "published_at": pub_date,
            "source": provider,
            "thumbnail": thumbnail,
            "category": _classify(title, summary),
            "ticker": source_ticker,
        }
    except Exception:
        return None


@router.get("")
def get_news(
    tickers: str = Query(default=",".join(DEFAULT_TICKERS), description="Comma-separated tickers"),
    limit: int = Query(default=30, le=60),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregate market news from yfinance for a set of tickers.
    Returns deduplicated, categorised articles sorted by date.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:8]
    seen_ids: set = set()
    articles: list = []

    for ticker in ticker_list:
        try:
            t = yf.Ticker(ticker)
            raw_news = t.news or []
            for item in raw_news[:10]:
                article_id = item.get("id", "")
                if article_id in seen_ids:
                    continue
                seen_ids.add(article_id)
                formatted = _format_article(item, ticker)
                if formatted:
                    articles.append(formatted)
        except Exception:
            continue

    # Sort by published_at descending (best effort)
    articles.sort(key=lambda a: a.get("published_at", ""), reverse=True)

    # Filter by category
    if category:
        articles = [a for a in articles if a["category"].lower() == category.lower()]

    return {
        "articles": articles[:limit],
        "total": len(articles),
        "tickers": ticker_list,
        "categories": list({a["category"] for a in articles}),
    }


@router.get("/categories")
def get_categories(
    current_user: User = Depends(get_current_user),
):
    """Return available news categories."""
    return {"categories": ["Todos"] + list(CATEGORY_MAP.values())}
