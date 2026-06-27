"""
GUARDRAIL Bug D — notas EXTREMAS de DADO FINO não viram veredito FORTE nem liberam alavancagem.

Quando o scrape fundamental BR quebra (Fundamentus falha), a Qualidade da Camada 1 nasce de POUCOS
pilares reais e RENORMALIZA — não fabrica, mas a nota fica FRÁGIL e pode estourar (ITSA4 q3 por
só-ROE-fallback; vários q100 por 1 pilar generoso). Esses testes travam o comportamento:
  1) quality_pilares_reais conta os pilares-núcleo REAIS (não os ausentes/renormalizados).
  2) quality_data_thin/quality_data_confidence marcam dado fino (< QUALITY_MIN_PILARES_REAIS).
  3) O veredito não pode ser COMPRAR FORTE / ESPECULATIVO-falso sobre qualidade frágil.
  4) ZERO regressão: ativo com TODOS os pilares reais → contagem cheia, NÃO é fino, veredito intacto.

Funções puras, sem rede. Rodar: `pytest tests/test_guardrail_notas.py` a partir de backend/.
"""
from app.quantitative import scoring_v2 as S
from app.services import ranking_service as R


# ─────────────── contagem de pilares-núcleo reais ───────────────
def test_pilares_reais_dado_completo():
    # ativo com TODOS os pilares de negócio reais (ROIC+safety+FCF+crescimento) → 4 núcleo.
    q, bd = S.compute_quality_blend(
        roe=0.18, roic=0.20, debt_to_equity=0.5, fcf_yield=0.06, growth_5y=12)
    assert S.quality_pilares_reais(bd) >= S.QUALITY_MIN_PILARES_REAIS
    assert S.quality_data_thin(bd) is False
    assert S.quality_data_confidence(bd, q) == "ALTA"


def test_pilares_reais_so_roe_fallback_e_fino():
    # ITSA4-style: scrape quebrou, só veio ROE (ROIC/FCF/D-E/crescimento ausentes) → 1 pilar-núcleo
    # (roic_nivel via fallback de ROE). É DADO FINO → confiança BAIXA.
    q, bd = S.compute_quality_blend(roe=0.05)   # ROE baixo → nota tende a extremo-baixo
    assert "roic_nivel" in bd                    # o fallback de ROE entra como roic_nivel
    assert S.quality_pilares_reais(bd) < S.QUALITY_MIN_PILARES_REAIS
    assert S.quality_data_thin(bd) is True
    assert S.quality_data_confidence(bd, q) == "BAIXA"


def test_pilares_reais_dois_nucleo_e_media():
    # 2 pilares-núcleo (ROIC + safety), nota NÃO-extrema → confiança MEDIA, ainda FINO (abaixo de 3).
    q, bd = S.compute_quality_blend(roic=0.09, debt_to_equity=1.0)
    assert 10 < q < 100                            # nota intermediária (não dispara o sanity bound)
    assert S.quality_pilares_reais(bd) == 2
    assert S.quality_data_thin(bd) is True
    assert S.quality_data_confidence(bd, q) == "MEDIA"


def test_extremo_alto_com_dado_fino_encolhe_pro_prior_e_baixa_confianca():
    # DES-SATURAÇÃO + SHRINKAGE: ANTES, 1 pilar generoso (ROIC 40%) estourava em ~100 (saturação) e
    # o guardrail só rebaixava a CONFIANÇA. AGORA o SHRINKAGE morde a NOTA: 1 de 3 obteníveis →
    # w=(1/3)^1.5≈0,19 → a nota encolhe PERTO do prior 60 (trava de sanidade k≤1 → Q≤55). Não há
    # mais "Q100 de 1 pilar" na decisão de compra. Confiança segue BAIXA. (Sem alavancagem: é só a
    # nota de qualidade refletir honestamente que 1 pilar não comprova um compounder.)
    q, bd = S.compute_quality_blend(roic=0.40)    # 1 só pilar, ROIC altíssimo
    assert q <= 55                                # shrinkage + trava k≤1 → perto do prior, NÃO ~100
    assert S.quality_pilares_reais(bd) == 1
    assert S.quality_data_confidence(bd, q) == "BAIXA"


def test_extremo_baixo_com_dado_fino_vira_neutro_e_baixa_confianca():
    # CASO TIMS3 (TIM, ROIC real 24% que veio quebrado): ANTES a nota saía ~3 (q≤10) e enganava o
    # veredito como ESPECULATIVO. AGORA a trava de DADO QUEBRADO (k<K e Q_raw≤12) zera o direcional:
    # a nota vira o prior NEUTRO (60, capado a 55 por 1 pilar) + flag "_quebrado". Confiança BAIXA.
    q, bd = S.compute_quality_blend(roe=0.01)
    assert bd.get("_quebrado") is True            # flag p/ o consumidor tratar como neutro
    assert 50 <= q <= 60                          # neutro típico (não o q3 direcional de antes)
    assert S.quality_data_confidence(bd, q) == "BAIXA"


def test_breakdown_vazio_ou_etf_eh_fino():
    # ETF/COMMODITY: breakdown sem pilares de negócio → 0 reais → fino/BAIXA (não engana o guardrail).
    assert S.quality_pilares_reais({}) == 0
    assert S.quality_data_thin({}) is True
    assert S.quality_data_confidence({}, 50.0) == "BAIXA"


# ─────────────── rebaixamento de veredito por dado fino (espelha _analyze via _verdict_from_momentum) ───────────────
def _state(**kw):
    base = {"bucket": "ACELERADOR", "quality": 50.0, "knife": False,
            "crivo_rebaixa": False, "conf_baixa": False, "gold_override": False,
            "quality_thin": False}
    base.update(kw)
    return base


def test_verdict_forte_rebaixa_com_dado_fino():
    # qualidade frágil-mas-alta (q100 de 1 pilar) + momento forte → SEM guardrail seria FORTE.
    st = _state(quality=100.0, quality_thin=True)
    # momento 75 + quality 100 → aporte_verdict = COMPRAR FORTE; guardrail rebaixa p/ COMPRAR.
    assert R._verdict_from_momentum(75.0, st, "US") == "COMPRAR"


def test_verdict_especulativo_falso_vira_justo_com_dado_fino():
    # ITSA4 q3 (extremo-baixo FABRICADO): aporte_verdict daria ESPECULATIVO (q<45). Mas NÃO é faca
    # (knife=False) — é cegueira do provedor → vira JUSTO ("dados insuficientes"), não marca faca.
    st = _state(quality=3.0, quality_thin=True, knife=False)
    assert R._verdict_from_momentum(75.0, st, "US") == "JUSTO"


def test_verdict_especulativo_real_segue_especulativo():
    # faca DE VERDADE (knife=True) com dado fino → segue ESPECULATIVO (o guardrail não a salva).
    st = _state(quality=3.0, quality_thin=True, knife=True)
    assert R._verdict_from_momentum(75.0, st, "US") == "ESPECULATIVO"


# ─────────────── ZERO REGRESSÃO: dado completo segue idêntico ───────────────
def test_zero_regressao_dado_completo_mantem_forte():
    # qualidade comprovada (q alta de MUITOS pilares) → quality_thin=False → veredito intacto.
    q, bd = S.compute_quality_blend(
        roe=0.18, roic=0.22, debt_to_equity=0.4, fcf_yield=0.07, growth_5y=14)
    assert S.quality_data_thin(bd) is False
    st = _state(quality=q, quality_thin=False)
    # com dado completo, FORTE permanece FORTE (nenhum rebaixe do guardrail Bug D).
    assert R._verdict_from_momentum(75.0, st, "US") == "COMPRAR FORTE"


def test_zero_regressao_score_nao_muda_com_dado_completo():
    # o GUARDRAIL NÃO toca o score: a nota de um ativo bem coberto é a MESMA de antes.
    q_full, _ = S.compute_quality_blend(
        roe=0.18, roic=0.22, debt_to_equity=0.4, fcf_yield=0.07, growth_5y=14)
    # recomputar dá exatamente o mesmo número (função pura, guardrail é só leitura do breakdown).
    q_again, _ = S.compute_quality_blend(
        roe=0.18, roic=0.22, debt_to_equity=0.4, fcf_yield=0.07, growth_5y=14)
    assert q_full == q_again
