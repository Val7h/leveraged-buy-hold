"""
PERFIL na ABA RANKING — re-derivação SEM refetch (apply_profile_to_ranking).

A auditoria achou que GET /api/ranking servia o cache CANÔNICO (agressivo) a TODOS: conservador
via 5x no Ranking mas 2x no Screening/Aporte (incoerência de produto). A correção re-deriva a
alavancagem de cada ativo a partir dos tetos JÁ COMPUTADOS no payload cacheado (_profile_inputs),
SEM refazer fetch nem _analyze.

Garante:
  • conservador capa a leverage de cada ativo ≤2 (teto duro do perfil), ações E cripto;
  • agressivo/None → ranking IDÊNTICO ao original (zero regressão), só sem a chave interna;
  • a ORDEM do ranking é preservada (perfil só mexe na alavancagem, não no mérito);
  • _profile_inputs NUNCA vaza no contrato da API.

OFFLINE: monta payloads sintéticos (mesmo shape de _analyze/_analyze_crypto) — não toca rede.
"""
from __future__ import annotations

import copy

from app.services import ranking_service as rs


# ─────────────────────────── Fixtures sintéticas (shape de _analyze) ───────────────────────────
def _stock_asset(ticker="AAPL", regime="CAPIT.EXTREMA", rank=80.0, verdict="COMPRAR FORTE"):
    """Ativo de ações que pegaria 4-5x no agressivo (σ baixo, beta ~1, regime forte)."""
    return {
        "ticker": ticker,
        "verdict": verdict,
        "rank": rank,
        "rank_alavancado": rank,
        "leverage": 5.0,                 # canônico agressivo (regime CAPIT.EXTREMA=5x, sem cap mordendo)
        "quality": 70,
        "momentum": 80,
        "staggered_stops": {"stop_1_pct": -10, "stop_2_pct": -20, "liquidation_pct": -20},
        "_profile_inputs": {
            "regime": regime,
            "sigma_total": 18.0,         # σ normal → não capa no agressivo (sigma_floor None)
            "gap_pct": 3.0,
            "beta": 1.0,
            "max_dd": -40.0,
            "hist_curto": False,
            "adv_dollar": 5e8,           # large-cap → passa o gate de liquidez
            "gap_risk_extremo": False,
            "distance_ma200": 5.0,
            "teto_lev_tendencia": None,
            "verdict": verdict,
            "bucket": "ACELERADOR",
            "quality": 70,
            "is_buy_candidate": True,
            "is_crypto": False,
        },
    }


def _crypto_asset(ticker="BTC-USD", regime="CAPIT.EXTREMA"):
    """Cripto que no agressivo pega 2x (teto por-ativo BTC=2x, dentro do teto 3x de cripto)."""
    return {
        "ticker": ticker,
        "verdict": "COMPRAR FORTE",
        "rank": 75.0,
        "rank_alavancado": 75.0,
        "leverage": 2.0,                 # canônico agressivo: min(mult=5→3, lev_cap_asset=2) = 2
        "is_crypto": True,
        "staggered_stops": {"stop_1_pct": -10, "stop_2_pct": -20, "liquidation_pct": -20},
        "_profile_inputs": {
            "regime": regime,
            "mult": 5,                   # MULT[CAPIT.EXTREMA]=5 (cripto trava em 3x depois)
            "lev_cap_asset": 2.0,        # BTC = 2x por-ativo
            "is_buy_candidate": True,
            "bucket": "ACELERADOR",
            "verdict": "COMPRAR FORTE",
            "is_crypto": True,
        },
    }


def _ranking(assets_us, assets_crypto=None):
    cats = {"US": {"regime": "CAPIT.EXTREMA", "multiplier": 5, "assets": assets_us}}
    if assets_crypto is not None:
        cats["CRYPTO"] = {"regime": "CAPIT.EXTREMA", "multiplier": 3, "assets": assets_crypto}
    return {"categories": cats, "generated_at": "2026-06-26T00:00:00Z"}


# ─────────────────────────── Agressivo / None == idêntico (zero regressão) ───────────────────────────
def test_agressivo_identico_ao_cache():
    rk = _ranking([_stock_asset()], [_crypto_asset()])
    snapshot = copy.deepcopy(rk)
    out = rs.apply_profile_to_ranking(rk, "agressivo")
    a = out["categories"]["US"]["assets"][0]
    c = out["categories"]["CRYPTO"]["assets"][0]
    # leverage/rank/ordem idênticos ao canônico (só sem _profile_inputs)
    assert a["leverage"] == 5.0
    assert a["rank_alavancado"] == snapshot["categories"]["US"]["assets"][0]["rank_alavancado"]
    assert c["leverage"] == 2.0
    assert "_profile_inputs" not in a
    assert "_profile_inputs" not in c
    assert out["categories"]["US"]["multiplier"] == 5


def test_none_normaliza_moderado_nao_agressivo():
    """profile=None → moderado (default seguro do assinante), NÃO agressivo."""
    rk = _ranking([_stock_asset()])
    out = rs.apply_profile_to_ranking(rk, None)
    assert out["profile"] == "moderado"


# ─────────────────────────── Conservador capa ≤2 (ações) ───────────────────────────
def test_conservador_capa_leverage_acoes():
    rk = _ranking([_stock_asset()])
    out = rs.apply_profile_to_ranking(rk, "conservador")
    a = out["categories"]["US"]["assets"][0]
    assert a["leverage"] <= 2.0          # teto duro do perfil conservador
    assert out["profile"] == "conservador"


def test_conservador_so_desce_nunca_sobe():
    """Survival só DESCE: a leverage do conservador nunca supera a do agressivo p/ o mesmo ativo."""
    rk = _ranking([_stock_asset()])
    aggr = rs.apply_profile_to_ranking(copy.deepcopy(rk), "agressivo")["categories"]["US"]["assets"][0]
    cons = rs.apply_profile_to_ranking(copy.deepcopy(rk), "conservador")["categories"]["US"]["assets"][0]
    assert cons["leverage"] <= aggr["leverage"]


# ─────────────────────────── Conservador capa ≤2 (cripto) ───────────────────────────
def test_conservador_capa_leverage_cripto():
    rk = _ranking([_stock_asset()], [_crypto_asset()])
    out = rs.apply_profile_to_ranking(rk, "conservador")
    c = out["categories"]["CRYPTO"]["assets"][0]
    assert c["leverage"] <= 2.0


def test_agressivo_cripto_inalterado():
    rk = _ranking([_stock_asset()], [_crypto_asset()])
    out = rs.apply_profile_to_ranking(rk, "agressivo")
    assert out["categories"]["CRYPTO"]["assets"][0]["leverage"] == 2.0


# ─────────────────────────── Ordem preservada ───────────────────────────
def test_ordem_do_ranking_preservada():
    """Perfil só mexe na alavancagem, não no mérito de compra → ordem idêntica."""
    a1 = _stock_asset(ticker="AAA", rank=90.0)
    a2 = _stock_asset(ticker="BBB", rank=70.0)
    a3 = _stock_asset(ticker="CCC", rank=50.0)
    rk = _ranking([a1, a2, a3])
    out = rs.apply_profile_to_ranking(rk, "conservador")
    tickers_out = [x["ticker"] for x in out["categories"]["US"]["assets"]]
    assert tickers_out == ["AAA", "BBB", "CCC"]


# ─────────────────────────── _profile_inputs nunca vaza ───────────────────────────
def test_profile_inputs_nunca_vaza():
    for prof in ("agressivo", "moderado", "conservador", None):
        rk = _ranking([_stock_asset()], [_crypto_asset()])
        out = rs.apply_profile_to_ranking(rk, prof)
        for cat in out["categories"].values():
            for a in cat["assets"]:
                assert "_profile_inputs" not in a


# ─────────────────────────── rank_alavancado coerente com a nova leverage ───────────────────────────
def test_rank_alavancado_recomputado_no_conservador():
    """Ao capar a leverage, rank_alavancado é recomputado (fórmula v2) — coerente, não o do cache."""
    rk = _ranking([_stock_asset(rank=80.0)])
    out = rs.apply_profile_to_ranking(rk, "conservador")
    a = out["categories"]["US"]["assets"][0]
    esperado = rs._rank_alavancado_v2(a["rank"], a["leverage"], 18.0)
    assert a["rank_alavancado"] == esperado


# ─────────────────────────── Blindagem: sem _profile_inputs mantém o cache ───────────────────────────
def test_sem_profile_inputs_mantem_valores_do_cache():
    """Ativo legado sem _profile_inputs (ex: cache antigo) → re-derivação não dispara, mantém leverage."""
    asset = _stock_asset()
    asset.pop("_profile_inputs")
    rk = _ranking([asset])
    out = rs.apply_profile_to_ranking(rk, "conservador")
    assert out["categories"]["US"]["assets"][0]["leverage"] == 5.0   # inalterado (sem insumos)
