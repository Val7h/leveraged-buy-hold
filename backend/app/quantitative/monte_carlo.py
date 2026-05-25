"""
Monte Carlo simulation for long-term leveraged Buy & Hold.
Uses bootstrapped historical returns + GBM with adaptive leverage.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime


# ── Stress Test — cenários de crise histórica ─────────────────────────────────
# Retornos mensais do S&P 500 em cada crise (sem alavancagem)
_CRISIS_SCENARIOS: Dict[str, dict] = {
    "covid_2020": {
        "name": "COVID-19 (2020)",
        "period": "Fev–Jun 2020",
        "color": "#FF5252",
        # Feb, Mar, Apr, May, Jun, Jul 2020
        "monthly_returns": [-0.0841, -0.1235, 0.1268, 0.0453, 0.0184, 0.0551],
        "description": "Queda abrupta de -34% em 33 dias; recuperação em forma de V.",
    },
    "gfc_2008": {
        "name": "Crise Global (2008–09)",
        "period": "Set 2008 – Mar 2009",
        "color": "#FF6D00",
        # Sep 2008 → Mar 2009 (7 meses de queda + 2 de recuperação)
        "monthly_returns": [-0.0908, -0.1679, -0.0748, 0.0078, -0.0857, -0.1099, 0.0854, 0.0939, 0.0531],
        "description": "Maior crise desde 1929. S&P caiu -57% do pico ao vale.",
    },
    "bear_2022": {
        "name": "Bear Market (2022)",
        "period": "Jan–Dez 2022",
        "color": "#FFD600",
        # Jan–Dec 2022
        "monthly_returns": [-0.0568, -0.0314, 0.0348, -0.0872, 0.0001, -0.0839, 0.0911, -0.0424, -0.0925, 0.0799, 0.0538, -0.0590],
        "description": "Alta de juros pelo Fed. S&P caiu -25%, Nasdaq -34%.",
    },
    "dotcom_2000": {
        "name": "Dot-com Crash (2000–02)",
        "period": "Mar 2000 – Out 2002",
        "color": "#E040FB",
        # 30 meses de declínio gradual (S&P -49%, Nasdaq -78%)
        "monthly_returns": [
            -0.0033, -0.0305, -0.0199, -0.0217, -0.0251, 0.0063,
            -0.0159, -0.0585, -0.0519, -0.0812, -0.0808, 0.0076,
            -0.0305, -0.0112, -0.0643, -0.0085, 0.0530, -0.0796,
            0.0180, -0.0642, -0.0812, -0.1100, 0.0880, 0.0556,
        ],
        "description": "Colapso das empresas de tecnologia. 30 meses de bear market.",
    },
}


def run_stress_test(
    initial_equity: float,
    leverage: float,
    monthly_contribution: float = 0.0,
) -> List[dict]:
    """
    Aplica retornos históricos de crise ao portfólio com a alavancagem dada.
    Retorna lista de cenários com drawdown máximo, trajetória e métricas.
    """
    results = []
    for key, scenario in _CRISIS_SCENARIOS.items():
        equity = initial_equity
        path = [{"month": 0, "value": round(equity, 2)}]
        peak = equity
        max_dd = 0.0
        months_to_trough = 0

        for i, ret in enumerate(scenario["monthly_returns"], 1):
            leveraged_ret = ret * leverage
            equity = equity * (1 + leveraged_ret) + monthly_contribution
            equity = max(equity, 0.0)
            path.append({"month": i, "value": round(equity, 2)})

            if equity > peak:
                peak = equity
            dd = (equity - peak) / peak if peak > 0 else 0.0
            if dd < max_dd:
                max_dd = dd
                months_to_trough = i

        trough_value = min(p["value"] for p in path)
        final_value = path[-1]["value"]
        total_return_pct = (final_value / initial_equity - 1) * 100

        results.append({
            "key":              key,
            "name":             scenario["name"],
            "period":           scenario["period"],
            "color":            scenario["color"],
            "description":      scenario["description"],
            "initial":          round(initial_equity, 2),
            "final":            round(final_value, 2),
            "trough":           round(trough_value, 2),
            "max_drawdown_pct": round(max_dd * 100, 2),
            "months_to_trough": months_to_trough,
            "total_months":     len(scenario["monthly_returns"]),
            "total_return_pct": round(total_return_pct, 2),
            "path":             path,
        })
    return results


def bootstrap_returns(
    historical_returns: np.ndarray,
    n_steps: int,
    block_size: int = 21,
) -> np.ndarray:
    """Block bootstrap to preserve autocorrelation in returns."""
    n = len(historical_returns)
    blocks = []
    while sum(len(b) for b in blocks) < n_steps:
        start = np.random.randint(0, n - block_size)
        blocks.append(historical_returns[start: start + block_size])
    return np.concatenate(blocks)[:n_steps]


def gbm_path(
    mu: float,
    sigma: float,
    dt: float,
    n_steps: int,
    seed: Optional[int] = None,
) -> np.ndarray:
    """Geometric Brownian Motion path of returns."""
    if seed is not None:
        np.random.seed(seed)
    z = np.random.standard_normal(n_steps)
    returns = (mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * z
    return returns


def simulate_portfolio(
    initial_equity: float,
    monthly_contribution: float,
    annual_returns: np.ndarray,
    leverage_schedule: np.ndarray,
    dividend_yield_annual: float,
    inflation_rate: float,
    horizon_months: int,
    drip: bool = True,
) -> Tuple[np.ndarray, float]:
    """
    Simulate a single portfolio path.
    drip=True  → dividends reinvested (aumenta equity)
    drip=False → dividends paid out as cash (não compõem; mostrados separadamente)
    Returns (equity_path, is_ruined, total_dividends_paid_out)
    """
    equity = initial_equity
    path = np.zeros(horizon_months + 1)
    path[0] = equity
    ruined = False
    dividends_paid_out = 0.0

    for t in range(horizon_months):
        lev = leverage_schedule[t] if t < len(leverage_schedule) else 1.0
        monthly_ret = annual_returns[t]
        leveraged_ret = lev * monthly_ret

        equity = equity * (1 + leveraged_ret)
        equity += monthly_contribution * (1 + inflation_rate / 12) ** (-t / 12)

        div_income = equity * (dividend_yield_annual / 12)
        if drip:
            equity += div_income          # reinveste — compõe o patrimônio
        else:
            dividends_paid_out += div_income  # paga como renda, não compõe

        equity = max(equity, 0.0)

        if equity < initial_equity * 0.05:
            ruined = True
            equity = 0.0

        path[t + 1] = equity

    return path, ruined


def run_monte_carlo(
    historical_close: pd.Series,
    initial_equity: float,
    monthly_contribution: float,
    horizon_years: int,
    risk_profile: str = "balanced",
    dividend_yield: float = 0.04,
    inflation_rate: float = 0.03,
    n_simulations: int = 1000,
    starting_leverage: float = 1.5,
    drip: bool = True,
    fx_brl_usd: float = 1.0,
) -> Dict:
    log_returns = np.log(historical_close / historical_close.shift(1)).dropna().values
    mu = float(np.mean(log_returns)) * 252
    sigma = float(np.std(log_returns)) * np.sqrt(252)

    horizon_months = horizon_years * 12
    dt = 1 / 12

    max_lev_map = {"conservative": 2.0, "balanced": 3.0, "aggressive": 4.0}
    max_leverage = max_lev_map.get(risk_profile, 3.0)

    leverage_schedule = np.linspace(starting_leverage, 1.0, horizon_months)
    leverage_schedule = np.clip(leverage_schedule, 1.0, max_leverage)

    paths = np.zeros((n_simulations, horizon_months + 1))
    ruin_count = 0

    for i in range(n_simulations):
        if i % 2 == 0:
            monthly_rets = bootstrap_returns(log_returns, horizon_months)
        else:
            monthly_rets = gbm_path(mu, sigma, dt, horizon_months)

        path, ruined = simulate_portfolio(
            initial_equity,
            monthly_contribution,
            monthly_rets,
            leverage_schedule,
            dividend_yield,
            inflation_rate,
            horizon_months,
            drip=drip,
        )
        paths[i] = path
        if ruined:
            ruin_count += 1

    ruin_probability = ruin_count / n_simulations

    # Aplica FX se solicitado (multiplica todos os valores por taxa BRL/USD)
    if fx_brl_usd != 1.0:
        paths = paths * fx_brl_usd

    percentile_levels = [5, 10, 25, 50, 75, 90, 95]
    final_values = paths[:, -1]
    percentile_values = {
        f"p{p}": round(float(np.percentile(final_values, p)), 2)
        for p in percentile_levels
    }

    time_axis = list(range(0, horizon_months + 1, 12))
    scenario_curves = {}
    sorted_indices = np.argsort(final_values)
    n = len(sorted_indices)
    for p in [5, 25, 50, 75, 95]:
        idx = sorted_indices[min(int(p / 100 * n), n - 1)]
        curve = paths[idx]
        scenario_curves[f"p{p}"] = [
            {"month": t, "year": round(t / 12, 1), "value": round(float(curve[t]), 2)}
            for t in time_axis
        ]

    total_contributions = initial_equity + monthly_contribution * horizon_months
    median_final = float(np.median(final_values))
    median_cagr = (median_final / initial_equity) ** (1 / horizon_years) - 1 if median_final > 0 else 0.0

    leverage_evolution = [
        {"month": t, "year": round(t / 12, 1), "leverage": round(float(leverage_schedule[min(t, len(leverage_schedule)-1)]), 3)}
        for t in time_axis
    ]

    dividend_accumulation = []
    running_div = 0.0
    for t in time_axis:
        median_equity = float(np.median(paths[:, t]))
        monthly_div = median_equity * (dividend_yield / 12)
        if drip:
            running_div += monthly_div   # DRIP ON: acumula reinvestido
        # DRIP OFF: mostra o fluxo corrente (monthly_income), não acumulado
        dividend_accumulation.append({
            "month":                t,
            "year":                 round(t / 12, 1),
            "cumulative_dividends": round(running_div, 2),   # relevante quando DRIP=ON
            "monthly_income":       round(monthly_div, 2),   # relevante quando DRIP=OFF
            "annual_income":        round(monthly_div * 12, 2),
        })

    contribution_breakdown = []
    for t in time_axis:
        total_contrib = initial_equity + monthly_contribution * t
        median_equity = float(np.median(paths[:, t]))
        returns_component = max(0, median_equity - total_contrib)
        contribution_breakdown.append({
            "year": round(t / 12, 1),
            "contributions": round(total_contrib, 2),
            "returns": round(returns_component, 2),
            "total": round(median_equity, 2),
        })

    return {
        "n_simulations": n_simulations,
        "horizon_years": horizon_years,
        "ruin_probability": round(ruin_probability, 4),
        "median_cagr_pct": round(median_cagr * 100, 2),
        "mu_annual_pct": round(mu * 100, 2),
        "sigma_annual_pct": round(sigma * 100, 2),
        "percentiles": percentile_values,
        "scenarios": scenario_curves,
        "leverage_evolution": leverage_evolution,
        "dividend_accumulation": dividend_accumulation,
        "contribution_breakdown": contribution_breakdown,
        "total_contributions": round(total_contributions, 2),
    }
