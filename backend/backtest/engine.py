"""
Backtest event-driven (margem, estilo Quantfury) 2011-2026 com DADOS REAIS.
Confronta 3 estratégias sobre a MESMA cesta (mesmos ativos, difere só
alavancagem + gestão de stop):

  BH   = Buy & Hold sem alavancagem (benchmark)
  ESP  = Modelo dos especialistas (assimetria R:R, stop ÚNICO, anti-faca por reversão)
  USER = Seu modelo (matriz de regime + defensiva/oportunidade, STOP ESCALONADO 1/3+1/3)

Limitações honestas: usa só dados de PREÇO. Beta é trailing (calculável); dividend
yield NÃO entra (não há fundamentos históricos) — perfil defensivo no backtest = beta baixo.
Liquidação modelada como posição de margem: perda cumulativa de -1/alavancagem zera a tranche.
"""
import os, csv, math
import numpy as np

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.quantitative import scoring_v2 as S
from app.quantitative import indicators_v2 as I

DATA = os.path.join(os.path.dirname(__file__), "data")

TRADABLE = ["BBAS3.SA","TAEE11.SA","ITUB4.SA","EGIE3.SA","PETR4.SA","VALE3.SA",
            "AAPL","JNJ","KO","MSFT"]
INDEX_FOR = lambda tk: "_BVSP" if tk.endswith(".SA") else "_GSPC"
STOP_BASE = lambda tk: 18.0 if tk.endswith(".SA") else 15.0


def load(tk):
    path = os.path.join(DATA, tk.replace("^","_") + ".csv")
    dates, px = [], []
    with open(path) as f:
        for row in csv.DictReader(f):
            dates.append(row["date"]); px.append(float(row["close"]))
    return dates, np.array(px)


# ---- carrega tudo num grid de datas comum ----
series = {tk: load(tk) for tk in TRADABLE}
idx = {k: load("_"+k) for k in ["BVSP","GSPC"]}
# usa as datas do ^GSPC como mestre e alinha por data (dict lookup)
def to_map(d, p): return {dt: v for dt, v in zip(d, p)}
_raw_s = {tk: to_map(*series[tk]) for tk in TRADABLE}
_raw_i = {"_BVSP": to_map(*idx["BVSP"]), "_GSPC": to_map(*idx["GSPC"])}
all_dates = sorted(set().union(*[set(d) for d,_ in series.values()],
                               set(idx["BVSP"][0]), set(idx["GSPC"][0])))

def densify(m):
    """Forward-fill no grid comum — todo dia tem preço (corrige feriados BR≠US)."""
    out = {}; last = None
    for d in all_dates:
        if d in m and m[d] is not None:
            last = m[d]
        out[d] = last
    return out

smap = {tk: densify(_raw_s[tk]) for tk in TRADABLE}
imap = {k: densify(_raw_i[k]) for k in _raw_i}

# começa só quando TODOS têm dados (evita capital "sumindo" no aquecimento)
_start_i = 0
for i, d in enumerate(all_dates):
    if all(smap[tk][d] is not None for tk in TRADABLE) and all(imap[k][d] is not None for k in imap):
        _start_i = i; break
all_dates = all_dates[_start_i:]


def trailing(tkmap, dates_upto):
    """array de preços do ticker até a data (inclui), na ordem cronológica."""
    return np.array([tkmap[d] for d in dates_upto if d in tkmap])


def market_regime(imp, dates_upto):
    arr = np.array([imp[d] for d in dates_upto if d in imp])
    if len(arr) < 210:
        return 3
    ma200 = np.mean(arr[-200:])
    dist = (arr[-1]/ma200 - 1)*100
    hi1y = np.max(arr[-252:])
    dd = (arr[-1]/hi1y - 1)*100
    if dd <= -18 or dist <= -12:
        return 4   # capitulação
    if dist >= 10 and dd > -3:
        return 2   # topo
    return 3       # neutro


def trailing_beta(asset_arr, idx_arr):
    n = min(len(asset_arr), len(idx_arr), 252)
    if n < 60:
        return None
    a = np.diff(np.log(asset_arr[-n:])); b = np.diff(np.log(idx_arr[-n:]))
    if np.var(b) == 0:
        return None
    return float(np.cov(a, b)[0,1]/np.var(b))


def sharpe_tr(arr):
    if len(arr) < 252: return None
    r = np.diff(np.log(arr[-756:] if len(arr)>=756 else arr))
    if r.std()==0: return None
    return float(r.mean()/r.std()*math.sqrt(252))


def max_dd(arr):
    if len(arr) < 60: return None
    rm = np.maximum.accumulate(arr)
    return float(np.min((arr-rm)/rm)*100)


# rebalance mensal: primeira data de cada mês presente no grid
month_starts = []
seen = set()
for d in all_dates:
    ym = d[:7]
    if ym not in seen:
        seen.add(ym); month_starts.append(d)
month_set = set(month_starts)


def signals(tk, dates_upto):
    """Calcula qualidade/perfil/regime/leverage para os 3 modelos numa data."""
    arr = trailing(smap[tk], dates_upto)
    if len(arr) < 260:
        return None
    iarr = trailing(imap[INDEX_FOR(tk)], dates_upto)
    sharpe = sharpe_tr(arr); mdd = max_dd(arr)
    rec = I.recovery_days_from_max_dd(arr); std = I.annual_return_std(arr)
    disc = I.distance_from_ath(arr); rev = I.reversal_confirmation(arr)
    beta = trailing_beta(arr, iarr)
    # MM200 distance, RSI, stoch (rápidos)
    ma200 = np.mean(arr[-200:]); dma = (arr[-1]/ma200-1)*100
    delta = np.diff(arr[-15:]); up = delta[delta>0].sum(); dn = -delta[delta<0].sum()
    rsi = 100 - 100/(1+(up/dn)) if dn>0 else 70.0
    lo14, hi14 = arr[-14:].min(), arr[-14:].max()
    stoch = (arr[-1]-lo14)/(hi14-lo14)*100 if hi14>lo14 else 50.0

    q,_ = S.compute_quality_score_v2(sharpe=sharpe, max_drawdown_pct=mdd, recovery_days=rec,
                                     annual_return_std_pct=std)
    gate = S.quality_gate(q)
    stop = STOP_BASE(tk)
    regime = S.regime_from_multiplier(market_regime(imap[INDEX_FOR(tk)], dates_upto))

    # ----- Modelo USER (regime + perfil + stop escalonado) -----
    prof = S.classify_profile(beta, None, disc, rev)  # DY None no backtest
    clear = dma >= 0
    if gate["eligible"]:
        u = S.leverage_recommendation(regime, prof, q, gate["leverage_cap"], clear)
        user_lev = u["leverage"]; user_stops = u["stops"]
    else:
        user_lev = 1.0; user_stops = None

    # ----- Modelo ESP (assimetria R:R + reversão + stop único) -----
    if gate["eligible"]:
        opp,_ = S.compute_opportunity_score_v2(distance_ma200=dma, stoch_k=stoch,
                    discount_from_top=disc, reversal_confirmation=rev, rsi=rsi)
        entry = S.entry_confirmed(dma, rsi, rev)
        rr = (disc/stop) if (disc and disc>0) else None
        if entry["confirmed"] and rr:
            sz = S.leverage_from_asymmetry(rr, q, gate["leverage_cap"], stop)
            esp_lev = sz["leverage"]
        else:
            esp_lev = 1.0
    else:
        esp_lev = 1.0

    return {"eligible": gate["eligible"], "stop": stop,
            "user_lev": user_lev, "user_stops": user_stops, "esp_lev": esp_lev}


def run():
    cap0 = 100000.0
    books = {m: {"equity": cap0, "peak": cap0, "maxdd": 0.0, "liq": 0, "stops": 0,
                 "lev_sum": 0.0, "lev_n": 0, "lev_gt1": 0}
             for m in ["BH","ESP","USER"]}
    eqseries = {m: [] for m in ["BH","ESP","USER"]}
    # posições por ticker por modelo: dict tk -> {entry,L,f_held,realized,stop,stops}
    pos = {m: {} for m in ["BH","ESP","USER"]}

    prev_price = {}
    n_tradable = len(TRADABLE)

    for di, d in enumerate(all_dates):
        # ---- rebalance mensal: fecha tudo, recalcula sinais, reabre ----
        if d in month_set:
            for m in ["BH","ESP","USER"]:
                # fecha posições a mercado
                tot = 0.0
                for tk, p in pos[m].items():
                    if tk in smap and d in smap[tk]:
                        price = smap[tk][d]
                        val = p["realized"] + p["f_held"]*(1 + p["L"]*(price/p["entry"]-1))
                        tot += max(0.0, val)*p["cap"]
                    else:
                        tot += p["cap"]  # sem preço: mantém
                if pos[m]:
                    books[m]["equity"] = tot if tot>0 else books[m]["equity"]
                pos[m] = {}

            dates_upto = all_dates[:di+1]
            sig = {}
            for tk in TRADABLE:
                if d in smap[tk]:
                    sig[tk] = signals(tk, dates_upto)
            alloc = {m: books[m]["equity"]/n_tradable for m in ["BH","ESP","USER"]}
            for tk in TRADABLE:
                s = sig.get(tk)
                if not s or d not in smap[tk]:
                    continue
                entry = smap[tk][d]
                # BH sempre 1x
                pos["BH"][tk] = dict(entry=entry,L=1.0,f_held=1.0,realized=0.0,
                                     cap=alloc["BH"],stop=None,stops=None,model="BH")
                pos["ESP"][tk] = dict(entry=entry,L=s["esp_lev"],f_held=1.0,realized=0.0,
                                      cap=alloc["ESP"],stop=s["stop"],stops=None,model="ESP")
                pos["USER"][tk] = dict(entry=entry,L=s["user_lev"],f_held=1.0,realized=0.0,
                                       cap=alloc["USER"],stop=s["stop"],stops=s["user_stops"],model="USER")
                for mm, lv in (("ESP",s["esp_lev"]),("USER",s["user_lev"])):
                    books[mm]["lev_sum"] += lv; books[mm]["lev_n"] += 1
                    if lv > 1.0: books[mm]["lev_gt1"] += 1

        # ---- diário: aplica stops/liquidação por posição ----
        for m in ["ESP","USER"]:
            for tk, p in pos[m].items():
                if p["L"] <= 1.0 or p["f_held"] <= 0 or tk not in smap or d not in smap[tk]:
                    continue
                price = smap[tk][d]
                x = (price/p["entry"]-1)*100  # variação % desde entrada
                liq = -100.0/p["L"]
                # liquidação da tranche restante
                if x <= liq:
                    p["f_held"] = 0.0
                    books[m]["liq"] += 1
                    continue
                if m == "ESP":
                    if p["stop"] and x <= -p["stop"]:
                        # stop único: vende tudo, realiza
                        p["realized"] += p["f_held"]*(1 + p["L"]*(price/p["entry"]-1))
                        p["f_held"] = 0.0
                        books[m]["stops"] += 1
                else:  # USER escalonado
                    st = p["stops"]
                    if not st: continue
                    if p["f_held"] > 0.66 and x <= -st["stop_1_pct"]:
                        frac = 1/3
                        p["realized"] += frac*(1 + p["L"]*(price/p["entry"]-1))
                        p["f_held"] -= frac; books[m]["stops"] += 1
                    elif p["f_held"] > 0.33 and x <= -st["stop_2_pct"]:
                        frac = 1/3
                        p["realized"] += frac*(1 + p["L"]*(price/p["entry"]-1))
                        p["f_held"] -= frac; books[m]["stops"] += 1

        # ---- marca equity diária p/ drawdown ----
        for m in ["BH","ESP","USER"]:
            if not pos[m]:
                continue
            tot = 0.0
            for tk, p in pos[m].items():
                if tk in smap and d in smap[tk]:
                    price = smap[tk][d]
                    val = p["realized"] + p["f_held"]*(1 + p["L"]*(price/p["entry"]-1))
                    tot += max(0.0,val)*p["cap"]
                else:
                    tot += p["cap"]
            if tot > 0:
                books[m]["_mark"] = tot
                eqseries[m].append(tot)
                if tot > books[m]["peak"]: books[m]["peak"] = tot
                dd = (tot/books[m]["peak"]-1)*100
                if dd < books[m]["maxdd"]: books[m]["maxdd"] = dd

    # equity final = última marcação
    for m in ["BH","ESP","USER"]:
        books[m]["equity"] = books[m].get("_mark", books[m]["equity"])
        s = np.array(eqseries[m])
        if len(s) > 30:
            r = np.diff(np.log(s))
            books[m]["sharpe"] = float(r.mean()/r.std()*math.sqrt(252)) if r.std()>0 else 0.0
            books[m]["vol"] = float(r.std()*math.sqrt(252)*100)
        else:
            books[m]["sharpe"] = 0.0; books[m]["vol"] = 0.0
    return books


if __name__ == "__main__":
    b = run()
    yrs = 15.0
    print(f"\n{'='*74}\nBACKTEST 2011-2026 (15 anos, dados reais) — cesta de 10 ativos BR+US")
    print(f"Capital inicial: R$100.000  |  rebalance mensal  |  margem sem carry\n{'='*74}")
    print(f"{'Estrategia':30s}|{'Final':>13s} | {'CAGR':>6s} |{'MaxDD':>8s} |{'Sharpe':>7s} |{'Vol':>6s} | Liq")
    print("-"*84)
    names = {"BH":"Buy&Hold (SEM alavancagem)","ESP":"ESPECIALISTAS (R:R, stop unico)",
             "USER":"SEU MODELO (regime+escalonado)"}
    for m in ["BH","ESP","USER"]:
        e = b[m]["equity"]; cagr = (e/100000.0)**(1/yrs)-1
        print(f"{names[m]:30s}|R${e:>11,.0f} | {cagr*100:5.1f}% |{b[m]['maxdd']:7.1f}% |{b[m]['sharpe']:6.2f} |{b[m]['vol']:5.1f}% | {b[m]['liq']:3d}")
    print("-"*84)
    print("\nUso de alavancagem (diagnostico):")
    for m in ["ESP","USER"]:
        n = b[m]["lev_n"] or 1
        avg = b[m]["lev_sum"]/n
        pct = b[m]["lev_gt1"]/n*100
        print(f"  {names[m]:30s}  lev media={avg:.2f}x  |  posicoes-mes alavancadas={pct:.0f}%  |  stops disparados={b[m]['stops']}")
