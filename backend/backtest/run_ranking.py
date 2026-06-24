"""
RANKING DE APORTE — sinal quase-perfeito do momento, ao vivo.
DOIS scores: QUALIDADE (beta, maxDD, dividendos, crescimento 5a, fundamentos) e
MOMENTO (Stochastic LENTO semanal [principal] + desconto×reversão + MM200).
NADA exclui um ativo — tudo é peso. Separado por categoria.
(Demo: dividendos/fundamentos = neutro, pois usa só preço; em produção vêm da FMP.)
"""
import urllib.request, ssl, json, time, math, os, sys, datetime as dt
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.quantitative.universe import UNIVERSE, INDEX_BY_CAT
from app.quantitative import scoring_v2 as S
from app.quantitative import accumulation as A
from app.quantitative import indicators_v2 as I

CTX=ssl.create_default_context(); CTX.check_hostname=False; CTX.verify_mode=ssl.CERT_NONE

def fetch(ticker, years=6):
    end=int(time.time()); start=end-int(years*365.25*86400)
    url=(f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
         f"?period1={start}&period2={end}&interval=1d")
    req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    for _ in range(3):
        try:
            d=json.loads(urllib.request.urlopen(req,timeout=30,context=CTX).read())
            res=d["chart"]["result"][0]; ts=res["timestamp"]
            q=res["indicators"]["quote"][0]
            adj=(res["indicators"].get("adjclose") or [{}])[0].get("adjclose")
            cl=adj or q["close"]
            return [(t,c) for t,c in zip(ts,cl) if c is not None]
        except Exception:
            time.sleep(1.5)
    return None

def closes(arr): return np.array([c for _,c in arr], dtype=float)

def weekly_closes(arr):
    wk={}
    for t,c in arr:
        y,w,_=dt.date.fromtimestamp(t).isocalendar(); wk[(y,w)]=float(c)
    return [wk[k] for k in sorted(wk)]

def slow_stoch_weekly(arr, n=14):
    wc=weekly_closes(arr)
    if len(wc)<n+3: return None
    wc=np.array(wc)
    fast=[]
    for i in range(n-1, len(wc)):
        win=wc[i-n+1:i+1]; lo,hi=win.min(),win.max()
        fast.append((wc[i]-lo)/(hi-lo)*100 if hi>lo else 50.0)
    return float(np.mean(fast[-3:])) if len(fast)>=3 else float(fast[-1])  # slow %K = SMA3

def datemap(arr):
    return {dt.date.fromtimestamp(t).isoformat(): c for t,c in arr}

def beta_aligned(asset_arr, idx_dmap):
    """Beta alinhado POR DATA (corrige desalinhamento ^BVSP x ações BR)."""
    if not idx_dmap: return None
    pairs=[(c, idx_dmap[dt.date.fromtimestamp(t).isoformat()])
           for t,c in asset_arr if dt.date.fromtimestamp(t).isoformat() in idx_dmap]
    if len(pairs)<60: return None
    pairs=pairs[-252:]
    a=np.array([p[0] for p in pairs]); ix=np.array([p[1] for p in pairs])
    ra=np.diff(np.log(a)); ri=np.diff(np.log(ix))
    if np.var(ri)==0: return None
    return float(np.cov(ra,ri)[0,1]/np.var(ri))

def growth5y(a):
    if len(a)<252: return None
    yrs=len(a)/252.0
    return float(((a[-1]/a[0])**(1/yrs)-1)*100)

def sharpe_tr(a):
    if len(a)<252: return None
    r=np.diff(np.log(a[-756:] if len(a)>=756 else a))
    return float(r.mean()/r.std()*math.sqrt(252)) if r.std()>0 else None

def max_dd(a):
    rm=np.maximum.accumulate(a); return float(np.min((a-rm)/rm)*100)

def regime(idx):
    if idx is None or len(idx)<210: return "NEUTRO"
    ma=np.mean(idx[-200:]); dist=(idx[-1]/ma-1)*100
    hi=np.max(idx[-252:]); dd=(idx[-1]/hi-1)*100
    if dd<=-30: return "CAPIT.EXTREMA"
    if dd<=-18 or dist<=-12: return "CAPITULACAO"
    if dist>=10 and dd>-3: return "TOPO"
    return "NEUTRO"
MULT={"CAPIT.EXTREMA":5,"CAPITULACAO":4,"NEUTRO":3,"TOPO":2}

print("Buscando indices..."); idxc={}; idxdm={}
for ix in set(INDEX_BY_CAT.values()):
    a=fetch(ix)
    idxc[ix]=closes(a) if a else None
    idxdm[ix]=datemap(a) if a else None
    time.sleep(0.4)
# regime do mercado de AÇÕES (p/ regra do ouro em capitulação)
EQUITY_REG = regime(idxc.get("^GSPC"))

def analyze(tk, bucket, cat):
    arr=fetch(tk)
    if not arr or len(arr)<260: return None
    a=closes(arr)
    dma=(a[-1]/np.mean(a[-200:])-1)*100
    disc=I.distance_from_ath(a) or 0.0
    rev=I.reversal_confirmation(a)
    sstoch=slow_stoch_weekly(arr)
    bt=beta_aligned(arr, idxdm.get(INDEX_BY_CAT[cat]))
    g5=growth5y(a); dd=max_dd(a); shp=sharpe_tr(a)
    cagr=g5  # CAGR de retorno (preço); produção: total return c/ dividendos
    tsr=g5   # TSR esperado proxy (demo); produção: dividend yield + crescimento esperado
    reg=regime(idxc.get(INDEX_BY_CAT[cat])); mult=MULT[reg]

    # QUALIDADE (dividendos/fundamentos = None no demo → neutro; produção preenche via FMP)
    qual,qb=S.compute_quality_blend(beta=bt, max_dd_pct=dd, dividend_yield=None, growth_5y=g5,
                                    sharpe=shp, cagr=cagr, tsr_expected=tsr)
    # MOMENTO — Stoch lento semanal é o principal
    mom,mb=S.compute_momentum(slow_stoch_weekly=sstoch, discount_from_top=disc,
                              reversal_confirmation=rev, distance_ma200=dma)
    verdict = "RESERVA" if bucket=="RESERVA" else S.aporte_verdict(mom, qual)
    # REGRA DO OURO: em capitulação do mercado de ações, ouro vira hedge → comprar
    if tk=="GLD" and EQUITY_REG in ("CAPITULACAO","CAPIT.EXTREMA"):
        verdict="COMPRAR FORTE"
    rank = qual*0.45 + mom*0.55   # #15b: oportunidade decide o desempate (comprar bem)
    # Alavancagem = multiplicador do regime (2/3/4/5x); só em candidato de compra
    lev = float(mult) if (mom>=50 or dma<-3) and bucket!="RESERVA" else 1.0
    return dict(tk=tk,bucket=bucket,verdict=verdict,qual=round(qual),mom=round(mom),
                rank=round(rank,1),sstoch=round(sstoch) if sstoch is not None else None,
                dma=round(dma,1),disc=round(disc,1),dd=round(dd),beta=bt,g5=g5,
                sharpe=shp,mult=mult,lev=round(lev,1),reg=reg)

def run():
    for cat,lst in UNIVERSE.items():
        rows=[]
        for tk,bucket,name in lst:
            r=analyze(tk,bucket,cat)
            if r: rows.append(r)
            time.sleep(0.35)
        order={"COMPRAR FORTE":0,"COMPRAR":1,"JUSTO":2,"ESPECULATIVO":3,"ESTICADO":4,"RESERVA":5}
        rows.sort(key=lambda x:(order.get(x["verdict"],9), -x["rank"]))
        reg=rows[0]["reg"] if rows else "?"
        print(f"\n{'='*100}\n  {cat} — regime {reg} (multiplicador {MULT.get(reg,3)}x)\n{'='*100}")
        print(f"  {'Ativo':10s}{'Bucket':11s}{'VEREDITO':14s}{'Qual':>5s}{'Mom':>5s}{'Rank':>6s}{'StochSem':>9s}{'DescTopo':>9s}{'Beta':>6s}{'CAGR':>7s}{'Sharpe':>7s}")
        print("  "+"-"*97)
        for r in rows:
            bt=f"{r['beta']:.2f}" if r['beta'] is not None else "  -"
            g5=f"{r['g5']:.0f}%" if r['g5'] is not None else "  -"
            sh=f"{r['sharpe']:.2f}" if r['sharpe'] is not None else "  -"
            ss=f"{r['sstoch']}" if r['sstoch'] is not None else "-"
            print(f"  {r['tk']:10s}{r['bucket']:11s}{r['verdict']:14s}{r['qual']:5d}{r['mom']:5d}{r['rank']:6.1f}{ss:>9s}{r['disc']:8.1f}%{bt:>6s}{g5:>7s}{sh:>7s}")

if __name__=="__main__":
    run()
