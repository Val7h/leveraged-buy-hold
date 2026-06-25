"""
Golden tests da CAMADA 3 — APTIDÃO PRA ALAVANCAR (parte por-ativo). Passo 2 do motor de 3 camadas.

A Camada 3 recebe o RISCO DE PREÇO e responde "quanto dá pra alavancar este ativo e SOBREVIVER ao
pior tombo?". Mecânica Quantfury: carry ZERO; liquidação quando perda≈equity (2x→−50%, 3x→−33%,
4x→−25%, 5x→−20%). Survival-first: o teto é o MÍNIMO de todos os tetos, nunca a média; aptidão
MODULA pra baixo, nunca sobe o teto. Nada é fabricado: fator ausente renormaliza/não entra no MIN.

Rodar: `pytest tests/test_camada3_aptidao.py` a partir de backend/.
"""
import math

import numpy as np

from app.quantitative import scoring_v2 as S
from app.services import ranking_service as R


# ─────────────────────────── TETO máxDD × FOLGA (ratificado) ───────────────────────────
def test_teto_maxdd_50_long_da_1x():
    # máxDD −50% → precisa sobreviver ~−90% → nenhum tier alavancado sobrevive → 1x.
    assert S.teto_maxdd(-50, hist_curto=False) == 1.0


def test_teto_maxdd_30_long_da_1x_com_folga_18():
    # FOLGA 1,8× (decisão do dono, fat tails): máxDD −30% → sobreviver −54% → 2x liquida em −50%
    # (não sobrevive); sem tier 1,5 no máxDD → 1x. (Esta função vive agora no AGREGADO C.3, não
    # no MIN por-fluxo — ver test_teto_alavancagem_* que NÃO usa máxDD.)
    assert S.teto_maxdd(-30, hist_curto=False) == 1.0


def test_teto_maxdd_28_da_2x():
    # máxDD ≤−28% (raso o bastante): −25×1,8=45% ≤ 50% (liq 2x) → 2x.
    assert S.teto_maxdd(-25, hist_curto=False) == 2.0


def test_teto_maxdd_hist_curto_endurece_a_folga():
    # MESMO −30%, mas história CURTA (<15a) → folga 2,5× → 1x (não testado em crise).
    assert S.teto_maxdd(-30, hist_curto=True) == 1.0


def test_teto_maxdd_sigma_alto_endurece():
    # σ alto (>35%) endurece a folga igual história curta.
    assert S.teto_maxdd(-30, hist_curto=False, sigma_pct=45) == 1.0


def test_teto_maxdd_raso_libera_mais():
    # FOLGA 1,8×: −15×1,8=27% → 4x liquida em −25% (não sobrevive 27%) → 3x (liq −33%).
    assert S.teto_maxdd(-15, hist_curto=False) == 3.0


def test_teto_maxdd_ausente_nao_opina():
    assert S.teto_maxdd(None) is None


# ─────────────────────────── TETO σ total (tabela) ───────────────────────────
def test_teto_sigma_tabela():
    assert S.teto_sigma(10) == 4.0     # σ<15% → 4x
    assert S.teto_sigma(20) == 2.0     # 15-25% → 2x
    assert S.teto_sigma(30) == 1.5     # 25-35% → 1,5x
    assert S.teto_sigma(40) == 1.0     # >35% → 1x


def test_teto_sigma_maior_35_da_1x():
    assert S.teto_sigma(36) == 1.0
    assert S.teto_sigma(120) == 1.0


def test_teto_sigma_ausente_nao_opina():
    assert S.teto_sigma(None) is None


# ─────────────────────────── TETO gap (× 2,0 folga INEGOCIÁVEL) ───────────────────────────
def test_teto_gap_folga_2x():
    # FOLGA 2,0× (inegociável — gap é o risco mais letal): gap 20% × 2,0 = 40% exigido →
    # 2x liquida em −50% (>40) → 2x; 3x liquida em −33 (<40) → não sobrevive.
    assert S.teto_gap(20) == 2.0


def test_teto_gap_extremo_capa():
    # gap 30% × 2,0 = 60% exigido → NENHUM tier alavancado sobrevive (2x liquida −50% < 60) → 1x.
    assert S.teto_gap(30) == 1.0


def test_teto_gap_baixo_libera():
    # gap 5% × 2,0 = 10% exigido → 5x liquida em −20% (>10) → 5x.
    assert S.teto_gap(5) == 5.0


def test_teto_gap_ausente_nao_opina():
    assert S.teto_gap(None) is None


# ─────────────────────────── TETO beta (tabela; integra a trava ≥1,45→2x) ───────────────────────────
def test_teto_beta_tabela():
    assert S.teto_beta(0.6) is None    # <0,8 sem cap → fora do MIN
    assert S.teto_beta(1.0) == 4.0     # 0,8-1,15
    assert S.teto_beta(1.3) == 3.0     # 1,15-1,45
    assert S.teto_beta(1.5) == 2.0     # 1,45-1,8 (a trava ≥1,45→2x vive aqui)
    assert S.teto_beta(2.0) == 1.0     # >1,8


def test_teto_beta_ausente_nao_opina():
    assert S.teto_beta(None) is None


# ─────────────────────────── ¼·Kelly (função AGREGADA — não entra no MIN por-fluxo) ───────────────────────────
def test_kelly_quarto_formula():
    # ¼·Kelly = 0,25 × (μ_excesso / σ²). Função existe p/ a trava AGREGADA (C.3) usar; NÃO entra
    # no MIN por-fluxo (Kelly de patrimônio-inteiro colapsaria o fluxo a 1x — ver docstring).
    k = S.teto_kelly(0.30, 14)
    assert math.isclose(k, 0.25 * (0.30 / (0.14 ** 2)), rel_tol=1e-6)


def test_kelly_fora_do_min_por_fluxo():
    # mu_excess passado mas Kelly NÃO morde o teto por-fluxo (binding nunca é 'kelly').
    lev, det = S.teto_alavancagem_aptidao(sigma_pct=14, mult_regime=4, mu_excess_annual=0.05)
    # σ<15%→4x, regime 4x → 4x; Kelly baixo (0,05) NÃO derruba (fora do MIN).
    assert det["binding"] != "kelly" and "kelly" not in det["tetos"]
    assert lev == 4.0


def test_kelly_sem_edge_da_1x():
    assert S.teto_kelly(-0.02, 20) == 1.0   # μ_excesso ≤ 0 → não justifica alavancar


def test_kelly_ausente_nao_opina():
    assert S.teto_kelly(None, 20) is None
    assert S.teto_kelly(0.1, None) is None


# ─────────────────────────── MIN pega o MENOR (sobrevivência) ───────────────────────────
def test_min_pega_o_menor_teto():
    # σ 40% (>35% → 1x) + beta 1.0 (4x) + regime 4x → MIN = 1x (σ binding). máxDD/Kelly fora do MIN.
    lev, det = S.teto_alavancagem_aptidao(
        max_dd_pct=-30, sigma_pct=40, gap_pct=8, beta=1.0, mult_regime=4,
        mu_excess_annual=0.10, hist_curto=False)
    assert lev == 1.0
    assert det["binding"] == "sigma"
    assert "maxdd" not in det["tetos"] and "kelly" not in det["tetos"]


def test_aptidao_nunca_sobe_o_teto():
    # Aptidão é só MODULADOR: o teto vem dos gates/MIN, não da nota. Ativo de aptidão ALTA
    # mas σ alto continua capado em 1x (a nota não destrava alavancagem).
    apt, _ = S.score_aptidao(max_dd_pct=-12, sigma_pct=40, gap_pct=4, dividend_yield=4,
                             recovered=True, recovery_years=0.5, beta=0.6)
    lev, _ = S.teto_alavancagem_aptidao(max_dd_pct=-12, sigma_pct=40, gap_pct=4, beta=0.6,
                                        mult_regime=4)
    assert apt >= 60          # nota razoável
    assert lev == 1.0         # σ>35% capa em 1x INDEPENDENTE da nota


def test_regime_entra_no_min():
    # Ativo seguríssimo (tudo libera 4x+) mas regime conservador 2x → MIN = 2x.
    lev, det = S.teto_alavancagem_aptidao(
        max_dd_pct=-10, sigma_pct=8, gap_pct=3, beta=0.5, mult_regime=2,
        mu_excess_annual=0.20)   # ¼·Kelly = 0,25×(0,20/0,08²)=7,8 → não morde
    assert lev == 2.0 and det["binding"] == "regime"


# ─────────────────────────── GATES eliminatórios → 1x ───────────────────────────
def test_gate_liquidez_zera():
    lev, det = S.teto_alavancagem_aptidao(max_dd_pct=-10, sigma_pct=8, beta=0.5,
                                          mult_regime=4, volume=10_000)
    assert lev == 1.0 and det["binding"] == "GATE" and det["gate_liquidez"] is True


def test_sem_volume_nao_veta_por_liquidez():
    # Sem dado de volume → NÃO fabrica liquidez ruim → não veta.
    lev, det = S.teto_alavancagem_aptidao(max_dd_pct=-10, sigma_pct=8, beta=0.5,
                                          mult_regime=4, volume=None)
    assert det["binding"] != "GATE"
    assert lev == 4.0


def test_gate_gap_extremo_zera():
    lev, det = S.teto_alavancagem_aptidao(max_dd_pct=-10, sigma_pct=8, beta=0.5,
                                          mult_regime=4, gap_risk_extremo=True)
    assert lev == 1.0 and det["binding"] == "GATE"


def test_gap_risk_extremo_armado_gap_20_forca_1x():
    # VÁLVULA agora ARMADA no live path: gap histórico ≥20% = ativo estruturalmente gappy → 1x.
    # Replica a regra de ranking_service: gap_risk_extremo = (gap_pct >= 20).
    gap_pct = 22.0
    extremo = (gap_pct is not None and abs(gap_pct) >= 20.0)
    lev, det = S.teto_alavancagem_aptidao(max_dd_pct=-10, sigma_pct=8, beta=0.5,
                                          mult_regime=4, gap_risk_extremo=extremo)
    assert extremo is True
    assert lev == 1.0 and det["binding"] == "GATE" and det["gate_gap_extremo"] is True


def test_gap_risk_nao_extremo_nao_dispara():
    # gap < 20% → válvula NÃO dispara (não força 1x por gap-risk).
    extremo = (12.0 >= 20.0)
    lev, det = S.teto_alavancagem_aptidao(max_dd_pct=-10, sigma_pct=8, beta=0.5,
                                          mult_regime=4, gap_risk_extremo=extremo)
    assert det["binding"] != "GATE"


# ─────────────────────────── GATE de LIQUIDEZ via ADV-$ (vivo) ───────────────────────────
def test_gate_liquidez_adv_baixo_veta():
    # ADV-$ < US$ 5M (micro-cap ilíquida) → veta → 1x à vista.
    lev, det = S.teto_alavancagem_aptidao(max_dd_pct=-10, sigma_pct=8, beta=0.5,
                                          mult_regime=4, volume=2_000_000.0)
    assert lev == 1.0 and det["binding"] == "GATE" and det["gate_liquidez"] is True


def test_gate_liquidez_adv_largecap_passa():
    # ADV-$ de large-cap (US$ 500M) passa folgado → não veta.
    lev, det = S.teto_alavancagem_aptidao(max_dd_pct=-10, sigma_pct=8, beta=0.5,
                                          mult_regime=4, volume=500_000_000.0)
    assert det["binding"] != "GATE"
    assert lev == 4.0


# ─────────────────────────── ETF: aptidão DIFERENCIA (JEPI vs lixo) ───────────────────────────
def test_etf_jepi_alto_vs_volatil_baixo():
    # JEPI-like: baixo beta, queda rasa, baixa vol, dividendo consistente → aptidão ALTA.
    jepi, _ = S.score_aptidao(max_dd_pct=-12, sigma_pct=10, gap_pct=4, dividend_yield=7.5,
                              recovered=True, recovery_years=0.5, hist_curto=True, beta=0.55)
    # ETF lixo: volátil, queda funda, sem recuperação, beta alto → aptidão BAIXA.
    lixo, _ = S.score_aptidao(max_dd_pct=-65, sigma_pct=60, gap_pct=22, dividend_yield=0,
                              recovered=False, hist_curto=True, beta=1.7)
    assert jepi >= 75
    assert lixo <= 30
    assert jepi - lixo >= 45     # diferenciam de verdade (antes ambos = 50 achatado)


def test_dy_saturado_yield_alto_rebaixa():
    # DY na zona saudável (4%) pontua mais que yield-trap (12%): yield alto REBAIXA (não premia).
    saudavel = S._apt_dividend_saturated(4.0)
    trap = S._apt_dividend_saturated(12.0)
    assert saudavel > trap


# ─────────────────────────── RENORMALIZAÇÃO (não fabrica) ───────────────────────────
def test_score_renormaliza_sem_fabricar():
    # Só dois fatores presentes → a nota é a média ponderada SÓ deles (renormaliza), não injeta 50.
    nota, bd = S.score_aptidao(max_dd_pct=-12, beta=0.5)   # só máxDD + beta
    assert set(bd.keys()) == {"maxdd", "beta"}
    esperado = (S._apt_maxdd(-12) * 0.25 + S._apt_beta(0.5) * 0.10) / (0.25 + 0.10)
    assert math.isclose(nota, round(esperado, 1), abs_tol=0.2)


def test_score_sem_fatores_e_neutro():
    nota, bd = S.score_aptidao()
    assert nota == 50.0 and bd == {}


def test_teto_sem_dados_e_conservador_1x():
    lev, det = S.teto_alavancagem_aptidao()   # nenhum teto disponível
    assert lev == 1.0 and det["binding"] is None


# ─────────────────────────── σ / gap calculados do df (helpers do ranking) ───────────────────────────
def test_sigma_e_gap_de_retornos():
    rng = np.random.default_rng(42)
    rets = rng.normal(0.0, 0.01, 300)        # σ diária ~1% → anualizada ~16%
    sigma = S.aptidao_volatility_annualized(rets)
    gap = S.aptidao_gap(rets)
    assert sigma is not None and 12 < sigma < 22
    assert gap is not None and gap > 0


def test_sigma_gap_serie_curta_none():
    assert S.aptidao_volatility_annualized([0.01, 0.02]) is None
    assert S.aptidao_gap([0.01]) is None
    # _daily_log_returns também blinda série curta
    assert R._daily_log_returns(np.linspace(100, 110, 10)) is None


def test_daily_log_returns_ok():
    a = np.cumprod(1 + np.full(60, 0.001)) * 100
    r = R._daily_log_returns(a)
    assert r is not None and r.size == 59


# ─────────────────── QUALIDADE DO VEÍCULO (ETF/commodity) + RANK DUPLO ───────────────────
def test_vehicle_quality_jepi_maior_que_lixo():
    # JEPI-like: dividendo alto consistente + queda rasa + Sharpe ok → alto.
    q_jepi, bd = S.score_etf_vehicle_quality(dy_avg10=8.0, dy_worst=7.0, dividend_yield=8,
                                             max_dd_pct=-12, sharpe=1.1)
    # ETF lixo: sem dividendo + queda funda + Sharpe ruim → baixo.
    q_lixo, _ = S.score_etf_vehicle_quality(dy_avg10=None, dy_worst=None, dividend_yield=0,
                                            max_dd_pct=-65, sharpe=0.1)
    assert q_jepi > q_lixo
    assert q_jepi >= 65 and q_lixo <= 45
    assert "dividendos" in bd and "resiliencia_queda" in bd and "risco_ajustado" in bd


def test_vehicle_quality_leverage_independente():
    # A função NÃO recebe alavancagem/σ/gap — é mérito do veículo, não aptidão. (assinatura prova)
    import inspect
    params = set(inspect.signature(S.score_etf_vehicle_quality).parameters)
    assert "sigma_pct" not in params and "leverage" not in params and "gap_pct" not in params


def test_vehicle_quality_renormaliza_sem_dado():
    # Commodity sem dividendo: renormaliza sobre queda+Sharpe (não fabrica), nota válida.
    q, bd = S.score_etf_vehicle_quality(dividend_yield=None, dy_avg10=None,
                                        max_dd_pct=-20, sharpe=0.8)
    assert "dividendos" not in bd and 0 <= q <= 100
    # Sem NENHUM pilar → 50 neutro honesto.
    q0, bd0 = S.score_etf_vehicle_quality()
    assert q0 == 50.0 and bd0 == {}


# ─────────────────────────── RANK DUPLO v2 (Kelly: desempate, não dominância) ───────────────────────────
def test_rank_alavancado_v2_lev1_igual_base():
    # Sem alavancagem (1x): rank alavancado == rank base (bonus=0 → mult=1 → a decisão não muda).
    assert R._rank_alavancado_v2(80.0, 1.0, None) == 80.0
    assert R._rank_alavancado_v2(80.0, 1.0, 20.0) == 80.0


def test_rank_alavancado_v2_boa_3x_sobe_pouco():
    # Boa-3x σ baixo: DESEMPATE (sobe pouco, ≤ teto 1,35× → ≤ +35%), não domina.
    base = 72.0
    rav = R._rank_alavancado_v2(base, 3.0, 15.0)     # σ 15% baixo
    assert rav > base                                # ganha bônus
    assert rav <= base * 1.35 + 1e-6                 # teto duro 1,35×
    # sobe pouco: na faixa de desempate (~+15-20%), não os +50% da v1 linear
    assert (rav / base - 1.0) <= 0.35


def test_rank_alavancado_v2_inversao_suavizou():
    # A INVERSÃO da v1 (boa-3x 26pts à frente da ótima-1x) sumiu/suavizou: a ótima-1x não fica
    # MUITO atrás; a alavancagem vira desempate, não dominância.
    otima_1x = R._rank_alavancado_v2(82.0, 1.0, 12.0)   # ótima, σ baixo, mas regime/teto → 1x
    boa_3x = R._rank_alavancado_v2(72.0, 3.0, 15.0)     # boa, alavancável 3x
    # boa-3x pode encostar/passar levemente, mas NÃO os 26 pontos da v1 (≈90 vs 82).
    assert boa_3x - otima_1x < 12.0


def test_rank_alavancado_v2_junk_nao_resgatado():
    # GATE ANTI-JUNK: mérito < 40 NÃO ganha bônus de alavancagem (mult=1) → junk-4x = rank base.
    junk = R._rank_alavancado_v2(30.0, 4.0, 50.0)
    assert junk == 30.0                              # sem bônus
    otima_1x = R._rank_alavancado_v2(82.0, 1.0, 12.0)
    assert junk < otima_1x                           # junk nunca ultrapassa por alavancagem


def test_rank_alavancado_v2_drag_desconta_sigma_alto():
    # Mesma alavancagem: σ ALTO tem o volatility drag descontado → bônus MENOR que σ baixo.
    base = 70.0
    bonus_sig_baixo = R._rank_alavancado_v2(base, 3.0, 10.0)
    bonus_sig_alto = R._rank_alavancado_v2(base, 3.0, 40.0)
    assert bonus_sig_baixo > bonus_sig_alto          # drag côncavo pune σ alto
    assert bonus_sig_alto >= base                    # mas nunca abaixo do base (piso 1,0×)


def test_rank_alavancado_v2_sigma_ausente_sem_desconto():
    # σ ausente (crypto) → sig=0 → SEM desconto de drag (conservador no bônus, que fica pequeno).
    rav = R._rank_alavancado_v2(70.0, 3.0, None)
    assert rav > 70.0 and rav <= 70.0 * 1.35 + 1e-6
