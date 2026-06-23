"""
Golden tests da LÓGICA QUANT (motor de decisão de capital) — gap nº1 de governança da revisão.
Funções PURAS, sem rede: dado um input fixo, o score/leverage/veredito é o esperado.
Protegem contra mudanças silenciosas no scoring quando mexemos no motor.
Rodar: `pytest tests/test_quant_golden.py` a partir de backend/.
"""
import datetime as dt
import numpy as np

from app.quantitative import scoring_v2 as S
from app.services import ranking_service as R
from app.services import portfolio_service as P


# ─────────────────────────── veredito de aporte ───────────────────────────
def test_aporte_verdict_thresholds():
    assert S.aporte_verdict(75, 65) == "COMPRAR FORTE"     # momento alto + qualidade boa
    assert S.aporte_verdict(75, 40) == "ESPECULATIVO"      # descontado mas qualidade fraca = faca
    assert S.aporte_verdict(60, 55) == "COMPRAR"
    assert S.aporte_verdict(45, 80) == "JUSTO"             # boa empresa, hora mediana
    assert S.aporte_verdict(20, 80) == "ESTICADO"          # sem desconto agora (NÃO exclui)


def test_aporte_verdict_two_bands_15b():
    # #15b "número ótimo": pechincha forte (mom>=70) + boa-o-suficiente (>=58) já é FORTE
    assert S.aporte_verdict(72, 60) == "COMPRAR FORTE"
    assert S.aporte_verdict(72, 50) == "COMPRAR"           # pechincha + qualidade média → só COMPRAR
    # momento bom (60-69): só a EXCELENTE (>=75) sobe a FORTE
    assert S.aporte_verdict(65, 80) == "COMPRAR FORTE"     # excelência compra o momento que falta
    assert S.aporte_verdict(65, 60) == "COMPRAR"           # boa, não excelente → COMPRAR


def test_quality_crivo_by_type_and_missing_data():
    # financeira: ROE pilar; D/E alto (5.0) é IGNORADO (é o negócio do banco, não risco)
    nota_fin, _ = S.score_quality_crivo("financeira", roe=0.22, dy_avg10=8.0, dy_worst=7.0, debt_to_equity=5.0)
    assert nota_fin is not None and nota_fin >= 70
    # normal: o MESMO D/E 5.0 + roic/fcf baixos DERRUBAM (entram no crivo)
    nota_norm, _ = S.score_quality_crivo("normal", roe=0.22, roic=0.05, fcf_yield=0.02,
                                         debt_to_equity=5.0, dy_avg10=8.0, dy_worst=7.0)
    assert nota_norm is not None and nota_norm < nota_fin
    # falta de dado: < 2 termos reais → crivo NÃO opina (None, não "50 falso")
    n_none, cnt = S.score_quality_crivo("normal", roe=0.22)
    assert n_none is None and cnt == 0
    # piso afrouxa pela confiança (menos dado → mais tolerante)
    assert S.crivo_piso("ALTA") > S.crivo_piso("BAIXA")


# ─────────────────────── beta contextual (amplificador) ───────────────────
def test_beta_contextual_amplifier():
    assert S.score_beta_contextual(0.3) > 90                       # baixo = defensivo bom
    assert S.score_beta_contextual(0.3, is_tatico=True) == 62.0    # tático mata o bônus falso
    oversold = S.score_beta_contextual(1.8, momentum=75)           # beta alto no fundo = bônus
    overbought = S.score_beta_contextual(1.8, momentum=30)         # beta alto esticado = penalidade
    assert oversold > overbought


# ───────────────────── dividendo por consistência ─────────────────────────
def test_dividend_consistency_scoring():
    cut = S.score_dividend_sustainable(avg10=16.0, worst_year=0.0)   # PETR4: cortou a 0% na crise
    solid = S.score_dividend_sustainable(avg10=8.0, worst_year=7.0)  # TAEE11: nunca cortou
    assert solid > cut
    # growth guard: yield baixo (não é renda) não leva castigo de corte
    growth = S.score_dividend_sustainable(avg10=0.3, worst_year=0.0)
    assert growth == S.score_dividend_q(0.3)


def test_dividend_consistency_helper_worst_year():
    y = dt.date.today().year
    annual = {y - 1: 8.0, y - 2: 0.0, y - 3: 7.0, y - 4: 9.0, y - 5: 6.0}
    avg, worst = R._dividend_consistency(annual)
    assert worst == 0.0                                    # pega o ano que cortou
    assert avg is not None and avg > 0


# ───────────── stop escalonado fica SEMPRE antes da liquidação ─────────────
def test_staggered_stops_before_liquidation():
    for lev in (2.0, 3.0, 4.0, 5.0):
        s = S.staggered_stops(lev)
        assert s["stop_1_pct"] < s["liquidation_pct"]      # 1º stop dispara ANTES de liquidar
        assert s["stop_2_pct"] < s["liquidation_pct"]      # 2º idem
        assert s["stop_1_pct"] < s["stop_2_pct"]           # escalonado
    # mais alavancado → liquida com menos queda
    assert S.staggered_stops(5.0)["liquidation_pct"] < S.staggered_stops(2.0)["liquidation_pct"]


# ─────────────────────────── regime de mercado ────────────────────────────
def test_regime_capitulacao_e_topo():
    # série que sobe e despenca ~-50% do topo → capitulação extrema
    crash = np.concatenate([np.linspace(100, 200, 400), np.linspace(200, 100, 60)])
    assert R.regime(crash) in ("CAPITULACAO", "CAPIT.EXTREMA")
    # alta saudável → NÃO é capitulação
    assert R.regime(np.linspace(100, 200, 450)) not in ("CAPITULACAO", "CAPIT.EXTREMA")
    # série curta demais → NEUTRO (sem dados p/ decidir)
    assert R.regime(np.array([100.0, 101.0])) == "NEUTRO"


# ─────────── discount factor conservador (anti value-trap, piso 0.85) ──────
def test_discount_factor_conservative_floor():
    assert P._discount_factor(-30) == 0.85                 # oversold: alívio MÁXIMO é só 15%
    assert P._discount_factor(30) == 1.0                   # esticado: tombo cheio
    assert P._discount_factor(None) == 1.0                 # sem dado = conservador (sem alívio)
    assert 0.85 <= P._discount_factor(-10) <= 1.0


# ─────────────────── quality blend: faixa e composição ─────────────────────
def test_quality_blend_range_and_keys():
    q, bd = S.compute_quality_blend(beta=0.6, max_dd_pct=-20, dividend_yield=4,
                                    growth_5y=10, sharpe=1.0, cagr=10,
                                    tsr_expected=12, momentum=60)
    assert 0 <= q <= 100
    assert {"beta", "max_drawdown", "dividendos", "fundamentos"}.issubset(bd.keys())


def test_quality_blend_renormalizes_without_real_growth():
    # #15a: a Qualidade usa crescimento REAL (receita/EPS, não preço). Ausente (BR/jovem) → o termo
    # SAI e os pesos RENORMALIZAM (sem injetar "50 falso"); a chave crescimento_5a é omitida.
    _, bd_with = S.compute_quality_blend(beta=0.6, max_dd_pct=-20, dividend_yield=4,
                                         growth_5y=12, sharpe=1.0, roic=0.18, momentum=60)
    q_wo, bd_wo = S.compute_quality_blend(beta=0.6, max_dd_pct=-20, dividend_yield=4,
                                          growth_5y=None, sharpe=1.0, roic=0.18, momentum=60)
    assert "crescimento_5a" in bd_with
    assert "crescimento_5a" not in bd_wo
    assert 0 <= q_wo <= 100


def test_is_falling_knife_15c():
    # negócio encolhendo (crescimento real 5a < 0) = faca
    assert S.is_falling_knife(-3.0, None, 8.0) is True
    # boa empresa (5a +) mas APODRECENDO recente (TTM muito negativo) = faca
    assert S.is_falling_knife(10.0, -15.0, 8.0) is True
    # boa empresa, recente ok, preço caído = NÃO é faca (é pechincha)
    assert S.is_falling_knife(10.0, 4.0, -5.0) is False
    # CÍCLICA: queda recente é o CICLO (não rot) → ignora real, usa só o preço de 6a
    assert S.is_falling_knife(-3.0, -20.0, 6.0, is_tatico=True) is False
    assert S.is_falling_knife(10.0, 5.0, -2.0, is_tatico=True) is True
    # sem dado real (BR): fallback no CAGR de preço de 6a
    assert S.is_falling_knife(None, None, -1.0) is True
    assert S.is_falling_knife(None, None, 5.0) is False


def test_momentum_blend_range():
    m, bd = S.compute_momentum(slow_stoch_weekly=15, discount_from_top=-10,
                               reversal_confirmation=1, distance_ma200=-5)
    assert 0 <= m <= 100
    assert "stoch_lento_semanal" in bd


# ───────── unidades de fundamentos: roe/fcf_yield devem sair FRAÇÃO (regressão) ─────────
# Bug Fase 3: roe e fcf_yield eram gravados como % (ex 25, 8) enquanto o score
# (score_fundamental_health) usa roe>=0.20 / fcf>=0.08 (FRAÇÃO) → pontuavam ~100
# SEMPRE, neutralizando o sinal. Trava a unidade na origem (cada provider).
from app.services import fundamentals_provider as F


def test_fundamentals_roe_fcf_are_fractions(monkeypatch):
    # brapi: returnOnEquity e freeCashflow/marketCap nativos = fração
    monkeypatch.setenv("BRAPI_TOKEN", "x")
    monkeypatch.setattr(F, "_http_json", lambda url: {"results": [{
        "financialData": {"returnOnEquity": 0.25, "debtToEquity": 1.2, "freeCashflow": 8e9},
        "defaultKeyStatistics": {"dividendYield": 0.06},
        "marketCap": 1e11,
    }]})
    b = F._from_brapi("PETR4.SA")
    assert b["roe"] is not None and abs(b["roe"] - 0.25) < 1e-6        # fração, não 25
    assert b["fcf_yield"] is not None and abs(b["fcf_yield"] - 0.08) < 1e-6   # 8e9/1e11
    assert abs(b["dividend_yield"] - 6.0) < 1e-6                       # DY continua em % (de propósito)

    # finnhub: roeTTM nativo = % (ex 25) → ÷100 = fração
    monkeypatch.setenv("FINNHUB_API_KEY", "x")
    monkeypatch.setattr(F, "_http_json", lambda url: {"metric": {
        "roeTTM": 25.0, "roicTTM": 18.0, "payoutRatioTTM": 40.0}})
    fh = F._from_finnhub("AAPL")
    assert abs(fh["roe"] - 0.25) < 1e-6
    assert abs(fh["roic"] - 0.18) < 1e-6
    assert abs(fh["payout_ratio"] - 0.40) < 1e-6

    # fmp: returnOnEquityTTM e freeCashFlowYieldTTM nativos = fração
    monkeypatch.setenv("FMP_API_KEY", "x")
    monkeypatch.setattr(F, "_http_json", lambda url: [{
        "returnOnEquityTTM": 0.25, "freeCashFlowYieldTTM": 0.09,
        "payoutRatioTTM": 0.40, "roicTTM": 0.18, "debtEquityRatioTTM": 1.2}])
    fm = F._from_fmp("AAPL")
    assert abs(fm["roe"] - 0.25) < 1e-6
    assert abs(fm["fcf_yield"] - 0.09) < 1e-6


def test_fundamental_score_discriminates_on_roe():
    # Com a unidade certa (fração), roe alto pontua mais que roe baixo (sinal volta a discriminar).
    hi = S.score_fundamental_health(payout_ratio=None, debt_to_equity=None, roe=0.25)
    lo = S.score_fundamental_health(payout_ratio=None, debt_to_equity=None, roe=0.05)
    assert hi > lo


# ───────── stress: liquidação pela regra QUANTFURY + mínima intradiária (regressão) ─────────
# Quantfury liquida quando a PERDA = equity (~-100%, com buffer de slippage → -97%), checado na
# MÍNIMA do dia (gap/intraday é irreversível) — NÃO na "margem de manutenção -85%" (corretora
# tradicional, que a Quantfury não tem). Trava o modelo de cauda discutido com o usuário.
def test_stress_liquidation_quantfury_and_intraday(monkeypatch):
    from app.services import ranking_service as R

    base = dt.date(2020, 2, 3)
    def mkser(close_t, low_t=None):
        out = []
        for i in range(70):
            d = base + dt.timedelta(days=i)
            c = 100.0 if d != dt.date(2020, 3, 16) else close_t
            lo = (low_t if (d == dt.date(2020, 3, 16) and low_t) else c)
            out.append((d, c, min(lo, c)))
        return out

    monkeypatch.setattr(R, "_chart_api_df", lambda tk, days, want_div=False: (tk, None))
    def run(close_t, low_t, notional):
        monkeypatch.setattr(R, "_dated_close_low", lambda df: mkser(close_t, low_t))
        res = P._stress_scenarios(
            [{"ticker": "X", "notional": float(notional), "distance_ma200": None}],
            1000.0, float(notional),
        )
        return [r for r in res if "COVID" in r["scenario"]][0]

    # Mínima intradiária -26% liquida (eq -104%) mesmo com fechamento -20% recuperado (eq -80%).
    c1 = run(80.0, 74.0, 4000)   # L=4
    assert c1["liquidated"] is True and c1["equity_pct"] > -85
    # Fechamento -22% (eq -88%): sob -85 velho liquidaria; pela regra Quantfury (-97%) NÃO.
    assert run(78.0, None, 4000)["liquidated"] is False
    # Regra Quantfury exata: 4x liquida a -25% do ativo (= -100% equity).
    assert run(75.0, None, 4000)["liquidated"] is True
