from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.analysis import BacktestRequest, BacktestResult
from app.services.market_data import fetch_multiple_price_history
from app.quantitative.backtest import run_backtest

router = APIRouter(prefix="/backtest", tags=["backtest"])


@router.post("", response_model=BacktestResult)
def run(request: BacktestRequest, user: User = Depends(get_current_user)):
    all_tickers = list(set(request.tickers + ["SPY"]))
    price_data = fetch_multiple_price_history(all_tickers, "20y")

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
        "request": request,
        "completed_at": datetime.utcnow(),
    }
