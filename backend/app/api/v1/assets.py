from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from app.core.security import get_current_user
from app.models.user import User
from app.services.market_data import analyze_asset, screen_assets, get_market_state
from app.schemas.asset import AssetScore, AssetScreenResult, AssetFilter, MarketStateData

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/market-state")
def get_market_state_endpoint(current_user: User = Depends(get_current_user)):
    """
    Retorna o estado atual do mercado (TOPO / NORMAL / CAPITULAÇÃO) com base
    no SPY: RSI semanal, distância da MM200 e distância do topo das 52 semanas.
    Drives o multiplicador dinâmico de entrada (2x / 3x / 4x).
    """
    state = get_market_state()
    state["last_updated"] = datetime.utcnow().isoformat()
    return state


@router.get("/screen", response_model=AssetScreenResult)
def screen(
    tickers: Optional[str] = Query(None, description="CSV de tickers, ex: NEE,SO,JNJ"),
    min_score: float = Query(0.0, ge=0, le=100),
    current_user: User = Depends(get_current_user),
):
    risk_profile = current_user.risk_profile.value
    ticker_list = [t.strip().upper() for t in tickers.split(",")] if tickers else None
    results, market_state = screen_assets(ticker_list, risk_profile, min_score)
    return {
        "assets": results,
        "screened_at": datetime.utcnow(),
        "total_assets": len(results),
        "market_state": market_state,
    }


@router.get("/{ticker}/price")
def get_current_price(
    ticker: str,
    current_user: User = Depends(get_current_user),
):
    """Retorna apenas o preço atual do ativo — endpoint leve, sem análise completa."""
    from app.services.market_data import fetch_price_history
    import yfinance as yf
    ticker = ticker.upper()
    price = None
    company_name = None
    try:
        info = yf.Ticker(ticker).fast_info
        price = float(info.last_price) if info.last_price else None
    except Exception:
        pass
    if not price:
        df = fetch_price_history(ticker, "5d")
        if df is not None and not df.empty:
            price = round(float(df["Close"].iloc[-1]), 4)
    if not price:
        raise HTTPException(404, f"Preço não encontrado para {ticker}")
    return {"ticker": ticker, "price": round(price, 4)}


@router.get("/{ticker}", response_model=AssetScore)
def get_asset(
    ticker: str,
    current_user: User = Depends(get_current_user),
):
    ticker = ticker.upper()
    # Pega estado do mercado para o sinal de entrada correto
    market_state = get_market_state()
    result = analyze_asset(ticker, current_user.risk_profile.value,
                           market_multiplier=market_state.get("multiplier", 3))
    if not result:
        raise HTTPException(status_code=404, detail=f"Ativo {ticker} não encontrado ou sem dados suficientes")
    return result


@router.get("/{ticker}/history")
def get_price_history(
    ticker: str,
    period: str = Query("1y", description="1mo, 3mo, 6mo, 1y, 2y, 5y, 10y"),
    current_user: User = Depends(get_current_user),
):
    from app.services.market_data import fetch_price_history
    ticker = ticker.upper()
    df = fetch_price_history(ticker, period=period)
    if df is None:
        raise HTTPException(status_code=404, detail=f"Dados não encontrados para {ticker}")

    return [
        {
            "date": str(idx)[:10],
            "open": round(float(row["Open"]), 4),
            "high": round(float(row["High"]), 4),
            "low": round(float(row["Low"]), 4),
            "close": round(float(row["Close"]), 4),
            "volume": int(row["Volume"]),
        }
        for idx, row in df.iterrows()
    ]
