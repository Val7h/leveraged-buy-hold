"""
DES-SATURAÇÃO DO SCORE DE QUALIDADE (Camada 1) — golden tests que TRAVAM o comportamento novo.

Desenho ratificado (painel de 3 especialistas + dono). Funções puras, sem rede.
Rodar a partir de backend/:  pytest tests/test_quality_dessaturacao.py

Cobre:
  1) CURVAS CONTÍNUAS  — ROIC/FCF/D-E sem teto-degrau; 100 é RARO (assintótico).
  2) ANTI-SATURAÇÃO    — empresas "boas mas diferentes" NÃO empatam em 100.
  3) SHRINKAGE NA NOTA — Q_final = w·Q_raw+(1−w)·60, w=(k/K)^1.5 (3/3 ILESA, 1/3 perto do prior 60).
  4) TRAVAS DE SANIDADE— <K pilares nunca Q>65; k≤1 ≤55; dado quebrado (q≤12 magro) → neutro+flag.
  5) CICLICIDADE       — is_tatico/commodity → Q≤65; ROIC oscilante (dispersão) derruba mais.
  6) NÃO-REGRESSÃO     — qualidade real e completa segue ALTA (≥75) e acima de uma cíclica de pico.

ENQUADRAMENTO: Camada 1 = mérito do NEGÓCIO p/ a DECISÃO DE COMPRA À VISTA (rank+veredito),
INDEPENDENTE de alavancagem (Camada 3 é overlay posterior). O prior 60 é a mediana honesta do
universo (empirical Bayes) — sob dado fino, palpite = ativo TÍPICO do país, nem premia nem pune.
"""
import math

from app.quantitative import scoring_v2 as S


# ═══════════════════════ 1) CURVAS CONTÍNUAS (mata o degrau) ═══════════════════════
def test_curva_roic_continua_monotona_e_100_raro():
    # ROIC 15% < 25% < 35% → notas CRESCENTES e DISTINTAS (não 100/100/100 do degrau antigo).
    n15, n25, n35 = S._q_roic(0.15), S._q_roic(0.25), S._q_roic(0.35)
    assert n15 < n25 < n35
    assert 65 <= n15 <= 78                    # 15% ≈ 72 (era 100 no degrau)
    assert 82 <= n25 <= 90                    # 25% ≈ 88
    assert 90 <= n35 <= 97                    # 35% ≈ 95
    assert n35 < 100                          # 100 só assintótico — nunca alcançado por patamar fixo
    # ROIC≤0 → 0 (destrói capital).
    assert S._q_roic(0.0) == 0.0 and S._q_roic(-0.1) == 0.0


def test_curva_fcf_continua_nunca_trava():
    # FCF 8% ≈ 70, subindo suave, sem travar em 100. FCF≤0 → 10 (queima caixa).
    assert 64 <= S._q_fcf(0.08) <= 76
    assert S._q_fcf(0.08) < S._q_fcf(0.12) < S._q_fcf(0.16) < S._q_fcf(0.25)
    assert S._q_fcf(0.25) < 100
    assert S._q_fcf(0.0) == 10.0


def test_curva_debt_continua_suave():
    # D/E ≤0,5 ≈ 75 (não 100), melhorando suave conforme cai, pior conforme sobe (monótono ↓).
    assert 70 <= S._q_debt(0.5) <= 80
    assert S._q_debt(0.0) > S._q_debt(0.5) > S._q_debt(1.0) > S._q_debt(2.0) > S._q_debt(3.0)
    assert S._q_debt(0.0) < 100               # caixa-líquido alto, mas não satura em 100
    # winsorize: D/E absurdo não despenca abaixo do piso.
    assert S._q_debt(50.0) == S._q_debt(8.0)


def test_winsorize_roic_outlier():
    # ROIC de fonte suja (200%) é winsorizado em p99 (~60%) antes da curva — não vira "100 perfeito".
    assert S._q_roic(2.0) == S._q_roic(0.60)
    assert S._q_roic(2.0) < 100


# ═══════════════════════ 2) ANTI-SATURAÇÃO ═══════════════════════
def test_tres_empresas_boas_diferentes_nao_empatam_em_100():
    # 3 empresas com pilares "bons mas diferentes" — antes empatavam em Q100 (degrau). Agora DISTINTAS.
    qa, _ = S.compute_quality_blend(roic=0.16, fcf_yield=0.08, debt_to_equity=0.5, growth_5y=8, market="US")
    qb, _ = S.compute_quality_blend(roic=0.24, fcf_yield=0.11, debt_to_equity=0.3, growth_5y=12, market="US")
    qc, _ = S.compute_quality_blend(roic=0.32, fcf_yield=0.14, debt_to_equity=0.2, growth_5y=15, market="US")
    notas = {qa, qb, qc}
    assert len(notas) == 3                    # nenhuma empata
    assert qa < qb < qc                       # ordem pela força real dos pilares
    assert max(qa, qb, qc) < 100              # nem a melhor satura em 100


# ═══════════════════════ 3) SHRINKAGE NA NOTA ═══════════════════════
def test_shrinkage_br_3de3_ilesa():
    # BR bem-coberta (roic+safety+fcf reais = 3/3 obteníveis) → w=1 → nota PLENA, ILESA pelo shrinkage.
    q, bd = S.compute_quality_blend(roic=0.25, fcf_yield=0.10, debt_to_equity=0.3, market="BR")
    assert set(bd.keys()) == {"roic_nivel", "fcf", "safety"}
    assert q >= 78                            # 3 pilares fortes → nota alta intacta


def test_shrinkage_br_1de3_perto_do_prior():
    # BR com 1 pilar real (Q_raw alto, ROIC 40%) → w=(1/3)^1.5≈0,19 → encolhe PERTO do prior 60
    # (a trava k≤1 ainda capa em 55). Não fabrica: pouca cobertura = palpite no típico do universo.
    q, _ = S.compute_quality_blend(roic=0.40, market="BR")
    assert 50 <= q <= 60                       # perto do prior 60 (capado 55 por k≤1), NÃO ~100


def test_shrinkage_2de3_paga_preco():
    # 2/3 (cobertura parcial) → w convexo (^1.5) já desconta; a trava de sub-cobertura capa em 65.
    q, _ = S.compute_quality_blend(roic=0.30, debt_to_equity=0.3, market="BR")
    assert q <= 65
    # e ainda assim ACIMA de 1/3 (mais cobertura → mais nota, ordem preservada).
    q1, _ = S.compute_quality_blend(roic=0.30, market="BR")
    assert q > q1


# ═══════════════════════ 4) TRAVAS DE SANIDADE NA NOTA ═══════════════════════
def test_sub_cobertura_nunca_passa_de_65():
    # Qualquer ação com < K pilares-núcleo reais NUNCA dá Q>65 (perto da mediana, mesmo com pilar
    # generoso) — nota magra não pode parecer compounder de elite na decisão de compra.
    for kwargs in (dict(roic=0.50), dict(roic=0.40, debt_to_equity=0.1),
                   dict(fcf_yield=0.25, debt_to_equity=0.1)):
        q, _ = S.compute_quality_blend(market="BR", **kwargs)
        assert q <= 65


def test_dado_quebrado_vira_neutro_com_flag():
    # CASO TIMS3: empresa com ALGUM pilar mas nota magra ≤12 (renormalização quebrada) → NÃO pontua
    # direcional: vira prior NEUTRO (60, capado a 55 por ser 1 pilar) + flag "_quebrado". Não engana
    # o veredito como ESPECULATIVO; fica no típico do universo até o dado voltar.
    q, bd = S.compute_quality_blend(roe=0.01, market="BR")   # ROE 1% → roic_nivel ~quase 0, 1 pilar
    assert bd.get("_quebrado") is True
    assert 50 <= q <= 60                       # neutro (não o q3 direcional de antes)


def test_um_pilar_nunca_passa_de_55():
    q, _ = S.compute_quality_blend(roic=0.45, market="US")   # 1 pilar (k≤1) → trava ≤55
    assert q <= 55


# ═══════════════════════ 5) CICLICIDADE ═══════════════════════
def test_ciclica_pico_capada_em_65():
    # is_tatico (cíclica/commodity) com ROIC de PICO → cap 65 (não chega a tier de alavancagem alta).
    q_t, _ = S.compute_quality_blend(roic=0.30, fcf_yield=0.08, debt_to_equity=0.5,
                                     growth_5y=10, is_tatico=True, market="US")
    q_n, _ = S.compute_quality_blend(roic=0.30, fcf_yield=0.08, debt_to_equity=0.5,
                                     growth_5y=10, is_tatico=False, market="US")
    assert q_t <= 65
    assert q_n > q_t                          # a MESMA empresa, não-cíclica, pontua mais


def test_ciclica_roic_oscilante_derruba_mais():
    # ROIC que oscila (5%→30%→8%→25%→6%) = fosso fraco → multiplicador de dispersão DERRUBA a nota
    # abaixo do cap 65; histórico ESTÁVEL fica no cap (sem penalidade de dispersão).
    q_osc, _ = S.compute_quality_blend(roic=0.30, fcf_yield=0.08, debt_to_equity=0.5, growth_5y=10,
                                       is_tatico=True, roic_history=[0.05, 0.30, 0.08, 0.25, 0.06],
                                       market="US")
    q_estavel, _ = S.compute_quality_blend(roic=0.30, fcf_yield=0.08, debt_to_equity=0.5, growth_5y=10,
                                           is_tatico=True, roic_history=[0.28, 0.30, 0.29, 0.31, 0.30],
                                           market="US")
    assert q_osc < q_estavel <= 65
    assert q_osc < 60                          # oscilação real puxa pra baixo do cap


# ═══════════════════════ 6) NÃO-REGRESSÃO DE ORDEM ═══════════════════════
def test_qualidade_real_completa_alta_e_acima_de_ciclica_de_pico():
    # Compounder real e completo (ROIC alto durável + FCF + safety, 3-4 pilares) segue ALTA (≥75)
    # e ACIMA de uma cíclica de pico (capada em 65). A des-saturação NÃO inverte a ordem do mérito.
    q_compounder, bd = S.compute_quality_blend(
        roic=0.30, fcf_yield=0.12, debt_to_equity=0.3, growth_5y=14, roe=0.28,
        roic_history=[0.29, 0.30, 0.31, 0.30, 0.30], market="US")
    assert q_compounder >= 75
    q_ciclica, _ = S.compute_quality_blend(
        roic=0.30, fcf_yield=0.12, debt_to_equity=0.3, growth_5y=14, is_tatico=True,
        roic_history=[0.05, 0.30, 0.08], market="US")
    assert q_compounder > q_ciclica


def test_etf_nao_sofre_dessaturacao():
    # ETF/COMMODITY (fundamentals_apply=False): caminho próprio — sem shrinkage/sanidade/ciclicidade,
    # nota neutra 50, breakdown vazio (a Camada 1 não os avalia; é por preço/momento alhures).
    q, bd = S.compute_quality_blend(fundamentals_apply=False, is_tatico=True, market="US")
    assert q == 50.0 and bd == {}
