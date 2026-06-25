"""
Golden tests OFFLINE do CAP AGREGADO DE ALAVANCAGEM (Camada 3 nível portfólio / C.3).

POR QUE ESTE ARQUIVO EXISTE
---------------------------
A Camada 3 POR-FLUXO (no ranking) capa cada aporte por σ/gap/beta/regime. máxDD e
¼·Kelly foram EXILADOS pro AGREGADO — e até o C.3 o agregado só ALERTAVA. Este módulo
FORÇA: dá um teto DURO de alavancagem efetiva da CARTEIRA (corr-ajustada) e calcula a
alavancagem MÁXIMA que um aporte novo pode ter sem estourar o cap. A guidance de aporte
passa a usar MIN(o que já calcula, esse teto) → VETO do agregado sobre o fluxo individual.

DOUTRINA (regra nº1 = SOBREVIVÊNCIA): o cap FORÇA (não só alerta). Carteira já a 2,4x
efetiva → max_lev_novo_fluxo ~1x. Dado ausente → o termo NÃO entra no MIN (não fabrica).

Tudo é testado sobre a LÓGICA pura (funções _effective_leverage_corr e
_aggregate_leverage_cap) com posições sintéticas — sem rede.
"""
from __future__ import annotations

import math

from app.services import portfolio_service as ps


# ─────────────────────────── helpers ────────────────────────────────────────────
def _row(ticker, notional, **kw):
    base = {"ticker": ticker, "is_shy": False, "is_seed": False, "notional": float(notional)}
    base.update(kw)
    return base


def _totals(equity, risk_notional, effective_leverage, cagr=None, sigma=None):
    t = {
        "equity": equity,
        "risk_notional": risk_notional,
        "effective_leverage": effective_leverage,
        "cagr": cagr,
    }
    if sigma is not None:
        t["_sigma_basket_pct"] = sigma
    return t


# ═══════════════ 1. ALAVANCAGEM EFETIVA AJUSTADA POR CORRELAÇÃO ══════════════════
def test_eff_corr_equals_normal_when_diversified():
    """Sem clusters (nenhum par corr≥0.8) e blocos balanceados → eff_corr ≈ eff_normal."""
    rows = [_row("A", 2500), _row("B", 2500), _row("C", 2500), _row("D", 2500)]  # 10k
    eff = ps._effective_leverage_corr(rows, equity=10000.0, correlation={"redundant_pairs": []})
    assert eff is not None
    # 10k/10k = 1.0x, 4 blocos iguais e independentes → penalty=1 → 1.0
    assert abs(eff - 1.0) < 0.01


def test_eff_corr_rises_with_high_correlation_cluster():
    """Cluster de corr≥0.8 concentra fator → eff_corr SOBE acima da eff_normal."""
    rows = [_row("A", 2500), _row("B", 2500), _row("C", 2500), _row("D", 2500)]  # 10k
    eq = 10000.0
    corr = {"redundant_pairs": [
        {"a": "A", "b": "B", "corr": 0.9},
        {"a": "B", "b": "C", "corr": 0.85},
        {"a": "A", "b": "C", "corr": 0.88},
    ]}  # A,B,C colam num bloco; D sozinho → 2 blocos (7500 e 2500)
    eff_corr = ps._effective_leverage_corr(rows, equity=eq, correlation=corr)
    eff_normal = sum(r["notional"] for r in rows) / eq  # 1.0
    assert eff_corr is not None
    assert eff_corr > eff_normal  # concentração de fator PUNE a efetiva


def test_eff_corr_none_without_equity():
    """Sem equity → None (não fabrica)."""
    rows = [_row("A", 1000)]
    assert ps._effective_leverage_corr(rows, equity=None, correlation={}) is None
    assert ps._effective_leverage_corr(rows, equity=0.0, correlation={}) is None


# ═══════════════ 2. CAP DURO QUE FORÇA (max_lev_novo_fluxo) ══════════════════════
def test_cap_forces_1x_when_portfolio_already_high():
    """Carteira já a ~2,4x efetiva → max_lev_novo_fluxo ~1x (FORÇA, não só alerta)."""
    rows = [_row("A", 12000), _row("B", 12000)]  # risk_notional 24k
    eq = 10000.0  # efetiva = 2.4x
    totals = _totals(eq, 24000.0, 2.4)
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={"redundant_pairs": []},
                                     risk_obj=None, totals=totals)
    assert out["status"] in ("alerta", "estourado")
    assert out["max_lev_novo_fluxo"] == 1.0  # sem espaço pra alavancar fluxo novo


def test_cap_estourado_above_hard_cap():
    """Efetiva acima do cap duro (2.5x) → status 'estourado' e fluxo novo a 1x."""
    rows = [_row("A", 30000)]  # 3.0x
    eq = 10000.0
    totals = _totals(eq, 30000.0, 3.0)
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={"redundant_pairs": []},
                                     risk_obj=None, totals=totals)
    assert out["status"] == "estourado"
    assert out["max_lev_novo_fluxo"] == 1.0


def test_cap_allows_more_when_portfolio_low():
    """Carteira a ~1,2x efetiva → permite MAIS alavancagem no fluxo novo (>1x)."""
    rows = [_row("A", 6000), _row("B", 6000)]  # risk 12k
    eq = 10000.0  # 1.2x
    totals = _totals(eq, 12000.0, 1.2)
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={"redundant_pairs": []},
                                     risk_obj=None, totals=totals)
    assert out["status"] == "ok"
    assert out["max_lev_novo_fluxo"] > 1.0  # há espaço


def test_cap_block_constants():
    """O bloco leverage_agregado expõe cap=2.5 e alerta=2.0 (constantes duras)."""
    rows = [_row("A", 10000)]
    eq = 10000.0
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={},
                                     risk_obj=None, totals=_totals(eq, 10000.0, 1.0))
    assert out["cap"] == 2.5
    assert out["alerta"] == 2.0
    assert ps._LEV_EFETIVA_CAP == 2.5
    assert ps._LEV_EFETIVA_ALERTA == 2.0


def test_cap_indisponivel_without_equity():
    """Sem equity → survival default 1x (não alavanca nada)."""
    rows = [_row("A", 10000)]
    out = ps._aggregate_leverage_cap(rows, equity=None, correlation={},
                                     risk_obj=None, totals={"effective_leverage": None})
    assert out["status"] == "indisponivel"
    assert out["max_lev_novo_fluxo"] == 1.0


def test_high_correlation_lowers_max_lev():
    """Cluster de corr alta sobe a efetiva ajustada → derruba o max_lev_novo_fluxo."""
    rows = [_row("A", 5000), _row("B", 5000), _row("C", 5000)]  # risk 15k
    eq = 10000.0  # eff_normal = 1.5x
    totals = _totals(eq, 15000.0, 1.5)
    diversified = ps._aggregate_leverage_cap(
        rows, equity=eq, correlation={"redundant_pairs": []}, risk_obj=None, totals=totals)
    clustered = ps._aggregate_leverage_cap(
        rows, equity=eq,
        correlation={"redundant_pairs": [{"a": "A", "b": "B", "corr": 0.9},
                                         {"a": "B", "b": "C", "corr": 0.9}]},
        risk_obj=None, totals=totals)
    assert clustered["effective_leverage_corr"] > diversified["effective_leverage_corr"]
    assert clustered["max_lev_novo_fluxo"] <= diversified["max_lev_novo_fluxo"]


# ═══════════════ 3. máxDD E KELLY AGREGADOS (onde finalmente mordem) ═════════════
def test_deep_basket_maxdd_caps_aggregate():
    """máxDD fundo da CESTA → teto agregado baixo (máxDD finalmente morde no nível cesta)."""
    rows = [_row("A", 8000)]  # eff 0.8x → cap efetivo alto sozinho
    eq = 10000.0
    totals = _totals(eq, 8000.0, 0.8)
    # cesta com máxDD -60% → teto_maxdd força ~1x apesar da efetiva baixa
    risk_deep = {"maxdd_basket": -60.0}
    risk_shallow = {"maxdd_basket": -15.0}
    deep = ps._aggregate_leverage_cap(rows, equity=eq, correlation={}, risk_obj=risk_deep, totals=totals)
    shallow = ps._aggregate_leverage_cap(rows, equity=eq, correlation={}, risk_obj=risk_shallow, totals=totals)
    assert "maxdd_cesta" in deep["caps_aplicados"]
    assert deep["max_lev_novo_fluxo"] <= shallow["max_lev_novo_fluxo"]
    assert deep["max_lev_novo_fluxo"] == 1.0  # -60% × 1.8 folga → liquidação 1x só


def test_kelly_enters_with_mu_and_sigma():
    """Kelly do portfólio entra quando há μ (CAGR-rf) e σ da cesta."""
    rows = [_row("A", 8000)]
    eq = 10000.0
    # CAGR alto + σ baixo → Kelly generoso ; CAGR baixo + σ alto → Kelly aperta
    totals = _totals(eq, 8000.0, 0.8, cagr=12.0, sigma=20.0)
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={}, risk_obj={"maxdd_basket": -10.0},
                                     totals=totals)
    assert "kelly_cesta" in out["caps_aplicados"]


def test_kelly_mu_capado_anti_prociclico_agregado():
    """Fix 1: μ do Kelly agregado (CAGR de PREÇO − rf) é CAPADO em ~12% a.a. — cesta que já subiu
    muito (CAGR 40%) NÃO superdimensiona a alavancagem (return-chasing pró-cíclico). O mu_excess_cesta
    reportado fica no teto, não no excesso cru (40−4=36%)."""
    rows = [_row("A", 8000)]
    eq = 10000.0
    totals = _totals(eq, 8000.0, 0.8, cagr=40.0, sigma=20.0)   # CAGR alto = topo de ciclo
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={}, risk_obj={"maxdd_basket": -10.0},
                                     totals=totals)
    # μ reportado capado (12% a.a.), NÃO o cru de 36%.
    assert abs(out["mu_excess_cesta"] - 12.0) < 1e-6


def test_kelly_absent_without_sigma():
    """Sem σ da cesta → Kelly NÃO entra no MIN (não fabrica)."""
    rows = [_row("A", 8000)]
    eq = 10000.0
    totals = _totals(eq, 8000.0, 0.8, cagr=12.0)  # sem sigma
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={}, risk_obj=None, totals=totals)
    assert "kelly_cesta" not in out["caps_aplicados"]


def test_min_of_three_caps_rounds_down():
    """max_lev_novo_fluxo = MIN(cap efetivo, teto máxDD, ¼Kelly), arredondado PRA BAIXO."""
    rows = [_row("A", 5000), _row("B", 5000)]  # eff 1.0x
    eq = 10000.0
    totals = _totals(eq, 10000.0, 1.0, cagr=30.0, sigma=18.0)  # Kelly e cap generosos
    # máxDD -45% da cesta puxa pra ~1x (×1.8 folga → liquidação só 1x sobrevive)
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={"redundant_pairs": []},
                                     risk_obj={"maxdd_basket": -45.0}, totals=totals)
    assert out["max_lev_novo_fluxo"] == min(out["caps_aplicados"].values()).__floor__() or \
        out["max_lev_novo_fluxo"] == max(1.0, math.floor(min(out["caps_aplicados"].values())))
    # o número final é inteiro (arredonda pra baixo)
    assert out["max_lev_novo_fluxo"] == float(int(out["max_lev_novo_fluxo"]))


# ═══════════════ 4. C.2 DISJUNTOR DE FLUXOS — flag honesto (dado ausente) ════════
def test_c2_disjuntor_flagged_not_fabricated():
    """C.2 (fluxos consecutivos) NÃO é fabricado: vem flagado como não-implementado + o que falta."""
    rows = [_row("A", 10000)]
    eq = 10000.0
    out = ps._aggregate_leverage_cap(rows, equity=eq, correlation={}, risk_obj=None,
                                     totals=_totals(eq, 10000.0, 1.0))
    dj = out["disjuntor_fluxos"]
    assert dj["implementado"] is False
    assert "aporte-history" in dj["falta"]


# ═══════════════ 5. INTEGRAÇÃO: leverage_agregado no payload + VETO no aporte ════
def test_portfolio_analytics_includes_leverage_agregado(monkeypatch):
    """portfolio_analytics retorna leverage_agregado no payload, blindado contra rede off."""
    monkeypatch.setattr(ps, "_flatten_ranking", lambda: {})
    monkeypatch.setattr(ps, "_bucket_of", lambda t: "ANCORA")
    monkeypatch.setattr(ps, "_cov_analytics", lambda w: None)
    monkeypatch.setattr(ps, "_correlation_matrix", lambda t: {})
    monkeypatch.setattr(ps, "_stress_scenarios", lambda *a, **k: [])
    monkeypatch.setattr(ps, "_thesis_stops", lambda rows: [])

    import app.services.ranking_service as rs
    monkeypatch.setattr(rs, "compute_ranking", lambda *a, **k: {"categories": {}})
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))

    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    out = ps.portfolio_analytics(positions, equity=1000.0)
    assert "leverage_agregado" in out
    la = out["leverage_agregado"]
    assert "max_lev_novo_fluxo" in la
    assert la["cap"] == 2.5
    assert la["alerta"] == 2.0
    # σ interno não vaza no totals do payload
    assert "_sigma_basket_pct" not in out["totals"]


def test_aporte_regime_respects_aggregate_cap(monkeypatch):
    """O multiplicador de aporte_regime é MIN(regime, cap agregado) — o agregado tem VETO."""
    # Força carteira MUITO alavancada → cap agregado deve segurar o multiplicador do regime.
    monkeypatch.setattr(ps, "_flatten_ranking", lambda: {})
    monkeypatch.setattr(ps, "_bucket_of", lambda t: "ANCORA")
    monkeypatch.setattr(ps, "_cov_analytics", lambda w: None)
    monkeypatch.setattr(ps, "_correlation_matrix", lambda t: {})
    monkeypatch.setattr(ps, "_stress_scenarios", lambda *a, **k: [])
    monkeypatch.setattr(ps, "_thesis_stops", lambda rows: [])

    import app.services.ranking_service as rs
    monkeypatch.setattr(rs, "compute_ranking", lambda *a, **k: {"categories": {}})
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))

    # 1 posição de 30000 com equity 10000 → 3.0x efetiva → estourado → cap força 1x
    positions = [{"ticker": "AAPL", "shares": 300, "avg_price": 100.0}]
    out = ps.portfolio_analytics(positions, equity=10000.0)
    ar = out["aporte_regime"]
    # NEUTRO pediria 3x, mas a carteira estourada segura em 1x.
    assert ar["multiplier"] <= ar["multiplier_regime"]
    assert ar["multiplier"] == 1
    assert out["leverage_agregado"]["status"] == "estourado"
