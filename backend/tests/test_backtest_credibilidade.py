"""
Testes de CREDIBILIDADE do backtest (parecer do investidor sênior, nota 6→8+).

POR QUE EXISTE
--------------
O sênior apontou 3 pecados no backtest:
  1. Survivorship bias — default num único VENCEDOR (NEE).
  2. Zero fricção — sem slippage na liquidação/stops e sem imposto nos ⅓ vendidos.
  3. Amostra única — um caminho histórico só, sem Monte Carlo/distribuição de ruína.

Estes testes travam os 3 fixes sobre séries SINTÉTICAS inline (zero rede,
determinístico). Carry continua ZERO (Quantfury) — não há juro de empréstimo.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.quantitative.backtest import (
    _run_adaptive_strategy,
    run_backtest,
    run_backtest_monte_carlo,
    build_basket_df,
    CostModel,
    DEFAULT_BASKET,
)


# ─────────────────────────── helpers de fixture sintética ──────────────────────
def _daily_df(prices, low_frac=0.995):
    idx = pd.bdate_range(start="2020-01-01", periods=len(prices))
    close = np.array([float(p) for p in prices])
    return pd.DataFrame(
        {"Close": close, "High": close * 1.005, "Low": close * low_frac},
        index=idx,
    )


def _rising(n, daily=0.0006, start=100.0):
    return [start * (1 + daily) ** i for i in range(n)]


# ════════════════════ FIX 2 — camada de custos (slippage + imposto) ═══════════
def test_costs_reduce_final_equity_vs_gross():
    """
    Cenário com um crash que dispara stops (vende ⅓ → realiza ganho/saída): o
    resultado LÍQUIDO (com custos) tem que ser <= ao BRUTO (sem custos). Sobe,
    acumula posição alavancada e ganho, depois cai forte para acionar stops.
    """
    up   = _rising(80, daily=0.0015)             # ~4 meses subindo (cria ganho)
    peak = up[-1]
    down = [peak * (0.985 ** i) for i in range(20)]   # crash ~ -26% dispara stops
    df = _daily_df(up + down)

    gross = CostModel(enabled=False)
    net   = CostModel(enabled=True, slippage_pct=0.005, tax_pct=0.15)

    g_df, g_trades = _run_adaptive_strategy(
        df, 100_000.0, 8_000.0, "balanced", index_close=None, costs=gross,
    )
    n_df, n_trades = _run_adaptive_strategy(
        df, 100_000.0, 8_000.0, "balanced", index_close=None, costs=net,
    )
    # houve stops (a fricção foi de fato exercitada)
    assert any(t["type"] == "STOP" for t in n_trades), "stops deveriam ter disparado"
    # custos acumulados positivos no líquido
    assert n_df.attrs["total_costs"] > 0.0
    assert g_df.attrs["total_costs"] == 0.0
    # líquido nunca melhor que bruto
    assert n_df["equity"].iloc[-1] <= g_df["equity"].iloc[-1] + 1e-6


def test_costs_disabled_is_identical_to_gross():
    """apply_costs=False ⇒ slippage e imposto zerados ⇒ idêntico ao bruto."""
    df = _daily_df(_rising(120, daily=0.0008))
    off = CostModel(enabled=False)
    a, _ = _run_adaptive_strategy(df, 100_000.0, 5_000.0, "balanced", costs=off)
    b, _ = _run_adaptive_strategy(df, 100_000.0, 5_000.0, "balanced", costs=None)
    assert a["equity"].iloc[-1] == pytest.approx(b["equity"].iloc[-1], rel=1e-9)
    assert a.attrs["total_costs"] == 0.0


def test_tax_only_on_realized_gain_not_loss():
    """Imposto só incide sobre GANHO realizado; prejuízo não tributa."""
    c = CostModel(enabled=True, slippage_pct=0.0, tax_pct=0.20)
    assert c.tax_on_gain(proceeds=120.0, cost_basis=100.0) == pytest.approx(4.0)  # 20% de 20
    assert c.tax_on_gain(proceeds=80.0,  cost_basis=100.0) == 0.0                 # prejuízo: 0


# ════════════════════ FIX 1 — cesta anti-survivorship ════════════════════════
def test_default_basket_has_multiple_and_includes_losers():
    """A cesta default não é 1 vencedor: tem múltiplos tickers, mistura cíclicas."""
    assert len(DEFAULT_BASKET) >= 3
    assert DEFAULT_BASKET[0] == "NEE"          # utility boa
    # cíclicas/casos que sofreram presentes (não só vencedores)
    assert any(t in DEFAULT_BASKET for t in ("XOM", "BAC", "CAT"))


def test_build_basket_is_equal_weight_blend():
    """
    Cesta equal-weight de 2 ativos: um sobe, outro cai. O índice da cesta fica
    ENTRE os dois extremos (não segue só o vencedor) — prova anti-survivorship.
    """
    n = 100
    winner = _daily_df(_rising(n, daily=0.004))            # sobe forte
    loser  = _daily_df([100.0 * (0.997 ** i) for i in range(n)])  # cai
    price_data = {"WIN": winner, "LOSE": loser}
    basket, used = build_basket_df(price_data, ["WIN", "LOSE"])
    assert set(used) == {"WIN", "LOSE"}
    final = float(basket["Close"].iloc[-1])
    win_final  = 100.0 * (winner["Close"].iloc[-1] / winner["Close"].iloc[0])
    lose_final = 100.0 * (loser["Close"].iloc[-1] / loser["Close"].iloc[0])
    assert lose_final < final < win_final, "cesta deve ficar entre vencedor e perdedor"
    assert "Low" in basket.columns


def test_run_backtest_uses_basket_when_multiple_tickers():
    """run_backtest com >=2 tickers (fora SPY) marca is_basket e lista os tickers."""
    price_data = {
        "AAA": _daily_df(_rising(300, daily=0.0006)),
        "BBB": _daily_df(_rising(300, daily=0.0003)),
        "SPY": _daily_df(_rising(300, daily=0.0004)),
    }
    res = run_backtest(price_data, 100_000.0, 1_000.0, "balanced", mc_paths=200)
    assert res["basket"]["is_basket"] is True
    assert set(res["basket"]["tickers"]) == {"AAA", "BBB"}   # SPY fica de fora


# ════════════════════ FIX 3 — Monte Carlo / probabilidade de ruína ════════════
def test_monte_carlo_returns_distribution_and_ruin_prob():
    """
    O MC reusa o motor (simulate_portfolio + bootstrap) e devolve a DISTRIBUIÇÃO
    de maxDD (p5/p50/p95) + probabilidade de ruína — não um número único.
    """
    df = _daily_df(_rising(800, daily=0.0005))
    mc = run_backtest_monte_carlo(
        df, 100_000.0, 1_000.0, "balanced", n_paths=300, seed=42,
    )
    assert mc["n_paths"] == 300
    assert 0.0 <= mc["ruin_probability"] <= 1.0
    dd = mc["max_dd_distribution"]
    # percentis ordenados e <= 0 (drawdown)
    assert dd["p95"] >= dd["p50"] >= dd["p5"]
    assert dd["worst"] <= dd["p5"]
    assert dd["p95"] <= 0.0
    # histograma servido p/ o frontend
    assert len(mc["max_dd_histogram"]) > 0
    assert sum(b["count"] for b in mc["max_dd_histogram"]) <= 300


def test_monte_carlo_is_deterministic_with_seed():
    """Seed fixa ⇒ resultado idêntico (reprodutível p/ o teste/CI)."""
    df = _daily_df(_rising(600, daily=0.0006))
    a = run_backtest_monte_carlo(df, 50_000.0, 2_000.0, "aggressive", n_paths=200, seed=7)
    b = run_backtest_monte_carlo(df, 50_000.0, 2_000.0, "aggressive", n_paths=200, seed=7)
    assert a["ruin_probability"] == b["ruin_probability"]
    assert a["max_dd_distribution"] == b["max_dd_distribution"]


# ════════════════════ integração: payload completo de credibilidade ══════════
def test_run_backtest_payload_has_credibility_blocks():
    """
    O payload de run_backtest deve trazer: as 4 curvas (não quebrou), o
    cost_breakdown (gross×net) e o bloco monte_carlo.
    """
    price_data = {
        "QQQ": _daily_df(_rising(700, daily=0.0007)),
        "SPY": _daily_df(_rising(700, daily=0.0005)),
    }
    res = run_backtest(
        price_data, 100_000.0, 2_000.0, "balanced",
        apply_costs=True, mc_paths=200, mc_seed=42,
    )
    # 4 curvas seguem
    names = {m["strategy"] for m in res["metrics"]}
    assert {"adaptive", "buy_hold_1x", "buy_hold_2x", "sp500"} <= names
    # cost breakdown com gross×net
    cb = res["cost_breakdown"]
    assert cb["applied"] is True
    assert "cagr_gross_pct" in cb and "cagr_net_pct" in cb
    # net nunca acima do gross
    assert cb["cagr_net_pct"] <= cb["cagr_gross_pct"] + 1e-6
    # monte carlo presente com prob de ruína
    assert res["monte_carlo"] is not None
    assert 0.0 <= res["monte_carlo"]["ruin_probability"] <= 1.0
