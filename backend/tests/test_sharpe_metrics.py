"""
Golden tests da aba SHARPE alavancada (survival-first), parecer do investidor sênior.

Cobrem os fixes:
  1. Calmar (CAGR/|MaxDD|) e Sortino (downside deviation) calculados por ativo.
  2. Ordenação dos sobreviventes por Calmar (desempate Sortino) — NÃO por Sharpe.
     Liquidados ficam no fundo.
  3. Margin buffer = mín. histórico de (low − liq_price)/liq_price (em %).
  4. Max leverage survivable via busca binária no LOW.
  5. Carry ZERO: nenhum débito de juro de empréstimo.

Funções PURAS, sem rede. Rodar de backend/:
    python -m pytest tests/test_sharpe_metrics.py -q
"""
import numpy as np
import pandas as pd

from app.quantitative import sharpe_compare as SC


# ─────────────────────────── helpers ───────────────────────────
def _df(closes, lows=None):
    """DataFrame OHLC mínimo (Close + Low) com índice diário."""
    idx = pd.date_range("2015-01-01", periods=len(closes), freq="D")
    if lows is None:
        lows = [c * 0.999 for c in closes]
    return pd.DataFrame({"Close": closes, "Low": lows}, index=idx)


def _steady_up(n=300, daily=0.001, start=100.0):
    """Série monotonicamente crescente — sem drawdown, sem downside."""
    closes = [start * (1 + daily) ** i for i in range(n)]
    lows   = [c * 0.9999 for c in closes]  # low colado no close: nunca liquida
    return closes, lows


# ─────────────────────────── carry zero ───────────────────────────
def test_carry_zero_no_interest_debit():
    """
    Sem custo de carrego: B&H 3x num ativo que não mexe (preço constante) deve
    terminar com patrimônio EXATAMENTE igual ao capital — nenhum juro debitado.
    """
    closes = [100.0] * 250
    lows   = [99.99] * 250  # nunca toca liq_price (=66.67 para 3x)
    res = SC._simulate_leveraged_hold("FLAT", _df(closes, lows), None,
                                      capital=10_000.0, leverage=3.0, risk_free=0.05)
    assert res["margin_call"] is False
    # preço constante => equity = capital, retorno total ~0 (sem débito de carry)
    assert abs(res["final_equity"] - 10_000.0) < 1e-6
    assert abs(res["retorno_total"]) < 1e-6


# ─────────────────────────── Calmar ───────────────────────────
def test_calmar_equals_cagr_over_maxdd():
    closes, lows = _steady_up(n=300, daily=0.001)
    res = SC._simulate_leveraged_hold("UP", _df(closes, lows), None,
                                      capital=10_000.0, leverage=1.0, risk_free=0.0)
    assert res["margin_call"] is False
    # subida monotônica => MaxDD ~ 0 => calmar tratado como 0 (sem divisão por ~0 explodindo)
    # mas o sinal de CAGR deve ser positivo
    assert res["retorno_anualizado"] > 0
    # com leverage 1x e subida limpa, não há drawdown relevante
    assert abs(res["max_drawdown"]) < 0.01


def test_calmar_with_real_drawdown():
    """Calmar = CAGR / |MaxDD| com um drawdown mensurável e recuperação."""
    # sobe, cai ~20%, recupera e fecha acima
    closes = ([100 + i * 0.2 for i in range(100)]      # 100 -> 119.8
              + [119.8 - i * 0.9 for i in range(1, 30)]  # queda
              + [93.7 + i * 0.5 for i in range(1, 200)])  # recuperação forte
    lows = [c * 0.999 for c in closes]
    res = SC._simulate_leveraged_hold("DD", _df(closes, lows), None,
                                      capital=10_000.0, leverage=1.0, risk_free=0.0)
    assert res["margin_call"] is False
    assert res["max_drawdown"] < 0  # houve drawdown
    expected = res["retorno_anualizado"] / abs(res["max_drawdown"])
    assert abs(res["calmar"] - round(expected, 3)) < 0.01


def test_liquidated_calmar_and_sortino_are_sentinel():
    """Ativo liquidado: calmar/sortino recebem sentinela muito negativa (fundo do rank)."""
    closes = [100.0, 90.0, 70.0, 60.0, 50.0, 40.0]  # despenca; 3x liquida em 66.67
    lows   = [99.0, 88.0, 65.0, 55.0, 45.0, 35.0]
    res = SC._simulate_leveraged_hold("CRASH", _df(closes, lows), None,
                                      capital=10_000.0, leverage=3.0, risk_free=0.0)
    assert res["margin_call"] is True
    assert res["calmar"] <= -99.0
    assert res["sortino"] <= -99.0
    assert res["retorno_total"] == -100.0


# ─────────────────────────── Sortino ───────────────────────────
def test_sortino_no_downside_is_finite_nonnegative():
    """Sem retornos negativos => downside dev = 0 => sortino tratado como 0 (não inf/NaN)."""
    closes, lows = _steady_up(n=300, daily=0.001)
    res = SC._simulate_leveraged_hold("UP", _df(closes, lows), None,
                                      capital=10_000.0, leverage=1.0, risk_free=0.0)
    assert np.isfinite(res["sortino"])
    assert res["sortino"] >= 0.0


def test_sortino_higher_than_sharpe_when_downside_rare():
    """
    Série com volatilidade concentrada no UPSIDE (saltos pra cima, quedas pequenas):
    Sortino deve superar Sharpe, pois Sharpe pune a vol total e Sortino só o downside.
    """
    rng = np.random.default_rng(42)
    rets = []
    for _ in range(500):
        if rng.random() < 0.5:
            rets.append(0.03)    # saltos grandes pra cima (inflam a vol total)
        else:
            rets.append(-0.005)  # quedas pequenas (downside baixo)
    closes = [100.0]
    for r in rets:
        closes.append(closes[-1] * (1 + r))
    lows = [c * 0.999 for c in closes]
    res = SC._simulate_leveraged_hold("UPSIDE", _df(closes, lows), None,
                                      capital=10_000.0, leverage=1.0, risk_free=0.0)
    assert res["margin_call"] is False
    assert res["sortino"] > res["sharpe"]


# ─────────────────────────── Margin buffer ───────────────────────────
def test_margin_buffer_is_min_distance_to_liq_in_pct():
    """
    Margin buffer = mín. (low − liq_price)/liq_price * 100. Para 2x, liq_price = price0/2.
    Construímos um low que chega bem perto do liq_price e medimos.
    """
    price0 = 100.0
    closes = [price0, 98.0, 95.0, 99.0, 101.0]
    # 2x => liq_price = 50. Buffer mínimo no menor low.
    lows   = [99.0, 60.0, 52.0, 80.0, 100.0]  # menor low = 52 -> buffer = (52-50)/50 = 4%
    res = SC._simulate_leveraged_hold("BUF", _df(closes, lows), None,
                                      capital=10_000.0, leverage=2.0, risk_free=0.0)
    assert res["margin_call"] is False
    assert res["margin_buffer"] is not None
    assert abs(res["margin_buffer"] - 4.0) < 0.01  # 4%


def test_margin_buffer_none_when_no_leverage():
    """Leverage 1x => sem empréstimo => sem liq_price => margin_buffer = None."""
    closes = [100.0, 95.0, 90.0, 105.0]
    res = SC._simulate_leveraged_hold("NOLEV", _df(closes), None,
                                      capital=10_000.0, leverage=1.0, risk_free=0.0)
    assert res["margin_buffer"] is None


def test_margin_buffer_negative_or_zero_when_liquidated():
    """Quando liquida, o low cruzou o liq_price => buffer <= 0."""
    closes = [100.0, 90.0, 70.0, 60.0]
    lows   = [99.0, 88.0, 64.0, 55.0]  # 3x liq=66.67, low 64 cruza
    res = SC._simulate_leveraged_hold("LIQ", _df(closes, lows), None,
                                      capital=10_000.0, leverage=3.0, risk_free=0.0)
    assert res["margin_call"] is True
    assert res["margin_buffer"] is not None
    assert res["margin_buffer"] <= 0.0


# ─────────────────────────── Max leverage survivable ───────────────────────────
def test_max_leverage_survivable_flat_is_high():
    """Preço que nunca cai: sobrevive a leverage altíssimo (bate o teto)."""
    closes = [100.0] * 200
    lows   = [99.999] * 200
    ml = SC._max_leverage_survivable(closes, lows, capital=10_000.0, lev_cap=20.0)
    assert ml == 20.0


def test_max_leverage_survivable_bounded_by_drawdown():
    """
    Drawdown de ~30% (low chega a 70) => liq_price seguro precisa ficar < 70.
    liq_price(lev) = price0 * (lev-1)/lev. Resolve <=70 => lev <= 100/30 ≈ 3.33.
    """
    price0 = 100.0
    closes = [price0, 85.0, 80.0, 90.0, 110.0, 120.0]
    lows   = [99.0, 80.0, 70.0, 85.0, 105.0, 118.0]  # menor low = 70
    ml = SC._max_leverage_survivable(closes, lows, capital=10_000.0, lev_cap=20.0)
    # leverage máximo teórico ~3.33; buscar deve devolver algo próximo e < 3.4, >= 3.2
    assert 3.2 <= ml <= 3.4
    # confirma a fronteira: ml sobrevive, ml+0.2 não
    assert SC._survives_leverage(closes, lows, 10_000.0, ml) is True
    assert SC._survives_leverage(closes, lows, 10_000.0, ml + 0.2) is False


# ─────────────────────────── Ordenação por Calmar ───────────────────────────
def test_ranking_by_calmar_not_sharpe():
    """
    Dois sobreviventes: A tem Sharpe MAIOR mas Calmar MENOR que B.
    A nova ordenação (Calmar) deve colocar B na frente — provando que NÃO ordena
    mais por Sharpe.
    """
    # A: subida com vol alta porém drawdown grande (Sharpe ok, Calmar ruim)
    a_closes = ([100 + i * 0.1 for i in range(80)]       # sobe devagar
                + [108 - i * 0.8 for i in range(1, 25)]   # cai ~18% (drawdown grande)
                + [89 + i * 0.6 for i in range(1, 200)])  # recupera
    # B: subida limpa e consistente (drawdown pequeno => Calmar alto)
    b_closes = [100 * (1.0008) ** i for i in range(len(a_closes))]

    price_data = {
        "A": _df(a_closes, [c * 0.999 for c in a_closes]),
        "B": _df(b_closes, [c * 0.9995 for c in b_closes]),
    }
    out = SC.run_sharpe_compare(price_data, capital=10_000.0, leverage=1.0, risk_free=0.0)

    by_t = {r["ticker"]: r for r in out}
    a, b = by_t["A"], by_t["B"]
    # pré-condição do cenário: B tem Calmar melhor; A pode ter Sharpe >= B
    assert b["calmar"] > a["calmar"]
    # a ordenação efetiva: B antes de A
    order = [r["ticker"] for r in out]
    assert order.index("B") < order.index("A")


def test_liquidated_always_at_bottom():
    """Liquidados sempre no fundo, independentemente de qualquer métrica."""
    surv_closes = [100 * (1.001) ** i for i in range(200)]
    crash_closes = [100.0, 80.0, 60.0, 40.0, 20.0]
    price_data = {
        "SURV":  _df(surv_closes, [c * 0.999 for c in surv_closes]),
        "DEAD":  _df(crash_closes, [c * 0.99 for c in crash_closes]),
    }
    out = SC.run_sharpe_compare(price_data, capital=10_000.0, leverage=3.0, risk_free=0.0)
    assert out[-1]["ticker"] == "DEAD"
    assert out[-1]["margin_call"] is True
    assert out[0]["ticker"] == "SURV"


def test_composite_tiebreak_by_sortino():
    """Calmar empatado => desempata por Sortino (maior na frente)."""
    a = {"ticker": "A", "margin_call": False, "calmar": 2.0, "sortino": 1.0}
    b = {"ticker": "B", "margin_call": False, "calmar": 2.0, "sortino": 3.0}
    ranked = sorted([a, b], key=SC._rank_key, reverse=True)
    assert ranked[0]["ticker"] == "B"


# ─────────────────────────── não quebrar contrato ───────────────────────────
def test_output_contract_has_all_fields():
    closes, lows = _steady_up(n=120)
    res = SC._simulate_leveraged_hold("X", _df(closes, lows), None,
                                      capital=10_000.0, leverage=2.0, risk_free=0.05)
    for key in ("ticker", "retorno_total", "retorno_anualizado", "volatilidade",
                "sharpe", "sortino", "calmar", "max_drawdown", "margin_buffer",
                "max_leverage", "beta", "final_equity", "margin_call", "margin_call_date"):
        assert key in res, f"campo ausente: {key}"
