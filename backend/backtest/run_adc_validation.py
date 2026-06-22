"""
BACKTEST POINT-IN-TIME — Estrategia "Alavancagem Dinamica Composta" (ADC) do LBH.

ESTUDO DE VALIDACAO: roda de verdade (rede) e reporta numeros via `python run_adc_validation.py`.
COMMITADO (Fase 3-E) como ALVO do teste offline determinístico do CI
(backend/tests/test_adc_backtest_offline.py exercita as funcoes PURAS daqui SEM rede;
o fetch ao vivo so roda sob o guard `if __name__ == "__main__"`, nunca no import/CI).

MODELAGEM CORRETA (corrige o erro do passado):
  - Alavancagem e sobre FLUXOS NOVOS, com DIVIDA FIXA por fluxo na entrada.
  - A divida NAO e re-marginada no equity crescente -> alavancagem efetiva CAI sozinha.

Reaproveita o fetch confiavel (Yahoo chart API) e a logica de regime() do app.
"""
from __future__ import annotations
import sys, os, math, datetime as dt
import numpy as np
import pandas as pd

# importa o servico de producao p/ reaproveitar fetch + regime
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.services.ranking_service import _chart_api_df, _chart_api_series, regime, MULT

# ───────────────────────── UNIVERSO (cesta curada) ─────────────────────────
# pesos-alvo por bucket: Ancoras 55% / Geradores 30% / Aceleradores 15% (SHY a parte)
UNIVERSE = {
    # ticker: (bucket, peso_relativo_dentro_do_bucket)
    "SCHD":      ("ANCORA",     1.0),
    "KO":        ("ANCORA",     1.0),
    "PG":        ("ANCORA",     1.0),
    "JNJ":       ("ANCORA",     1.0),
    "TAEE11.SA": ("ANCORA",     1.0),
    "O":         ("GERADOR",    1.0),
    "BBSE3.SA":  ("GERADOR",    1.0),
    "V":         ("ACELERADOR", 1.0),
    "MA":        ("ACELERADOR", 1.0),
    "ITSA4.SA":  ("ACELERADOR", 1.0),
}
BUCKET_TARGET = {"ANCORA": 0.55, "GERADOR": 0.30, "ACELERADOR": 0.15}
SHY = "SHY"

# parametros da estrategia
INITIAL_CAPITAL = 10_000.0
MONTHLY_FLOW    = 1_000.0
DIV_LEVERAGE    = 3.0      # dividendos reinvestidos alavancados 3x fixo
SHY_TARGET      = 0.20     # 20% do fluxo vai p/ SHY como reserva de ataque (fora dos 100% de RV)
STOP_1          = -0.10    # -10% do preco medio -> vende 1/3
STOP_2          = -0.20    # -20% -> vende mais 1/3
MAINT_MARGIN    = 0.15     # equity <= 15% do notional -> liquidacao (equity/notional <= 0.15)
SHY_ANNUAL_YIELD = 0.025   # rendimento ~ T-bill curto (proxy fixo conservador)

FETCH_DAYS = int(25 * 366)


# ───────────────────────── carga de dados ─────────────────────────
def load_prices():
    """{ticker: DataFrame[Close] mensal-fim} e dict de dividendos mensais por ticker."""
    closes = {}
    divs = {}
    failed = []
    for tk in list(UNIVERSE) + [SHY]:
        df, _dy = _chart_api_df(tk, FETCH_DAYS, want_div=True)
        if df is None or len(df) < 200:
            failed.append(tk)
            continue
        # serie diaria -> usaremos resample mensal (fim do mes)
        df = df[["Close"]].copy()
        df.index = pd.to_datetime(df.index)
        closes[tk] = df
        # dividendos: extrai do raw chart de novo (chart_api_df nao retorna o dict completo)
        divs[tk] = _fetch_div_series(tk)
    return closes, divs, failed


def _fetch_div_series(tk):
    """{date: amount} de dividendos via chart API (mesma fonte)."""
    import urllib.request as u, ssl, json, time
    ctx = ssl.create_default_context()
    ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    try:
        end = int(time.time()); start = end - FETCH_DAYS * 86400
        url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{tk}"
               f"?period1={start}&period2={end}&interval=1d&events=div")
        req = u.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with u.urlopen(req, timeout=30, context=ctx) as r:
            d = json.loads(r.read())
        evs = (d["chart"]["result"][0].get("events") or {}).get("dividends") or {}
        out = {}
        for k, v in evs.items():
            ts = int(v.get("date", k))
            day = dt.datetime.utcfromtimestamp(ts).date()
            out[day] = out.get(day, 0.0) + float(v.get("amount", 0) or 0)
        return out
    except Exception:
        return {}


def monthly_grid(closes):
    """grade mensal comum (ultimo pregao de cada mes) + serie ^GSPC diaria p/ regime."""
    # uniao de todas as datas
    all_idx = None
    for df in closes.values():
        all_idx = df.index if all_idx is None else all_idx.union(df.index)
    # grade mensal: ultimo dia de cada (ano,mes) presente
    months = sorted(set((d.year, d.month) for d in all_idx))
    return months


def price_on(df, year, month):
    """ultimo close ATE o fim daquele mes (point-in-time, sem look-ahead)."""
    end = pd.Timestamp(year=year, month=month, day=1) + pd.offsets.MonthEnd(0)
    sub = df[df.index <= end]
    if len(sub) == 0:
        return None
    return float(sub["Close"].iloc[-1])


def divs_in_month(divmap, year, month):
    """soma de dividendos pagos naquele mes."""
    return sum(a for d, a in divmap.items() if d.year == year and d.month == month)


# ───────────────────────── motor do backtest ─────────────────────────
class Lot:
    """um fluxo alavancado = posicao com DIVIDA FIXA na entrada."""
    __slots__ = ("ticker", "shares", "debt", "avg_price", "stop_stage", "_residual")
    def __init__(self, ticker, shares, debt, avg_price):
        self.ticker = ticker
        self.shares = shares
        self.debt = debt            # divida FIXA (nao re-marginada)
        self.avg_price = avg_price
        self.stop_stage = 0
        self._residual = 0.0


def run_backtest(closes, divs, gspc_closes, gspc_dm, verbose=False):
    months = monthly_grid(closes)
    # comeca quando ha >=1 ativo com preco; ativa cada ativo conforme tem historico (point-in-time)
    lots = []                 # lista de Lot abertos
    shy_value = 0.0           # valor em SHY (reserva)
    liquidations = 0
    cash = 0.0                # caixa residual (raro)
    initial_done = False

    # series p/ metricas
    equity_curve = []         # (date, equity)
    lev_curve = []            # (date, alavancagem efetiva)
    bh_curve = []             # B&H sem alavancagem da mesma cesta

    # B&H paralelo: mesmas datas/fluxos, sem alavancagem, sem SHY, sem stop
    bh_shares = {}            # ticker -> shares
    bh_cash = 0.0

    # data->indice no gspc p/ regime point-in-time
    gspc_df = pd.DataFrame({"Close": gspc_closes}, index=pd.to_datetime(
        [pd.Timestamp(d) for d in sorted(gspc_dm)]))
    gspc_df = gspc_df.sort_index()
    gspc_series = None
    if gspc_dm:
        gser = pd.Series({pd.Timestamp(k): v for k, v in gspc_dm.items()}).sort_index()
        gspc_series = gser

    def regime_at(year, month):
        if gspc_series is None:
            return "NEUTRO"
        end = pd.Timestamp(year=year, month=month, day=1) + pd.offsets.MonthEnd(0)
        sub = gspc_series[gspc_series.index <= end]
        if len(sub) < 210:
            return "NEUTRO"
        return regime(sub.values)

    def active_tickers(year, month):
        out = []
        for tk in UNIVERSE:
            if price_on(closes[tk], year, month) is not None:
                out.append(tk)
        return out

    def notional_and_equity(year, month):
        """notional bruto (valor de mercado das posicoes), divida total, equity."""
        notional = 0.0
        debt = 0.0
        for lot in lots:
            p = price_on(closes[lot.ticker], year, month)
            if p is None:
                continue
            notional += lot.shares * p
            debt += lot.debt
        eq = notional - debt + shy_value + cash
        return notional, debt, eq

    # achar primeiro mes com algum ativo
    start_i = 0
    for i, (y, m) in enumerate(months):
        if active_tickers(y, m):
            start_i = i
            break

    for (y, m) in months[start_i:]:
        reg = regime_at(y, m)
        mult = float(MULT.get(reg, 3))
        acts = active_tickers(y, m)
        if not acts:
            continue

        # ── 1. STOP escalonado de sobrevivencia (avalia ANTES de novos fluxos) ──
        for lot in lots:
            p = price_on(closes[lot.ticker], y, m)
            if p is None:
                continue
            chg = p / lot.avg_price - 1.0
            # escalonado: stage 0->1 em -10%, 1->2 em -20%
            target_stage = lot.stop_stage
            if chg <= STOP_2:
                target_stage = 2
            elif chg <= STOP_1:
                target_stage = max(target_stage, 1)
            while lot.stop_stage < target_stage:
                # vende 1/3 das shares ORIGINAIS restantes neste lote (1/3 por estagio)
                sell_frac = 1.0 / 3.0
                sell_shares = lot.shares * sell_frac
                proceeds = sell_shares * p
                # reduz divida proporcionalmente a fracao vendida da posicao
                debt_reduce = lot.debt * sell_frac
                lot.shares -= sell_shares
                lot.debt -= debt_reduce
                # o caixa liberado abate a divida primeiro (proceeds cobre debt_reduce);
                # sobra (equity liberado) vai p/ caixa/reserva SHY
                residual = proceeds - debt_reduce
                # equity liberado pelo stop vira reserva (pos-stop = defensivo)
                lot._residual += residual
                lot.stop_stage += 1

        # coleta residuais dos stops -> SHY
        for lot in lots:
            if lot._residual:
                shy_value += lot._residual
                lot._residual = 0.0
        lots = [l for l in lots if l.shares > 1e-9]

        # ── 2. LIQUIDACAO: equity da carteira <= maint margin do notional ──
        notional, debt, eq = notional_and_equity(y, m)
        if notional > 0 and (eq - shy_value - cash) <= MAINT_MARGIN * notional:
            # equity das posicoes alavancadas afundou ate a margem -> evento
            liquidations += 1
            if verbose:
                print(f"  !! LIQUIDACAO em {y}-{m:02d}: eq_pos={(eq-shy_value-cash):.0f} "
                      f"notional={notional:.0f} ratio={(eq-shy_value-cash)/notional:.2%}")
            # zera posicoes alavancadas (margin call), preserva SHY
            lots = []

        # ── 3. dividendos recebidos -> reinvestidos alavancados 3x ──
        div_cash = 0.0
        for lot in list(lots):
            dm = divs.get(lot.ticker, {})
            d_ps = divs_in_month(dm, y, m)
            if d_ps > 0:
                div_cash += lot.shares * d_ps
        # reinveste dividendos em SCHD (ancora liquida) alavancado 3x
        if div_cash > 0:
            tk = "SCHD" if "SCHD" in acts else acts[0]
            p = price_on(closes[tk], y, m)
            if p:
                notional_buy = div_cash * DIV_LEVERAGE
                shares = notional_buy / p
                debt_new = div_cash * (DIV_LEVERAGE - 1.0)
                lots.append(Lot(tk, shares, debt_new, p))

        # ── 4. fluxo do mes (inicial + aporte mensal) ──
        flow = MONTHLY_FLOW + (INITIAL_CAPITAL if not initial_done else 0.0)
        initial_done = True

        # parte vai p/ SHY (reserva); em capitulacao, ESVAZIA SHY e deploya 4x
        if reg in ("CAPITULACAO", "CAPIT.EXTREMA"):
            rv_flow = flow                      # nao guarda reserva nova
            deploy_shy = shy_value              # vende toda a reserva
            shy_value = 0.0
        else:
            rv_flow = flow * (1.0 - SHY_TARGET)
            shy_value += flow * SHY_TARGET
            deploy_shy = 0.0

        # aloca rv_flow + deploy_shy nos buckets ativos
        def alloc(amount, leverage):
            if amount <= 0:
                return
            # pesos por bucket entre ativos ATIVOS
            for bucket, w in BUCKET_TARGET.items():
                bucket_tks = [t for t in acts if UNIVERSE[t][0] == bucket]
                if not bucket_tks:
                    continue
                per = amount * w / len(bucket_tks)
                for tk in bucket_tks:
                    p = price_on(closes[tk], y, m)
                    if not p:
                        continue
                    notional_buy = per * leverage
                    shares = notional_buy / p
                    debt_new = per * (leverage - 1.0)
                    lots.append(Lot(tk, shares, debt_new, p))

        alloc(rv_flow, mult)
        # SHY deployado em capitulacao entra a 4x (mult ja e 4 ou 5 em capit)
        alloc(deploy_shy, mult)

        # rende SHY (mensal)
        shy_value *= (1.0 + SHY_ANNUAL_YIELD / 12.0)

        # ── B&H paralelo (mesma cesta, SEM alavancagem, SEM SHY, SEM stop) ──
        bh_flow = MONTHLY_FLOW + (INITIAL_CAPITAL if len(equity_curve) == 0 else 0.0)
        for bucket, w in BUCKET_TARGET.items():
            bucket_tks = [t for t in acts if UNIVERSE[t][0] == bucket]
            if not bucket_tks:
                continue
            per = bh_flow * w / len(bucket_tks)
            for tk in bucket_tks:
                p = price_on(closes[tk], y, m)
                if not p:
                    continue
                bh_shares[tk] = bh_shares.get(tk, 0.0) + per / p
        # dividendos B&H reinvestidos 1x
        for tk in list(bh_shares):
            d_ps = divs_in_month(divs.get(tk, {}), y, m)
            if d_ps > 0:
                p = price_on(closes[tk], y, m)
                if p:
                    bh_shares[tk] += (bh_shares[tk] * d_ps) / p

        # ── snapshot ──
        notional, debt, eq = notional_and_equity(y, m)
        date = pd.Timestamp(year=y, month=m, day=1) + pd.offsets.MonthEnd(0)
        equity_curve.append((date, eq))
        eff_lev = (notional / (notional - debt)) if (notional - debt) > 1e-6 else 1.0
        lev_curve.append((date, eff_lev))
        bh_eq = sum(bh_shares.get(tk, 0.0) * (price_on(closes[tk], y, m) or 0.0) for tk in bh_shares)
        bh_curve.append((date, bh_eq))

    return {
        "equity": equity_curve, "lev": lev_curve, "bh": bh_curve,
        "liquidations": liquidations, "n_months": len(equity_curve),
    }


# ───────────────────────── metricas ─────────────────────────
def metrics(curve, total_contributed):
    dates = [d for d, _ in curve]
    vals = np.array([v for _, v in curve], dtype=float)
    years = (dates[-1] - dates[0]).days / 365.25
    final = vals[-1]
    # CAGR sobre money-weighted: usa equity final vs aportes? -> usamos retorno do equity puro
    # CAGR "do equity" nao e justo c/ aportes; reportamos equity final + total aportado + multiplo
    rm = np.maximum.accumulate(vals)
    mdd = float(np.min((vals - rm) / rm)) * 100
    rets = np.diff(vals) / vals[:-1]
    rets = rets[np.isfinite(rets)]
    sharpe = float(rets.mean() / rets.std() * math.sqrt(12)) if rets.std() > 0 else None
    # IRR aproximado (money-weighted) via solver simples sobre fluxos mensais
    return {
        "final": final, "years": years, "mdd": mdd, "sharpe": sharpe,
        "total_contributed": total_contributed, "multiple": final / total_contributed if total_contributed else None,
    }


def irr_monthly(curve, monthly_flow, initial):
    """TIR mensal -> anualizada. Fluxos: -inicial no mes0, -aporte/mes, +equity final no fim."""
    n = len(curve)
    cfs = [-(initial + monthly_flow)]  # mes 0 ja inclui aporte+inicial no modelo
    for i in range(1, n - 1):
        cfs.append(-monthly_flow)
    cfs.append(-monthly_flow + curve[-1][1])  # ultimo mes: aporte + recebe equity
    # bisseccao
    def npv(r):
        return sum(cf / (1 + r) ** i for i, cf in enumerate(cfs))
    lo, hi = -0.9, 1.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if npv(mid) > 0:
            lo = mid
        else:
            hi = mid
    rm = (lo + hi) / 2
    return (1 + rm) ** 12 - 1


def main():
    print("=" * 70)
    print("BACKTEST ADC — carregando dados (Yahoo chart API)...")
    closes, divs, failed = load_prices()
    if failed:
        print(f"  FALHARAM no fetch: {failed}")
    print(f"  OK: {sorted(closes)}")
    for tk in sorted(closes):
        df = closes[tk]
        print(f"    {tk:11s} {df.index[0].date()} -> {df.index[-1].date()}  ({len(df)} pregoes)")

    print("  buscando ^GSPC p/ regime...")
    gspc_closes, gspc_dm = _chart_api_series("^GSPC", FETCH_DAYS)
    # SPY p/ benchmark extra
    spy_df, _ = _chart_api_df("SPY", FETCH_DAYS, want_div=True)

    print("\nrodando backtest point-in-time...")
    res = run_backtest(closes, divs, gspc_closes, gspc_dm, verbose=True)

    eq = res["equity"]; lev = res["lev"]; bh = res["bh"]
    n_months = res["n_months"]
    total_contributed = INITIAL_CAPITAL + MONTHLY_FLOW * n_months

    m = metrics(eq, total_contributed)
    mbh = metrics(bh, total_contributed)
    irr = irr_monthly(eq, MONTHLY_FLOW, INITIAL_CAPITAL)
    irr_bh = irr_monthly(bh, MONTHLY_FLOW, INITIAL_CAPITAL)

    # SPY B&H com os mesmos fluxos
    spy_final = None
    if spy_df is not None:
        spy_df.index = pd.to_datetime(spy_df.index)
        sh = 0.0
        for (d, _) in eq:
            sub = spy_df[spy_df.index <= d]
            if len(sub):
                p = float(sub["Close"].iloc[-1])
                sh += MONTHLY_FLOW / p
                if d == eq[0][0]:
                    sh += INITIAL_CAPITAL / p
        last = float(spy_df["Close"].iloc[-1])
        spy_final = sh * last

    print("\n" + "=" * 70)
    print("RESULTADOS")
    print("=" * 70)
    print(f"Periodo: {eq[0][0].date()} -> {eq[-1][0].date()}  ({m['years']:.1f} anos, {n_months} meses)")
    print(f"Total aportado: US$ {total_contributed:,.0f}")
    print()
    print(f"{'METRICA':<26}{'ADC (alavancada)':>22}{'B&H cesta (1x)':>20}")
    adc_fin = "US$ {:,.0f}".format(m["final"]); bh_fin = "US$ {:,.0f}".format(mbh["final"])
    print(f"{'Equity final':<26}{adc_fin:>22}{bh_fin:>20}")
    print(f"{'Multiplo s/ aportado':<26}{m['multiple']:>21.2f}x{mbh['multiple']:>19.2f}x")
    print(f"{'TIR (money-weighted aa)':<26}{irr*100:>21.1f}%{irr_bh*100:>19.1f}%")
    print(f"{'Max Drawdown':<26}{m['mdd']:>21.1f}%{mbh['mdd']:>19.1f}%")
    print(f"{'Sharpe (mensal->aa)':<26}{(m['sharpe'] or 0):>22.2f}{(mbh['sharpe'] or 0):>20.2f}")
    if spy_final:
        print(f"\nSPY B&H (mesmos fluxos): US$ {spy_final:,.0f}  multiplo {spy_final/total_contributed:.2f}x")
    print()
    print(f"Alavancagem efetiva INICIO: {lev[0][1]:.2f}x   FIM: {lev[-1][1]:.2f}x")
    # media movel da alavancagem em janelas
    levvals = [v for _, v in lev]
    print(f"  alav. efetiva media: {np.mean(levvals):.2f}x   pico: {np.max(levvals):.2f}x")
    # snapshots periodicos
    print("  evolucao (amostras):")
    step = max(1, len(lev) // 8)
    for i in range(0, len(lev), step):
        d, l = lev[i]
        print(f"    {d.date()}  alav {l:.2f}x   equity US$ {eq[i][1]:,.0f}")
    print(f"    {lev[-1][0].date()}  alav {lev[-1][1]:.2f}x   equity US$ {eq[-1][1]:,.0f}")
    print()
    print(f">>> N DE LIQUIDACOES: {res['liquidations']}")
    print("=" * 70)


if __name__ == "__main__":
    main()
