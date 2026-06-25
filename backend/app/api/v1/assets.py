from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from app.services.market_data import analyze_asset, screen_assets, get_market_state
from app.schemas.asset import AssetScore, AssetScreenResult, AssetFilter, MarketStateData

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/market-state")
def get_market_state_endpoint():
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
    risk_profile: str = Query("moderate", description="conservative | moderate | aggressive"),
):
    ticker_list = [t.strip().upper() for t in tickers.split(",")] if tickers else None
    results, market_state, failed = screen_assets(ticker_list, risk_profile, min_score)
    attempted = len(ticker_list) if ticker_list else len(results) + len(failed)
    return {
        "assets": results,
        "screened_at": datetime.utcnow(),
        "total_assets": len(results),
        "market_state": market_state,
        "failed_tickers": failed if failed else None,
        "attempted_count": attempted,
    }


@router.get("/{ticker}/price")
def get_current_price(ticker: str):
    """Retorna apenas o preço atual do ativo — endpoint leve, sem análise completa.

    FIX: usava yf.Ticker().fast_info (yfinance, BLOQUEADO no Render) → /price falhava
    em prod → o SWEEP DE ALERTAS não pegava preço → alertas não disparavam. Agora usa
    _chart_api_df (Yahoo chart API via urllib, funciona em prod); yfinance só como
    último fallback. NÃO fabrica preço (None/404 se tudo falhar).
    """
    from app.services.ranking_service import _chart_api_df
    ticker = ticker.upper()
    price = None

    # Fonte primária: Yahoo chart API (funciona no Render).
    try:
        res = _chart_api_df(ticker, 10, want_div=False)
        df = res[0] if isinstance(res, tuple) else res
        if df is not None and "Close" in getattr(df, "columns", []) and len(df) >= 1:
            price = round(float(df["Close"].iloc[-1]), 4)
    except Exception:
        price = None

    # Último fallback: yfinance (não funciona em prod, mas inócuo localmente).
    if not price:
        try:
            import yfinance as yf
            info = yf.Ticker(ticker).fast_info
            if info.last_price:
                price = round(float(info.last_price), 4)
        except Exception:
            price = None

    if not price:
        raise HTTPException(404, f"Preço não encontrado para {ticker}")
    return {"ticker": ticker, "price": round(price, 4)}


@router.get("/{ticker}", response_model=AssetScore)
def get_asset(
    ticker: str,
    risk_profile: str = Query("moderate", description="conservative | moderate | aggressive"),
):
    ticker = ticker.upper()
    # Pega estado do mercado para o sinal de entrada correto
    market_state = get_market_state()
    result = analyze_asset(ticker, risk_profile,
                           market_multiplier=market_state.get("multiplier", 3))
    if not result:
        raise HTTPException(status_code=404, detail=f"Ativo {ticker} não encontrado ou sem dados suficientes")
    return result


@router.get("/{ticker}/history")
def get_price_history(
    ticker: str,
    period: str = Query("1y", description="1mo, 3mo, 6mo, 1y, 2y, 5y, 10y"),
):
    # FIX (mesma praga do Simulador): fetch_price_history usa yfinance, BLOQUEADO no Render →
    # retornava None → 404 → gráfico vazio. Usa _chart_api_df (Yahoo chart API via urllib, funciona
    # em prod); yfinance só como último fallback. Só Close (médias/RSI derivam dele).
    from app.services.ranking_service import _chart_api_df
    ticker = ticker.upper()
    _days = {"1mo": 31, "3mo": 93, "6mo": 186, "1y": 366, "2y": 732,
             "5y": 1830, "10y": 3660}.get(period, 366)

    df = None
    try:
        res = _chart_api_df(ticker, _days, want_div=False)
        cand = res[0] if isinstance(res, tuple) else res
        if cand is not None and len(cand) >= 2:
            df = cand
    except Exception:
        df = None

    if df is None:   # fallback yfinance (não funciona em prod, mas inócuo)
        try:
            from app.services.market_data import fetch_price_history
            df = fetch_price_history(ticker, period=period)
        except Exception:
            df = None

    if df is None or "Close" not in getattr(df, "columns", []):
        raise HTTPException(status_code=404, detail=f"Dados não encontrados para {ticker}")

    out = []
    for idx, row in df.iterrows():
        try:
            c = round(float(row["Close"]), 4)
        except Exception:
            continue
        # OHLC do _chart_api_df = só Close; preenche o-h-l com close (o gráfico plota Close+médias).
        o = round(float(row["Open"]), 4) if "Open" in df.columns else c
        h = round(float(row["High"]), 4) if "High" in df.columns else c
        lo = round(float(row["Low"]), 4) if "Low" in df.columns else c
        v = int(row["Volume"]) if "Volume" in df.columns else 0
        out.append({"date": str(idx)[:10], "open": o, "high": h, "low": lo,
                    "close": c, "volume": v})
    if not out:
        raise HTTPException(status_code=404, detail=f"Sem série p/ {ticker}")
    return out
