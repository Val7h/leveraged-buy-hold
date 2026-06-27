"""
Golden tests OFFLINE do COCKPIT DE SOBREVIVÊNCIA — os 6 blocos que os investidores
sênior pediram p/ alimentar o Dashboard/Portfólio.

DOUTRINA (regra nº1 = SOBREVIVÊNCIA): B&H ALAVANCADO PREVIDENCIÁRIO, survival-first.
Survival só DESCE: faltou dado → status/coverage HONESTO, NUNCA número fabricado.
Tudo blindado: nenhum bloco derruba o payload. Nada de trader/market-timing — só
EXPOR/CALCULAR dado de sobrevivência.

O sandbox NÃO tem rede → fontes ao vivo (ranking/fundamentals) são MONKEYPATCHADAS.
Testamos a LÓGICA pura de cada bloco + a presença/shape no payload completo.

Os 6 blocos (nomes EXATOS — contrato p/ o frontend):
  1. liquidation_watch   — distância % até a liquidação, agregado + por posição, com status
  2. aporte_vs_agregado  — mult sugerido × alavancagem agregada vs teto (headroom)
  3. structure_targets   — alvos de bucket por PERFIL (inclui RESERVA)
  4. cvar                — CVaR 95% (perda média na cauda) ao lado do VaR no `risk`/`totals`
  5. equity_stale        — flag de equity manual inconsistente com o notional
  6. coverage            — fração coberta das médias ponderadas (beta X/N, % notional)
"""
from __future__ import annotations

import pytest

from app.services import portfolio_service as ps


def _row(ticker, **kw):
    base = {"ticker": ticker, "is_shy": False, "is_seed": False,
            "notional": 1000.0, "beta": 1.0, "cagr": 10.0,
            "dividend_yield": 2.0, "tsr_expected": 12.0}
    base.update(kw)
    return base


# ───────────────────────── BLOCO 1: LIQUIDATION WATCH ──────────────────────────
def test_liquidation_watch_aggregate_and_per_position():
    """Agregado + por posição com distância NEGATIVA e status por faixa de folga."""
    rows = [_row("A", notional=1000.0), _row("B", notional=580.0)]
    # risk_notional=1580, equity=1000 → L≈1.58 → folga ≈ 97/1.58 ≈ 61% (ok)
    risk_block = {"liquidation_distance_pct": -61.4}
    out = ps._liquidation_watch(rows, equity=1000.0, risk_block=risk_block)
    assert out["aggregate"] is not None
    assert out["aggregate"]["distance_pct"] == -61.4
    assert out["aggregate"]["status"] == "ok"
    assert round(out["aggregate"]["leverage"], 2) == 1.58
    assert len(out["por_posicao"]) == 2
    assert all(p["distance_pct"] < 0 for p in out["por_posicao"])


def test_liquidation_watch_critico_status():
    """Folga pequena (< 15%) → status crítico (beira da ruína)."""
    rows = [_row("LEV", notional=9000.0)]
    risk_block = {"liquidation_distance_pct": -10.0}   # só 10% de folga
    out = ps._liquidation_watch(rows, equity=1000.0, risk_block=risk_block)
    assert out["aggregate"]["status"] == "critico"
    assert out["status"] == "critico"


def test_liquidation_watch_indisponivel_without_equity():
    """Sem equity → status indisponível, NÃO fabrica número."""
    rows = [_row("A")]
    out = ps._liquidation_watch(rows, equity=None, risk_block=None)
    assert out["status"] == "indisponivel"
    assert out["aggregate"] is None
    assert out["por_posicao"] == []


def test_liquidation_watch_fallback_without_risk_block():
    """Sem risk_block mas com equity/notional → calcula a distância pela fórmula (não falha)."""
    rows = [_row("A", notional=2000.0)]   # L=2.0 → folga ≈ 97/2 ≈ 48.5%
    out = ps._liquidation_watch(rows, equity=1000.0, risk_block=None)
    assert out["aggregate"] is not None
    assert out["aggregate"]["distance_pct"] < 0
    assert out["aggregate"]["status"] in ("ok", "alerta", "critico")


# ───────────────────────── BLOCO 2: APORTE vs AGREGADO ─────────────────────────
def test_aporte_vs_agregado_headroom_true():
    """Mult do regime cabe no cap agregado → headroom True."""
    aporte_regime = {"multiplier": 3, "multiplier_regime": 3}
    leverage_agregado = {"effective_leverage": 1.2, "effective_leverage_corr": 1.3,
                         "cap": 2.5, "max_lev_novo_fluxo": 4.0}
    out = ps._aporte_vs_agregado(aporte_regime, leverage_agregado)
    assert out["headroom"] is True
    assert out["mult_sugerido"] == 3
    assert out["teto"] == 2.5
    assert "cabe" in out["nota"].lower()


def test_aporte_vs_agregado_headroom_false():
    """Mult do regime ESTOURARIA o cap → headroom False (o cap segurou)."""
    aporte_regime = {"multiplier": 1, "multiplier_regime": 3}
    leverage_agregado = {"effective_leverage": 2.4, "effective_leverage_corr": 2.6,
                         "cap": 2.5, "max_lev_novo_fluxo": 1.0}
    out = ps._aporte_vs_agregado(aporte_regime, leverage_agregado)
    assert out["headroom"] is False
    assert "estouraria" in out["nota"].lower()


def test_aporte_vs_agregado_indisponivel():
    """Sem cap agregado → headroom None com nota honesta (survival: sem folga)."""
    out = ps._aporte_vs_agregado({"multiplier_regime": None}, {"cap": 2.5})
    assert out["headroom"] is None


# ───────────────────────── BLOCO 3: STRUCTURE TARGETS ──────────────────────────
def test_structure_targets_varies_by_profile():
    """Conservador carrega mais Âncora+Reserva; agressivo mais Acelerador."""
    cons = ps._structure_targets("conservador")
    agr = ps._structure_targets("agressivo")
    assert cons["targets"]["RESERVA"] > agr["targets"]["RESERVA"]
    assert cons["targets"]["ANCORA"] > agr["targets"]["ANCORA"]
    assert agr["targets"]["ACELERADOR"] > cons["targets"]["ACELERADOR"]


def test_structure_targets_sum_to_100():
    """Os 3 buckets de risco + RESERVA somam ~100% do capital total."""
    for prof in ("conservador", "moderado", "agressivo"):
        t = ps._structure_targets(prof)["targets"]
        assert abs(sum(t.values()) - 100.0) < 0.5


def test_structure_targets_reserve_from_profile():
    """A RESERVA vem do reserve_pct do perfil (profiles)."""
    from app.quantitative import profiles
    for prof in ("conservador", "moderado", "agressivo"):
        rp = profiles.profile_leverage_params(prof)["reserve_pct"] * 100.0
        assert abs(ps._structure_targets(prof)["targets"]["RESERVA"] - rp) < 0.5


# ───────────────────────── BLOCO 4: CVaR ───────────────────────────────────────
def test_cvar_in_payload(monkeypatch):
    """CVaR 95% (cesta e equity) chega ao payload ao lado do VaR."""
    import numpy as np
    import app.services.ranking_service as rs

    monkeypatch.setattr(ps, "_flatten_ranking", lambda: {})
    monkeypatch.setattr(ps, "_bucket_of", lambda t: "ANCORA")
    monkeypatch.setattr(ps, "_correlation_matrix", lambda t: {})
    monkeypatch.setattr(ps, "_stress_scenarios", lambda *a, **k: [])
    monkeypatch.setattr(ps, "_thesis_stops", lambda rows: [])
    monkeypatch.setattr(rs, "compute_ranking", lambda *a, **k: {"categories": {}})
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))

    # Série sintética p/ 2 ativos (força o bloco `risk` a reconstruir e calcular CVaR).
    rng = np.random.default_rng(0)
    dates = [f"2020-{m:02d}-{d:02d}" for m in range(1, 13) for d in range(1, 28)]
    s1 = {d: 100.0 * (1 + rng.normal(0, 0.01)) ** i for i, d in enumerate(dates)}
    s2 = {d: 50.0 * (1 + rng.normal(0, 0.012)) ** i for i, d in enumerate(dates)}

    def fake_cov(weights):
        return {
            "_series": {"AAA": s1, "BBB": s2},
            "rc": {"AAA": 50.0, "BBB": 50.0}, "vol": {"AAA": 15.0, "BBB": 18.0},
            "correlation": {"tickers": ["AAA", "BBB"], "matrix": {}, "avg_correlation": 0.3,
                            "avg_correlation_crisis": 0.5, "redundant_pairs": []},
        }
    monkeypatch.setattr(ps, "_cov_analytics", fake_cov)

    positions = [{"ticker": "AAA", "shares": 10, "avg_price": 100.0},
                 {"ticker": "BBB", "shares": 20, "avg_price": 50.0}]
    out = ps.portfolio_analytics(positions, equity=1500.0)
    assert "cvar95_basket_daily" in out["risk"]
    assert "cvar95_equity_daily" in out["risk"]
    # CVaR (perda média na cauda) ≥ VaR (percentil) — cauda é pior ou igual.
    assert out["risk"]["cvar95_basket_daily"] >= out["risk"]["var95_basket_daily"]
    assert out["totals"].get("cvar95_basket_daily") is not None


# ───────────────────────── BLOCO 5: EQUITY STALE ───────────────────────────────
def test_equity_stale_missing_equity():
    """Equity ausente → stale=True (todo o painel depende dele)."""
    out = ps._equity_stale(None, risk_notional=5000.0, shy_notional=0.0, invested=5000.0)
    assert out["stale"] is True
    assert "ausente" in out["motivo"].lower() or "zero" in out["motivo"].lower()


def test_equity_stale_equity_far_below_notional():
    """Equity << notional investido → suspeito de desatualização."""
    out = ps._equity_stale(1000.0, risk_notional=10000.0, shy_notional=0.0, invested=10000.0)
    assert out["stale"] is True
    assert "desatualizado" in out["motivo"].lower()


def test_equity_stale_consistent():
    """Equity ~ notional → consistente, sem flag falso."""
    out = ps._equity_stale(9000.0, risk_notional=10000.0, shy_notional=0.0, invested=10000.0)
    assert out["stale"] is False


def test_equity_stale_no_positions():
    """Equity presente mas sem posições → nada a comparar (stale False)."""
    out = ps._equity_stale(1000.0, risk_notional=0.0, shy_notional=0.0, invested=0.0)
    assert out["stale"] is False


# ───────────────────────── BLOCO 6: COVERAGE ───────────────────────────────────
def test_coverage_partial_beta():
    """Beta presente em 1 de 2 ativos → coverage honesto '1/2' e % notional < 1."""
    rows = [_row("A", beta=1.1, notional=800.0), _row("B", beta=None, notional=200.0)]
    out = ps._coverage(rows, cov_series=None)
    assert out["beta"] == "1/2"
    assert out["pct_notional_coberto"] == 0.80   # só o ativo A (800/1000)
    assert out["n_ativos"] == 2


def test_coverage_full():
    """Todos os ativos com beta → '2/2' e 100% do notional coberto."""
    rows = [_row("A", notional=600.0), _row("B", notional=400.0)]
    out = ps._coverage(rows, cov_series={"A": {}, "B": {}})
    assert out["beta"] == "2/2"
    assert out["pct_notional_coberto"] == 1.0
    assert out["correlacao"] == "2/2"


def test_coverage_correlation_subset():
    """Correlação cobre só os ativos com série confiável (cov._series)."""
    rows = [_row("A", notional=500.0), _row("B", notional=500.0)]
    out = ps._coverage(rows, cov_series={"A": {}})   # só A teve série
    assert out["correlacao"] == "1/2"
    assert out["pct_notional_coberto_correlacao"] == 0.5


# ───────────────────────── INTEGRAÇÃO: payload completo ────────────────────────
def _neutralize_network(monkeypatch):
    import app.services.ranking_service as rs
    monkeypatch.setattr(ps, "_flatten_ranking", lambda: {})
    monkeypatch.setattr(ps, "_bucket_of", lambda t: "ANCORA")
    monkeypatch.setattr(ps, "_cov_analytics", lambda w: None)
    monkeypatch.setattr(ps, "_correlation_matrix", lambda t: {})
    monkeypatch.setattr(ps, "_stress_scenarios", lambda *a, **k: [])
    monkeypatch.setattr(ps, "_thesis_stops", lambda rows: [])
    monkeypatch.setattr(rs, "compute_ranking", lambda *a, **k: {"categories": {}})
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))


def test_payload_includes_all_six_cockpit_blocks(monkeypatch):
    """portfolio_analytics expõe os 6 blocos do cockpit, blindados contra falha de rede."""
    _neutralize_network(monkeypatch)
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    out = ps.portfolio_analytics(positions, equity=1000.0)
    for key in ("liquidation_watch", "aporte_vs_agregado", "structure_targets",
                "equity_stale", "coverage"):
        assert key in out, f"faltou bloco {key}"
    # CVaR (bloco 4) vive no `risk`/`totals` — sem série confiável (rede off) o `risk` fica
    # vazio, mas o payload NÃO quebra (survival: degrada, não falha).
    assert "risk" in out
    assert isinstance(out["liquidation_watch"], dict)
    assert "targets" in out["structure_targets"]
    assert out["coverage"]["n_ativos"] == 1


def test_payload_survival_does_not_fabricate_without_equity(monkeypatch):
    """Sem equity → liquidation_watch indisponível e equity_stale=True (não fabrica)."""
    _neutralize_network(monkeypatch)
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    out = ps.portfolio_analytics(positions, equity=None)
    assert out["liquidation_watch"]["status"] == "indisponivel"
    assert out["equity_stale"]["stale"] is True


def test_payload_structure_targets_respects_profile(monkeypatch):
    """O bloco buckets (alvo×real) passa a usar o alvo do PERFIL, não a constante global."""
    _neutralize_network(monkeypatch)
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    cons = ps.portfolio_analytics(positions, equity=1000.0, profile="conservador")
    agr = ps.portfolio_analytics(positions, equity=1000.0, profile="agressivo")
    assert cons["structure_targets"]["targets"]["RESERVA"] > agr["structure_targets"]["targets"]["RESERVA"]
    # buckets também refletem o alvo do perfil (ANCORA conservador > agressivo).
    cons_anc = next(b["target"] for b in cons["buckets"] if b["bucket"] == "ANCORA")
    agr_anc = next(b["target"] for b in agr["buckets"] if b["bucket"] == "ANCORA")
    assert cons_anc > agr_anc
