import math

from fastapi import APIRouter, HTTPException
from datetime import datetime

from app.schemas.analysis import BacktestRequest, BacktestResult, SharpeCompareRequest, SharpeCompareResult
from app.services.market_data import fetch_multiple_price_history
from app.quantitative.backtest import run_backtest
from app.quantitative.sharpe_compare import run_sharpe_compare

router = APIRouter(prefix="/backtest", tags=["backtest"])


def _sanitize_floats(obj):
    """NaN/Inf → 0.0 recursivamente. FastAPI/JSON não aceitam NaN/Inf (dá 500);
    o schema exige float (não Optional), então 0.0 é o sentinela seguro."""
    if isinstance(obj, float):
        return 0.0 if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_floats(v) for v in obj]
    return obj


@router.post("", response_model=BacktestResult)
def run(request: BacktestRequest):
    all_tickers = list(set(request.tickers + ["SPY"]))
    price_data  = fetch_multiple_price_history(all_tickers, "20y")

    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados históricos para os tickers informados")

    # start_date do usuário é RESPEITADO: filtra o histórico ANTES do backtest.
    # (antes era ignorado → a curva vinha sempre dos últimos ~5a, escondendo p.ex. a COVID.)
    _start = getattr(request, "start_date", None)
    if _start:
        for _t in list(price_data.keys()):
            try:
                _df = price_data[_t].loc[str(_start):]
                if len(_df) >= 60:          # mantém só se sobra histórico utilizável
                    price_data[_t] = _df
            except Exception:
                pass

    results = run_backtest(
        price_data=price_data,
        initial_capital=request.initial_capital,
        monthly_contribution=request.monthly_contribution,
        risk_profile=request.risk_profile,
        apply_costs=request.apply_costs,
        slippage_pct=request.slippage_pct,
        tax_pct=request.tax_pct,
        run_monte_carlo=request.run_monte_carlo,
        mc_paths=request.mc_paths,
    )

    return {
        **results,
        "request":      request,
        "completed_at": datetime.utcnow(),
    }


@router.post("/sharpe-compare", response_model=SharpeCompareResult)
def sharpe_compare(request: SharpeCompareRequest):
    tickers_list = [t.strip().upper() for t in request.tickers.split(",") if t.strip()]
    if not tickers_list:
        raise HTTPException(400, "Nenhum ticker informado")

    all_tickers = list(set(tickers_list + ["SPY"]))
    price_data  = fetch_multiple_price_history(all_tickers, "10y")

    if not price_data:
        raise HTTPException(400, "Não foi possível obter dados históricos")

    # Filter by date range
    for ticker in list(price_data.keys()):
        try:
            if request.start:
                price_data[ticker] = price_data[ticker].loc[request.start:]
            if request.end:
                price_data[ticker] = price_data[ticker].loc[:request.end]
            if len(price_data[ticker]) < 30:
                del price_data[ticker]
        except Exception:
            pass

    items = run_sharpe_compare(
        price_data=price_data,
        capital=request.capital,
        leverage=request.leverage,
        risk_free=request.risk_free,
    )
    # XOM (e outros) podiam gerar NaN/Inf (ex: vol/beta em série com gap) → 500 na
    # serialização JSON. Sanitiza p/ 0.0 e nunca derruba a comparação inteira.
    items = _sanitize_floats(items)

    period_end = request.end or datetime.utcnow().strftime("%Y-%m-%d")

    return {
        "items":       items,
        "benchmark":   "SPY",
        "leverage":    request.leverage,
        "period":      f"{request.start} → {period_end}",
        "computed_at": datetime.utcnow().isoformat(),
    }

