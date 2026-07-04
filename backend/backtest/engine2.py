"""
Backtest do modelo de ACUMULAÇÃO CONTRACÍCLICA (meio-termo, teto 3x).
2011-2026, dados reais. Posição de margem mantida; alavancagem ajustada
mensalmente pelo sinal de ciclo (compra fundo / vende topo). Re-margina no
preço corrente a cada ajuste (sem carry). Liquida se queda intra-mês > 1/L.

Compara:  BH (sem alavancagem)  x  ACUM (modelo de acumulação)
Por sleeve independente (R$10k cada), soma no fim. Mesma cesta de 10 ativos.
"""
import os, csv, math, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.quantitative import accumulation as A
from app.quantitative import scoring_v2 as S
from app.quantitative import indicators_v2 as I

DATA = os.path.join(os.path.dirname(__file__), "data")
TRADABLE = ["BBAS3.SA","TAEE11.SA","ITUB4.SA","EGIE3.SA","PETR4.SA","VALE3.SA",
            "AAPL","JNJ","KO","MSFT"]
INDEX_FOR = lambda tk: "_BVSP" if tk.endswith(".SA") else "_GSPC"


def load(tk):
    d, p = [], []
    with open(os.path.join(DATA, tk.replace("^","_")+".csv")) as f:
        for row in csv.DictReader(f):
            d.append(row["date"]); p.append(float(row["close"]))
    return d, np.array(p)

series = {tk: load(tk) for tk in TRADABLE}
idx = {"_BVSP": load("_BVSP"), "_GSPC": load("_GSPC")}
all_dates = sorted(set().union(*[set(d) for d,_ in series.values()],
                               set(idx["_BVSP"][0]), set(idx["_GSPC"][0])))
def tomap(d,p): return {a:b for a,b in zip(d,p)}
def densify(m):
    out={}; last=None
    for d in all_dates:
        if d in m and m[d] is not None: last=m[d]
        out[d]=last
    return out
smap={tk:densify(tomap(*series[tk])) for tk in TRADABLE}
imap={k:densify(tomap(*idx[k])) for k in idx}
start=0
for i,d in enumerate(all_dates):
    if all(smap[tk][d] is not None for tk in TRADABLE) and all(imap[k][d] is not None for k in imap):
        start=i; break
all_dates=all_dates[start:]
month_set=set()
seen=set()
for d in all_dates:
    if d[:7] not in seen: seen.add(d[:7]); month_set.add(d)


def arr_upto(m, di):
    return np.array([m[all_dates[j]] for j in range(di+1)])


def regime(imp_arr):
    if len(imp_arr) < 210: return "NEUTRO"
    ma=np.mean(imp_arr[-200:]); dist=(imp_arr[-1]/ma-1)*100
    hi=np.max(imp_arr[-252:]); dd=(imp_arr[-1]/hi-1)*100
    if dd<=-18 or dist<=-12: return "CAPITULACAO"
    if dist>=10 and dd>-3: return "TOPO"
    return "NEUTRO"


def quality_elig(arr):
    if len(arr)<260: return False
    r=np.diff(np.log(arr[-756:] if len(arr)>=756 else arr))
    sharpe=float(r.mean()/r.std()*math.sqrt(252)) if r.std()>0 else None
    rm=np.maximum.accumulate(arr); mdd=float(np.min((arr-rm)/rm)*100)
    rec=I.recovery_days_from_max_dd(arr); std=I.annual_return_std(arr)
    q,_=S.compute_quality_score_v2(sharpe=sharpe,max_drawdown_pct=mdd,recovery_days=rec,
                                   annual_return_std_pct=std)
    return q>=65   # gate price-only um pouco mais brando (sem fundamentos)


def signal_for(tk, di):
    arr=arr_upto(smap[tk], di)
    if len(arr)<260: return None
    iarr=arr_upto(imap[INDEX_FOR(tk)], di)
    disc=I.distance_from_ath(arr)
    ma200=np.mean(arr[-200:]); dma=(arr[-1]/ma200-1)*100
    delta=np.diff(arr[-15:]); up=delta[delta>0].sum(); dn=-delta[delta<0].sum()
    rsi=100-100/(1+up/dn) if dn>0 else 70.0
    elig=quality_elig(arr)
    reg=regime(iarr)
    return A.cycle_signal(disc, dma, rsi, elig, reg)


def run():
    cap=10000.0
    sl={tk:{"eq":cap,"L":1.0,"ref":None,"peak":cap} for tk in TRADABLE}   # ACUM
    bh={tk:{"eq":cap,"peak":cap} for tk in TRADABLE}                       # benchmark
    acts={"COMPRAR":0,"VENDER":0,"SEGURAR":0,"EVITAR":0}
    liq=0; maxdd_acum=0.0; maxdd_bh=0.0
    eq_series=[]; bh_series=[]

    for di,d in enumerate(all_dates):
        if d in month_set and di>0:
            for tk in TRADABLE:
                di_arr=arr_upto(smap[tk], di)
                if len(di_arr)<260:
                    sl[tk]["L"]=1.0; sl[tk]["ref"]=smap[tk][d]; continue
                disc=I.distance_from_ath(di_arr) or 0.0
                hi1y=float(np.max(di_arr[-252:]))
                price=di_arr[-1]
                st=sl[tk]
                holding=st.get("holding",False)
                # ENTRADA: capitulação profunda do ativo (descontado >= 25% do topo)
                if not holding and disc >= 25:
                    L=A.depth_leverage(disc)            # 1..3x seguro p/ -60% DD
                    if L>1.0:
                        st["holding"]=True; st["L"]=L; st["entry_hi"]=hi1y
                        acts["COMPRAR"]+=1
                    else:
                        st["L"]=1.0
                # SAIDA: recuperou (preço de volta perto da maxima de quando entrou)
                elif holding and price >= st["entry_hi"]*0.97:
                    st["holding"]=False; st["L"]=1.0; acts["VENDER"]+=1
                elif holding:
                    acts["SEGURAR"]+=1                  # segura a alavancagem na recuperacao
                else:
                    st["L"]=1.0; acts["SEGURAR"]+=1
                st["ref"]=smap[tk][d]

        # marca diária
        tot_a=0.0; tot_b=0.0
        for tk in TRADABLE:
            price=smap[tk][d]
            # ACUM
            st=sl[tk]
            if st["ref"] is None: st["ref"]=price
            L=st["L"]
            if di>0:
                prevp=smap[tk][all_dates[di-1]]
                if L<=0:
                    pass  # em caixa: equity não muda
                else:
                    move=price/prevp-1
                    st["eq"]*= (1+L*move)
                    # liquidação: queda desde a re-margem além de 1/L
                    if (price/st["ref"]-1) <= -1.0/L:
                        st["eq"]*=0.0; liq+=1
            st["eq"]=max(0.0, st["eq"])
            st["peak"]=max(st["peak"], st["eq"])
            tot_a+=st["eq"]
            # BH
            b=bh[tk]
            if di>0:
                prevp=smap[tk][all_dates[di-1]]
                b["eq"]*= (1+(price/prevp-1))
            tot_b+=b["eq"]
        eq_series.append(tot_a); bh_series.append(tot_b)

    def metrics(series):
        s=np.array(series); fin=s[-1]
        peak=np.maximum.accumulate(s); mdd=float(np.min((s-peak)/peak)*100)
        r=np.diff(np.log(s[s>0]))
        sh=float(r.mean()/r.std()*math.sqrt(252)) if r.std()>0 else 0
        vol=float(r.std()*math.sqrt(252)*100)
        return fin, mdd, sh, vol

    cap0=cap*len(TRADABLE)
    fa,da,sa,va=metrics(eq_series); fb,db,sb,vb=metrics(bh_series)
    yrs=len(all_dates)/252.0
    print(f"\n{'='*82}\nBACKTEST ACUMULACAO 2011-2026 ({yrs:.1f} anos, dados reais) — cesta 10 ativos")
    print(f"Modelo meio-termo: teto 3x, escala por profundidade, vende no caro\n{'='*82}")
    print(f"{'Estrategia':32s}|{'Final':>13s} |{'CAGR':>7s} |{'MaxDD':>8s} |{'Sharpe':>7s} |{'Vol':>6s}")
    print("-"*82)
    for nome,fin,mdd,sh,vol in [("Buy&Hold (sem alavancagem)",fb,db,sb,vb),
                                 ("ACUMULACAO (compra fundo/vende topo)",fa,da,sa,va)]:
        cagr=(fin/cap0)**(1/yrs)-1
        print(f"{nome:32s}|R${fin:>11,.0f} | {cagr*100:5.1f}% |{mdd:7.1f}% |{sh:6.2f} |{vol:5.1f}%")
    print("-"*82)
    print(f"Sinais: COMPRAR={acts['COMPRAR']}  VENDER={acts['VENDER']}  SEGURAR={acts['SEGURAR']}  EVITAR={acts['EVITAR']}  | liquidacoes={liq}")
    return fa,fb


if __name__=="__main__":
    run()
