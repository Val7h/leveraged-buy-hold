from fastapi import APIRouter, HTTPException
from datetime import datetime
import numpy as np
import pandas as pd

from app.schemas.analysis import SimulationRequest, SimulationResult
from app.services.market_data import fetch_price_history
from app.services.ranking_service import _chart_api_df
from app.quantitative.monte_carlo import run_monte_carlo, run_stress_test
from app.quantitative.leverage import deleverage_timeline

router = APIRouter(prefix="/simulator", tags=["simulator"])

LEVERAGE_MAP = {"conservative": 1.25, "balanced": 1.75, "aggressive": 2.5}


REBALANCE_FREQ = {"monthly": 1, "quarterly": 3, "annual": 12}


def _build_portfolio_close(tickers: list[str], rebalancing: str = "none") -> pd.Series:
    """
    Retorna série de preços sintética de uma carteira igualmente ponderada.
    Alinha as datas, calcula retornos diários de cada ativo e faz média simples.
    """
    series_list = []
    for ticker in tickers:
        df = None
        # PRIMARIO: Yahoo chart API + Stooq via urllib (mesma fonte do Ranking,
        # comprovadamente funcional em producao; yfinance e bloqueado no Render).
        for days in (20 * 366, 10 * 366, 5 * 366):
            res = _chart_api_df(ticker, days, want_div=False)
            cand = res[0] if isinstance(res, tuple) else res
            if cand is not None and len(cand) >= 252:
                df = cand
                break
        # FALLBACK final: yfinance (raramente funciona em prod, mas nao custa).
        if df is None:
            for period in ("20y", "10y", "5y"):
                cand = fetch_price_history(ticker, period)
                if cand is not None and len(cand) >= 252:
                    df = cand
                    break
        if df is not None:
            close = df["Close"].squeeze()
            close.name = ticker
            series_list.append(close)

    if not series_list:
        raise HTTPException(400, "Nenhum dado encontrado para os tickers informados")

    if len(series_list) == 1:
        return series_list[0]

    # Alinha por data (inner join)
    prices = pd.concat(series_list, axis=1).dropna()

    if rebalancing == "none":
        # Sem rebalanceamento: deriva igual-ponderado sem reset de pesos
        normalized = prices / prices.iloc[0]
        portfolio_price = normalized.mean(axis=1) * 100
    else:
        # Com rebalanceamento: reset periódico de pesos
        freq_months = REBALANCE_FREQ.get(rebalancing, 12)
        freq_days = freq_months * 21  # ~21 dias úteis por mês
        returns = prices.pct_change().fillna(0)
        n = len(returns)
        portfolio_ret = pd.Series(index=returns.index, dtype=float)

        for i in range(n):
            if i % freq_days == 0:
                # Reseta pesos igualmente
                weights = np.ones(len(series_list)) / len(series_list)
            daily_ret = float((returns.iloc[i] * weights).sum())
            # Atualiza pesos com drift
            weights = weights * (1 + returns.iloc[i].values)
            if weights.sum() > 0:
                weights = weights / weights.sum()
            portfolio_ret.iloc[i] = daily_ret

        portfolio_price = (1 + portfolio_ret).cumprod() * 100

    return portfolio_price


@router.post("", response_model=SimulationResult)
def simulate(request: SimulationRequest):
    tickers = [t.strip().upper() for t in request.tickers if t.strip()] or ["SPY"]
    close = _build_portfolio_close(tickers, rebalancing=request.rebalancing)
    starting_lev = LEVERAGE_MAP.get(request.risk_profile, 1.75)

    mc_result = run_monte_carlo(
        historical_close=close,
        initial_equity=request.initial_equity * (request.fx_brl_usd or 1.0),
        monthly_contribution=request.monthly_contribution * (request.fx_brl_usd or 1.0),
        horizon_years=request.horizon_years,
        risk_profile=request.risk_profile,
        dividend_yield=request.dividend_yield,
        inflation_rate=request.inflation_rate,
        n_simulations=request.num_simulations,
        starting_leverage=starting_lev,
        drip=request.drip,
        fx_brl_usd=request.fx_brl_usd or 1.0,
    )

    deleverage = deleverage_timeline(
        initial_equity=request.initial_equity,
        initial_notional=request.initial_equity * starting_lev,
        monthly_contribution=request.monthly_contribution,
        dividend_yield_annual=request.dividend_yield,
        expected_cagr=0.08,
        target_leverage=1.1,
        max_years=request.horizon_years,
    )

    scenarios = []
    for key, curve in mc_result["scenarios"].items():
        p = int(key[1:])
        final_val = curve[-1]["value"] if curve else 0
        cagr = (final_val / request.initial_equity) ** (1 / request.horizon_years) - 1 if final_val > 0 else 0
        scenarios.append({
            "name": f"Percentil {p}",
            "percentile": float(p),
            "equity_curve": curve,
            "final_value": final_val,
            "cagr": round(cagr * 100, 2),
            # tombo REAL do caminho daquele percentil (calculado na simulação), não mais -30 chumbado
            "max_drawdown": mc_result.get("scenario_drawdowns", {}).get(key, 0.0),
            "ruin_probability": mc_result["ruin_probability"] if p == 5 else 0.0,
        })

    stress = run_stress_test(
        initial_equity=request.initial_equity * (request.fx_brl_usd or 1.0),
        leverage=starting_lev,
        monthly_contribution=0.0,
    )

    return {
        "request": request,
        "scenarios": scenarios,
        "leverage_evolution": mc_result["leverage_evolution"],
        "dividend_accumulation": mc_result["dividend_accumulation"],
        "contribution_breakdown": mc_result["contribution_breakdown"],
        "percentiles": mc_result["percentiles"],
        "ruin_probability": mc_result["ruin_probability"],
        "stress_test": stress,
        "completed_at": datetime.utcnow(),
    }


@router.get("/deleverage")
def get_deleverage_projection(
    initial_equity: float = 50000,
    total_exposure: float = 100000,
    monthly_contribution: float = 1000,
):
    timeline = deleverage_timeline(
        initial_equity=initial_equity,
        initial_notional=total_exposure,
        monthly_contribution=monthly_contribution,
        dividend_yield_annual=0.04,
        expected_cagr=0.08,
    )
    return timeline

