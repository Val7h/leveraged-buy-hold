"""
Golden tests da ESTRATÉGIA MASTER (ADC) no BACKTEST de produção
(app.quantitative.backtest._run_adaptive_strategy / run_backtest).

POR QUE EXISTE
--------------
O backtest do produto passou a seguir a DOUTRINA (alavanca FLUXOS, não o
patrimônio), espelhando `simulate_portfolio` do Monte Carlo. Estes testes
travam o COMPORTAMENTO dessa mecânica sobre séries de preço SINTÉTICAS inline
(zero rede, determinístico):

  1. aporte INICIAL entra SEM alavancagem (debt = 0 no início);
  2. fluxo novo cria DÍVIDA FIXA (alavanca o fluxo, não o equity);
  3. equity compondo → alavancagem EFETIVA cai (dívida fixa diluída);
  4. stop escalonado vende ⅓ e abate dívida numa queda;
  5. 0 liquidações num cenário que sobrevive;
  6. B&H 2x roda em paralelo e a comparação/métricas ficam preservadas.

NÃO toca em fetch ao vivo, market_data nem rede.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.quantitative.backtest import (
    _run_adaptive_strategy,
    _run_buy_hold,
    run_backtest,
    compute_strategy_metrics,
)


# ─────────────────────────── helpers de fixture sintética ──────────────────────
def _daily_df(prices):
    """DataFrame OHLC diário com Low = 99.5% do close (sem disparar stop sozinho)."""
    idx = pd.bdate_range(start="2020-01-01", periods=len(prices))
    close = np.array([float(p) for p in prices])
    return pd.DataFrame(
        {"Close": close, "High": close * 1.005, "Low": close * 0.995},
        index=idx,
    )


def _rising(n, daily=0.0005, start=100.0):
    """Série que só sobe devagar (nunca dispara stop nem liquida)."""
    return [start * (1 + daily) ** i for i in range(n)]


# ════════════════════ 1. aporte inicial SEM alavancagem ═══════════════════════
def test_initial_contribution_has_no_leverage():
    df = _daily_df(_rising(40))
    adf, trades = _run_adaptive_strategy(
        df, initial_capital=100_000.0, monthly_contribution=0.0,
        risk_profile="balanced", dividend_yield=0.0,
    )
    # 1º registro: equity == capital inicial (sem dívida), alavancagem efetiva 1x
    first = adf.iloc[0]
    assert first["equity"] == pytest.approx(100_000.0, rel=1e-6)
    assert first["leverage"] == pytest.approx(1.0, rel=1e-6)
    # o trade INICIAL é 1x
    inicial = [t for t in trades if t["type"] == "INICIAL"]
    assert inicial and inicial[0]["leverage"] == 1.0


# ════════════════════ 2. fluxo novo cria DÍVIDA FIXA ══════════════════════════
def test_flow_creates_fixed_debt_not_equity_leverage():
    """
    Preço CONSTANTE: sem ganho/perda de mercado. Com aporte mensal alavancado, a
    dívida tem que aparecer (assets > equity) — prova que alavanca o FLUXO. E a
    dívida é FIXA: não cresce nem encolhe com o mercado parado.
    """
    n = 70  # ~3 meses úteis -> alguns aportes
    df = _daily_df([100.0] * n)
    adf, trades = _run_adaptive_strategy(
        df, initial_capital=100_000.0, monthly_contribution=10_000.0,
        risk_profile="balanced",
    )
    # houve aportes alavancados (lev > 1x em algum APORTE)
    aportes = [t for t in trades if t["type"] == "APORTE"]
    assert aportes, "esperava aportes mensais"
    assert any(t["leverage"] > 1.0 for t in aportes), "fluxo deveria ser alavancado"
    # com preço parado, a alavancagem efetiva final é > 1x (existe dívida criada
    # pelos fluxos alavancados). O patrimônio inicial em si não foi alavancado —
    # a alavancagem efetiva começa colada em 1x e só cresce com os fluxos.
    assert adf.iloc[0]["leverage"] == pytest.approx(1.0, abs=0.05)
    assert adf.iloc[-1]["leverage"] > 1.0


# ════════════════════ 3. desalavancagem natural (equity compõe) ═══════════════
def test_effective_leverage_falls_as_equity_compounds():
    """
    Cenário limpo: preços sobem suave, sem stop, sem capitulação. Dívida FIXA por
    fluxo → conforme os ativos compõem, a alavancagem EFETIVA (notional/equity)
    cai sozinha. Esta é a assinatura da doutrina (vs. rebalance-ao-alvo, que
    manteria a alavancagem fixa).
    """
    n = 500  # ~2 anos úteis, fluxos mensais + composição
    df = _daily_df(_rising(n, daily=0.0008))
    adf, _ = _run_adaptive_strategy(
        df, initial_capital=50_000.0, monthly_contribution=5_000.0,
        risk_profile="balanced",
    )
    lev = adf["leverage"].values
    # alavancagem efetiva sobe quando entram fluxos e CAI conforme o equity cresce:
    # o pico fica acima do valor final (desalavancagem natural).
    peak = float(np.max(lev))
    assert peak > 1.0
    assert lev[-1] < peak


# ════════════════════ 4. stop escalonado vende ⅓ numa queda ═══════════════════
def test_staggered_stop_fires_on_drawdown():
    """
    Sobe um pouco, acumula posição alavancada, depois despenca > -10% do pico do
    ativo → stop estágio 1 deve disparar (vende ⅓, abate dívida). Sem liquidação
    catastrófica: o stop é justamente o mecanismo de sobrevivência.
    """
    up = _rising(60, daily=0.001)          # ~3 meses subindo (acumula fluxo)
    peak = up[-1]
    down = [peak * (0.98 ** i) for i in range(15)]  # crash rápido ~ -26%
    df = _daily_df(up + down)
    adf, trades = _run_adaptive_strategy(
        df, initial_capital=100_000.0, monthly_contribution=8_000.0,
        risk_profile="balanced",
    )
    stops = [t for t in trades if t["type"] == "STOP"]
    assert stops, "stop escalonado deveria ter disparado na queda"
    # sobreviveu (equity final positivo)
    assert adf["equity"].iloc[-1] > 0.0


# ════════════════════ 5. zero liquidações num cenário que sobrevive ═══════════
def test_no_liquidation_in_surviving_scenario():
    df = _daily_df(_rising(400, daily=0.0006))
    adf, trades = _run_adaptive_strategy(
        df, initial_capital=100_000.0, monthly_contribution=3_000.0,
        risk_profile="aggressive",
    )
    margin_calls = [t for t in trades if t["type"] == "MARGIN_CALL"]
    assert margin_calls == [], "cenário ascendente não deveria liquidar"
    # equity nunca zera
    assert (adf["equity"] > 0).all()


# ════════════════════ 6. comparação/métricas preservadas (B&H 2x) ═════════════
def test_comparison_and_metrics_preserved():
    """
    run_backtest deve continuar devolvendo Adaptativo × B&H 1x × B&H 2x × SPY com
    as métricas (CAGR/Sharpe/Calmar/maxDD) e marcadores de trade.
    """
    prices = _rising(600, daily=0.0007)
    price_data = {
        "QQQ": _daily_df(prices),
        "SPY": _daily_df(_rising(600, daily=0.0005)),
    }
    res = run_backtest(
        price_data, initial_capital=100_000.0, monthly_contribution=2_000.0,
        risk_profile="balanced",
    )
    # 4 estratégias comparadas
    names = {m["strategy"] for m in res["metrics"]}
    assert {"adaptive", "buy_hold_1x", "buy_hold_2x", "sp500"} <= names
    # métricas presentes
    for m in res["metrics"]:
        for key in ("cagr_pct", "sharpe_ratio", "calmar_ratio", "max_drawdown_pct"):
            assert key in m
    # marcadores de trade do adaptativo presentes (INICIAL + aportes)
    types = {t["type"] for t in res["trades"]}
    assert "INICIAL" in types
    assert "APORTE" in types
    # curvas e leverage_curve servidas
    assert res["equity_curves"]["adaptive"]
    assert res["leverage_curve"]


# ════════════════════ 7. B&H 2x alavanca o patrimônio (contraste) ═════════════
def test_buy_hold_2x_levers_principal_unlike_adaptive():
    """
    Contraste explícito: o B&H 2x alavanca o PATRIMÔNIO inicial (debt de saída),
    enquanto o adaptativo entra 1x. Garante que a diferença doutrinária está viva.
    """
    df = _daily_df(_rising(60, daily=0.0005))
    bh2x, _ = _run_buy_hold(df, 100_000.0, 0.0, leverage=2.0)
    adf, _  = _run_adaptive_strategy(df, 100_000.0, 0.0, "balanced", dividend_yield=0.0)
    # B&H 2x começa com alavancagem 2x declarada; adaptativo começa 1x efetivo
    assert bh2x.iloc[0]["leverage"] == pytest.approx(2.0)
    assert adf.iloc[0]["leverage"] == pytest.approx(1.0, rel=1e-6)
