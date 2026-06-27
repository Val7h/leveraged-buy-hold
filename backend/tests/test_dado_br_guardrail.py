"""
GARGALO #1 — DADO FUNDAMENTAL BR FRÁGIL + GUARDRAIL POR-MERCADO.

Dois fixes travados aqui (funções puras + cache em disco; sem rede real):

  1) CACHE DO ÚLTIMO-BOM (anti-oscilação) em fundamentals_provider: quando a fonte BR FALHA/volta
     vazia, REUSA o último valor BOM persistido em disco (TTL de dias) em vez de cair pro None
     fraco. NÃO fabrica — marca data_origin = fresh|cache|ausente.

  2) LIMIAR DO GUARDRAIL POR-MERCADO em scoring_v2: conta os pilares-núcleo contra os que são
     ESTRUTURALMENTE OBTENÍVEIS no mercado. BR não tem crescimento real grátis (sem Finnhub p/ BR)
     → BR bem-coberto (roic+safety+fcf reais) volta a CONF MÉDIA/ALTA e pode COMPRAR FORTE; BR com
     dado realmente faltando (só-ROE-fallback, ITSA4 q3) segue CONF BAIXA/thin. US inalterado.

Rodar a partir de backend/:  pytest tests/test_dado_br_guardrail.py
"""
import os
import importlib

from app.quantitative import scoring_v2 as S
from app.services import fundamentals_provider as F


# ═══════════════════════════ FIX 2 — LIMIAR POR-MERCADO ═══════════════════════════
def test_br_bem_coberto_nao_eh_thin_e_volta_conf_media():
    # Ação BR BEM coberta: roic+safety+fcf REAIS (crescimento indisponível p/ BR — sem Finnhub).
    q, bd = S.compute_quality_blend(
        roic=0.20, debt_to_equity=0.5, fcf_yield=0.08, growth_5y=None)
    assert set(bd.keys()) == {"roic_nivel", "safety", "fcf"}     # 3 núcleo, sem crescimento
    # Sob o mercado BR, os 3 obteníveis estão TODOS presentes → NÃO é dado fino.
    assert S.quality_data_thin(bd, market="BR") is False
    assert S.quality_pilares_reais(bd, market="BR") == 3
    # CONF volta a ALTA (qualidade comprovada pelo dado real obtenível) — pode liderar COMPRAR FORTE.
    assert S.quality_data_confidence(bd, q, market="BR") in ("ALTA", "MEDIA")
    assert S.quality_data_confidence(bd, q, market="BR") == "ALTA"


def test_br_itsa4_so_roe_segue_thin_e_baixa():
    # ITSA4-like: scrape quebrou, só veio ROE (vira roic_nivel via fallback). FCF/safety ausentes.
    q, bd = S.compute_quality_blend(roe=0.05)
    assert "roic_nivel" in bd
    assert "fcf" not in bd and "safety" not in bd                 # faltam pilares OBTENÍVEIS no BR
    # 1 de 3 obteníveis → dado fino mesmo no critério BR (não afrouxa o caso magro).
    assert S.quality_data_thin(bd, market="BR") is True
    assert S.quality_data_confidence(bd, q, market="BR") == "BAIXA"


def test_br_dois_pilares_segue_thin():
    # BR via Fundamentus-only (roe→roic + D/E→safety, SEM fcf): 2 de 3 obteníveis → ainda thin
    # (fcf É obtenível no BR via brapi/FMP; sua ausência é dado faltando de verdade).
    q, bd = S.compute_quality_blend(roic=0.18, debt_to_equity=0.6)
    assert set(bd.keys()) == {"roic_nivel", "safety"}
    assert S.quality_data_thin(bd, market="BR") is True
    assert S.quality_data_confidence(bd, q, market="BR") == "MEDIA"  # 2==piso-1 → MEDIA (não BAIXA)


def test_zero_regressao_us_dado_completo_identico():
    # US com os 4 núcleo reais → não thin, ALTA — IDÊNTICO ao critério legado (sem market).
    q, bd = S.compute_quality_blend(
        roic=0.20, debt_to_equity=0.4, fcf_yield=0.07, growth_5y=12)
    assert set(bd.keys()) == {"roic_nivel", "safety", "fcf", "crescimento"}
    # legado (sem market) == US explícito
    assert S.quality_data_thin(bd) == S.quality_data_thin(bd, market="US") is False
    assert S.quality_data_confidence(bd, q) == S.quality_data_confidence(bd, q, market="US") == "ALTA"
    assert S.quality_pilares_reais(bd) == S.quality_pilares_reais(bd, market="US") == 4


def test_zero_regressao_us_so_3_nucleo_sem_growth():
    # US sem crescimento (ADBE-like): 3 de 4 obteníveis → não thin, ALTA (piso US = 3). Inalterado.
    q, bd = S.compute_quality_blend(roic=0.36, fcf_yield=0.13, debt_to_equity=0.3, growth_5y=None)
    assert S.quality_data_thin(bd, market="US") is False
    assert S.quality_data_confidence(bd, q, market="US") == "ALTA"


def test_default_sem_market_eh_legado_us():
    # Chamada SEM market (assinatura antiga) preserva exatamente o comportamento US legado.
    _, bd = S.compute_quality_blend(roic=0.20, debt_to_equity=0.4, fcf_yield=0.07, growth_5y=12)
    assert S.quality_data_thin(bd) is False
    _, bd2 = S.compute_quality_blend(roe=0.05)   # 1 pilar
    assert S.quality_data_thin(bd2) is True


# ═══════════════════════════ FIX 1 — CACHE DO ÚLTIMO-BOM ═══════════════════════════
def _isolate_cache(tmp_path, monkeypatch):
    """Aponta o cache de disco p/ um diretório temporário isolado e recarrega o módulo."""
    monkeypatch.setenv("FUNDAMENTALS_CACHE_DIR", str(tmp_path / "fund_cache"))
    importlib.reload(F)
    F._CACHE.clear()
    return F


def test_lastgood_reusa_quando_fonte_falha(tmp_path, monkeypatch):
    Fx = _isolate_cache(tmp_path, monkeypatch)
    monkeypatch.setenv("BRAPI_TOKEN", "x")

    # CICLO 1: fonte BR boa → coleta FRESCA, persiste último-bom.
    monkeypatch.setattr(Fx, "_http_json", lambda url, *_a, **_k: {"results": [{
        "financialData": {"returnOnEquity": 0.30, "debtToEquity": 0.8, "freeCashflow": 9e9},
        "defaultKeyStatistics": {"dividendYield": 0.05},
        "marketCap": 1e11,
    }]})
    r1 = Fx.get_fundamentals("WEGE3.SA")
    assert r1["data_origin"] == "fresh"
    assert r1["roe"] is not None and r1["fcf_yield"] is not None

    # CICLO 2: fonte FALHA (None) + cache em memória limpo → reusa o último-bom do disco.
    Fx._CACHE.clear()
    monkeypatch.setattr(Fx, "_http_json", lambda url, *_a, **_k: None)
    monkeypatch.setattr(Fx, "_from_fundamentus", lambda t: Fx._empty("fundamentus"))
    monkeypatch.setattr(Fx, "_from_fmp", lambda t: Fx._empty("fmp"))
    r2 = Fx.get_fundamentals("WEGE3.SA")
    assert r2["data_origin"] == "cache"                  # reusou o último-bom (anti-oscilação)
    assert abs(r2["roe"] - 0.30) < 1e-9                  # MESMO dado de antes, não None
    assert abs(r2["fcf_yield"] - 0.09) < 1e-9


def test_lastgood_ausente_quando_nunca_houve_dado(tmp_path, monkeypatch):
    Fx = _isolate_cache(tmp_path, monkeypatch)
    monkeypatch.setenv("BRAPI_TOKEN", "x")
    # Nunca houve dado bom; tudo falha → data_origin = ausente (não fabrica, não inventa cache).
    monkeypatch.setattr(Fx, "_http_json", lambda url, *_a, **_k: None)
    monkeypatch.setattr(Fx, "_from_fundamentus", lambda t: Fx._empty("fundamentus"))
    monkeypatch.setattr(Fx, "_from_fmp", lambda t: Fx._empty("fmp"))
    r = Fx.get_fundamentals("ZZZZ9.SA")
    assert r["data_origin"] == "ausente"
    assert r["roe"] is None and r["roic"] is None and r["fcf_yield"] is None


def test_lastgood_expira_fora_do_ttl(tmp_path, monkeypatch):
    Fx = _isolate_cache(tmp_path, monkeypatch)
    # Escreve um último-bom com timestamp ANTIGO (além do TTL) → não deve ser reusado.
    Fx._lastgood_write("AGED3.SA", {**Fx._empty("brapi"), "roic": 0.22, "roe": 0.25})
    import json as _j
    path = Fx._lastgood_path("AGED3.SA")
    with open(path, "r", encoding="utf-8") as f:
        payload = _j.load(f)
    payload["saved_at"] = 0          # 1970 → muito além do TTL de dias
    with open(path, "w", encoding="utf-8") as f:
        _j.dump(payload, f)
    assert Fx._lastgood_read("AGED3.SA") is None


def test_lastgood_nao_persiste_dado_vazio(tmp_path, monkeypatch):
    Fx = _isolate_cache(tmp_path, monkeypatch)
    # Dict sem nenhum pilar-núcleo real NÃO vira último-bom (não cristaliza vazio).
    Fx._lastgood_write("EMPTY3.SA", Fx._empty("brapi"))
    assert Fx._lastgood_read("EMPTY3.SA") is None


def test_crypto_indice_nao_recebe_origin_cache(tmp_path, monkeypatch):
    Fx = _isolate_cache(tmp_path, monkeypatch)
    # Crypto/índice não têm fundamentos → data_origin fica None (não entra no cache de último-bom).
    r = Fx.get_fundamentals("BTC-USD")
    assert r["data_origin"] is None
    assert r["roe"] is None
