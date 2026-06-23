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


def test_quality_blend_etf_renormalizes_fundamentals_out():
    # ETF/commodity NAO sao empresas -> fundamentals_apply=False: o termo "fundamentos" SAI do
    # breakdown e os pesos RENORMALIZAM (nao ancora num 50 falso). Para um ativo com componentes
    # altos, tirar o 50 falso SOBE a nota. Acao (apply=True) mantem o termo neutro.
    q_etf, bd_etf = S.compute_quality_blend(beta=0.55, max_dd_pct=-10, dividend_yield=8,
                                            sharpe=1.2, momentum=55, fundamentals_apply=False)
    q_stock, bd_stock = S.compute_quality_blend(beta=0.55, max_dd_pct=-10, dividend_yield=8,
                                                sharpe=1.2, momentum=55, fundamentals_apply=True)
    assert "fundamentos" not in bd_etf      # ETF: termo removido
    assert "fundamentos" in bd_stock        # acao: termo mantido (50 neutro)
    assert q_etf > q_stock                  # sem a ancora 50 falsa, ETF bom sobe
    assert 0 <= q_etf <= 100


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


# ───────── Simulador fiel à ESTRATÉGIA MASTER (ADC) — #4 passo 2 ─────────
# O Monte Carlo deixou de alavancar o PATRIMÔNIO via linspace e passou a seguir a
# doutrina: aporte inicial SEM alavancagem, fluxos novos alavancados com dívida FIXA
# (→ desalavancagem natural), stop escalonado e reserva SHY. Trava o comportamento.
from app.quantitative import monte_carlo as MC


def test_adc_sim_regime_leverage_ladder():
    # topo protege (menor), capitulação ataca (teto do perfil)
    assert MC._regime_leverage(0.0, 3.0)[1] == "topo"
    assert MC._regime_leverage(-0.50, 3.0) == (3.0, "capitulacao")
    topo = MC._regime_leverage(0.0, 3.0)[0]
    cap = MC._regime_leverage(-0.50, 3.0)[0]
    assert topo < cap  # topo menos alavancado que capitulação


def test_adc_sim_initial_flow_unlevered_and_natural_deleverage():
    # vale (alavanca os fluxos) seguido de recuperação (desalavanca sozinho)
    rets = np.concatenate([np.full(8, -0.06), np.full(40, 0.02)])
    path, ruined, lev = MC.simulate_portfolio(
        1000.0, 200.0, rets, 3.0, 0.02, 0.03, 48, drip=True)
    assert lev[0] == 1.0                 # aporte inicial entra SEM alavancagem
    assert max(lev) > lev[0]             # fluxos no vale criam alavancagem
    assert max(lev) > lev[-1]            # desalavancagem natural na recuperação
    assert path[-1] > 0 and not ruined


def test_adc_sim_run_monte_carlo_measured_leverage_shape():
    import pandas as pd
    np.random.seed(11)
    idx = pd.date_range("2010-01-01", periods=1260, freq="B")
    prices = pd.Series(100 * np.cumprod(1 + np.random.normal(0.0004, 0.012, 1260)), index=idx)
    res = MC.run_monte_carlo(prices, 1000.0, 100.0, horizon_years=5,
                             risk_profile="balanced", n_simulations=120, drip=True)
    le = res["leverage_evolution"]
    assert le[0]["leverage"] == 1.0     # medida começa em 1.0 (base sem alavancagem)
    assert all(p["leverage"] >= 1.0 for p in le)  # alavancagem medida nunca < 1
    # shape do contrato com o frontend preservado
    for k in ("leverage_evolution", "dividend_accumulation", "contribution_breakdown",
              "percentiles", "scenarios", "ruin_probability"):
        assert k in res


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


def test_br_fundamentals_fmp_fallback_fills_gaps(monkeypatch):
    # Ramo .SA: brapi (free) NAO traz roe/roic/fcf -> get_fundamentals deve cair no FMP
    # e preencher as lacunas em FRACAO (sem /100 duplo). Trava a via FMP-para-BR.
    F._CACHE.clear()  # TTL ~6h: garante que nao volte cache velho
    monkeypatch.setenv("BRAPI_TOKEN", "x")
    monkeypatch.setenv("FMP_API_KEY", "x")

    def fake_http(url):
        # brapi: results/financialData; FMP ratios-ttm: lista [{...TTM...}]
        if "brapi.dev" in url:
            # brapi traz so dividend_yield e debt_to_equity; roe/roic/fcf ausentes (None)
            return {"results": [{
                "financialData": {"debtToEquity": 1.5},
                "defaultKeyStatistics": {"dividendYield": 0.07},
            }]}
        if "financialmodelingprep.com" in url:
            # FMP devolve roe/roic/fcf em FRACAO (ja e o contrato)
            return [{
                "returnOnEquityTTM": 0.25, "roicTTM": 0.18,
                "freeCashFlowYieldTTM": 0.09, "payoutRatioTTM": 0.40}]
        return None

    monkeypatch.setattr(F, "_http_json", fake_http)

    r = F.get_fundamentals("ABCD9.SA")  # ticker fora do cache
    # roe/roic/fcf vieram pela via FMP, em FRACAO (nao 25/18/9)
    assert r["roe"] is not None and abs(r["roe"] - 0.25) < 1e-6
    assert r["roic"] is not None and abs(r["roic"] - 0.18) < 1e-6
    assert r["fcf_yield"] is not None and abs(r["fcf_yield"] - 0.09) < 1e-6
    assert r["payout_ratio"] is not None and abs(r["payout_ratio"] - 0.40) < 1e-6
    # brapi NAO foi sobrescrito: dividend_yield em % (0.07 -> 7.0) e D/E multiplo
    assert abs(r["dividend_yield"] - 7.0) < 1e-6
    assert abs(r["debt_to_equity"] - 1.5) < 1e-6
    assert "fmp" in (r["source"] or "")


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


# ───────── simulador usa a fonte chart do Ranking (urllib), nao yfinance ─────────
# Bug de producao: _build_portfolio_close buscava preco via yfinance (bloqueado no
# Render) → 400 "Nenhum dado encontrado" p/ TODOS os tickers. Agora a fonte PRIMARIA
# e a Yahoo chart API / Stooq via urllib (mesma do Ranking, que funciona em prod),
# com yfinance so como ultimo fallback. Trava a origem do preco no simulador.
import pandas as pd
import pytest
from fastapi import HTTPException
from app.api.v1 import simulator as SIM


def _fake_close_df(n=300):
    idx = pd.date_range("2018-01-01", periods=n, freq="B")
    vals = np.linspace(100.0, 200.0, n)
    return pd.DataFrame({"Close": vals, "High": vals, "Low": vals}, index=idx)


def test_simulator_uses_chart_api_source(monkeypatch):
    # fonte chart devolve (df, None) → serie nao-vazia, SEM tocar em yfinance
    monkeypatch.setattr(SIM, "_chart_api_df",
                        lambda tk, days, want_div=False: (_fake_close_df(), None))
    def _boom(*a, **k):
        raise AssertionError("fetch_price_history (yfinance) NAO deveria ser chamado")
    monkeypatch.setattr(SIM, "fetch_price_history", _boom)
    s = SIM._build_portfolio_close(["FAKE"])
    assert s is not None and len(s) >= 252
    assert s.name == "FAKE"


def test_simulator_raises_400_when_all_sources_empty(monkeypatch):
    # chart vazio E yfinance vazio → 400 (sem dado sintetico, comportamento preservado)
    monkeypatch.setattr(SIM, "_chart_api_df",
                        lambda tk, days, want_div=False: (None, None))
    monkeypatch.setattr(SIM, "fetch_price_history", lambda tk, period: None)
    with pytest.raises(HTTPException) as ei:
        SIM._build_portfolio_close(["FAKE"])
    assert ei.value.status_code == 400
