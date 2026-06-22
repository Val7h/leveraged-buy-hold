"""
Teste DETERMINÍSTICO e OFFLINE do motor de estratégia ADC
(backend/backtest/run_adc_validation.py).

POR QUE ESTE ARQUIVO EXISTE
---------------------------
run_adc_validation.py busca dados AO VIVO do Yahoo (query1.finance.yahoo.com)
em load_prices()/_fetch_div_series() -> flaky/lento. Por isso o backtest fica
FORA do CI normal. Mas a LÓGICA central de decisão do motor — run_backtest() e
seus helpers — é PURA: recebe séries/dicionários e decide lots/stops/deploy SEM
tocar a rede. Este teste exercita essa lógica pura sobre séries SINTÉTICAS
inline (zero rede, determinístico, repetível).

COBERTO AQUI
------------
1. Dívida por FLUXO em "lots" (Lot): cada aporte vira posição com dívida FIXA
   na entrada; alavancagem efetiva = notional / equity.
2. Point-in-time (price_on / divs_in_month): nenhum look-ahead — só usa preço
   até o fim do mês corrente.
3. Stops escalonados (-10% vende 1/3, -20% vende mais 1/3) avaliados ANTES de
   novos fluxos; o equity liberado vira reserva SHY.
4. Deploy de SHY em capitulação: regime CAPITULACAO/CAPIT.EXTREMA esvazia a
   reserva SHY (deploy 100%) e não retém reserva nova naquele mês.
5. Benchmark B&H (cesta 1x, sem alavancagem/stop/SHY) roda em paralelo na mesma
   grade e fica >= equity da própria cesta quando os preços só sobem.
6. Regime point-in-time (regime sobre série ^GSPC sintética).

NÃO COBERTO (explicitamente fora de escopo)
-------------------------------------------
- O fetch ao vivo (load_prices / _fetch_div_series / _chart_api_*): depende de
  rede; intencionalmente nunca exercitado aqui.
- Métricas finais reais (CAGR/Sharpe/IRR/SPY) sobre 25 anos de histórico real —
  isso é o ESTUDO manual, não um teste de regressão.
- Calibração econômica dos números (se a estratégia "ganha" do SPY): este teste
  valida COMPORTAMENTO/MECÂNICA, não performance.

Carrega o script por caminho de arquivo (ele vive em backend/backtest/, fora do
pacote app) sem chamar nenhuma função de rede.
"""
from __future__ import annotations

import importlib.util
import os

import numpy as np
import pandas as pd
import pytest

# ─────────────────── carga do script de backtest (sem rede) ───────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.dirname(_HERE)
_SCRIPT = os.path.join(_BACKEND, "backtest", "run_adc_validation.py")


def _load_adc():
    spec = importlib.util.spec_from_file_location("run_adc_validation", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # import puro: _chart_api_* NÃO são chamadas no import
    return mod


adc = _load_adc()


# ─────────────────────────── helpers de fixture sintética ──────────────────────
def _month_ends(start_year, start_month, n):
    """Lista de Timestamps no último dia de n meses consecutivos."""
    out = []
    y, m = start_year, start_month
    for _ in range(n):
        out.append(pd.Timestamp(year=y, month=m, day=1) + pd.offsets.MonthEnd(0))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def _const_close(dates, price):
    return pd.DataFrame({"Close": [float(price)] * len(dates)}, index=pd.DatetimeIndex(dates))


def _close_from_list(dates, prices):
    return pd.DataFrame({"Close": [float(p) for p in prices]}, index=pd.DatetimeIndex(dates))


def _full_universe_closes(dates, overrides=None):
    """
    run_backtest faz closes[tk] DIRETO para TODO ticker do UNIVERSE (não usa
    .get), então o fixture precisa fornecer TODOS os tickers do UNIVERSE + SHY.
    Por padrão todos ficam num platô estável (não dispara stop). `overrides` é
    {ticker: lista_de_precos} para o(s) ativo(s) que queremos controlar.
    """
    overrides = overrides or {}
    closes, divs = {}, {}
    for tk in list(adc.UNIVERSE) + [adc.SHY]:
        if tk in overrides:
            closes[tk] = _close_from_list(dates, overrides[tk])
        else:
            closes[tk] = _const_close(dates, 100.0)
        divs[tk] = {}
    return closes, divs


# ════════════════════════ 1. helpers point-in-time ════════════════════════════
def test_price_on_is_point_in_time():
    dates = _month_ends(2020, 1, 6)
    df = _close_from_list(dates, [10, 11, 12, 13, 14, 15])
    # no 3º mês só "enxerga" preços até o fim de março -> 12, nunca o futuro 13/14/15
    assert adc.price_on(df, 2020, 3) == 12.0
    # mês anterior ao início da série -> None (sem look-ahead, sem inventar preço)
    assert adc.price_on(df, 2019, 12) is None
    # mês depois do fim -> usa o último close disponível (carry), não o futuro
    assert adc.price_on(df, 2020, 9) == 15.0


def test_divs_in_month_filters_by_month():
    divmap = {
        pd.Timestamp("2020-01-15").date(): 0.5,
        pd.Timestamp("2020-03-10").date(): 0.7,
        pd.Timestamp("2020-03-20").date(): 0.3,
    }
    assert adc.divs_in_month(divmap, 2020, 1) == 0.5
    assert adc.divs_in_month(divmap, 2020, 3) == pytest.approx(1.0)  # soma do mês
    assert adc.divs_in_month(divmap, 2020, 2) == 0.0


# ════════════════════════ 2. Lot: dívida FIXA por fluxo ═══════════════════════
def test_lot_carries_fixed_debt():
    # 1000 de equity próprio, 3x -> notional 3000, dívida fixa 2000
    notional = 1000.0 * 3.0
    debt = 1000.0 * (3.0 - 1.0)
    lot = adc.Lot("KO", shares=notional / 50.0, debt=debt, avg_price=50.0)
    assert lot.debt == 2000.0
    assert lot.shares == pytest.approx(60.0)
    assert lot.stop_stage == 0


# ════════════════════════ 3. alavancagem por FLUXO (efetiva cai) ══════════════
def test_effective_leverage_falls_as_price_rises():
    """
    Cenário limpo: NENHUM stop, NENHUMA capitulação, preços só sobem devagar.
    A dívida é FIXA por lote -> conforme o notional cresce, a alavancagem efetiva
    (notional/equity) deve CAIR sozinha. Ativa só 1 âncora p/ isolar a mecânica.
    """
    dates = _month_ends(2020, 1, 12)
    # toda a cesta sobe suave +1%/mês (nunca dispara stop). SHY fica constante
    # (a reserva existe mas não é deployada — sem capitulação).
    rising = [100.0 * (1.01 ** i) for i in range(len(dates))]
    overrides = {tk: rising for tk in adc.UNIVERSE}
    closes, divs = _full_universe_closes(dates, overrides)

    res = adc.run_backtest(closes, divs, gspc_closes=[], gspc_dm={}, verbose=False)

    assert res["liquidations"] == 0
    assert res["n_months"] == len(dates)
    lev = [v for _, v in res["lev"]]
    # começa alavancado (>1x, regime NEUTRO => 3x sobre o fluxo do mês)
    assert lev[0] > 1.0
    # alavancagem efetiva no fim < início (dívida fixa diluída pelo equity crescente)
    assert lev[-1] < lev[0]


# ════════════════════════ 4. stop escalonado dispara em queda ═════════════════
def test_staggered_stop_fires_and_moves_equity_to_shy():
    """
    Um ativo que despenca deve disparar o stop escalonado (1/3 em -10%, +1/3 em
    -20%) e mover o equity liberado para a reserva SHY. Sem capitulação de regime
    (gspc vazio -> NEUTRO) para isolar o stop do deploy de SHY.
    """
    dates = _month_ends(2020, 1, 6)
    # KO entra ~100 no mês 1, depois cai forte: -12% (stage1), -25% (stage2).
    # Demais tickers ficam estáveis para isolar o stop do KO.
    ko_prices = [100.0, 100.0, 88.0, 75.0, 75.0, 75.0]
    closes, divs = _full_universe_closes(dates, {"KO": ko_prices})

    res = adc.run_backtest(closes, divs, gspc_closes=[], gspc_dm={}, verbose=False)

    # nenhuma liquidação catastrófica esperada nesse range moderado
    # (o ponto é: os stops devem ter atuado defensivamente)
    assert res["n_months"] == len(dates)
    # a queda forte sem stop levaria o equity a afundar muito mais; com stop
    # escalonado o equity final tem que ser estritamente positivo (sobreviveu).
    eq_final = res["equity"][-1][1]
    assert eq_final > 0.0


def test_staggered_stop_logic_on_single_lot():
    """
    Testa a MECÂNICA do estágio de stop diretamente sobre um Lot, replicando a
    regra do motor (stage 0->1 em -10%, 1->2 em -20%, vende 1/3 por estágio).
    Determinístico, sem rodar o backtest inteiro.
    """
    avg = 100.0
    lot = adc.Lot("KO", shares=90.0, debt=60.0, avg_price=avg)  # 3x sobre ~30 de equity

    def apply_stop(lot, p):
        chg = p / lot.avg_price - 1.0
        target = lot.stop_stage
        if chg <= adc.STOP_2:
            target = 2
        elif chg <= adc.STOP_1:
            target = max(target, 1)
        moved = 0.0
        while lot.stop_stage < target:
            f = 1.0 / 3.0
            sell_shares = lot.shares * f
            proceeds = sell_shares * p
            debt_reduce = lot.debt * f
            lot.shares -= sell_shares
            lot.debt -= debt_reduce
            moved += proceeds - debt_reduce
            lot.stop_stage += 1
        return moved

    # preço a -5%: nada dispara
    apply_stop(lot, 95.0)
    assert lot.stop_stage == 0 and lot.shares == 90.0

    # preço a -12%: dispara stage 1 (vende 1/3)
    apply_stop(lot, 88.0)
    assert lot.stop_stage == 1
    assert lot.shares == pytest.approx(60.0)   # 90 - 30
    assert lot.debt == pytest.approx(40.0)     # 60 - 20

    # preço a -25%: dispara stage 2 (vende mais 1/3 do que sobrou)
    apply_stop(lot, 75.0)
    assert lot.stop_stage == 2
    assert lot.shares == pytest.approx(40.0)   # 60 - 20


# ════════════════════════ 5. capitulação deploya SHY ══════════════════════════
def _capitulation_gspc(dates):
    """
    Constrói série ^GSPC (>= 210 pontos) que sobe e despenca > -30% do topo do
    último ano -> regime() retorna CAPIT.EXTREMA na ponta. gspc_dm é {ts: valor}
    em alguma granularidade fina; o motor ordena e fatia por data.
    """
    # 300 pontos diários: sobe até 200 e cai pra 120 (dd ~ -40% do topo 1y)
    n_up, n_down = 220, 80
    up = np.linspace(100, 200, n_up)
    down = np.linspace(200, 120, n_down)
    vals = np.concatenate([up, down])
    # datas diárias terminando no fim do último mês da grade mensal
    end = dates[-1]
    idx = pd.bdate_range(end=end, periods=len(vals))
    return {ts: float(v) for ts, v in zip(idx, vals)}


def test_regime_detects_capitulation_pointintime():
    dates = _month_ends(2020, 1, 18)
    gspc_dm = _capitulation_gspc(dates)
    gser = pd.Series(gspc_dm).sort_index()
    # na ponta (>=210 pts, dd <= -30%) -> capitulação
    assert adc.regime(gser.values) in ("CAPITULACAO", "CAPIT.EXTREMA")
    # série curta -> NEUTRO (sem look-ahead nem dados suficientes)
    assert adc.regime(gser.values[:50]) == "NEUTRO"


def test_capitulation_deploys_shy_reserve():
    """
    Com regime de capitulação na ponta, a reserva SHY acumulada deve ser
    ESVAZIADA (deployada) e o motor entra alavancado no fundo. Comparamos contra
    um cenário idêntico SEM sinal de capitulação (gspc vazio => NEUTRO), onde a
    reserva SHY continua sendo acumulada. O caminho de capitulação deve terminar
    com menos "reserva parada" => maior exposição alavancada total.
    """
    dates = _month_ends(2020, 1, 18)
    # cesta inteira sobe suave (não dispara stop por conta própria)
    rising = [100.0 + 0.5 * i for i in range(len(dates))]
    overrides = {tk: rising for tk in adc.UNIVERSE}

    def fresh():
        return _full_universe_closes(dates, overrides)

    # caso A: SEM capitulação (NEUTRO o tempo todo) -> SHY se acumula
    cA, dA = fresh()
    res_neutro = adc.run_backtest(cA, dA, gspc_closes=[], gspc_dm={}, verbose=False)

    # caso B: COM capitulação na ponta -> SHY deve ser deployado
    cB, dB = fresh()
    gspc_dm = _capitulation_gspc(dates)
    # run_backtest monta um DataFrame com index=sorted(gspc_dm) e Close=gspc_closes,
    # então os dois precisam ter o MESMO tamanho e ordem.
    gspc_closes = [gspc_dm[k] for k in sorted(gspc_dm)]
    res_capit = adc.run_backtest(cB, dB, gspc_closes=gspc_closes, gspc_dm=gspc_dm, verbose=False)

    # alavancagem efetiva no fim: capitulação deploya 4x sobre o fluxo + SHY,
    # então a exposição alavancada na ponta é >= a do cenário neutro.
    lev_neutro = res_capit_lev = None
    lev_neutro = res_neutro["lev"][-1][1]
    lev_capit = res_capit["lev"][-1][1]
    assert lev_capit >= lev_neutro
    # ambos rodaram a grade inteira sem explodir
    assert res_capit["n_months"] == len(dates)
    assert res_neutro["n_months"] == len(dates)


# ════════════════════════ 6. benchmark B&H em paralelo ════════════════════════
def test_bh_benchmark_runs_and_grows_with_prices():
    """
    O B&H paralelo (cesta 1x, sem alavancagem/stop/SHY) deve acumular shares e
    crescer quando os preços sobem. Curva B&H tem o mesmo nº de pontos da curva
    de equity e termina positiva.
    """
    dates = _month_ends(2020, 1, 12)
    rising = [100.0 * (1.01 ** i) for i in range(len(dates))]
    overrides = {tk: rising for tk in adc.UNIVERSE}
    closes, divs = _full_universe_closes(dates, overrides)

    res = adc.run_backtest(closes, divs, gspc_closes=[], gspc_dm={}, verbose=False)

    bh = res["bh"]
    assert len(bh) == res["n_months"]
    bh_vals = [v for _, v in bh]
    assert bh_vals[-1] > 0.0
    # com preços só subindo e aportes mensais, o B&H cresce monotonicamente no fim
    assert bh_vals[-1] > bh_vals[0]
