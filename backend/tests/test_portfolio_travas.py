"""
Golden tests OFFLINE das TRAVAS DE PORTFÓLIO (Fase 2) — rede de segurança agregada.

POR QUE ESTE ARQUIVO EXISTE
---------------------------
As 4 travas (stop de tese, duração, choque de crédito, exposição agregada) leem
fontes AO VIVO (fundamentals_provider.get_fundamentals, ranking _chart_api_*).
O sandbox NÃO tem rede → tudo é MONKEYPATCHADO. Testamos a LÓGICA pura de cada
gatilho sobre dados sintéticos: fcf negativo dispara thesis_stop, VIX≥30 dispara
credit_shock, concentração >25% alerta, duração >24m + esticado alerta.

DOUTRINA (regra nº1 = SOBREVIVÊNCIA): prefira FALSO POSITIVO a FALSO NEGATIVO.
Os testes exigem que a trava DISPARE no caso de risco e fique SILENCIOSA (sem
fabricar dado) quando a fonte falha.
"""
from __future__ import annotations

import datetime as dt

import pytest

from app.services import portfolio_service as ps


# ─────────────────────────── TRAVA 1: STOP DE TESE ──────────────────────────────
def _row(ticker, **kw):
    base = {"ticker": ticker, "is_shy": False, "is_seed": False,
            "dy_worst_year": None, "dividend_yield": None, "verdict": "JUSTO",
            "notional": 1000.0}
    base.update(kw)
    return base


def test_thesis_stop_fires_on_negative_fcf(monkeypatch):
    """FCF yield negativo → empresa queimando caixa → stop de tese DISPARA."""
    monkeypatch.setattr(ps, "_thesis_stops", ps._thesis_stops)  # garante alvo real

    def fake_fund(tk):
        return {"fcf_yield": -0.05, "roic": 0.15, "dividend_yield": 2.0, "source": "test"}

    import app.services.fundamentals_provider as fp
    monkeypatch.setattr(fp, "get_fundamentals", fake_fund)
    monkeypatch.setattr(fp, "_is_no_fundamentals", lambda t: False)

    out = ps._thesis_stops([_row("XYZ")])
    assert len(out) == 1
    assert out[0]["ticker"] == "XYZ"
    assert "queimando caixa" in out[0]["reason"].lower()
    assert out[0]["fcf_yield"] == -0.05


def test_thesis_stop_fires_on_low_roic(monkeypatch):
    """ROIC abaixo do gatilho absoluto (0.03) → tese quebrada → DISPARA."""
    import app.services.fundamentals_provider as fp
    monkeypatch.setattr(fp, "get_fundamentals",
                        lambda t: {"fcf_yield": 0.05, "roic": 0.01, "dividend_yield": 1.0, "source": "test"})
    monkeypatch.setattr(fp, "_is_no_fundamentals", lambda t: False)

    out = ps._thesis_stops([_row("ABC")])
    assert len(out) == 1
    assert "roic" in out[0]["reason"].lower()


def test_thesis_stop_fires_on_dividend_cut(monkeypatch):
    """DY zerou E pior-ano do ranking == 0 E DY anterior > 0 → corte de dividendo."""
    import app.services.fundamentals_provider as fp
    monkeypatch.setattr(fp, "get_fundamentals",
                        lambda t: {"fcf_yield": 0.05, "roic": 0.20, "dividend_yield": 0.0, "source": "test"})
    monkeypatch.setattr(fp, "_is_no_fundamentals", lambda t: False)

    # ranking dizia DY>0 antes (dividend_yield) e pior-ano 0 → corte
    out = ps._thesis_stops([_row("DIV", dy_worst_year=0, dividend_yield=5.0)])
    assert len(out) == 1
    assert "dividendo cortado" in out[0]["reason"].lower()


def test_thesis_stop_silent_on_healthy(monkeypatch):
    """Fundamento saudável → NENHUM alerta (sem falso positivo absurdo)."""
    import app.services.fundamentals_provider as fp
    monkeypatch.setattr(fp, "get_fundamentals",
                        lambda t: {"fcf_yield": 0.08, "roic": 0.18, "dividend_yield": 3.0, "source": "test"})
    monkeypatch.setattr(fp, "_is_no_fundamentals", lambda t: False)
    assert ps._thesis_stops([_row("GOOD")]) == []


def test_thesis_stop_skips_shy_and_crypto(monkeypatch):
    """SHY e crypto/índice (sem fundamentos) → NUNCA entram no stop de tese."""
    import app.services.fundamentals_provider as fp
    # se chamasse, retornaria FCF negativo — mas não deve chamar p/ esses
    monkeypatch.setattr(fp, "get_fundamentals",
                        lambda t: {"fcf_yield": -0.9, "roic": -0.5, "dividend_yield": 0.0})
    monkeypatch.setattr(fp, "_is_no_fundamentals",
                        lambda t: t.upper().endswith("-USD") or t.upper().startswith("^"))
    rows = [_row("SHY", is_shy=True), _row("BTC-USD"), _row("^GSPC")]
    assert ps._thesis_stops(rows) == []


def test_thesis_stop_seed_not_immune_but_flagged(monkeypatch):
    """is_seed NÃO é imune (tese quebrada → âncora revista), mas vem com flag is_seed."""
    import app.services.fundamentals_provider as fp
    monkeypatch.setattr(fp, "get_fundamentals",
                        lambda t: {"fcf_yield": -0.1, "roic": 0.1, "dividend_yield": 2.0, "source": "test"})
    monkeypatch.setattr(fp, "_is_no_fundamentals", lambda t: False)
    out = ps._thesis_stops([_row("SEED", is_seed=True)])
    assert len(out) == 1
    assert out[0]["is_seed"] is True


def test_thesis_stop_silent_when_source_fails(monkeypatch):
    """Fonte retorna None/vazio (rede falhou) → trava silenciosa, NÃO fabrica número."""
    import app.services.fundamentals_provider as fp
    monkeypatch.setattr(fp, "get_fundamentals", lambda t: {})
    monkeypatch.setattr(fp, "_is_no_fundamentals", lambda t: False)
    assert ps._thesis_stops([_row("DEAD")]) == []


# ─────────────────────────── TRAVA 2: DURAÇÃO ──────────────────────────────────
def test_duration_warning_fires_old_and_esticado():
    """openedAt > 24 meses E verdict ESTICADO → alerta de duração."""
    old = (dt.date.today() - dt.timedelta(days=int(30.44 * 30))).isoformat()  # ~30 meses
    rows = [_row("OLD", verdict="ESTICADO")]
    positions = [{"ticker": "OLD", "openedAt": old}]
    out = ps._duration_warnings(rows, positions)
    assert len(out) == 1
    assert out[0]["ticker"] == "OLD"
    assert out[0]["months_held"] >= 24


def test_duration_warning_silent_if_recent():
    """openedAt < 24 meses → sem alerta (mesmo esticado)."""
    recent = (dt.date.today() - dt.timedelta(days=int(30.44 * 6))).isoformat()  # 6 meses
    rows = [_row("NEW", verdict="ESTICADO")]
    positions = [{"ticker": "NEW", "openedAt": recent}]
    assert ps._duration_warnings(rows, positions) == []


def test_duration_warning_silent_if_has_upside():
    """Velha mas COMPRAR/COMPRAR FORTE (tese se realizando) → sem alerta."""
    old = (dt.date.today() - dt.timedelta(days=int(30.44 * 30))).isoformat()
    rows = [_row("OLDBUY", verdict="COMPRAR FORTE")]
    positions = [{"ticker": "OLDBUY", "openedAt": old}]
    assert ps._duration_warnings(rows, positions) == []


def test_duration_warning_silent_without_openedAt():
    """Sem openedAt nas positions → trava silenciosa (não inventa data)."""
    rows = [_row("NODATE", verdict="ESTICADO")]
    assert ps._duration_warnings(rows, [{"ticker": "NODATE"}]) == []


# ─────────────────────────── TRAVA 3: CHOQUE DE CRÉDITO ────────────────────────
def test_credit_shock_fires_high_vix(monkeypatch):
    """VIX ≥ 30 → regime de stress de crédito DISPARA (proxy)."""
    import app.services.ranking_service as rs
    import numpy as np
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (np.array([15.0, 35.0]), None))
    # HYG/LQD indisponíveis (rede off) → só VIX
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))

    out = ps._credit_shock()
    assert out["triggered"] is True
    assert out["vix"] == 35.0
    assert "VIX" in out["signal"]
    assert "desalavanque" in out["recommendation"].lower() or "alavancagem" in out["recommendation"].lower()


def test_credit_shock_silent_low_vix(monkeypatch):
    """VIX baixo e HYG/LQD ausentes → NÃO dispara, mas é honesto sobre o proxy."""
    import app.services.ranking_service as rs
    import numpy as np
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (np.array([12.0, 14.0]), None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))

    out = ps._credit_shock()
    assert out["triggered"] is False
    assert out["vix"] == 14.0
    assert "proxy" in out["proxy_note"].lower()


def test_credit_shock_silent_when_vix_unavailable(monkeypatch):
    """VIX indisponível (rede falhou) → triggered=False, NÃO fabrica número."""
    import app.services.ranking_service as rs
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))
    out = ps._credit_shock()
    assert out["triggered"] is False
    assert out["vix"] is None


def test_credit_shock_fires_hyg_lqd_spread(monkeypatch):
    """VIX calmo mas HYG apanhando vs LQD (>3pp/20d) → spread de crédito abrindo → DISPARA."""
    import app.services.ranking_service as rs
    import numpy as np
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (np.array([12.0, 13.0]), None))

    today = dt.date.today()
    dates = [today - dt.timedelta(days=i) for i in range(40, 0, -1)]
    # HYG cai 8% nos últimos 20 pregões; LQD estável → diferencial ~ -8pp < -3pp
    hyg_closes = [100.0] * 20 + list(np.linspace(100.0, 92.0, 20))
    lqd_closes = [100.0] * 40

    def fake_df(tk, *a, **k):
        import pandas as pd
        closes = hyg_closes if tk == "HYG" else lqd_closes
        df = pd.DataFrame({"Close": closes,
                           "High": closes, "Low": closes},
                          index=pd.to_datetime([d.isoformat() for d in dates]))
        return df, None

    def fake_dated_closes(df):
        return [(idx.date(), float(c)) for idx, c in zip(df.index, df["Close"])]

    monkeypatch.setattr(rs, "_chart_api_df", fake_df)
    monkeypatch.setattr(rs, "_dated_closes", fake_dated_closes)

    out = ps._credit_shock()
    assert out["triggered"] is True
    assert out["hyg_lqd_spread_20d"] is not None
    assert out["hyg_lqd_spread_20d"] <= -3.0


# ─────────────────────────── TRAVA 4: EXPOSIÇÃO AGREGADA ───────────────────────
def test_exposure_cap_fires_concentration():
    """Maior posição > 25% do notional de risco → alerta de concentração."""
    rows = [
        _row("BIG", notional=5000.0),
        _row("A", notional=2000.0),
        _row("B", notional=2000.0),
        _row("C", notional=1000.0),
    ]  # BIG = 50% de 10000
    out = ps._exposure_caps(rows, buckets=[], correlation={}, risk_notional=10000.0,
                            effective_leverage=2.0)
    types = [a["type"] for a in out["alerts"]]
    assert "concentracao_ativo" in types
    assert out["top_position"]["ticker"] == "BIG"
    assert out["top_position"]["pct_of_risk_notional"] == 50.0


def test_exposure_cap_silent_when_balanced():
    """Posições equilibradas (cada ~25% ou menos) → sem alerta de concentração de ativo."""
    rows = [_row(t, notional=2500.0) for t in ("A", "B", "C", "D")]  # cada 25%
    out = ps._exposure_caps(rows, buckets=[], correlation={}, risk_notional=10000.0,
                            effective_leverage=1.5)
    assert not any(a["type"] == "concentracao_ativo" for a in out["alerts"])


def test_exposure_cap_fires_bucket_over_target():
    """Bucket acima do alvo + banda (5%) → alerta de concentração de bucket."""
    rows = [_row("X", notional=1000.0)]
    buckets = [{"bucket": "ACELERADOR", "target": 15.0, "real": 35.0, "drift": 20.0}]
    out = ps._exposure_caps(rows, buckets=buckets, correlation={}, risk_notional=1000.0,
                            effective_leverage=1.0)
    assert any(a["type"] == "concentracao_bucket" and a["bucket"] == "ACELERADOR"
               for a in out["alerts"])


def test_exposure_cap_fires_hidden_cluster():
    """Cluster de corr ≥ 0.8 somando > 25% do risco → alerta de cluster oculto."""
    rows = [
        _row("AAA", notional=3000.0),
        _row("BBB", notional=3000.0),
        _row("CCC", notional=2000.0),
        _row("DDD", notional=2000.0),
    ]  # AAA+BBB = 60% e andam colados
    correlation = {"redundant_pairs": [{"a": "AAA", "b": "BBB", "corr": 0.9}]}
    out = ps._exposure_caps(rows, buckets=[], correlation=correlation,
                            risk_notional=10000.0, effective_leverage=2.0)
    clusters = out["clusters"]
    assert clusters and clusters[0]["pct_of_risk_notional"] == 60.0
    assert any(a["type"] == "cluster_correlacao" for a in out["alerts"])


# ─────────────────────────── INTEGRAÇÃO: payload completo ──────────────────────
def test_portfolio_analytics_includes_all_four_travas(monkeypatch):
    """portfolio_analytics retorna as 4 travas no payload, blindadas contra falha de rede."""
    # Neutraliza TODAS as fontes de rede usadas internamente.
    monkeypatch.setattr(ps, "_flatten_ranking", lambda: {})
    monkeypatch.setattr(ps, "_bucket_of", lambda t: "ANCORA")
    monkeypatch.setattr(ps, "_cov_analytics", lambda w: None)
    monkeypatch.setattr(ps, "_correlation_matrix", lambda t: {})
    monkeypatch.setattr(ps, "_stress_scenarios", lambda *a, **k: [])
    monkeypatch.setattr(ps, "_thesis_stops", lambda rows: [])  # rede off → vazio

    import app.services.ranking_service as rs
    monkeypatch.setattr(rs, "compute_ranking", lambda *a, **k: {"categories": {}})
    monkeypatch.setattr(rs, "_chart_api_series", lambda tk, days: (None, None))
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))

    positions = [{"ticker": "AAPL", "shares": 10, "avg_price": 100.0}]
    out = ps.portfolio_analytics(positions, equity=1000.0)
    assert "thesis_stops" in out
    assert "duration_warnings" in out
    assert "credit_shock" in out
    assert "exposure_caps" in out
    assert out["credit_shock"]["triggered"] is False  # rede off
