"""
Golden tests das recomendações do gestor sênior (jun/2026), implementadas em ranking_service:

#1 — DIVIDENDO RECORRENTE (corrigir na origem):
   O DY do app misturava recorrente com extraordinário/forward, inflando picks (ITUB4 8,4%
   com R$2,12 de 1 dividendo extraordinário único; recorrente ~3-4%). Alavancar 3x sobre carry
   que NÃO se repete é perigoso. A correção detecta o pagamento EXTRAORDINÁRIO (outlier) e usa o
   DY RECORRENTE no score e no display. Conservador: na dúvida SUBESTIMA, nunca infla; sem detecção
   segura mantém o valor original (nunca fabrica).

#3 — BETA SANITIZADO + TRAVA DE ALAVANCAGEM (regra nº1 = sobrevivência):
   - Guard de beta implausível: beta NEGATIVO p/ ativo de risco é artefato (TTE −0,17 é impossível
     p/ petrolífera) → fallback (5a se ≥0, senão piso setorial). NUNCA alimenta bônus de defensivo.
   - Trava: beta ≥ 1.45 capa a alavancagem em 2.0x (3x×1,5 = ~4,5x efetivo = liquidação no drawdown).

Sem rede: séries/dividendos sintéticos; exercita as funções puras e replica os predicados de
decisão de `_analyze` (beta guard, trava de leverage) mantidos em sync.

Rodar: `pytest tests/test_ranking_dividend_beta.py` a partir de backend/.
"""
import pytest

from app.services import ranking_service as R


# ─────────────────────────── #1 — DIVIDENDO RECORRENTE ───────────────────────────
def test_extraordinario_um_pagamento_outlier_no_ano():
    """(a) Ano com 4 pagamentos regulares + 1 EXTRAORDINÁRIO gigante → o recorrente exclui/
    normaliza o outlier (substitui pela mediana dos regulares). Modela ITUB4: ~R$0,84/ano de
    recorrente (4×0,21) com 1 extraordinário de R$2,12 inflando o headline."""
    regulares = [0.21, 0.21, 0.21, 0.21]
    extraordinario = 2.12
    amts = regulares + [extraordinario]
    peers = [0.84, 0.80, 0.88]  # anos normais ~R$0,84
    rec = R._recurring_annual_amount(amts, peers)
    assert rec is not None, "deveria detectar o extraordinário"
    bruto = sum(amts)  # 2.96
    # recorrente bem menor que o bruto, próximo do total regular (4×0,21=0,84 + mediana 0,21)
    assert rec < bruto
    assert rec == pytest.approx(0.84 + 0.21, abs=1e-6)  # 4 regulares + outlier→mediana


def test_dividendos_regulares_estaveis_dy_inalterado():
    """(b) Dividendos regulares e estáveis → NENHUMA correção (recorrente == bruto → None)."""
    amts = [0.25, 0.25, 0.24, 0.26]
    peers = [1.00, 0.98, 1.02]
    assert R._recurring_annual_amount(amts, peers) is None


def test_ano_inteiro_salta_vs_pares():
    """(b) Trava de ANO que salta: total do ano > 1,8× a mediana dos outros anos → capa no teto."""
    # 2 pagamentos iguais (não dispara a trava de pagamento individual), mas o ANO dobra os pares
    amts = [1.50, 1.50]          # total 3,00
    peers = [1.00, 1.05, 0.95]   # mediana ~1,00 → teto recorrente = 1,8×1,00 = 1,80
    rec = R._recurring_annual_amount(amts, peers)
    assert rec is not None
    assert rec == pytest.approx(1.80, abs=1e-6)


def test_sem_base_suficiente_nao_corrige():
    """Conservador: <3 pagamentos e <2 anos de par → sem base segura → não corrige (None)."""
    assert R._recurring_annual_amount([0.10, 5.00], []) is None
    assert R._recurring_annual_amount([5.00], [1.00]) is None


def test_consistencia_usa_dy_recorrente_pos_correcao():
    """O score de consistência (_dividend_consistency) opera sobre o DY anual JÁ recorrente.
    Sanidade: a média/pior-ano refletem os valores recorrentes passados (não o headline)."""
    this_year = R.dt.date.today().year
    annual_rec = {this_year - 1: 4.0, this_year - 2: 3.8, this_year - 3: 4.2, this_year - 4: 3.9}
    avg, worst = R._dividend_consistency(annual_rec)
    assert avg == pytest.approx(3.975, abs=0.01)
    assert worst == pytest.approx(3.8, abs=0.01)


# ─────────────────────────── #3 — BETA GUARD ───────────────────────────
def _resolve_beta_guard(tk, cat, bucket, beta, beta_source, beta_long):
    """Réplica fiel do guard de beta de `_analyze` (mantido em sync com o serviço)."""
    is_risk = (cat not in ("CRYPTO", "COMMODITY")
               and not tk.startswith("^") and "=" not in tk
               and tk.upper() not in ("SHY", "GLD", "GC=F"))
    if is_risk and beta is not None and beta < 0.0:
        tku = tk.upper()
        ciclica = (bucket == "TATICO") or (tku in R._TATICO_US)
        if "reg5a" not in beta_source and beta_long is not None and beta_long >= 0.0:
            return beta_long, "reg5a:beta_neg_guard"
        piso = 1.0 if ciclica else 0.5
        return piso, "piso_setorial:beta_neg_guard"
    return beta, beta_source


def test_beta_negativo_substituido_por_fallback_5a():
    """(c) Beta de ENTRADA negativo (artefato reg1a) com 5a positivo disponível → usa o 5a."""
    beta, src = _resolve_beta_guard(
        "TTE", "US", "TATICO", beta=-0.17, beta_source="reg1a", beta_long=0.45)
    assert beta == pytest.approx(0.45)
    assert "beta_neg_guard" in src and "reg5a" in src
    assert beta > 0.0  # NUNCA negativo alimentando bônus de defensivo


def test_beta_negativo_sem_5a_cai_no_piso_setorial():
    """(c) Beta negativo e 5a indisponível/negativo → piso setorial (cíclica 1.0 / defensiva 0.5)."""
    # cíclica curada US (TTE)
    beta_c, src_c = _resolve_beta_guard(
        "TTE", "US", "TATICO", beta=-0.30, beta_source="reg5a", beta_long=-0.30)
    assert beta_c == pytest.approx(1.0) and src_c.startswith("piso_setorial")
    # defensiva (não cíclica)
    beta_d, _ = _resolve_beta_guard(
        "KO", "US", "CORE", beta=-0.05, beta_source="reg5a", beta_long=None)
    assert beta_d == pytest.approx(0.5)


def test_beta_baixo_positivo_petrolifera_preservado():
    """Petrolífera com beta ~0.15 (suspeito mas POSSÍVEL por janela) → NÃO mexe. Só o negativo é vetado."""
    beta, src = _resolve_beta_guard(
        "XOM", "US", "TATICO", beta=0.15, beta_source="fmp", beta_long=0.20)
    assert beta == pytest.approx(0.15) and src == "fmp"


def test_crypto_e_shy_beta_negativo_nao_sao_tocados():
    """Cripto/SHY/ouro: beta baixo/negativo é o PAPEL deles → guard não se aplica."""
    b1, s1 = _resolve_beta_guard("BTC-USD", "CRYPTO", "CORE", -0.2, "reg1a", None)
    assert b1 == pytest.approx(-0.2) and s1 == "reg1a"
    b2, s2 = _resolve_beta_guard("SHY", "ETF", "RESERVA", -0.1, "reg1a", None)
    assert b2 == pytest.approx(-0.1) and s2 == "reg1a"


# ─────────────────────────── #3 — TRAVA DE ALAVANCAGEM POR BETA ───────────────────────────
def _leverage_with_beta_cap(mult, beta, verdict="COMPRAR", quality=70):
    """Réplica do encadeamento de tetos de `_analyze` (regime → veredito → BETA ≥1.45 → 2x)."""
    leverage = float(mult)
    if verdict == "ESPECULATIVO":
        leverage = min(leverage, 2.0)
    elif verdict == "COMPRAR" and quality is not None and quality < 50:
        leverage = min(leverage, 3.0)
    if beta is not None and beta >= 1.45:
        leverage = min(leverage, 2.0)
    return leverage


def test_beta_alto_capa_alavancagem_em_2x_regime_neutro():
    """(d) Beta 1.50 + regime NEUTRO (mult 3) → leverage CAPADA em 2.0 (sobrevivência)."""
    assert _leverage_with_beta_cap(R.MULT["NEUTRO"], beta=1.50) == pytest.approx(2.0)
    # B3SA3 1.48 / ADBE 1.46 — ambos acima do limiar → capados
    assert _leverage_with_beta_cap(R.MULT["NEUTRO"], beta=1.48) == pytest.approx(2.0)
    assert _leverage_with_beta_cap(R.MULT["NEUTRO"], beta=1.46) == pytest.approx(2.0)
    # capa INVIOLÁVEL mesmo em capitulação (mult 4/5)
    assert _leverage_with_beta_cap(R.MULT["CAPITULACAO"], beta=1.50) == pytest.approx(2.0)
    assert _leverage_with_beta_cap(R.MULT["CAPIT.EXTREMA"], beta=1.50) == pytest.approx(2.0)


def test_beta_normal_nao_capa_alavancagem():
    """(e) Beta 0.9 + regime NEUTRO (mult 3) → leverage 3 NORMAL (sem cap por beta)."""
    assert _leverage_with_beta_cap(R.MULT["NEUTRO"], beta=0.9) == pytest.approx(3.0)
    # logo abaixo do limiar 1.45 → ainda sem cap
    assert _leverage_with_beta_cap(R.MULT["NEUTRO"], beta=1.44) == pytest.approx(3.0)
    # beta ausente → sem cap (não fabrica trava)
    assert _leverage_with_beta_cap(R.MULT["NEUTRO"], beta=None) == pytest.approx(3.0)
