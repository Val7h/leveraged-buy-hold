"""
CAMADA 2 — MOMENTO DE ENTRADA (golden tests da lógica TRAVADA).

Desenho travado por painel (entrada-tática × trend-follower × contrarian + dono):
"COMPRE O DESCONTO, ALAVANQUE NO QUIQUE". O desconto manda na COMPRA; a tendência FREIA a
ALAVANCAGEM, não a compra.

Cobre:
  • contrato de saída de compute_momentum (chaves EXATAS do breakdown);
  • pesos travados (somam 100%) e renormalização de termo ausente;
  • GATE de reversão (desconto-sem-reversão = teto JUSTO ≤50, anti-faca);
  • GATE de tendência → CAPA a alavancagem (não veta a compra);
  • helpers (valuation relativo, tendência primária, osciladores+divergência, estrutura,
    momentum relativo) e os helpers de série do ranking_service.

Funções PURAS, sem rede. Rodar: `pytest tests/test_camada2_momento.py` a partir de backend/.
"""
import numpy as np

from app.quantitative import scoring_v2 as S
from app.services import ranking_service as R


_BREAKDOWN_KEYS = {"desconto_reversao", "tendencia_primaria", "valuation_relativo",
                   "osciladores", "momentum_relativo", "estrutura"}


# ─────────────────────────── CONTRATO DE SAÍDA ───────────────────────────
def test_breakdown_keys_exatas_quando_tudo_presente():
    m, bd = S.compute_momentum(
        slow_stoch_weekly=20, discount_from_top=-20, reversal_confirmation=1.0,
        distance_ma200=8, rsi=35, ma200_slope_weekly=2.0, dy=6.0, dy_avg10=4.0,
        divergence=1.0, rel_momentum_percentile=0.8, estrutura=0.9,
    )
    assert 0 <= m <= 100
    # TODAS as chaves presentes, e SÓ elas (o frontend depende disso).
    assert set(bd.keys()) == _BREAKDOWN_KEYS
    assert all(isinstance(v, int) for v in bd.values())
    assert all(0 <= v <= 100 for v in bd.values())


def test_termo_ausente_renormaliza_sai_do_breakdown():
    # Sem dy/dy_avg10 → valuation SAI; sem percentil → momentum_relativo SAI; sem slope/dma →
    # tendência SAI. Nenhum vira "50 falso": some do breakdown.
    m, bd = S.compute_momentum(
        slow_stoch_weekly=20, discount_from_top=-20, reversal_confirmation=1.0,
        rsi=35, divergence=1.0,
    )
    assert "valuation_relativo" not in bd        # sem dy/dy_avg10
    assert "momentum_relativo" not in bd          # sem percentil
    assert "tendencia_primaria" not in bd         # sem slope/dma
    assert "estrutura" not in bd                  # sem estrutura
    assert "desconto_reversao" in bd and "osciladores" in bd
    assert 0 <= m <= 100


def test_sem_nenhum_dado_so_desconto_neutro():
    # score_discount_from_top tem um neutro embutido (sem desconto → ~45, "perto da máxima"),
    # então desconto_reversao está SEMPRE presente; os demais termos saem e renormalizam.
    m, bd = S.compute_momentum()
    assert set(bd.keys()).issubset(_BREAKDOWN_KEYS)
    assert set(bd.keys()) == {"desconto_reversao"}
    assert 0 <= m <= 100


# ─────────────────────────── GATE DE REVERSÃO (anti-faca) ───────────────────────────
def test_gate_reversao_desconto_profundo_sem_reversao_capa_justo():
    # Desconto PROFUNDO (-40%) mas SEM reversão (rev=0) = FACA → teto JUSTO (≤50),
    # independente do desconto. Sem isso viraria COMPRAR.
    m, bd = S.compute_momentum(
        discount_from_top=-40, reversal_confirmation=0.0,
        slow_stoch_weekly=10, distance_ma200=-20, ma200_slope_weekly=-1.0, rsi=20,
    )
    assert m <= 50.0, f"faca sem reversão deveria ser capada em JUSTO, veio {m}"


def test_gate_reversao_com_reversao_libera_o_teto():
    # MESMO desconto, mas COM reversão confirmada (rev=1) → o teto solta (pode passar de 50).
    m, _ = S.compute_momentum(
        discount_from_top=-40, reversal_confirmation=1.0,
        slow_stoch_weekly=10, distance_ma200=-20, ma200_slope_weekly=-1.0, rsi=20,
        divergence=1.0, estrutura=1.0,
    )
    assert m > 50.0, f"com reversão confirmada o momento deveria superar JUSTO, veio {m}"


def test_gate_reversao_nao_morde_perto_da_maxima():
    # Sem desconto relevante (perto da máxima) NÃO há faca → o gate não capa.
    m, _ = S.compute_momentum(
        discount_from_top=-2, reversal_confirmation=0.0,
        distance_ma200=12, ma200_slope_weekly=3.0,
    )
    assert m > 50.0, "perto da máxima em uptrend não deveria ser capado pelo gate de reversão"


# ─────────────────────────── VALUATION RELATIVO ───────────────────────────
def test_valuation_relativo_yield_acima_da_media_e_barato():
    barato = S.score_valuation_relativo(dy=6.0, dy_avg10=4.0)   # yield 1.5× a média
    caro = S.score_valuation_relativo(dy=3.0, dy_avg10=4.0)     # yield 0.75× a média
    assert barato is not None and caro is not None
    assert barato > caro
    assert S.score_valuation_relativo(None, 4.0) is None
    assert S.score_valuation_relativo(0.0, 4.0) is None         # não-pagador → não opina


# ─────────────────────────── TENDÊNCIA PRIMÁRIA ───────────────────────────
def test_tendencia_primaria_uptrend_maior_que_downtrend():
    up = S.score_tendencia_primaria(ma200_slope_weekly=3.0, distance_ma200=15)
    down = S.score_tendencia_primaria(ma200_slope_weekly=-3.0, distance_ma200=-25)
    assert up is not None and down is not None
    assert up > down
    assert up >= 90 and down <= 20
    assert S.score_tendencia_primaria(None, None) is None


# ─────────────────────────── OSCILADORES + DIVERGÊNCIA ───────────────────────────
def test_osciladores_sobrevenda_so_conta_com_divergencia():
    # Sobrevendido (stoch 10, rsi 20). SEM divergência o sinal é descontado pro neutro;
    # COM divergência vale inteiro → nota MAIOR.
    sem = S.score_osciladores(stoch_k=10, rsi=20, divergence=0.0)
    com = S.score_osciladores(stoch_k=10, rsi=20, divergence=1.0)
    assert sem is not None and com is not None
    assert com > sem, "sobrevenda com divergência deve valer mais que sem"
    assert S.score_osciladores(None, None, 1.0) is None


# ─────────────────────────── MOMENTUM RELATIVO / ESTRUTURA ───────────────────────────
def test_momentum_relativo_e_estrutura():
    assert S.score_momentum_relativo(0.9) > S.score_momentum_relativo(0.1)
    assert S.score_momentum_relativo(None) is None
    assert S.score_estrutura_reversao(1.0) == 100
    assert S.score_estrutura_reversao(None) is None


# ─────────────────────────── GATE DE TENDÊNCIA → CAPA A LEVERAGE ───────────────────────────
def test_teto_leverage_tendencia_downtrend_forte_capa_2x():
    # Downtrend FORTE: preço bem abaixo da MM200 longa (-15%) E MM200 caindo (-1%) → teto 2x.
    assert S.teto_leverage_tendencia(distance_ma200=-15, ma200_slope_weekly=-1.0) == 2.0


def test_teto_leverage_tendencia_nao_capa_sem_os_dois_sinais():
    # Preço abaixo da média mas MM200 AINDA SUBINDO (pullback) → NÃO capa.
    assert S.teto_leverage_tendencia(distance_ma200=-15, ma200_slope_weekly=1.0) is None
    # MM200 caindo mas preço perto da média (início, não faca) → NÃO capa.
    assert S.teto_leverage_tendencia(distance_ma200=-2, ma200_slope_weekly=-1.0) is None
    # Dado ausente → NÃO fabrica downtrend.
    assert S.teto_leverage_tendencia(None, -1.0) is None
    assert S.teto_leverage_tendencia(-15, None) is None


def test_gate_tendencia_nao_veta_compra_so_capa():
    # Princípio do dono: tendência de baixa NÃO impede COMPRAR (descontado), só capa leverage.
    # Aqui o gate de leverage devolve um teto, mas o momento (com reversão) ainda pode ser de compra.
    teto = S.teto_leverage_tendencia(distance_ma200=-15, ma200_slope_weekly=-1.0)
    m, _ = S.compute_momentum(
        discount_from_top=-30, reversal_confirmation=1.0, distance_ma200=-15,
        ma200_slope_weekly=-1.0, slow_stoch_weekly=15, rsi=25, divergence=1.0, estrutura=1.0,
    )
    assert teto == 2.0                 # leverage capada
    assert m > 50.0                    # mas a compra (momento) não é vetada pela tendência


# ─────────────────────────── HELPERS DE SÉRIE (ranking_service) ───────────────────────────
def _mk_df(closes, highs=None, lows=None):
    import pandas as pd
    idx = pd.date_range("2018-01-01", periods=len(closes), freq="W")
    return pd.DataFrame({
        "Close": closes,
        "High": highs if highs is not None else closes,
        "Low": lows if lows is not None else closes,
    }, index=idx)


def test_estrutura_reversao_higher_low():
    # Sobe no fim (higher-low + fecha acima da máxima anterior + acima da MM10) → estrutura alta.
    up = np.array([10.0] * 6 + [8, 8.2, 8.5, 9, 9.5, 10.5], dtype=float)
    s = R._estrutura_reversao(up)
    assert s is not None and s >= 0.5
    # Faca (caindo sempre) → sem estrutura de reversão.
    down = np.array(list(np.linspace(20, 5, 14)), dtype=float)
    s2 = R._estrutura_reversao(down)
    assert s2 is not None and s2 < 0.5
    assert R._estrutura_reversao(np.array([1.0, 2.0])) is None  # série curta


def test_divergence_bullish_virada_do_stoch():
    closes = np.array(list(np.linspace(20, 10, 14)), dtype=float)
    # %K acima de %D = virada do oscilador → divergência > 0.
    d = R._divergence_bullish(closes, stoch_k=30, stoch_d=20, rsi=35)
    assert d is not None and d > 0.0
    assert R._divergence_bullish(closes, None, None, None) is None


def test_ma200_slope_weekly_uptrend_positivo():
    # Série semanal longa subindo → inclinação da MM200 semanal > 0.
    closes = list(np.linspace(10, 40, 260))
    df = _mk_df(closes)
    sl = R._ma200_slope_weekly(df)
    assert sl is not None and sl > 0
    # Série curta → None (renormaliza).
    assert R._ma200_slope_weekly(_mk_df(list(range(50)))) is None
