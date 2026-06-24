"""
Golden tests do SCORE DE CRYPTO (framework separado — ratificado Pal/Hayes/Woo).

Testa a LÓGICA PURA, SEM REDE (o sandbox não tem rede): séries/respostas sintéticas
via monkeypatch. Protege os invariantes da doutrina:
  • RENORMALIZAÇÃO quando faltam fatores (REGRA DE OURO — nada fabricado).
  • Leverage caps por ativo: BTC 2x · ETH 1.75x · top-10 1.25x · resto 1x (teto 3x).
  • Circuit breaker (OI>p90 E funding>p90 → trava/força 1x).
  • Funding contrarian (negativo = compra, positivo = topo).
  • Crypto roteia p/ o scorer dedicado (NÃO o blend de ações).

Rodar: `pytest tests/test_crypto_scoring.py` a partir de backend/.
"""
import numpy as np

from app.quantitative import scoring_v2 as S
from app.services import crypto_data as CD
from app.services import ranking_service as R


# ─────────────────────── leverage cap POR ATIVO (doutrina §5) ───────────────────────
def test_crypto_leverage_cap_by_asset():
    assert S.crypto_leverage_cap("BTC", market_cap_rank=1) == 2.0      # BTC 2x
    assert S.crypto_leverage_cap("ETH", market_cap_rank=2) == 1.75     # ETH 1.75x
    assert S.crypto_leverage_cap("SOL", market_cap_rank=5) == 1.25     # top-10 → 1.25x
    assert S.crypto_leverage_cap("LINK", market_cap_rank=15) == 1.0    # fora do top-10 → 1x
    assert S.crypto_leverage_cap("FOO", market_cap_rank=None) == 1.0   # rank ausente → conservador 1x
    # teto-classe crypto = 3x nunca é ultrapassado (mesmo se a tabela mudar)
    for sym in ("BTC", "ETH", "SOL", "ZZZ"):
        assert S.crypto_leverage_cap(sym, 1) <= 3.0


# ─────────────────────── circuit breaker (Hayes — binário) ───────────────────────
def test_crypto_circuit_breaker():
    assert S.crypto_circuit_breaker(oi_percentile=95, funding_percentile=95) is True   # ambos > p90
    assert S.crypto_circuit_breaker(oi_percentile=95, funding_percentile=50) is False  # só OI
    assert S.crypto_circuit_breaker(oi_percentile=50, funding_percentile=95) is False  # só funding
    assert S.crypto_circuit_breaker(None, None) is False                                # sem dado → não trava


def test_circuit_breaker_forces_1x():
    # SOBREALAVANCADO força sizing 1x mesmo p/ BTC (teto normal 2x).
    base = S.compute_crypto_score(symbol="BTC", market_cap_rank=1,
                                  oi_percentile=95, funding_percentile=95)
    assert base["circuit_breaker"] is True
    assert base["leverage_cap"] == 1.0
    calm = S.compute_crypto_score(symbol="BTC", market_cap_rank=1,
                                  oi_percentile=50, funding_percentile=50)
    assert calm["leverage_cap"] == 2.0


# ─────────────────────── funding contrarian (Woo/Hayes) ───────────────────────
def test_crypto_funding_contrarian():
    capit = S.score_crypto_funding(-0.001)   # funding muito negativo = capitulação = compra
    topo = S.score_crypto_funding(0.001)     # funding muito positivo = excesso = topo
    assert capit > topo
    assert capit == 100.0 and topo == 0.0
    assert S.score_crypto_funding(None) is None   # ausente → omitido (renormaliza)


# ─────────────────────── RENORMALIZAÇÃO quando falta fator (REGRA DE OURO) ───────────────────────
def test_survival_renormalizes_without_onchain():
    # on-chain z-score OMITIDO (Glassnode pago) → termo SAI, NÃO injeta 50 falso.
    s_full, bd_full, omits_full = S.compute_crypto_survival(
        volume_24h=1e9, market_cap_rank=1, age_years=15, onchain_z=2.0, symbol="BTC")
    s_wo, bd_wo, omits_wo = S.compute_crypto_survival(
        volume_24h=1e9, market_cap_rank=1, age_years=15, onchain_z=None, symbol="BTC")
    assert "saude_onchain" in bd_full
    assert "saude_onchain" not in bd_wo           # termo removido
    assert "saude_onchain" in omits_wo            # documentado como omitido
    assert s_wo is not None and 0 <= s_wo <= 100  # renormalizou, não quebrou


def test_survival_all_factors_missing_returns_none():
    # nenhum fator de sobrevivência → não opina (None), não fabrica
    s, bd, omits = S.compute_crypto_survival(
        volume_24h=None, market_cap_rank=None, age_years=None, onchain_z=None)
    assert s is None
    assert bd == {}
    assert set(omits) >= {"liquidez", "marketcap_dominancia", "saude_onchain", "lindy"}


def test_timing_renormalizes_omitting_paid_onchain():
    # MVRV-Z/Reserve/Puell/SOPR (Glassnode pago) ausentes → SAEM e renormalizam;
    # restam funding (Binance free) + técnico. O score continua válido (0-100).
    s, bd, omits = S.compute_crypto_timing(
        funding_rate=-0.0005, slow_stoch_weekly=15, distance_ma200=-10,
        discount_from_top=30, reversal_confirmation=0.6)
    assert s is not None and 0 <= s <= 100
    assert "funding_contrarian" in bd
    assert {"mvrv_z", "reserve_risk", "puell", "sopr"}.issubset(set(omits))


def test_timing_includes_paid_onchain_when_present():
    # se um dia houver fonte (live) de MVRV-Z, ele entra com seu peso (não some por padrão).
    s, bd, omits = S.compute_crypto_timing(funding_rate=0.0, mvrv_z=80.0)
    assert "mvrv_z" in bd
    assert "mvrv_z" not in omits


def test_regime_renormalizes_omitting_paid_macro():
    # liquidez global (Fed-RRP-TGA) e crédito China = macro pago/frágil → OMITIDOS sempre.
    # Restam DXY + USD/JPY + regime BTC (grátis via Yahoo). Score válido.
    s, bd, omits = S.score_crypto_regime(dxy_change=-3.0, usdjpy_change=2.0, btc_regime="NEUTRO")
    assert s is not None and 0 <= s <= 100
    assert {"liquidez_global_fed_rrp_tga", "credito_china"}.issubset(set(omits))
    # dólar caindo (liquidez expansiva) deve ELEVAR a nota vs dólar subindo
    s_up, _, _ = S.score_crypto_regime(dxy_change=5.0, btc_regime="NEUTRO")
    s_dn, _, _ = S.score_crypto_regime(dxy_change=-5.0, btc_regime="NEUTRO")
    assert s_dn > s_up


def test_regime_all_missing_returns_none():
    s, bd, omits = S.score_crypto_regime(dxy_change=None, usdjpy_change=None, btc_regime=None)
    assert s is None


# ─────────────────────── confiança cai com on-chain ausente ───────────────────────
def test_confidence_low_when_onchain_absent():
    # produção (só grátis): on-chain estrutural quase todo ausente → confiança no máx MEDIA/BAIXA.
    full = S.compute_crypto_score(
        volume_24h=1e9, market_cap_rank=1, age_years=15, symbol="BTC",
        dxy_change=-2.0, btc_regime="NEUTRO", funding_rate=-0.0003,
        onchain_z=None, mvrv_z=None, reserve_risk=None, puell=None, sopr=None)
    assert full["confidence"] in ("BAIXA", "MEDIA")   # NUNCA ALTA sem on-chain
    # com on-chain pago presente (hipotético live) → pode subir a ALTA
    rich = S.compute_crypto_score(
        volume_24h=1e9, market_cap_rank=1, age_years=15, symbol="BTC",
        dxy_change=-2.0, btc_regime="NEUTRO", funding_rate=-0.0003,
        onchain_z=1.0, mvrv_z=70, reserve_risk=60, puell=55, sopr=50)
    assert rich["confidence"] == "ALTA"


# ─────────────────────── score consolidado: shape e faixas ───────────────────────
def test_compute_crypto_score_shape_and_ranges():
    r = S.compute_crypto_score(
        volume_24h=5e8, market_cap_rank=8, age_years=4, symbol="SOL",
        dxy_change=-1.0, usdjpy_change=1.0, btc_regime="NEUTRO",
        funding_rate=0.0001, slow_stoch_weekly=30, distance_ma200=-5,
        discount_from_top=20, reversal_confirmation=0.5)
    for k in ("quality", "momentum", "confidence", "leverage_cap",
              "circuit_breaker", "quality_breakdown", "momentum_breakdown", "omitted"):
        assert k in r
    assert 0 <= r["quality"] <= 100
    assert 0 <= r["momentum"] <= 100
    assert r["leverage_cap"] == 1.25           # SOL rank 8 = top-10 → 1.25x
    assert r["circuit_breaker"] is False
    # omitted documenta os fatores que sairam (transparência)
    assert "saude_onchain" in r["omitted"]["survival"]
    assert "mvrv_z" in r["omitted"]["timing"]


def test_crypto_score_never_raises_on_all_none():
    # blindagem total: tudo None → ainda devolve dict válido (neutro), não lança.
    r = S.compute_crypto_score()
    assert 0 <= r["quality"] <= 100 and 0 <= r["momentum"] <= 100
    assert r["leverage_cap"] == 1.0


# ─────────────────────── Lindy / liquidez / marketcap (sub-scores) ───────────────────────
def test_lindy_and_liquidity_monotonic():
    assert S.score_crypto_lindy(15) == 100.0
    assert S.score_crypto_lindy(0) < S.score_crypto_lindy(8) < S.score_crypto_lindy(15)
    assert S.score_crypto_lindy(None) is None
    # liquidez: mais volume = nota maior (log)
    assert S.score_crypto_liquidity(1e7) < S.score_crypto_liquidity(1e9) <= S.score_crypto_liquidity(1e10)
    assert S.score_crypto_liquidity(None) is None
    assert S.score_crypto_liquidity(0) is None
    # marketcap: rank baixo = nota maior
    assert S.score_crypto_marketcap(1) > S.score_crypto_marketcap(10) > S.score_crypto_marketcap(80)
    assert S.score_crypto_marketcap(None) is None


# ─────────────────────── crypto_data: helpers puros (sem rede) ───────────────────────
def test_base_symbol_and_age():
    assert CD.base_symbol("BTC-USD") == "BTC"
    assert CD.base_symbol("ETH-USDT") == "ETH"
    assert CD.base_symbol("sol-usd") == "SOL"
    assert CD.genesis_year("BTC-USD") == 2009
    assert CD.genesis_year("ZZZ-USD") is None       # desconhecida → Lindy omitido
    age = CD.age_years("BTC-USD")
    assert age is not None and age >= 15            # BTC nasceu em 2009


def test_crypto_data_fetch_all_blinded(monkeypatch):
    # sem rede: _http_json devolve None → fetch_all NÃO lança, devolve shape com Nones.
    CD._CACHE.clear()
    monkeypatch.setattr(CD, "_http_json", lambda url: None)
    out = CD.fetch_all("BTC-USD")
    assert out["symbol"] == "BTC"
    assert out["volume_24h"] is None and out["funding_rate"] is None
    assert out["age_years"] is not None             # Lindy é estático (não depende de rede)


def test_crypto_data_parses_coingecko(monkeypatch):
    CD._CACHE.clear()

    def fake_http(url):
        if "/global" in url:
            return {"data": {"market_cap_percentage": {"btc": 54.3}}}
        if "/coins/markets" in url:
            return [{"id": "bitcoin", "total_volume": 3e10, "market_cap": 1.2e12,
                     "market_cap_rank": 1}]
        if "premiumIndex" in url:
            return {"lastFundingRate": "-0.0002"}
        if "openInterest" in url:
            return {"openInterest": "75000.0"}
        return None

    monkeypatch.setattr(CD, "_http_json", fake_http)
    out = CD.fetch_all("BTC-USD")
    assert abs(out["btc_dominance"] - 54.3) < 1e-6
    assert out["market_cap_rank"] == 1
    assert abs(out["volume_24h"] - 3e10) < 1
    assert abs(out["funding_rate"] - (-0.0002)) < 1e-9
    assert abs(out["open_interest"] - 75000.0) < 1e-6


# ─────────────────────── roteamento: CRYPTO usa o scorer dedicado ───────────────────────
def _fake_crypto_df(n=400):
    import pandas as pd
    idx = pd.date_range("2021-01-01", periods=n, freq="D")
    vals = np.linspace(20000.0, 60000.0, n)
    return pd.DataFrame({"Close": vals, "High": vals * 1.01, "Low": vals * 0.99}, index=idx)


def test_crypto_routes_to_dedicated_scorer(monkeypatch):
    # CRYPTO NÃO deve cair no blend de ações: o resultado tem is_crypto=True,
    # beta None e o breakdown de momento traz regime/timing (não os campos de ação).
    df = _fake_crypto_df()
    monkeypatch.setattr(R, "_chart_api_df",
                        lambda tk, days, want_div=False, want_annual=False: (df, None, {}))
    # crypto_data sem rede → fatores externos None (renormaliza); ainda produz linha válida.
    monkeypatch.setattr(R.CD, "_http_json", lambda url: None)
    # blend de ações deve NÃO ser chamado p/ crypto
    def _boom(*a, **k):
        raise AssertionError("compute_quality_blend NAO deve ser chamado p/ crypto")
    monkeypatch.setattr(R.S, "compute_quality_blend", _boom)

    res = R._analyze("BTC-USD", "ACELERADOR", "Bitcoin", "CRYPTO", {}, {}, "NEUTRO")
    assert res is not None
    assert res.get("is_crypto") is True
    assert res.get("beta") is None
    assert res["leverage"] <= 3.0                     # teto-classe crypto
    assert "crypto_omitted" in res
    assert "regime" in res["momentum_breakdown"] or "timing" in res["momentum_breakdown"]
