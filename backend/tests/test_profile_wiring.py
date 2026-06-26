"""
ENCANAMENTO da camada de PERFIL no motor de alavancagem (ranking_service + portfolio_service).

A FUNDAÇÃO (app/quantitative/profiles.py + scoring_v2) já é testada em test_profiles.py.
Aqui validamos só o WIRING backend:
  • screen_assets/analyze_tickers/_analyze recebem `profile` e o repassam aos caps;
  • portfolio_analytics recebe `profile`, troca o multiplicador do regime e aplica o teto duro;
  • ZERO REGRESSÃO: default = "agressivo" = comportamento atual (sem perfil = idêntico);
  • a BORDA (None) normaliza p/ moderado.

OFFLINE: tudo que toca rede é MONKEYPATCHADO (mesmo padrão de test_portfolio_travas.py).
"""
from __future__ import annotations

import numpy as np

from app.quantitative import profiles
from app.services import ranking_service as rs
from app.services import portfolio_service as ps


# ─────────────────────────── import OK ──────────────────────────────────────────
def test_imports_ok():
    from app.services import ranking_service, portfolio_service  # noqa: F401
    from app.api.v1 import ranking, portfolio                    # noqa: F401
    assert hasattr(ranking_service, "screen_assets")
    assert hasattr(portfolio_service, "portfolio_analytics")


# ─────────────────────────── ZERO REGRESSÃO (default agressivo) ─────────────────
def test_default_signatures_are_aggressive():
    """As funções internas DEFAULTAM para 'agressivo' = comportamento atual."""
    import inspect
    assert inspect.signature(rs._analyze).parameters["profile"].default == "agressivo"
    assert inspect.signature(rs.analyze_tickers).parameters["profile"].default == "agressivo"
    assert inspect.signature(rs.screen_assets).parameters["profile"].default == "agressivo"
    assert inspect.signature(ps.portfolio_analytics).parameters["profile"].default == "agressivo"


def _patch_analyze_capture(monkeypatch):
    """Captura o profile com que _analyze é chamado e devolve um resultado sintético determinístico
    cujo leverage reflete o teto do perfil (proxy do encanamento _analyze→teto_alavancagem_aptidao)."""
    seen = {}

    def fake_analyze(tk, bucket, name, cat, idxc, idxdm, equity_regime, profile="agressivo"):
        seen["profile"] = profile
        # ativo que pegaria 4-5x no agressivo (σ baixo, beta ~1, regime forte): aqui o teto do
        # perfil é o único que muda → usamos teto_alavancagem_aptidao real com os caps do perfil.
        _plp = profiles.profile_leverage_params(profile)
        lev, _ = rs.S.teto_alavancagem_aptidao(
            sigma_pct=18.0, gap_pct=3.0, beta=1.0, mult_regime=5,
            leverage_cap=_plp["leverage_cap"], sigma_floor_min_pct=_plp["sigma_floor_min_pct"])
        return {"ticker": tk, "leverage": lev, "verdict": "COMPRAR", "category": cat}

    monkeypatch.setattr(rs, "_analyze", fake_analyze)
    monkeypatch.setattr(rs, "compute_ranking", lambda *a, **k: {"categories": {}})
    monkeypatch.setattr(rs, "_fetch_indices", lambda: ({}, {}, "NEUTRO"))
    monkeypatch.setattr(rs, "_index_universe", lambda: {})
    monkeypatch.setattr(rs, "regime", lambda *a, **k: "NEUTRO")
    return seen


def test_screen_agressivo_equals_no_profile(monkeypatch):
    """screen_assets sem profile == screen_assets(profile='agressivo') — bit a bit no leverage."""
    _patch_analyze_capture(monkeypatch)
    out_default = rs.screen_assets(["XPTO"])
    out_aggr = rs.screen_assets(["XPTO"], profile="agressivo")
    assert out_default["assets"][0]["leverage"] == out_aggr["assets"][0]["leverage"]
    # E o agressivo de fato não capa (ativo pegaria ~5x).
    assert out_aggr["assets"][0]["leverage"] >= 4.0


def test_screen_conservador_caps_at_2(monkeypatch):
    """Conservador: o MESMO ativo que pega 4-5x no agressivo capa em ≤2x (teto duro do perfil)."""
    seen = _patch_analyze_capture(monkeypatch)
    out = rs.screen_assets(["XPTO"], profile="conservador")
    assert seen["profile"] == "conservador"          # o perfil chegou a _analyze
    assert out["assets"][0]["leverage"] <= 2.0


# ─────────────────────────── portfolio_analytics ───────────────────────────────
def _patch_portfolio_offline(monkeypatch, regime="NEUTRO"):
    """Neutraliza rede; fixa o regime do equity via compute_ranking sintético."""
    monkeypatch.setattr(ps, "_cov_analytics", lambda w: None)
    monkeypatch.setattr(ps, "_correlation_matrix", lambda t: {})
    monkeypatch.setattr(ps, "_stress_scenarios", lambda *a, **k: [])
    monkeypatch.setattr(ps, "_thesis_stops", lambda rows: [])
    monkeypatch.setattr(ps, "_bucket_of", lambda t: "ANCORA")

    # ranking sintético: categoria US no regime pedido, e o ticker mapeado p/ US.
    cats = {"US": {"regime": regime, "assets": [{"ticker": "AAPL", "category": "US"}]}}
    flat = {"AAPL": {"category": "US", "current_price": 100.0, "verdict": "JUSTO"}}
    monkeypatch.setattr(ps, "_flatten_ranking", lambda: flat)

    import app.services.ranking_service as _rs
    monkeypatch.setattr(_rs, "compute_ranking", lambda *a, **k: {"categories": cats})
    monkeypatch.setattr(_rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(_rs, "_chart_api_df", lambda *a, **k: (None, None))


def test_portfolio_aggressive_is_current_behavior(monkeypatch):
    """Sem profile (=agressivo) em NEUTRO → multiplicador do aporte = 3 (tabela atual)."""
    _patch_portfolio_offline(monkeypatch, regime="NEUTRO")
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    out = ps.portfolio_analytics(positions, equity=1000.0)
    ar = out["aporte_regime"]
    assert ar["profile"] == "agressivo"
    assert ar["multiplier_regime"] == 3          # NEUTRO agressivo = 3 (comportamento atual)


def test_portfolio_conservador_caps_multiplier(monkeypatch):
    """profile='conservador' em NEUTRO → multiplicador ≤ 2 onde o agressivo daria 3."""
    _patch_portfolio_offline(monkeypatch, regime="NEUTRO")
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    out_aggr = ps.portfolio_analytics(positions, equity=1000.0, profile="agressivo")
    out_cons = ps.portfolio_analytics(positions, equity=1000.0, profile="conservador")
    assert out_aggr["aporte_regime"]["multiplier_regime"] == 3
    assert out_cons["aporte_regime"]["multiplier_regime"] <= 2
    assert out_cons["aporte_regime"]["multiplier"] <= 2
    assert out_cons["aporte_regime"]["profile"] == "conservador"
    assert out_cons["aporte_regime"]["profile_leverage_cap"] == 2.0


def test_portfolio_hard_cap_bites_in_strong_regime(monkeypatch):
    """CAPIT.EXTREMA: agressivo daria 5x; conservador é capado pelo teto duro 2x."""
    _patch_portfolio_offline(monkeypatch, regime="CAPIT.EXTREMA")
    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    out_aggr = ps.portfolio_analytics(positions, equity=1000.0, profile="agressivo")
    out_cons = ps.portfolio_analytics(positions, equity=1000.0, profile="conservador")
    assert out_aggr["aporte_regime"]["multiplier_regime"] == 5   # doutrina atual
    assert out_cons["aporte_regime"]["multiplier_regime"] <= 2   # teto duro morde
