"""
Backtesting engine for comparing:
  1. Adaptive Leveraged Buy & Hold (our strategy)
  2. Plain Buy & Hold (1x)
  3. Fixed 2x Leveraged Buy & Hold
  4. S&P 500 benchmark (SPY)

Adaptive strategy: leverage adjusts monthly based on composite score.
Margin call: uses intraday LOW (not close) — realistic liquidation detection.
Equity model: properly tracks borrowed capital (debt), so equity = shares * price - debt.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from app.quantitative.indicators import (
    calculate_rsi, calculate_stochastic, calculate_bollinger_bands,
    calculate_ma200, distance_from_ma, realized_volatility,
    bollinger_position, historical_max_drawdown, sharpe_ratio, sortino_ratio,
)
from app.quantitative.scoring import (
    compute_quality_score, compute_opportunity_score,
    compute_composite_score, leverage_from_score,
)
# ESTRATÉGIA MASTER (ADC): espelha a doutrina já implementada no Simulador
# (simulate_portfolio). Só LEMOS de monte_carlo p/ reusar os helpers de regime/
# stop/SHY E o motor de Monte Carlo (simulate_portfolio + bootstrap) — não
# reescrevemos nada lá.
from app.quantitative.monte_carlo import (
    _regime_leverage, _STOP_BANDS, _SHY_BUILD_FRAC,
    simulate_portfolio, bootstrap_monthly_returns, gbm_path, _path_max_drawdown,
)

# Multiplicador-teto do regime por perfil de risco (mesmo mapa do Monte Carlo:
# conservador 2x / equilibrado 3x / agressivo 4x). O regime escolhe abaixo disso.
_MAX_LEV_BY_PROFILE = {"conservative": 2.0, "balanced": 3.0, "aggressive": 4.0}

# ── Cesta DEFAULT anti-survivorship ───────────────────────────────────────────
# O pecado nº1 do parecer sênior: default num único VENCEDOR (NEE). Trocamos por
# uma CESTA representativa que MISTURA uma utility boa (NEE) com cíclicas/casos que
# SOFRERAM de verdade (energia que afundou no petróleo barato, banco que apanhou na
# GFC, industrial cíclica). O resultado da cesta é mais HONESTO que o de 1 vencedor
# porque carrega os perdedores junto — não é cherry-picking de sobrevivente.
DEFAULT_BASKET = ["NEE", "XOM", "BAC", "CAT"]


# ── Camada de CUSTOS (fricção) — toggle ───────────────────────────────────────
# Carry continua ZERO (Quantfury) — NÃO há juro de empréstimo aqui de propósito.
# Os custos modelados são: (1) SLIPPAGE no preço de execução de stops e liquidação
# (a saída forçada não sai no meio do book); (2) IMPOSTO sobre o GANHO REALIZADO
# nos ⅓ vendidos no stop. Tudo configurável e desligável (gross vs net).
class CostModel:
    def __init__(
        self,
        enabled: bool = True,
        slippage_pct: float = 0.004,   # 0,4% no preço de execução de stop/liquidação
        tax_pct: float = 0.15,         # 15% sobre o ganho realizado no ⅓ vendido
    ):
        self.enabled = enabled
        self.slippage_pct = max(0.0, slippage_pct) if enabled else 0.0
        self.tax_pct = max(0.0, tax_pct) if enabled else 0.0

    def exec_price(self, quote: float) -> float:
        """Preço de execução de uma VENDA forçada (stop/liq): pior que a cotação."""
        return quote * (1.0 - self.slippage_pct)

    def tax_on_gain(self, proceeds: float, cost_basis: float) -> float:
        """Imposto sobre o ganho realizado (>=0). Prejuízo não gera imposto."""
        gain = proceeds - cost_basis
        return self.tax_pct * gain if gain > 0 else 0.0

CRISIS_PERIODS = [
    {"name": "GFC 2008-2009",       "start": "2007-10-01", "end": "2009-03-31"},
    {"name": "Flash Crash 2010",     "start": "2010-04-01", "end": "2010-07-31"},
    {"name": "European Debt 2011",   "start": "2011-07-01", "end": "2011-10-31"},
    {"name": "China Selloff 2015",   "start": "2015-08-01", "end": "2016-02-29"},
    {"name": "COVID Crash 2020",     "start": "2020-02-01", "end": "2020-04-30"},
    {"name": "Rate Hike Bear 2022",  "start": "2022-01-01", "end": "2022-12-31"},
]


def _compute_drawdown_series(equity: pd.Series) -> pd.Series:
    peak = equity.cummax().replace(0, 1e-10)
    return (equity - peak) / peak * 100


def _compute_cagr(start_val: float, end_val: float, years: float) -> float:
    if start_val <= 0 or years <= 0 or end_val <= 0:
        return -1.0
    return (end_val / start_val) ** (1 / years) - 1


def _irr_monthly(cashflows: List[float]) -> Optional[float]:
    """Taxa mensal (IRR) que zera o NPV do fluxo de caixa. Bissecção robusta.
    cashflows[i] = fluxo no mês i (saídas negativas: aporte inicial + mensais;
    entrada positiva: valor final). Retorna a taxa MENSAL ou None se não bracketar."""
    def npv(r: float) -> float:
        # Fator de desconto ITERATIVO com guarda de underflow: (1+r)**i com r≈-0.99 e i
        # grande (até ~240 meses) fazia (0.01)**i → 0.0 → cf/0.0 = ZeroDivisionError (500 em
        # backtest de história longa/volátil). Piso no df evita a divisão por zero.
        base = 1.0 + r
        if base < 1e-9:
            base = 1e-9
        total = 0.0
        df = 1.0
        for cf in cashflows:
            total += cf / df
            df *= base
            if df < 1e-300:
                df = 1e-300
        return total
    lo, hi = -0.99, 1.0
    flo, fhi = npv(lo), npv(hi)
    if flo == 0:
        return lo
    if flo * fhi > 0:            # sem troca de sinal → não dá p/ bracketar
        return None
    for _ in range(200):
        mid = (lo + hi) / 2.0
        fm = npv(mid)
        if abs(fm) < 1e-7:
            return mid
        if flo * fm < 0:
            hi = mid
        else:
            lo, flo = mid, fm
    return (lo + hi) / 2.0


def _money_weighted_cagr(start_val: float, monthly_contribution: float,
                         end_val: float, years: float) -> float:
    """CAGR money-weighted (IRR anualizado) p/ carteira COM aportes. Sem aporte,
    reduz ao CAGR simples. Corrige o bug de contar os aportes como 'retorno'."""
    n_months = max(1, int(round(years * 12)))
    mc = monthly_contribution if monthly_contribution and monthly_contribution > 0 else 0.0
    if mc <= 0:
        return _compute_cagr(start_val, end_val, years)
    cf = [-start_val] + [-mc] * n_months
    cf[-1] += end_val                       # valor final entra no último mês
    r = _irr_monthly(cf)
    if r is None:
        # fallback: retorno sobre o capital TOTAL investido, anualizado
        total_in = start_val + mc * n_months
        return _compute_cagr(total_in, end_val, years)
    return (1.0 + r) ** 12 - 1.0


def _compute_calmar(cagr: float, max_dd_pct: float) -> float:
    if max_dd_pct == 0:
        return 0.0
    return cagr / abs(max_dd_pct / 100)


def _safe_float(series: pd.Series, i: int) -> Optional[float]:
    """Safely get float from series at index i, returning None if NaN/out-of-bounds."""
    try:
        val = float(series.iloc[i])
        return None if np.isnan(val) else val
    except Exception:
        return None


def _run_adaptive_strategy(
    price_df: pd.DataFrame,
    initial_capital: float,
    monthly_contribution: float,
    risk_profile: str,
    beta: float = 0.7,
    dividend_yield: float = 0.04,
    max_drawdown_hist: float = -35.0,
    sharpe_hist: float = 0.8,
    vol_hist: float = 15.0,
    index_close: Optional[pd.Series] = None,
    costs: Optional["CostModel"] = None,
    shy_yield_annual: float = 0.025,
) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Backtest da ESTRATÉGIA MASTER (Alavancagem Dinâmica Composta) sobre PREÇOS
    REAIS — fiel à doutrina, espelhando `simulate_portfolio` do monte_carlo:

      • o aporte INICIAL entra SEM alavancagem (a doutrina alavanca FLUXOS, não o
        patrimônio de partida);
      • cada mês, o FLUXO NOVO (aporte + dividendos reinvestidos) é deployado com
        alavancagem POR REGIME (topo/correção/urso/capitulação), criando dívida
        FIXA — a dívida NÃO re-margina com o mercado → desalavancagem natural
        conforme o equity compõe;
      • stop escalonado -10/-20/-30% do pico: vende 1/3 e ABATE dívida (o caixa
        liberado acima da dívida vira reserva SHY de munição);
      • reserva SHY (sem alavancagem) construída no topo/correção e DEPLOYADA na
        capitulação;
      • Quantfury CARRY ZERO (sem juro de margem). LIQUIDAÇÃO quando a perda ≈
        equity alocado (assets - debt ≈ 0), checada na MÍNIMA (Low) do dia.

    Regime = multiplicador do mercado na data. Usa o drawdown do ÍNDICE
    (`index_close`, ex. SPY) quando disponível; senão usa o drawdown do próprio
    ativo como proxy (mesma lógica auto-referente do Monte Carlo).
    NÃO alavanca mais o patrimônio inteiro: `new_notional = equity * target_lev`
    foi removido de propósito.
    """
    close = price_df["Close"].squeeze()
    low   = price_df["Low"].squeeze()  if "Low"  in price_df.columns else close * 0.995

    max_leverage = _MAX_LEV_BY_PROFILE.get(risk_profile, 3.0)
    costs = costs if costs is not None else CostModel(enabled=False)

    # ── Índice de regime: drawdown do pico até a data (point-in-time) ─────────
    # Preferimos um índice externo (SPY) alinhado às datas do ativo; sem ele,
    # usamos o próprio ativo como proxy de regime.
    if index_close is not None and len(index_close) > 0:
        regime_src = index_close.reindex(close.index).ffill().bfill()
    else:
        regime_src = close
    regime_peak_series = regime_src.cummax()

    # ── Posição: ATIVOS (notional) / DÍVIDA (fixa por fluxo) / SHY ────────────
    price0   = float(close.iloc[0])
    assets   = initial_capital     # aporte inicial entra SEM alavancagem (1x)
    debt     = 0.0                 # dívida fixa por fluxo; não re-margina
    shy      = 0.0                 # reserva de ataque (cash-like, 1x)
    cost_basis = initial_capital   # custo dos ATIVOS (cresce no deploy, NÃO com mercado)
    total_costs = 0.0              # acumulado de slippage + imposto (p/ relatório)
    liquidated = False

    asset_peak = assets            # pico dos ATIVOS p/ stop escalonado
    triggered: set = set()         # stops já disparados desde o último pico
    prev_lev = 1.0

    trades: List[Dict] = [{
        "date": str(close.index[0])[:10],
        "type": "INICIAL",
        "price": round(price0, 4),
        "leverage": 1.0,
        "details": "Aporte inicial 1x (alavanca fluxos, não o patrimônio)",
    }]

    records    = []
    prev_month = None
    prev_price = price0

    for i, (date, price_val) in enumerate(close.items()):
        price     = float(price_val)
        date_str  = str(date)[:10]
        daily_low = _safe_float(low, i) or price * 0.99

        # ── Já liquidado: equity zerado dali em diante ───────────────────────
        if liquidated:
            records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": price})
            continue

        # ── Mercado mexe nos ATIVOS (dívida NÃO muda → desalavancagem natural) ─
        if i > 0 and prev_price > 0:
            ret = price / prev_price - 1.0
            assets *= (1.0 + ret)
        prev_price = price

        # ── Reserva SHY RENDE Treasury (1-3a). Modelá-la a 0% era um dreno IRREAL:
        #    SHY é ETF de Treasuries, não colchão de dinheiro parado. Compõe ~2,5%/a
        #    (conservador — abaixo da média de T-bills fora da ZIRP). Recalibração de
        #    upside SEM tocar no risco (é o ativo mais seguro). Só nos dias com reserva.
        if i > 0 and shy > 0 and shy_yield_annual > 0:
            shy *= (1.0 + shy_yield_annual / 252.0)

        # ── Quantfury: liquidação quando a perda ≈ equity alocado ────────────
        # Checada na MÍNIMA do dia (assets na mínima - dívida ≈ 0). Carry zero.
        if i > 0:
            # A liquidação sai com SLIPPAGE: o preço de execução forçada é pior que
            # a mínima (não se zera a posição no meio do book).
            exec_low = costs.exec_price(daily_low)
            assets_at_low = assets * (exec_low / price) if price > 0 else assets
            if debt > 0 and (assets_at_low + shy - debt) <= initial_capital * 0.05:
                liquidated = True
                trades.append({
                    "date": date_str, "type": "MARGIN_CALL",
                    "price": round(exec_low, 4), "leverage": 0.0,
                    "details": f"Liquidado (perda ≈ equity, c/ slippage) @ ${exec_low:.2f}",
                })
                assets = debt = shy = cost_basis = 0.0
                records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": exec_low})
                continue

        # ── Drawdown do regime (índice ou proxy) até esta data ───────────────
        rpeak = float(regime_peak_series.iloc[i])
        rval  = float(regime_src.iloc[i])
        dd_regime = (rval / rpeak - 1.0) if rpeak > 0 else 0.0

        # ── Pico dos ATIVOS + drawdown do próprio ativo p/ stop escalonado ───
        if assets > asset_peak:
            asset_peak = assets
            triggered.clear()        # novo pico zera os stops
        dd_assets = (assets / asset_peak - 1.0) if asset_peak > 0 else 0.0

        # ── Stop escalonado: vende 1/3 e abate dívida (sobrevivência) ────────
        for k, band in enumerate(_STOP_BANDS):
            if dd_assets <= band and k not in triggered:
                triggered.add(k)
                frac = 1.0 / 3.0
                gross_sell  = assets * frac                 # valor de mercado vendido
                basis_sold  = cost_basis * frac             # custo proporcional vendido
                # SLIPPAGE: a venda forçada do stop sai abaixo da cotação.
                proceeds    = gross_sell * (1.0 - costs.slippage_pct)
                # IMPOSTO sobre o ganho REALIZADO nesse ⅓ (prejuízo não tributa).
                tax         = costs.tax_on_gain(proceeds, basis_sold)
                net_proceeds = proceeds - tax
                total_costs += (gross_sell - proceeds) + tax

                assets     -= gross_sell
                cost_basis -= basis_sold
                pay = min(debt, net_proceeds)
                debt -= pay
                shy += (net_proceeds - pay)  # caixa líquido acima da dívida vira munição
                detail = f"Stop {int(band*100)}% — vendeu ⅓, abateu dívida"
                if costs.enabled:
                    detail += f" (custos ${(gross_sell - proceeds) + tax:,.0f})"
                trades.append({
                    "date": date_str, "type": "STOP",
                    "price": round(costs.exec_price(price), 4), "leverage": 0.0,
                    "details": detail,
                })

        month = pd.Timestamp(date).month
        if prev_month is None or month != prev_month:
            # ── Fluxo novo do mês: aporte + dividendos reinvestidos ──────────
            div_income = assets * (dividend_yield / 12.0)
            flow = (monthly_contribution if monthly_contribution > 0 else 0.0) + div_income

            # ── Regime → alavancagem dos FLUXOS + comportamento do SHY ───────
            lev, regime = _regime_leverage(dd_regime, max_leverage)
            if regime in ("topo", "correcao"):
                to_shy = flow * _SHY_BUILD_FRAC      # constrói reserva (sem alavancagem)
                shy   += to_shy
                deploy = flow - to_shy
            else:
                deploy = flow + shy                  # urso/capitulação: solta a munição
                shy    = 0.0

            # ── Alavanca SÓ o fluxo deployado (dívida FIXA por fluxo) ────────
            if deploy > 0:
                assets     += lev * deploy
                debt       += (lev - 1.0) * deploy
                cost_basis += lev * deploy    # o notional comprado entra ao custo

            if monthly_contribution > 0:
                trades.append({
                    "date": date_str, "type": "APORTE",
                    "price": round(price, 4), "leverage": round(lev, 2),
                    "details": f"+${monthly_contribution:,.0f} @ {lev:.1f}x [{regime}]",
                })

            # ── Marca mudança de regime/alavancagem (≥ 0.25x) ────────────────
            if prev_month is not None and abs(lev - prev_lev) >= 0.25:
                trade_type = "REBALANCE_ALTA" if lev > prev_lev else "REBALANCE_BAIXA"
                trades.append({
                    "date": date_str, "type": trade_type,
                    "price": round(price, 4), "leverage": round(lev, 2),
                    "details": f"{prev_lev:.1f}x → {lev:.1f}x [{regime}]",
                })

            prev_lev   = lev
            prev_month = month

        # ── Equity + alavancagem EFETIVA medida (notional / equity) ──────────
        equity = max(0.0, assets + shy - debt)
        eff_lev = (assets / equity) if equity > 1e-9 else 0.0
        records.append({
            "date":     date,
            "equity":   equity,
            "leverage": eff_lev,
            "price":    price,
        })

    out = pd.DataFrame(records).set_index("date")
    out.attrs["total_costs"] = round(float(total_costs), 2)
    return out, trades


def _run_buy_hold(
    price_df: pd.DataFrame,
    initial_capital: float,
    monthly_contribution: float,
    leverage: float = 1.0,
    dividend_yield: float = 0.04,
) -> Tuple[pd.DataFrame, List[Dict]]:
    """
    Fixed-leverage buy & hold.
    Properly tracks equity = shares * price - borrowed.
    Margin call triggered by intraday LOW (only relevant for leverage > 1).
    """
    close = price_df["Close"].squeeze()
    low   = price_df["Low"].squeeze() if "Low" in price_df.columns else close * 0.995

    price0         = float(close.iloc[0])
    total_shares   = (initial_capital * leverage) / price0
    total_borrowed = initial_capital * (leverage - 1)
    liq_price = (total_borrowed / total_shares
                 if total_shares > 0 and total_borrowed > 0 else 0.0)
    margin_called  = False

    trades: List[Dict] = []
    if leverage > 1.0:
        trades.append({
            "date": str(close.index[0])[:10],
            "type": "INICIAL",
            "price": round(price0, 4),
            "leverage": leverage,
            "details": f"Posição inicial {leverage:.1f}x",
        })

    records    = []
    prev_month = None

    for i, (date, price_val) in enumerate(close.items()):
        price     = float(price_val)
        date_str  = str(date)[:10]
        daily_low = _safe_float(low, i) or price * 0.99

        if margin_called:
            records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": price})
            continue

        # ── Intraday margin call check ────────────────────────────────────────
        if liq_price > 0 and daily_low <= liq_price:
            margin_called = True
            trades.append({
                "date": date_str, "type": "MARGIN_CALL",
                "price": round(liq_price, 4), "leverage": 0.0,
                "details": f"Liquidado @ ${liq_price:.2f}",
            })
            total_shares   = 0.0
            total_borrowed = 0.0
            records.append({"date": date, "equity": 0.0, "leverage": 0.0, "price": liq_price})
            continue

        month = pd.Timestamp(date).month
        if prev_month is None or month != prev_month:
            if monthly_contribution > 0:
                contrib_notional = monthly_contribution * leverage
                total_shares  += contrib_notional / price
                total_borrowed += monthly_contribution * (leverage - 1)
                if leverage > 1.0:
                    trades.append({
                        "date": date_str, "type": "APORTE",
                        "price": round(price, 4), "leverage": leverage,
                        "details": f"+${monthly_contribution:,.0f}",
                    })

            # Dividends reinvested — no new borrowing
            div_income    = total_shares * price * (dividend_yield / 12)
            total_shares += div_income / price

            prev_month = month
            liq_price  = (total_borrowed / total_shares
                          if total_shares > 0 and total_borrowed > 0 else 0.0)

        equity = max(0.0, total_shares * price - total_borrowed)
        records.append({"date": date, "equity": equity, "leverage": leverage, "price": price})

    return pd.DataFrame(records).set_index("date"), trades


def compute_strategy_metrics(
    equity_series: pd.Series,
    strategy_name: str,
    risk_free: float = 0.04,
    monthly_contribution: float = 0.0,
) -> Dict:
    start_val = float(equity_series.iloc[0])
    end_val   = float(equity_series.iloc[-1])
    years     = len(equity_series) / 252
    # Capital REALMENTE investido = inicial + aportes. Sem isso, os aportes eram
    # contados como 'retorno' → CAGR/retorno inflados ~3x (ex NEE 2020-26: 19% vs ~7% real).
    _n_months  = max(1, int(round(years * 12)))
    _mc        = monthly_contribution if monthly_contribution and monthly_contribution > 0 else 0.0
    total_invested = start_val + _mc * _n_months

    # Handle margin-call scenario (equity reached 0)
    if end_val <= 0 or start_val <= 0:
        return {
            "strategy":           strategy_name,
            "start_date":         str(equity_series.index[0])[:10],
            "end_date":           str(equity_series.index[-1])[:10],
            "total_return_pct":   -100.0,
            "cagr_pct":           -100.0,
            "max_drawdown_pct":   -100.0,
            "sharpe_ratio":       -9.99,
            "sortino_ratio":      -9.99,
            "calmar_ratio":       -9.99,
            "annualized_vol_pct": 0.0,
            "win_rate_pct":       0.0,
            "final_value":        round(end_val, 2),
            "initial_value":      round(start_val, 2),
        }

    log_returns  = np.log(equity_series / equity_series.shift(1)).dropna()
    dd_series    = _compute_drawdown_series(equity_series)
    max_dd       = float(dd_series.min())
    # CAGR money-weighted (IRR) e retorno sobre o capital TOTAL investido (não só o inicial).
    cagr         = _money_weighted_cagr(start_val, _mc, end_val, years)
    total_return = (end_val / total_invested - 1) * 100 if total_invested > 0 else 0.0
    ann_vol      = float(log_returns.std() * np.sqrt(252)) if len(log_returns) > 0 else 0.0
    excess       = log_returns - risk_free / 252
    sharpe_val   = float(excess.mean() / excess.std() * np.sqrt(252)) if excess.std() > 0 else 0.0
    downside_sq  = np.minimum(excess, 0) ** 2
    sigma_d      = float(np.sqrt(downside_sq.mean()))
    sortino_val  = float(excess.mean() / sigma_d * np.sqrt(252)) if sigma_d > 0 else 0.0
    calmar       = _compute_calmar(cagr, max_dd)
    wins         = log_returns[log_returns > 0]
    win_rate     = float(len(wins) / len(log_returns)) if len(log_returns) > 0 else 0.0

    return {
        "strategy":           strategy_name,
        "start_date":         str(equity_series.index[0])[:10],
        "end_date":           str(equity_series.index[-1])[:10],
        "total_return_pct":   round(total_return, 2),
        "cagr_pct":           round(cagr * 100, 2),
        "max_drawdown_pct":   round(max_dd, 2),
        "sharpe_ratio":       round(sharpe_val, 3),
        "sortino_ratio":      round(sortino_val, 3),
        "calmar_ratio":       round(calmar, 3),
        "annualized_vol_pct": round(ann_vol * 100, 2),
        "win_rate_pct":       round(win_rate * 100, 2),
        "final_value":        round(end_val, 2),
        "initial_value":      round(start_val, 2),
        "total_invested":     round(total_invested, 2),
    }


def analyze_crisis_period(
    equity_curves: Dict[str, pd.Series],
    start: str,
    end: str,
) -> Dict:
    result = {"start": start, "end": end}
    for name, curve in equity_curves.items():
        period = curve.loc[start:end]
        if len(period) < 2:
            continue
        start_v = float(period.iloc[0])
        if start_v <= 0:
            result[name] = {"return_pct": -100.0, "max_drawdown_pct": -100.0}
            continue
        ret = (float(period.iloc[-1]) / start_v - 1) * 100
        dd  = float(_compute_drawdown_series(period).min())
        result[name] = {"return_pct": round(ret, 2), "max_drawdown_pct": round(dd, 2)}
    return result


def build_basket_df(
    price_data: Dict[str, pd.DataFrame],
    tickers: List[str],
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Constrói uma CESTA equal-weight (rebalanceada diariamente p/ pesos iguais) a
    partir de N tickers — anti-survivorship: o caminho da cesta carrega os
    perdedores junto, não só o vencedor. Retorna (df OHLC sintético da cesta,
    lista de tickers efetivamente usados).

    O índice da cesta começa em 100 e evolui pela MÉDIA dos retornos diários dos
    componentes (cada um normalizado pelo próprio preço). Low da cesta é derivado
    da razão Low/Close média do dia (preserva o gap intradiário p/ stops/liq).
    """
    used = [t for t in tickers if t in price_data and len(price_data[t]) > 1]
    if not used:
        # fallback: usa o que houver
        used = [t for t in price_data.keys()][:1]

    # BLINDAGEM: normaliza o índice (tira timezone + zera a hora) ANTES do concat.
    # Sem isso, misturar séries tz-aware (ex: cache de um ETF) com tz-naive desalinhava
    # tudo → o dropna zerava a cesta (equity-curve VAZIA p/ carteira com ETF recente +
    # ações antigas, ex JEPQ+AAPL). numeric coerce evita string quebrando o pct_change.
    def _col(t, field):
        src = price_data[t]
        s = (src["Low"].squeeze() if field == "Low" and "Low" in src.columns
             else src["Close"].squeeze() * (0.995 if field == "Low" else 1.0))
        idx = pd.to_datetime(s.index)
        try:
            idx = idx.tz_localize(None)
        except (TypeError, AttributeError):
            try:
                idx = idx.tz_convert(None)
            except (TypeError, AttributeError):
                pass
        out = pd.Series(pd.to_numeric(s.values, errors="coerce"), index=idx.normalize())
        return out[~out.index.duplicated(keep="last")]

    close_series = {t: _col(t, "Close") for t in used}
    closes = pd.concat(close_series, axis=1).dropna()

    # Se a interseção ficou degenerada (ex: JEPQ começa 2022 e desalinha demais), remove
    # o ticker de histórico MAIS CURTO e tenta de novo — a cesta usa os componentes com
    # janela comum utilizável em vez de zerar a curva por causa de 1 ativo novo.
    while len(closes) < 60 and len(close_series) > 1:
        shortest = min(close_series, key=lambda k: len(close_series[k]))
        del close_series[shortest]
        used = [t for t in used if t != shortest]
        closes = pd.concat(close_series, axis=1).dropna()

    if closes.empty or len(closes) < 2:
        # série degenerada: devolve o primeiro componente cru
        df = price_data[used[0]].copy()
        return df, used

    daily_ret = closes.pct_change().fillna(0.0)
    basket_ret = daily_ret.mean(axis=1)                     # equal-weight
    basket_close = 100.0 * (1.0 + basket_ret).cumprod()

    # Low intradiário da cesta: aplica a razão média Low/Close do dia ao close da cesta
    lows = pd.concat(
        {t: _col(t, "Low") for t in used}, axis=1,
    ).reindex(closes.index).ffill()
    low_ratio = (lows / closes).mean(axis=1).clip(upper=1.0).fillna(0.995)
    basket_low = basket_close * low_ratio

    df = pd.DataFrame(
        {"Close": basket_close.values, "Low": basket_low.values},
        index=closes.index,
    )
    return df, used


def run_backtest_monte_carlo(
    primary_df: pd.DataFrame,
    initial_capital: float,
    monthly_contribution: float,
    risk_profile: str,
    dividend_yield: float = 0.04,
    n_paths: int = 2000,
    horizon_years: Optional[int] = None,
    seed: int = 42,
) -> Dict:
    """
    Monte Carlo de credibilidade — REUSA o motor da doutrina já existente em
    monte_carlo.py (`simulate_portfolio` + bootstrap de blocos / GBM). Em vez de
    um único caminho histórico, roda N caminhos sintéticos sobre os retornos do
    ativo/cesta e reporta a DISTRIBUIÇÃO de maxDD e a PROBABILIDADE de
    liquidação/ruína — não um número único.

    Determinístico: `seed` fixa o RNG (np.random.seed) p/ o teste.
    """
    close = primary_df["Close"].squeeze()
    log_returns = np.log(close / close.shift(1)).dropna().values
    if len(log_returns) < 30:
        return {
            "n_paths": 0, "ruin_probability": 0.0,
            "max_dd_distribution": {}, "final_value_percentiles": {},
            "note": "histórico insuficiente p/ Monte Carlo",
        }

    mu = float(np.mean(log_returns)) * 252
    sigma = float(np.std(log_returns)) * np.sqrt(252)
    dt = 1.0 / 12.0

    # horizonte: usa o do próprio histórico (anos), no piso de 10a (doutrina 10-15a)
    hist_years = max(1.0, len(close) / 252.0)
    h_years = int(horizon_years) if horizon_years else max(10, int(round(hist_years)))
    horizon_months = h_years * 12

    max_lev = _MAX_LEV_BY_PROFILE.get(risk_profile, 3.0)

    np.random.seed(seed)
    max_dds: List[float] = []
    finals:  List[float] = []
    ruin = 0
    for i in range(n_paths):
        if i % 2 == 0:
            monthly = bootstrap_monthly_returns(log_returns, horizon_months)
        else:
            monthly = np.expm1(gbm_path(mu, sigma, dt, horizon_months))
        path, ruined, _ = simulate_portfolio(
            initial_capital, monthly_contribution, monthly,
            max_lev, dividend_yield, 0.03, horizon_months, drip=True,
        )
        max_dds.append(_path_max_drawdown(path))
        finals.append(float(path[-1]))
        if ruined:
            ruin += 1

    max_dds_arr = np.array(max_dds)
    finals_arr = np.array(finals)
    return {
        "n_paths": n_paths,
        "horizon_years": h_years,
        "ruin_probability": round(ruin / n_paths, 4),
        "max_dd_distribution": {
            "p5":  round(float(np.percentile(max_dds_arr, 5)), 2),
            "p50": round(float(np.percentile(max_dds_arr, 50)), 2),
            "p95": round(float(np.percentile(max_dds_arr, 95)), 2),
            "worst": round(float(np.min(max_dds_arr)), 2),
            "mean": round(float(np.mean(max_dds_arr)), 2),
        },
        "max_dd_histogram": _histogram(max_dds_arr, lo=-100.0, hi=0.0, bins=20),
        "final_value_percentiles": {
            "p5":  round(float(np.percentile(finals_arr, 5)), 2),
            "p50": round(float(np.percentile(finals_arr, 50)), 2),
            "p95": round(float(np.percentile(finals_arr, 95)), 2),
        },
    }


def _histogram(values: np.ndarray, lo: float, hi: float, bins: int = 20) -> List[Dict]:
    """Histograma simples (contagem por faixa) p/ o frontend plotar a distribuição."""
    counts, edges = np.histogram(values, bins=bins, range=(lo, hi))
    return [
        {"bin_lo": round(float(edges[i]), 2),
         "bin_hi": round(float(edges[i + 1]), 2),
         "count": int(counts[i])}
        for i in range(len(counts))
    ]


def run_backtest(
    price_data: Dict[str, pd.DataFrame],
    initial_capital: float = 100_000.0,
    monthly_contribution: float = 1_000.0,
    risk_profile: str = "balanced",
    beta: float = 0.7,
    dividend_yield: float = 0.04,
    max_dd_hist: float = -35.0,
    sharpe_hist: float = 0.8,
    vol_hist: float = 15.0,
    apply_costs: bool = True,
    slippage_pct: float = 0.004,
    tax_pct: float = 0.15,
    run_monte_carlo: bool = True,
    mc_paths: int = 2000,
    mc_seed: int = 42,
) -> Dict:
    """Run all strategies and return comparable results.

    Cesta anti-survivorship: usa TODOS os tickers de `price_data` (exceto SPY,
    reservado p/ índice de regime) numa cesta equal-weight. Camada de custos
    (slippage+imposto) com gross×net. Monte Carlo de ruína sobre a cesta.
    """
    # ── Cesta equal-weight com TODOS os tickers do usuário (SPY fica de fora) ──
    basket_tickers = [t for t in price_data.keys() if t != "SPY"] or list(price_data.keys())
    if len(basket_tickers) >= 2:
        primary_df, used_tickers = build_basket_df(price_data, basket_tickers)
        primary_ticker = "CESTA"
    else:
        primary_ticker = basket_tickers[0]
        primary_df     = price_data[primary_ticker]
        used_tickers   = [primary_ticker]

    # Sinal de REGIME: drawdown do índice (SPY) na data. Sem SPY, o adaptativo
    # cai pro proxy (drawdown do próprio ativo).
    index_close = None
    if "SPY" in price_data and primary_ticker != "SPY":
        index_close = price_data["SPY"]["Close"].squeeze()

    # ── Camada de custos: roda o adaptativo BRUTO (sem fricção) e LÍQUIDO ──────
    # Carry continua ZERO (Quantfury). Custos = slippage na liquidação/stops +
    # imposto sobre o ganho realizado nos ⅓ vendidos. O LÍQUIDO é o que vira a
    # curva principal exibida; o BRUTO serve de referência (teto otimista).
    net_costs   = CostModel(enabled=apply_costs, slippage_pct=slippage_pct, tax_pct=tax_pct)
    gross_costs = CostModel(enabled=False)

    adaptive_df,  adaptive_trades  = _run_adaptive_strategy(
        primary_df, initial_capital, monthly_contribution, risk_profile,
        beta, dividend_yield, max_dd_hist, sharpe_hist, vol_hist,
        index_close=index_close, costs=net_costs,
    )
    adaptive_gross_df, _ = _run_adaptive_strategy(
        primary_df, initial_capital, monthly_contribution, risk_profile,
        beta, dividend_yield, max_dd_hist, sharpe_hist, vol_hist,
        index_close=index_close, costs=gross_costs,
    )
    bh1x_df,  _  = _run_buy_hold(primary_df, initial_capital, monthly_contribution, 1.0, dividend_yield)
    bh2x_df,  bh2x_trades = _run_buy_hold(primary_df, initial_capital, monthly_contribution, 2.0, dividend_yield)

    strategies: Dict[str, pd.DataFrame] = {
        "adaptive":    adaptive_df,
        "buy_hold_1x": bh1x_df,
        "buy_hold_2x": bh2x_df,
    }

    if "SPY" in price_data:
        spy_df, _ = _run_buy_hold(price_data["SPY"], initial_capital, monthly_contribution, 1.0, 0.015)
        strategies["sp500"] = spy_df

    equity_curves = {k: v["equity"] for k, v in strategies.items()}

    metrics = [compute_strategy_metrics(eq, name, monthly_contribution=monthly_contribution)
               for name, eq in equity_curves.items()]

    crisis_analysis = []
    for period in CRISIS_PERIODS:
        ca = analyze_crisis_period(equity_curves, period["start"], period["end"])
        ca["name"] = period["name"]
        crisis_analysis.append(ca)

    def serialize_curve(series: pd.Series) -> List[Dict]:
        return [{"date": str(idx)[:10], "value": round(float(val), 2)} for idx, val in series.items()]

    def serialize_lev_curve(df: pd.DataFrame) -> List[Dict]:
        return [{"date": str(idx)[:10], "leverage": round(float(row["leverage"]), 3)}
                for idx, row in df.iterrows()]

    # ── Price series for trade-marker chart (sample every 5 days + all trade dates) ──
    close_series = primary_df["Close"].squeeze()
    trade_dates  = {t["date"] for t in adaptive_trades}
    price_series = [
        {"date": str(idx)[:10], "value": round(float(val), 4)}
        for i, (idx, val) in enumerate(close_series.items())
        if i % 5 == 0 or str(idx)[:10] in trade_dates or i == len(close_series) - 1
    ]

    # ── Drawdown curves ───────────────────────────────────────────────────────
    drawdown_curves = {}
    for k, eq in equity_curves.items():
        dd = _compute_drawdown_series(eq)
        drawdown_curves[k] = [
            {"date": str(idx)[:10], "value": round(float(v), 3)}
            for idx, v in dd.items()
        ]

    # ── Gross × Net: CAGR bruto vs líquido do adaptativo ──────────────────────
    gross_metrics = compute_strategy_metrics(adaptive_gross_df["equity"], "adaptive_gross",
                                             monthly_contribution=monthly_contribution)
    cost_breakdown = {
        "applied":         apply_costs,
        "slippage_pct":    round(slippage_pct * 100, 3),
        "tax_pct":         round(tax_pct * 100, 2),
        "total_costs_usd": float(adaptive_df.attrs.get("total_costs", 0.0)),
        "cagr_gross_pct":  gross_metrics["cagr_pct"],
        "cagr_net_pct":    next((m["cagr_pct"] for m in metrics if m["strategy"] == "adaptive"), 0.0),
        "final_gross":     gross_metrics["final_value"],
        "final_net":       next((m["final_value"] for m in metrics if m["strategy"] == "adaptive"), 0.0),
    }

    # ── Monte Carlo de ruína (reuso do motor simulate_portfolio + bootstrap) ──
    monte_carlo = None
    if run_monte_carlo:
        monte_carlo = run_backtest_monte_carlo(
            primary_df, initial_capital, monthly_contribution, risk_profile,
            dividend_yield=dividend_yield, n_paths=mc_paths, seed=mc_seed,
        )

    return {
        "equity_curves":   {k: serialize_curve(v) for k, v in equity_curves.items()},
        "drawdown_curves": drawdown_curves,
        "leverage_curve":  serialize_lev_curve(strategies.get("adaptive", pd.DataFrame())),
        "metrics":         metrics,
        "crisis_analysis": [c for c in crisis_analysis if len(c) > 3],
        "price_series":    price_series,
        "trades":          adaptive_trades,
        "basket": {
            "is_basket":      len(used_tickers) >= 2,
            "tickers":        used_tickers,
            "label":          primary_ticker,
        },
        "cost_breakdown":  cost_breakdown,
        "monte_carlo":     monte_carlo,
    }
