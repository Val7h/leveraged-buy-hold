"""
Camada de PERFIL DE INVESTIDOR (produto) — golden tests.

Garante: (1) ZERO regressão — chamada sem parâmetros de perfil = comportamento atual
(agressivo); (2) os 3 presets traduzem nos parâmetros certos; (3) o teto duro e o piso de σ
mordem na alavancagem por-fluxo conforme o perfil.
"""
from app.quantitative import profiles
from app.quantitative.scoring_v2 import teto_alavancagem_aptidao, teto_sigma


# ─────────────────────────────────────────────────────────────────────────────
# Resolver de perfil
# ─────────────────────────────────────────────────────────────────────────────
def test_presets_existem_e_tem_campos():
    for key in ("conservador", "moderado", "agressivo"):
        p = profiles.PRESETS[key]
        assert {"leverage_cap", "sigma_floor_min_pct", "regime_mult",
                "seed_price_stop", "reserve_pct"} <= set(p)


def test_default_assinante_e_moderado():
    assert profiles.DEFAULT_PROFILE == "moderado"
    assert profiles.normalize_profile(None) == "moderado"
    assert profiles.normalize_profile("") == "moderado"
    assert profiles.normalize_profile("xpto") == "moderado"


def test_aliases_pt_en():
    assert profiles.normalize_profile("aggressive") == "agressivo"
    assert profiles.normalize_profile("balanced") == "moderado"
    assert profiles.normalize_profile("conservative") == "conservador"
    assert profiles.normalize_profile("AGRESSIVO") == "agressivo"


def test_agressivo_e_a_doutrina_do_dono():
    p = profiles.resolve_profile("agressivo")
    assert p["leverage_cap"] == 5.0
    assert p["sigma_floor_min_pct"] is None          # sem piso → só extremos
    assert p["seed_price_stop"] is False             # semente só tese
    assert p["regime_mult"] == {"TOPO": 2, "NEUTRO": 3, "CAPITULACAO": 4, "CAPIT.EXTREMA": 5}


def test_regime_multiplier_por_perfil():
    # Capitulação extrema: agressivo 5x, moderado 3x, conservador 2x.
    assert profiles.regime_multiplier("agressivo", "CAPIT.EXTREMA") == 5
    assert profiles.regime_multiplier("moderado", "CAPIT.EXTREMA") == 3
    assert profiles.regime_multiplier("conservador", "CAPIT.EXTREMA") == 2
    # Topo: agressivo 2x, conservador 1x.
    assert profiles.regime_multiplier("agressivo", "TOPO") == 2
    assert profiles.regime_multiplier("conservador", "TOPO") == 1


# ─────────────────────────────────────────────────────────────────────────────
# ZERO REGRESSÃO — sem parâmetros de perfil = comportamento atual
# ─────────────────────────────────────────────────────────────────────────────
def test_teto_sigma_sem_floor_inalterado():
    # Comportamento agressivo atual: σ<35 sem cap; extremos capam.
    assert teto_sigma(27.0) is None
    assert teto_sigma(40.0) == 3.0
    assert teto_sigma(60.0) == 2.0
    assert teto_sigma(70.0) == 1.0
    assert teto_sigma(None) is None


def test_teto_aptidao_sem_perfil_inalterado():
    # Ação de qualidade σ20, beta 1.0, gap pequeno, regime 4x → mesmo resultado de antes
    # (perfil None não entra no MIN).
    lev_sem, det_sem = teto_alavancagem_aptidao(sigma_pct=20.0, gap_pct=4.0, beta=1.0, mult_regime=4)
    lev_none, _ = teto_alavancagem_aptidao(sigma_pct=20.0, gap_pct=4.0, beta=1.0, mult_regime=4,
                                           leverage_cap=None, sigma_floor_min_pct=None)
    assert lev_sem == lev_none
    assert "perfil" not in det_sem["tetos"]          # perfil ausente não aparece no MIN


# ─────────────────────────────────────────────────────────────────────────────
# Perfil MORDE a alavancagem
# ─────────────────────────────────────────────────────────────────────────────
def test_teto_duro_conservador_capa_em_2():
    # Mesmo ativo que pegaria 4x no agressivo, capado a 2x pelo teto duro do conservador.
    p = profiles.profile_leverage_params("conservador")
    lev, det = teto_alavancagem_aptidao(sigma_pct=20.0, gap_pct=4.0, beta=1.0, mult_regime=4,
                                        leverage_cap=p["leverage_cap"],
                                        sigma_floor_min_pct=p["sigma_floor_min_pct"])
    assert lev == 2.0
    assert det["binding"] == "perfil"


def test_piso_sigma_morde_perfil_cauteloso():
    # σ28 (vol elevada): agressivo não capa (regime 5x manda); conservador (floor 25) capa a 2.
    lev_aggr, _ = teto_alavancagem_aptidao(sigma_pct=28.0, gap_pct=3.0, beta=0.7, mult_regime=5,
                                           leverage_cap=5.0, sigma_floor_min_pct=None)
    lev_cons, det = teto_alavancagem_aptidao(sigma_pct=28.0, gap_pct=3.0, beta=0.7, mult_regime=2,
                                             leverage_cap=2.0, sigma_floor_min_pct=25.0)
    assert lev_aggr >= 4.0                            # agressivo: σ28 não trava
    assert lev_cons == 2.0                            # conservador: travado
    assert teto_sigma(28.0, floor_min_pct=25.0) == 2.0


def test_moderado_intermediario():
    # Teto duro 3x do moderado: ativo que pegaria 4-5x cai a 3.
    p = profiles.profile_leverage_params("moderado")
    lev, _ = teto_alavancagem_aptidao(sigma_pct=18.0, gap_pct=3.0, beta=0.9, mult_regime=4,
                                      leverage_cap=p["leverage_cap"],
                                      sigma_floor_min_pct=p["sigma_floor_min_pct"])
    assert lev == 3.0
