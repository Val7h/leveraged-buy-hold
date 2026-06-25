"""
Testa o fallback do market_data para o Yahoo chart API (Render-safe) quando o
yfinance falha/retorna vazio — sem rede (monkeypatch).

Cobre:
- fetch_price_history cai no chart API e devolve DataFrame com colunas OHLCV
- DataFrame compatível com os consumidores (Close + Low + Open + Volume presentes)
- fetch_multiple_price_history usa sleep reduzido (não 3s/ticker)
"""
import time
import pandas as pd
import pytest

from app.services import market_data


def _fake_chart_df(ticker, days, want_div=False, want_annual=False):
    """Imita ranking_service._chart_api_df: (DataFrame[Close/High/Low], dy)."""
    idx = pd.date_range("2020-01-01", periods=300, freq="D")
    base = 100.0
    closes = [base + i * 0.1 for i in range(len(idx))]
    df = pd.DataFrame(
        {
            "Close": closes,
            "High": [c * 1.01 for c in closes],
            "Low": [c * 0.99 for c in closes],
        },
        index=idx,
    )
    return (df, None)


def test_fallback_to_chart_api_when_yfinance_empty(monkeypatch):
    # yfinance devolve vazio → deve cair no chart API
    class _EmptyTk:
        def __init__(self, *a, **k):
            pass

        def history(self, *a, **k):
            return pd.DataFrame()  # vazio

    monkeypatch.setattr(market_data.yf, "Ticker", _EmptyTk)
    monkeypatch.setattr(market_data.redis_cache, "cache_get_df", lambda *a, **k: None)
    monkeypatch.setattr(market_data.redis_cache, "cache_set_df", lambda *a, **k: None)
    # patcha o símbolo importado lazy dentro de ranking_service
    import app.services.ranking_service as rs
    monkeypatch.setattr(rs, "_chart_api_df", _fake_chart_df)

    df = market_data.fetch_price_history("AAPL", period="1y")

    assert df is not None, "deveria ter caído no chart API"
    # Colunas OHLCV completas (consumidores: Close/Low/Open/Volume)
    for col in ("Open", "High", "Low", "Close", "Volume"):
        assert col in df.columns, f"falta coluna {col}"
    assert len(df) == 300
    # Low real preservado (< Close), Open preenchido = Close, Volume = 0
    assert (df["Low"] < df["Close"]).all()
    assert (df["Open"] == df["Close"]).all()
    assert (df["Volume"] == 0).all()
    # Index temporal e ordenado (iterrows dos consumidores funciona)
    assert df.index.is_monotonic_increasing


def test_period_to_days_mapping():
    assert market_data._PERIOD_DAYS["1y"] == 366
    assert market_data._PERIOD_DAYS["5y"] == 1830
    assert market_data._PERIOD_DAYS["max"] == 9000


def test_returns_none_when_chart_api_also_fails(monkeypatch):
    class _EmptyTk:
        def __init__(self, *a, **k):
            pass

        def history(self, *a, **k):
            return pd.DataFrame()

    monkeypatch.setattr(market_data.yf, "Ticker", _EmptyTk)
    monkeypatch.setattr(market_data.redis_cache, "cache_get_df", lambda *a, **k: None)
    monkeypatch.setattr(market_data.redis_cache, "cache_set_df", lambda *a, **k: None)
    monkeypatch.setattr(market_data, "_ALLOW_SYNTH", False)
    import app.services.ranking_service as rs
    monkeypatch.setattr(rs, "_chart_api_df", lambda *a, **k: (None, None))

    df = market_data.fetch_price_history("ZZZZ", period="1y")
    assert df is None, "sem chart API e sem sintético → None (não fabrica)"


def test_multiple_uses_small_sleep(monkeypatch):
    calls = {"sleeps": []}
    monkeypatch.setattr(market_data.time, "sleep", lambda s: calls["sleeps"].append(s))
    monkeypatch.setattr(
        market_data, "fetch_price_history",
        lambda t, period="10y": pd.DataFrame({"Close": [1, 2, 3]}),
    )

    market_data.fetch_multiple_price_history(["A", "B", "C"], period="2y")

    # sleep só entre tickers (n-1 vezes) e cada um pequeno (<= 0.1s), nunca 3s
    assert calls["sleeps"] == [0.1, 0.1]
    assert all(s <= 0.1 for s in calls["sleeps"])
