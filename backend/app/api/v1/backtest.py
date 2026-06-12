from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
import logging

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analysis import BacktestRequest, BacktestResult, SharpeCompareRequest, SharpeCompareResult
from app.services.market_data import fetch_multiple_price_history
from app.quantitative.backtest import run_backtest
from app.quantitative.sharpe_compare import run_sharpe_compare

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/backtest", tags=["backtest"])


@router.post("", response_model=BacktestResult)
def run(request: BacktestRequest, user: User = Depends(get_current_user)):
    all_tickers = list(set(request.tickers + ["SPY"]))
    price_data  = fetch_multiple_price_history(all_tickers, "20y")

    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados históricos para os tickers informados")

    results = run_backtest(
        price_data=price_data,
        initial_capital=request.initial_capital,
        monthly_contribution=request.monthly_contribution,
        risk_profile=request.risk_profile,
    )

    return {
        **results,
        "request":      request,
        "completed_at": datetime.utcnow(),
    }


@router.post("/sharpe-compare", response_model=SharpeCompareResult)
def sharpe_compare(request: SharpeCompareRequest, user: User = Depends(get_current_user)):
    tickers_list = [t.strip().upper() for t in request.tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(400, "Nenhum ticker informado")

    all_tickers = list(set(tickers_list + ["SPY"]))
    price_data  = fetch_multiple_price_history(all_tickers, "10y")

    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados históricos")

    # Filter by date range. `.loc[start:]` needs a sorted DatetimeIndex; if the
    # filter fails we drop the ticker instead of silently keeping it unfiltered.
    for ticker in list(price_data.keys()):
        df = price_data[ticker]
        try:
            if not df.index.is_monotonic_increasing:
                df = df.sort_index()
            if request.start:
                df = df.loc[request.start:]
            if request.end:
                df = df.loc[:request.end]
        except Exception as exc:
            logger.warning(f"[SharpeCompare] date filter failed for {ticker}: {exc}; dropping")
            del price_data[ticker]
            continue
        if len(df) < 30:
            del price_data[ticker]
        else:
            price_data[ticker] = df

    items = run_sharpe_compare(
        price_data=price_data,
        capital=request.capital,
        leverage=request.leverage,
        risk_free=request.risk_free,
    )

    period_end = request.end or datetime.utcnow().strftime("%Y-%m-%d")

    return {
        "items":       items,
        "benchmark":   "SPY",
        "leverage":    request.leverage,
        "period":      f"{request.start} → {period_end}",
        "computed_at": datetime.utcnow().isoformat(),
    }
