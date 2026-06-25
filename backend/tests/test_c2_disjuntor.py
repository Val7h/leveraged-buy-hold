"""
Golden tests OFFLINE do DISJUNTOR DE FLUXOS CONSECUTIVOS (C.2) — a trava do CRO.

POR QUE ESTE ARQUIVO EXISTE
---------------------------
Empilhar aportes ALAVANCADOS no MESMO ativo enquanto ele CAI = averaging-down
alavancado (primo do martingale) → liquida ANTES da recuperação. O disjuntor degrada
o multiplicador um degrau a cada aporte CONSECUTIVO num ativo em queda (abaixo da MM /
em drawdown / verdict ruim / capitulação), com PISO 1x. Ativo SUBINDO/recuperado → sem
degradação. Sem histórico (aportes_recentes=0) → não degrada (NÃO fabrica).

Ladder: mult_efetivo = max(1, mult_regime − aportes_recentes).

DOUTRINA (survival-first): o disjuntor só DEGRADA, nunca sobe. Testamos a LÓGICA pura
(_esta_caindo, _disjuntor_fluxos) + a integração no portfolio_analytics (monkeypatchado,
sem rede), tal como os outros golden tests.
"""
from __future__ import annotations

from app.services import portfolio_service as ps


# ─────────────────────────── helpers ────────────────────────────────────────────
def _row(ticker, **kw):
    base = {"ticker": ticker, "is_shy": False, "is_seed": False,
            "verdict": "COMPRAR", "distance_ma200": 10.0, "pnl_pct": 5.0,
            "aportes_recentes": 0, "notional": 1000.0}
    base.update(kw)
    return base


# ═══════════════ 1. _esta_caindo — o que conta como "CAINDO" ═════════════════════
def test_caindo_by_verdict():
    assert ps._esta_caindo(_row("A", verdict="ESTICADO"), capitulacao=False) is True
    assert ps._esta_caindo(_row("A", verdict="JUSTO"), capitulacao=False) is True
    assert ps._esta_caindo(_row("A", verdict="ESPECULATIVO"), capitulacao=False) is True


def test_caindo_by_ma200_and_drawdown():
    # abaixo da MM200
    assert ps._esta_caindo(_row("A", verdict="COMPRAR", distance_ma200=-5.0,
                                 pnl_pct=2.0), capitulacao=False) is True
    # em drawdown vs PM
    assert ps._esta_caindo(_row("A", verdict="COMPRAR", distance_ma200=8.0,
                                 pnl_pct=-3.0), capitulacao=False) is True


def test_caindo_by_capitulacao():
    assert ps._esta_caindo(_row("A", verdict="COMPRAR FORTE", distance_ma200=20.0,
                                 pnl_pct=15.0), capitulacao=True) is True


def test_subindo_nao_esta_caindo():
    # COMPRAR/COMPRAR FORTE, acima da MM, no lucro, sem capitulação → NÃO está caindo
    assert ps._esta_caindo(_row("A", verdict="COMPRAR", distance_ma200=12.0,
                                 pnl_pct=8.0), capitulacao=False) is False
    assert ps._esta_caindo(_row("A", verdict="COMPRAR FORTE", distance_ma200=3.0,
                                 pnl_pct=1.0), capitulacao=False) is False


# ═══════════════ 2. _disjuntor_fluxos — ladder e piso ═══════════════════════════
def test_aporte_consecutivo_caindo_degrada():
    """Aporte consecutivo num ativo CAINDO degrada o multiplicador (5x − n)."""
    rows = [_row("A", verdict="JUSTO", aportes_recentes=2)]
    dj = ps._disjuntor_fluxos(rows, mult_regime=5, capitulacao=False)
    assert dj["implementado"] is True
    assert dj["n_afetados"] == 1
    af = dj["afetados"][0]
    assert af["ticker"] == "A"
    assert af["mult_original"] == 5
    assert af["mult_degradado"] == 3  # max(1, 5 − 2)


def test_um_degrau_por_aporte():
    """Cada aporte consecutivo derruba UM degrau."""
    assert ps._disjuntor_fluxos([_row("A", verdict="JUSTO", aportes_recentes=1)],
                                5, False)["afetados"][0]["mult_degradado"] == 4
    assert ps._disjuntor_fluxos([_row("A", verdict="JUSTO", aportes_recentes=2)],
                                5, False)["afetados"][0]["mult_degradado"] == 3
    assert ps._disjuntor_fluxos([_row("A", verdict="JUSTO", aportes_recentes=3)],
                                5, False)["afetados"][0]["mult_degradado"] == 2


def test_piso_1x_apos_N():
    """Após N aportes sem recuperação, zera a alavancagem (piso 1x à vista)."""
    dj = ps._disjuntor_fluxos([_row("A", verdict="JUSTO", aportes_recentes=10)],
                              mult_regime=5, capitulacao=False)
    assert dj["afetados"][0]["mult_degradado"] == 1  # piso 1x, nunca < 1


def test_subindo_nao_degrada():
    """Ativo SUBINDO/recuperado → sem degradação mesmo com aportes recentes (aporte normal)."""
    rows = [_row("A", verdict="COMPRAR", distance_ma200=15.0, pnl_pct=10.0,
                 aportes_recentes=3)]
    dj = ps._disjuntor_fluxos(rows, mult_regime=5, capitulacao=False)
    assert dj["n_afetados"] == 0
    assert dj["afetados"] == []


def test_sem_historico_nao_degrada():
    """Sem histórico (aportes_recentes=0) → não degrada (NÃO fabrica)."""
    rows = [_row("A", verdict="JUSTO", aportes_recentes=0)]
    dj = ps._disjuntor_fluxos(rows, mult_regime=5, capitulacao=False)
    assert dj["n_afetados"] == 0


def test_seed_nao_imune():
    """Semente NÃO é imune: reforçar âncora em queda ainda dispara o disjuntor."""
    rows = [_row("A", verdict="JUSTO", is_seed=True, aportes_recentes=2)]
    dj = ps._disjuntor_fluxos(rows, mult_regime=5, capitulacao=False)
    assert dj["n_afetados"] == 1
    assert dj["afetados"][0]["is_seed"] is True
    assert dj["afetados"][0]["mult_degradado"] == 3


def test_shy_ignorado():
    """SHY (reserva) não entra no disjuntor."""
    rows = [_row("SHY", verdict="JUSTO", is_shy=True, aportes_recentes=3)]
    dj = ps._disjuntor_fluxos(rows, mult_regime=5, capitulacao=False)
    assert dj["n_afetados"] == 0


def test_so_degrada_nunca_sobe():
    """Survival: aportes_recentes não pode SUBIR o multiplicador (degradação só ≤ regime)."""
    # mult_regime − aportes seria >= mult_regime apenas se aportes<=0 (já filtrado);
    # garantimos que nenhum afetado tenha mult_degradado > mult_original.
    rows = [_row("A", verdict="JUSTO", aportes_recentes=1)]
    dj = ps._disjuntor_fluxos(rows, mult_regime=3, capitulacao=False)
    for af in dj["afetados"]:
        assert af["mult_degradado"] <= af["mult_original"]


# ═══════════════ 3. INTEGRAÇÃO no portfolio_analytics (sem rede) ═════════════════
def _patch_offline(monkeypatch, ranking):
    """Monkeypatcha tudo que toca a rede; injeta um ranking sintético (ticker→asset)."""
    monkeypatch.setattr(ps, "_flatten_ranking", lambda: ranking)
    monkeypatch.setattr(ps, "_bucket_of", lambda t: "ANCORA")
    monkeypatch.setattr(ps, "_cov_analytics", lambda w: None)
    monkeypatch.setattr(ps, "_correlation_matrix", lambda t: {})
    monkeypatch.setattr(ps, "_stress_scenarios", lambda *a, **k: [])
    monkeypatch.setattr(ps, "_thesis_stops", lambda rows: [])

    import app.services.ranking_service as rs
    monkeypatch.setattr(rs, "compute_ranking", lambda *a, **k: {"categories": {}})
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))


def test_payload_expoe_disjuntor_implementado_true(monkeypatch):
    """portfolio_analytics expõe disjuntor_fluxos com implementado:true (antes era false)."""
    _patch_offline(monkeypatch, {})
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0, "aportes_recentes": 0}]
    out = ps.portfolio_analytics(positions, equity=100000.0)
    assert "disjuntor_fluxos" in out
    assert out["disjuntor_fluxos"]["implementado"] is True
    # também substitui o stub dentro de leverage_agregado
    assert out["leverage_agregado"]["disjuntor_fluxos"]["implementado"] is True


def test_payload_degrada_ativo_caindo(monkeypatch):
    """Ativo CAINDO (JUSTO) com aportes consecutivos → disjuntor afeta + degrada aporte_regime."""
    # ranking marca AAPL como JUSTO (caindo) e abaixo da MM.
    ranking = {"AAPL": {"ticker": "AAPL", "verdict": "JUSTO", "distance_ma200": -8.0,
                        "current_price": 90.0, "category": "US"}}
    _patch_offline(monkeypatch, ranking)
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0, "aportes_recentes": 2}]
    out = ps.portfolio_analytics(positions, equity=100000.0)  # equity alta → cap agregado não morde
    dj = out["disjuntor_fluxos"]
    assert dj["n_afetados"] == 1
    af = dj["afetados"][0]
    assert af["ticker"] == "AAPL"
    # regime NEUTRO (default) = 3x; 2 aportes → 1x.
    assert af["mult_degradado"] == 1
    ar = out["aporte_regime"]
    assert ar["degraded_by_disjuntor"] is True
    assert ar["multiplier"] == 1
    assert ar["multiplier"] <= ar["multiplier_pre_disjuntor"]


def test_payload_ativo_subindo_nao_degrada(monkeypatch):
    """Ativo SUBINDO (COMPRAR, acima da MM, no lucro) → sem degradação, aporte normal."""
    ranking = {"AAPL": {"ticker": "AAPL", "verdict": "COMPRAR", "distance_ma200": 12.0,
                        "current_price": 120.0, "category": "US"}}
    _patch_offline(monkeypatch, ranking)
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0, "aportes_recentes": 3}]
    out = ps.portfolio_analytics(positions, equity=100000.0)
    assert out["disjuntor_fluxos"]["n_afetados"] == 0
    assert out["aporte_regime"]["degraded_by_disjuntor"] is False


def test_payload_sem_historico_nao_degrada(monkeypatch):
    """Sem histórico (aportes_recentes ausente/0) → disjuntor não degrada (não fabrica)."""
    ranking = {"AAPL": {"ticker": "AAPL", "verdict": "JUSTO", "distance_ma200": -10.0,
                        "current_price": 90.0, "category": "US"}}
    _patch_offline(monkeypatch, ranking)
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]  # sem aportes_recentes
    out = ps.portfolio_analytics(positions, equity=100000.0)
    assert out["disjuntor_fluxos"]["n_afetados"] == 0
    assert out["aporte_regime"]["degraded_by_disjuntor"] is False
