"""
Golden tests da detecção de TÁTICO (cíclica/descolada) estendida às ações americanas.

Doutrina (ESTRATEGIA_MASTER + memória do projeto):
- BR: auto-detecção por dados (corr baixa + σ alta) contra ^BVSP, protegida por whitelist.
- US: corr/σ contra ^GSPC é RUIDOSO (S&P concentrado em tech). Auto corr/σ fica DESLIGADA p/ US;
  confiamos só na whitelist POSITIVA curada (_TATICO_US) de cíclicas estruturais.
- Conservador: melhor um cíclico US escapar do que punir um compounder com falso-tático
  (que mataria o bônus de beta defensivo dele).

Estes testes protegem as duas camadas de proteção e replicam a regra de decisão pura
(o mesmo predicado de `_analyze`, sem rede), além de validar as constantes load-bearing.

Rodar: `pytest tests/test_tatico_us.py` a partir de backend/.
"""
from app.services import ranking_service as R


def _decide_tatico(tk: str, bucket: str, is_br: bool, corr, sigma_ratio) -> bool:
    """Réplica fiel do predicado de TÁTICO embutido em `_analyze` (mantém em sync).
    BR usa auto corr/σ; US usa só a whitelist positiva curada; ambos respeitam a whitelist
    protetora e o bucket curado."""
    tku = tk.upper()
    auto_tatico = (is_br
                   and corr is not None and sigma_ratio is not None
                   and corr < R._TATICO_CORR_MAX and sigma_ratio > R._TATICO_SIGMA_MIN
                   and tku not in R._TATICO_WHITELIST)
    us_curated_tatico = (tku in R._TATICO_US and tku not in R._TATICO_WHITELIST)
    return (bucket == "TATICO") or auto_tatico or us_curated_tatico


# ─────────────────────── camada 1: whitelist positiva US (curada) ───────────────────────
def test_us_curated_cyclical_is_tatico():
    # XOM (energia integrada) está na whitelist positiva → tático mesmo SEM corr/σ.
    assert "XOM" in R._TATICO_US
    # Mesmo se viesse com bucket genérico e corr alta/σ baixa (que NÃO sugeririam tático),
    # a whitelist positiva curada manda → tático.
    assert _decide_tatico("XOM", bucket="GERADOR", is_br=False, corr=0.85, sigma_ratio=0.9) is True
    assert _decide_tatico("CVX", bucket="GERADOR", is_br=False, corr=0.90, sigma_ratio=1.0) is True
    assert _decide_tatico("CAT", bucket="ACELERADOR", is_br=False, corr=0.80, sigma_ratio=1.1) is True


def test_us_curated_only_genuine_cyclicals():
    # Só cíclicas estruturais genuínas. Nenhum compounder/defensiva entrou por engano.
    for compounder in ("AAPL", "MSFT", "GOOGL", "JNJ", "KO", "PG"):
        assert compounder not in R._TATICO_US


# ─────────────────────── camada 2: compounders US protegidos ───────────────────────
def test_us_compounder_protected_even_if_corr_sigma_suggest_tatico():
    # MSFT com corr baixíssima e σ alta (que SUGERIRIAM tático se a regra US fosse por dados).
    # Como a auto corr/σ está DESLIGADA p/ US E MSFT está na whitelist protetora → NÃO tático.
    assert "MSFT" in R._TATICO_WHITELIST
    assert _decide_tatico("MSFT", bucket="ACELERADOR", is_br=False,
                          corr=0.10, sigma_ratio=2.5) is False
    # Outros compounders icônicos idem.
    for tk in ("AAPL", "GOOGL", "AMZN", "JNJ", "KO", "PG", "PEP", "V", "MA", "COST"):
        assert tk in R._TATICO_WHITELIST
        assert _decide_tatico(tk, bucket="ANCORA", is_br=False,
                              corr=0.05, sigma_ratio=3.0) is False


def test_us_auto_corr_sigma_is_off():
    # Um ticker US genérico (não na whitelist positiva, não bucket TATICO) com corr/σ que
    # DISPARARIA no BR NÃO vira tático no US — prova de que a auto corr/σ está desligada p/ US.
    assert _decide_tatico("FAKEUS", bucket="GERADOR", is_br=False,
                          corr=0.10, sigma_ratio=2.5) is False


def test_us_whitelist_overrides_positive_list():
    # Defesa em profundidade: se um ticker estivesse em AMBAS as listas, a protetora vence.
    # (Não deve acontecer no universo atual, mas a regra precisa ser determinística.)
    overlap = R._TATICO_US & R._TATICO_WHITELIST
    assert overlap == set(), f"ticker em ambas as listas viola a doutrina: {overlap}"


# ─────────────────────── regressão: BR continua igual ───────────────────────
def test_br_auto_detection_still_works():
    # PETR4-like: corr baixa + σ alta, não-whitelist → tático automático (comportamento BR antigo).
    assert _decide_tatico("PETR4.SA", bucket="TATICO", is_br=True,
                          corr=0.26, sigma_ratio=1.6) is True
    # Mesmo se viesse com bucket genérico, os dados BR disparam.
    assert _decide_tatico("ANYBR3.SA", bucket="GERADOR", is_br=True,
                          corr=0.30, sigma_ratio=1.6) is True


def test_br_whitelist_still_protects():
    # WEGE3 (compounder BR) com corr baixa NÃO vira tático — whitelist protetora BR intacta.
    assert "WEGE3.SA" in R._TATICO_WHITELIST
    assert _decide_tatico("WEGE3.SA", bucket="ACELERADOR", is_br=True,
                          corr=0.20, sigma_ratio=1.8) is False


def test_br_below_thresholds_not_tatico():
    # corr alta OU σ baixa → não dispara (limiares BR preservados).
    assert _decide_tatico("ANYBR3.SA", bucket="GERADOR", is_br=True,
                          corr=0.50, sigma_ratio=1.6) is False
    assert _decide_tatico("ANYBR3.SA", bucket="GERADOR", is_br=True,
                          corr=0.20, sigma_ratio=1.2) is False


def test_import_is_clean():
    # Constantes existem e têm os tipos esperados.
    assert isinstance(R._TATICO_US, set) and len(R._TATICO_US) >= 4
    assert isinstance(R._TATICO_WHITELIST, set)
