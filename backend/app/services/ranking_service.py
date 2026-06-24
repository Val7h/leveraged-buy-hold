"""
RANKING DE APORTE — serviço de produção.

Porta a lógica de referência de backend/backtest/run_ranking.py para o app,
trocando o fetch via urllib/Yahoo direto pelo motor de dados do app
(market_data.fetch_price_history / fetch_fundamentals), que já tem cache Redis,
fallback sintético e tratamento de rate-limit.

Reusa os motores prontos (NÃO reimplementa scoring):
  - scoring_v2: compute_quality_blend, compute_momentum, aporte_verdict, score_slow_stoch_weekly
  - accumulation: staggered_stops, depth_leverage
  - indicators_v2: distance_from_ath, reversal_confirmation, recovery_days_from_max_dd,
                   annual_return_std, distance_from_52w_high
  - universe: UNIVERSE, INDEX_BY_CAT

Dois caches em memória com TTL:
  - ranking  ~20 min  (rodar ~116 tickers é lento → cache OBRIGATÓRIO)
  - market-bar ~5 min

Persistência do universo: data/ranking_universe.json (adições/remoções) MESCLADO
com UNIVERSE. Nada aqui pode derrubar o app — tudo blindado por try/except.
"""
from __future__ import annotations

import os
import json
import time
import math
import logging
import datetime as dt
from typing import Dict, List, Optional, Tuple

import numpy as np

from app.quantitative.universe import UNIVERSE, INDEX_BY_CAT
from app.quantitative import scoring_v2 as S
from app.quantitative import accumulation as A
from app.quantitative import indicators_v2 as I
from app.services.market_data import fetch_price_history, fetch_fundamentals
try:
    from app.services.fundamentals_provider import get_fundamentals
except Exception:  # módulo ausente/erro → fundamentos ficam neutros, não derruba o ranking
    def get_fundamentals(_tk):
        return {}
try:
    from app.services import crypto_data as CD
except Exception:  # módulo ausente/erro → crypto cai no caminho genérico (não derruba o ranking)
    CD = None

logger = logging.getLogger(__name__)

# ─────────────────────────── Fetch confiável p/ índices e barra de mercado ──────
# yfinance é instável com tickers especiais (^VIX, ^BVSP, ^STOXX50E, GC=F, USDBRL=X)
# e cai num FALLBACK SINTÉTICO (valores fabricados) → indicadores ERRADOS. Para esses,
# buscamos direto na Yahoo chart API (query1), que é confiável para todos os tipos.
# Em falha, retorna None (NUNCA sintético — melhor um indicador ausente que errado).
import urllib.request as _urlreq
import ssl as _ssl
import json as _json
import time as _time
try:
    import certifi as _certifi
    _CHART_CTX = _ssl.create_default_context(cafile=_certifi.where())
except Exception:
    _CHART_CTX = _ssl.create_default_context()
# Fallback SEM verificação de cert (MITM-risk). Gateado por env: ALLOW_INSECURE_SSL=0 desliga
# (recomendado em prod após confirmar que os preços carregam verificados). Default "1" preserva
# o comportamento atual (zero risco de quebrar a coleta).
_ALLOW_INSECURE = os.environ.get("ALLOW_INSECURE_SSL", "1").strip() == "1"
_CHART_CTX_NOVERIFY = _ssl.create_default_context()
_CHART_CTX_NOVERIFY.check_hostname = False
_CHART_CTX_NOVERIFY.verify_mode = _ssl.CERT_NONE

# Redundância de HOST: se query1 cair/rate-limit, tenta query2 (mesma API Yahoo, outro host).
_CHART_HOSTS = ("query1.finance.yahoo.com", "query2.finance.yahoo.com")


def _yahoo_chart_json(ticker: str, query: str):
    """GET no Yahoo chart com REDUNDÂNCIA de host (query1→query2), SSL verificado.
    Só cai p/ sem-verificação se ALLOW_INSECURE_SSL=1. Retorna dict JSON ou None."""
    last = None
    for host in _CHART_HOSTS:
        try:
            req = _urlreq.Request(f"https://{host}/v8/finance/chart/{ticker}?{query}",
                                  headers={"User-Agent": "Mozilla/5.0"})
            with _urlreq.urlopen(req, timeout=20, context=_CHART_CTX) as r:
                return _json.loads(r.read())
        except Exception as e:
            last = e
    if _ALLOW_INSECURE:
        # Fallback SEM verificação de cert — risco de MITM (preço forjado). NÃO silencioso:
        # loga ERRO. Desligue com ALLOW_INSECURE_SSL=0 no ambiente (recomendado em prod).
        logger.error(f"[CHART API][SSL-INSEGURO] verificação TLS falhou p/ {ticker}; usando "
                     f"CERT_NONE (risco MITM) — set ALLOW_INSECURE_SSL=0 p/ desligar")
        try:
            req = _urlreq.Request(f"https://{_CHART_HOSTS[0]}/v8/finance/chart/{ticker}?{query}",
                                  headers={"User-Agent": "Mozilla/5.0"})
            with _urlreq.urlopen(req, timeout=20, context=_CHART_CTX_NOVERIFY) as r:
                return _json.loads(r.read())
        except Exception as e:
            last = e
    if last:
        logger.warning(f"[CHART API] {ticker} todas as fontes falharam: {last}")
    return None


def _chart_api_series(ticker: str, days: int):
    """(closes np.array, {date_iso: close}) via Yahoo chart API. (None, None) em falha."""
    try:
        end = int(_time.time())
        start = end - int(days * 86400)
        d = _yahoo_chart_json(ticker, f"period1={start}&period2={end}&interval=1d")
        if d is None:
            return None, None
        res = d["chart"]["result"][0]
        ts = res["timestamp"]
        q = res["indicators"]["quote"][0]
        adj = (res["indicators"].get("adjclose") or [{}])[0].get("adjclose")
        cl = adj or q.get("close") or []
        pairs = [(t, c) for t, c in zip(ts, cl) if c is not None]
        if len(pairs) < 2:
            return None, None
        closes = np.array([c for _, c in pairs], dtype=float)
        # UTC para casar com as datas das ações (_chart_api_df usa pd.to_datetime unit=s = UTC).
        # Sem isso, beta_aligned compara dias trocados → beta errado (US/Europa negativos).
        dm = {dt.datetime.utcfromtimestamp(t).date().isoformat(): float(c) for t, c in pairs}
        return closes, dm
    except Exception as e:
        logger.warning(f"[CHART API] {ticker} falhou: {e}")
        return None, None


# ─────────────────────────── 2ª FONTE real (cross-provider): Stooq ──────────────
# Redundância de PROVEDOR (não só de host): se a Yahoo cair inteira, busca o histórico
# de preço no Stooq. CONSERVADOR no mapeamento de ticker — "dado ausente > dado errado":
# só mapeia ações/ETFs US (sufixo .us bem definido); BR(.SA)/cripto/índice → None (não
# arrisca casar no ativo errado). Stooq não dá dividendos → fallback só de preço.
def _stooq_symbol(ticker: str) -> Optional[str]:
    t = ticker.upper().strip()
    if not t or t.endswith(".SA"):        # B3 — Stooq não cobre confiavelmente
        return None
    if t.startswith("^") or "=" in t or "-" in t and t.endswith("USD"):  # índice/forex/cripto
        return None
    if t.endswith("USDT") or t.endswith("USD"):
        return None
    if not all(ch.isalnum() or ch == "." for ch in t):  # só tickers "limpos"
        return None
    return t.lower().replace(".", "-") + ".us"   # AAPL→aapl.us, BRK.B→brk-b.us


def _stooq_df(ticker: str, days: int):
    """(DataFrame[Close,High,Low], None) via Stooq CSV. (None, None) se não mapeia/sem dados.
    Só preço (Stooq não traz dividendos). SSL verificado. NUNCA fabrica dado."""
    sym = _stooq_symbol(ticker)
    if not sym:
        return None, None
    try:
        import pandas as pd
        end = dt.date.today()
        start = end - dt.timedelta(days=int(days))
        url = (f"https://stooq.com/q/d/l/?s={sym}&i=d"
               f"&d1={start.strftime('%Y%m%d')}&d2={end.strftime('%Y%m%d')}")
        req = _urlreq.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with _urlreq.urlopen(req, timeout=20, context=_CHART_CTX) as r:
            raw = r.read().decode("utf-8", "ignore")
        lines = [ln for ln in raw.strip().splitlines() if ln]
        # Stooq sem dados retorna "No data"/só cabeçalho → trata como ausente
        if len(lines) < 61 or not lines[0].lower().startswith("date"):
            return None, None
        rows = []
        for ln in lines[1:]:
            p = ln.split(",")
            if len(p) < 5:
                continue
            try:
                c, h, l = float(p[4]), float(p[2]), float(p[3])
            except ValueError:
                continue
            if c > 0:
                rows.append((p[0], c, h if h > 0 else c, l if l > 0 else c))
        if len(rows) < 60:
            return None, None
        idx = pd.to_datetime([r[0] for r in rows])
        df = pd.DataFrame(
            {"Close": [r[1] for r in rows], "High": [r[2] for r in rows], "Low": [r[3] for r in rows]},
            index=idx,
        )
        logger.info(f"[STOOQ fallback] {ticker} via {sym}: {len(rows)} barras (Yahoo indisponível)")
        return df, None
    except Exception as e:
        logger.warning(f"[STOOQ] {ticker} ({sym}) falhou: {e}")
        return None, None


def _chart_api_df(ticker: str, days: int, want_div: bool = False, want_annual: bool = False):
    """
    (DataFrame[index=datetime, Close], dy_trailing[, annual_dy]) via Yahoo chart API.
    Substitui fetch_price_history (que cai em dados SINTÉTICOS qd yfinance falha).
    dy_trailing = soma de dividendos dos últimos 365d / preço atual × 100 (None se não pediu).
    want_annual=True → retorna também {ano: dy_anual_%} (dividendos do ano / preço atual),
    p/ score de consistência do dividendo (média 10a + pior ano). Retorna (None, None[, None]).
    """
    try:
        import pandas as pd
        end = int(_time.time())
        start = end - int(days * 86400)
        ev = "&events=div" if want_div else ""
        d = _yahoo_chart_json(ticker, f"period1={start}&period2={end}&interval=1d{ev}")
        if d is None:
            # Yahoo inteira caiu → 2ª FONTE real (Stooq). Só preço (sem dividendos);
            # mapeia só US, senão retorna ausente (nunca dado errado).
            sdf, _ = _stooq_df(ticker, days)
            if sdf is not None:
                return (sdf, None, {}) if want_annual else (sdf, None)
            return (None, None, None) if want_annual else (None, None)
        res = d["chart"]["result"][0]
        ts = res["timestamp"]
        q = res["indicators"]["quote"][0]
        adj = (res["indicators"].get("adjclose") or [{}])[0].get("adjclose")
        cl = adj or q.get("close") or []
        hi = q.get("high") or []
        lo = q.get("low") or []
        rows = []
        for i, t in enumerate(ts):
            c = cl[i] if i < len(cl) else None
            if c is None:
                continue
            # Máx/mín reais; barra quebrada (H/L ausente ou ≤0, ex: semana corrente) → usa o close
            h = hi[i] if (i < len(hi) and hi[i] and hi[i] > 0) else c
            l = lo[i] if (i < len(lo) and lo[i] and lo[i] > 0) else c
            rows.append((t, float(c), float(h), float(l)))
        if len(rows) < 60:
            return (None, None, None) if want_annual else (None, None)
        idx = pd.to_datetime([r[0] for r in rows], unit="s")
        df = pd.DataFrame(
            {"Close": [r[1] for r in rows], "High": [r[2] for r in rows], "Low": [r[3] for r in rows]},
            index=idx,
        )
        pairs = [(r[0], r[1]) for r in rows]  # mantido p/ o cálculo de dividendos abaixo

        dy = None
        annual = {}
        if want_div or want_annual:
            divs = (res.get("events") or {}).get("dividends") or {}
            price = float(pairs[-1][1])  # preço atual (ajuste≈1 na última data) → DY trailing OK
            cutoff = end - 365 * 86400
            total = sum(float(v.get("amount", 0) or 0) for k, v in divs.items() if int(k) >= cutoff)
            dy = round(total / price * 100, 2) if (price and total > 0) else 0.0
            if want_annual:
                # DY anual histórico CORRETO: dividendo nominal ÷ preço BRUTO médio DAQUELE ano.
                # (usar preço de hoje subestima; usar preço AJUSTADO infla — ambos errados.)
                raw = q.get("close") or cl
                px_year: Dict[int, list] = {}
                for i, t in enumerate(ts):
                    rc = raw[i] if i < len(raw) else None
                    if rc and rc > 0:
                        px_year.setdefault(dt.datetime.utcfromtimestamp(int(t)).year, []).append(float(rc))
                avg_px = {y: sum(v) / len(v) for y, v in px_year.items() if v}
                by_year: Dict[int, float] = {}
                for k, v in divs.items():
                    try:
                        y = dt.datetime.utcfromtimestamp(int(v.get("date", k))).year
                        by_year[y] = by_year.get(y, 0.0) + float(v.get("amount", 0) or 0)
                    except Exception:
                        continue
                annual = {y: round(amt / avg_px[y] * 100, 2)
                          for y, amt in by_year.items() if avg_px.get(y)}
        if want_annual:
            return df, dy, annual
        return df, dy
    except Exception as e:
        logger.warning(f"[CHART DF] {ticker} falhou: {e}")
        return (None, None, None) if want_annual else (None, None)


# ─────────────────────────── Cache em memória com TTL ───────────────────────────
RANKING_TTL = int(os.environ.get("RANKING_TTL", "1200"))      # ~20 min
MARKET_BAR_TTL = int(os.environ.get("MARKET_BAR_TTL", "300"))  # ~5 min

_cache: Dict[str, Tuple[float, dict]] = {}


def _cache_get(key: str, ttl: int) -> Optional[dict]:
    hit = _cache.get(key)
    if hit and (time.time() - hit[0]) < ttl:
        return hit[1]
    return None


def _cache_set(key: str, value: dict) -> None:
    _cache[key] = (time.time(), value)


# ─────────────────────────── Persistência do universo ───────────────────────────
_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
_UNIVERSE_FILE = os.path.join(_DATA_DIR, "ranking_universe.json")


def _load_overrides() -> Dict[str, dict]:
    """{'added': {cat: [[ticker,bucket,name],...]}, 'removed': {cat: [ticker,...]}}"""
    try:
        if os.path.exists(_UNIVERSE_FILE):
            with open(_UNIVERSE_FILE, "r", encoding="utf-8") as f:
                d = json.load(f)
            d.setdefault("added", {})
            d.setdefault("removed", {})
            return d
    except Exception as e:
        logger.warning(f"[RANKING] falha lendo overrides do universo: {e}")
    return {"added": {}, "removed": {}}


def _save_overrides(ov: Dict[str, dict]) -> None:
    try:
        os.makedirs(_DATA_DIR, exist_ok=True)
        with open(_UNIVERSE_FILE, "w", encoding="utf-8") as f:
            json.dump(ov, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"[RANKING] falha salvando overrides do universo: {e}")


def get_universe() -> Dict[str, List[dict]]:
    """UNIVERSE base MESCLADO com as adições/remoções persistidas."""
    ov = _load_overrides()
    out: Dict[str, List[dict]] = {}
    for cat, lst in UNIVERSE.items():
        removed = set(t.upper() for t in ov["removed"].get(cat, []))
        rows = [
            {"ticker": tk, "bucket": bucket, "name": name}
            for tk, bucket, name in lst
            if tk.upper() not in removed
        ]
        existing = set(r["ticker"].upper() for r in rows)
        for add in ov["added"].get(cat, []):
            tk, bucket, name = add[0], add[1], (add[2] if len(add) > 2 else add[0])
            if tk.upper() not in existing and tk.upper() not in removed:
                rows.append({"ticker": tk, "bucket": bucket, "name": name})
                existing.add(tk.upper())
        out[cat] = rows
    # categorias inteiramente novas vindas só dos overrides
    for cat, adds in ov["added"].items():
        if cat not in out:
            out[cat] = [
                {"ticker": a[0], "bucket": a[1], "name": (a[2] if len(a) > 2 else a[0])}
                for a in adds
            ]
    return out


def add_ticker(category: str, ticker: str, bucket: str, name: str) -> Dict[str, List[dict]]:
    ov = _load_overrides()
    ticker = ticker.strip()
    ov["added"].setdefault(category, [])
    # remove de 'removed' se estava marcado p/ remoção
    if category in ov["removed"]:
        ov["removed"][category] = [t for t in ov["removed"][category] if t.upper() != ticker.upper()]
    # evita duplicata na lista de adições
    ov["added"][category] = [a for a in ov["added"][category] if a[0].upper() != ticker.upper()]
    ov["added"][category].append([ticker, bucket, name])
    _save_overrides(ov)
    _cache.pop("ranking", None)  # invalida ranking p/ refletir o novo ativo
    return get_universe()


def remove_ticker(category: str, ticker: str) -> Dict[str, List[dict]]:
    ov = _load_overrides()
    ticker = ticker.strip()
    # se era uma adição, só remove da lista de adições
    if category in ov["added"]:
        ov["added"][category] = [a for a in ov["added"][category] if a[0].upper() != ticker.upper()]
    # marca remoção (cobre tickers do UNIVERSE base)
    ov["removed"].setdefault(category, [])
    if ticker.upper() not in (t.upper() for t in ov["removed"][category]):
        ov["removed"][category].append(ticker)
    _save_overrides(ov)
    _cache.pop("ranking", None)
    return get_universe()


# ─────────────────────────── Helpers de série (porte de run_ranking) ───────────────────────────
def _closes(df) -> Optional[np.ndarray]:
    try:
        c = df["Close"].astype(float).values
        return c if len(c) >= 60 else None
    except Exception:
        return None


def _dated_closes(df) -> List[Tuple[dt.date, float]]:
    """[(date, close)] a partir do índice do DataFrame."""
    out = []
    try:
        for ts, val in zip(df.index, df["Close"].astype(float).values):
            try:
                d = ts.date() if hasattr(ts, "date") else dt.date.fromisoformat(str(ts)[:10])
                out.append((d, float(val)))
            except Exception:
                continue
    except Exception:
        pass
    return out


def _dated_close_low(df):
    """[(date, close, low)] — close + MÍNIMA do dia (p/ liquidação INTRADIÁRIA no stress).
    Sem coluna Low (ou Low inválido), usa o close como low (sem informação intradiária).
    Garante low <= close (saneamento)."""
    out = []
    try:
        closes = df["Close"].astype(float).values
        lows = df["Low"].astype(float).values if "Low" in df.columns else closes
        for ts, c, lo in zip(df.index, closes, lows):
            try:
                d = ts.date() if hasattr(ts, "date") else dt.date.fromisoformat(str(ts)[:10])
                c = float(c)
                lo = float(lo) if (lo and lo > 0) else c
                out.append((d, c, min(lo, c)))
            except Exception:
                continue
    except Exception:
        pass
    return out


def _weekly_closes_from_df(df) -> List[float]:
    wk = {}
    for d, c in _dated_closes(df):
        y, w, _ = d.isocalendar()
        wk[(y, w)] = c
    return [wk[k] for k in sorted(wk)]


def _weekly_ohlc(df):
    """Agrega diário→semanal (high=máx, low=mín, close=último por semana ISO).
    INCLUI a semana corrente (parcial/ao vivo) — captura quedas/altas intra-semana
    (ex.: capitulação no meio da semana) que o gráfico da Quantfury também mostra.
    GUARD do candle quebrado: quando o Yahoo devolve high/low ≤0 p/ a semana em
    formação, usa o close no lugar — evita o stochastic disparar p/ valor falso."""
    H = df["High"].astype(float).values if "High" in df else df["Close"].astype(float).values
    L = df["Low"].astype(float).values if "Low" in df else df["Close"].astype(float).values
    C = df["Close"].astype(float).values
    wk = {}  # (y,w) -> [high, low, close]
    for ts, h, l, c in zip(df.index, H, L, C):
        d = ts.date() if hasattr(ts, "date") else dt.date.fromisoformat(str(ts)[:10])
        iso = d.isocalendar()
        key = (iso[0], iso[1])
        c = float(c)
        h = float(h) if h and h > 0 else c   # guard: high quebrado → usa close
        l = float(l) if l and l > 0 else c   # guard: low quebrado → usa close
        if key not in wk:
            wk[key] = [h, l, c]
        else:
            wk[key][0] = max(wk[key][0], h)
            wk[key][1] = min(wk[key][1], l)
            wk[key][2] = c  # último close da semana (a corrente = preço mais recente)
    keys = sorted(wk)  # mantém a semana corrente (ao vivo)
    return (np.array([wk[k][0] for k in keys]),
            np.array([wk[k][1] for k in keys]),
            np.array([wk[k][2] for k in keys]))


def weekly_stoch_kd(df, n: int = 14):
    """Stochastic semanal estilo Quantfury "14 1 3", com MÁX/MÍN reais.
    Retorna (%K, %D): %K = stochastic rápido bruto (último); %D = SMA3 do %K (linha lenta)."""
    try:
        H, L, C = _weekly_ohlc(df)
        if len(C) < n + 1:
            return (None, None)
        fast = []
        for i in range(n - 1, len(C)):
            hh = H[i - n + 1:i + 1].max()
            ll = L[i - n + 1:i + 1].min()
            fast.append((C[i] - ll) / (hh - ll) * 100 if hh > ll else 50.0)
        k = float(fast[-1])
        d = float(np.mean(fast[-3:])) if len(fast) >= 3 else k
        return (k, d)
    except Exception:
        return (None, None)


def slow_stoch_weekly(df, n: int = 14) -> Optional[float]:
    """Linha LENTA (%D) do stochastic semanal — é a que pontua no score de momento."""
    return weekly_stoch_kd(df, n)[1]


def _datemap(df) -> Dict[str, float]:
    return {d.isoformat(): c for d, c in _dated_closes(df)}


def beta_aligned(asset_df, idx_dmap: Optional[Dict[str, float]]) -> Optional[float]:
    """Beta alinhado POR DATA (corrige desalinhamento ^BVSP x ações BR)."""
    if not idx_dmap:
        return None
    pairs = [
        (c, idx_dmap[d.isoformat()])
        for d, c in _dated_closes(asset_df)
        if d.isoformat() in idx_dmap
    ]
    if len(pairs) < 60:
        return None
    pairs = pairs[-252:]
    a = np.array([p[0] for p in pairs])
    ix = np.array([p[1] for p in pairs])
    ra = np.diff(np.log(a))
    ri = np.diff(np.log(ix))
    if np.var(ri) == 0:
        return None
    return float(np.cov(ra, ri)[0, 1] / np.var(ri))


def _beta_corr_sigma(asset_df, idx_dmap: Optional[Dict[str, float]], window: int = 252):
    """(beta, correlação, σ_ação/σ_índice) alinhados POR DATA. corr baixa + σ alta =
    assinatura de cíclica descolada (ex: PETR4 corr 0.26) — usado p/ detectar TÁTICO.
    window: janela de pregões. 252 (1a) p/ tático (descolamento recente); janela longa
    (1260=5a) p/ o VALOR do beta — a de 1a dá NEGATIVO em defensiva US (artefato)."""
    if not idx_dmap:
        return (None, None, None)
    pairs = [(c, idx_dmap[d.isoformat()]) for d, c in _dated_closes(asset_df)
             if d.isoformat() in idx_dmap]
    if len(pairs) < 60:
        return (None, None, None)
    pairs = pairs[-window:]
    a = np.array([p[0] for p in pairs]); ix = np.array([p[1] for p in pairs])
    ra = np.diff(np.log(a)); ri = np.diff(np.log(ix))
    if np.var(ri) == 0 or ra.std() == 0 or ri.std() == 0:
        return (None, None, None)
    beta = float(np.cov(ra, ri)[0, 1] / np.var(ri))
    corr = float(np.corrcoef(ra, ri)[0, 1])
    sigma_ratio = float(ra.std() / ri.std())
    return (beta, corr, sigma_ratio)


def _drawdown_option_b(a_long: np.ndarray, recent_years: int = 10, w_recent: float = 0.6):
    """Opção B (decisão do usuário): usa o PIOR drawdown de toda a história, mas pondera
    mais os últimos ~10 anos (empresa pode ter mudado — ex: Petrobras pós-Lava Jato).
    Retorna (dd_efetivo, dd_full_historico, dd_recente)."""
    dd_full = _max_dd(a_long)
    if dd_full is None:
        return (None, None, None)
    n = int(recent_years * 252)
    a_rec = a_long[-n:] if len(a_long) > n else a_long
    dd_rec = _max_dd(a_rec)
    if dd_rec is None:
        dd_rec = dd_full
    dd_eff = w_recent * dd_rec + (1.0 - w_recent) * dd_full
    return (dd_eff, dd_full, dd_rec)


def _recovered_after_maxdd(a: np.ndarray):
    """Após o PIOR tombo, a ação recuperou o topo anterior? (queda que não volta é pior).
    Retorna (recuperou_bool, anos_p/_recuperar, anos_desde_o_fundo).
    anos_desde_o_fundo separa 'antigo/impairment permanente' de 'recente/oportunidade'."""
    if a is None or len(a) < 252:
        return (None, None, None)
    rm = np.maximum.accumulate(a)
    dd = (a - rm) / rm
    trough = int(np.argmin(dd))
    peak_before = rm[trough]
    after = a[trough:]
    years_since_trough = round((len(a) - 1 - trough) / 252.0, 1)
    hit = np.where(after >= peak_before)[0]
    if len(hit):
        return (True, round(hit[0] / 252.0, 1), years_since_trough)
    return (False, None, years_since_trough)


def _dividend_consistency(annual_dy: Optional[Dict[int, float]], years: int = 10):
    """(DY médio dos últimos `years` anos, pior ano). O pior ano expõe corte em crise
    (PETR4 pagou 0% em 2020) — é o que separa renda confiável de janela de lucro."""
    if not annual_dy:
        return (None, None)
    this_year = dt.date.today().year
    # EXCLUI o ano corrente (incompleto) — senão entra com DY parcial baixo e vira "pior ano" falso.
    yrs = [y for y in annual_dy if (this_year - years) <= y < this_year]
    if not yrs:
        return (None, None)
    vals = [max(0.0, float(annual_dy[y])) for y in yrs]
    avg = sum(vals) / len(vals)
    # pior ano só conta como "corte" se a série cobre vários anos (senão jovem demais)
    worst = min(vals) if len(yrs) >= 4 else None
    return (round(avg, 2), (round(worst, 2) if worst is not None else None))


def _growth5y(a: np.ndarray) -> Optional[float]:
    if a is None or len(a) < 252:
        return None
    yrs = len(a) / 252.0
    return float(((a[-1] / a[0]) ** (1 / yrs) - 1) * 100)


def _sharpe(a: np.ndarray) -> Optional[float]:
    if a is None or len(a) < 252:
        return None
    r = np.diff(np.log(a[-756:] if len(a) >= 756 else a))
    return float(r.mean() / r.std() * math.sqrt(252)) if r.std() > 0 else None


def _max_dd(a: np.ndarray) -> Optional[float]:
    if a is None or len(a) == 0:
        return None
    rm = np.maximum.accumulate(a)
    return float(np.min((a - rm) / rm) * 100)


def _rsi(a: np.ndarray, n: int = 14) -> Optional[float]:
    if a is None or len(a) < n + 1:
        return None
    diff = np.diff(a[-(n + 1) * 3:])
    if len(diff) < n:
        return None
    gains = np.where(diff > 0, diff, 0.0)
    losses = np.where(diff < 0, -diff, 0.0)
    ag = gains[-n:].mean()
    al = losses[-n:].mean()
    if al == 0:
        return 100.0
    rs = ag / al
    return float(100 - 100 / (1 + rs))


def _distance_ma200(a: np.ndarray) -> Optional[float]:
    if a is None or len(a) < 200:
        return None
    return float((a[-1] / np.mean(a[-200:]) - 1) * 100)


def _distance_ma200_weekly(df, current_price=None) -> Optional[float]:
    """Distância % da MM200 SEMANAL (média de 200 semanas ≈ 4 anos) — coerente com o
    gráfico semanal que o usuário acompanha. Usa o preço atual (live) sobre a média longa."""
    try:
        _, _, C = _weekly_ohlc(df)
        if len(C) < 60:
            return None
        ma = float(np.mean(C[-200:])) if len(C) >= 200 else float(np.mean(C))
        p = float(current_price) if current_price else float(C[-1])
        return (p / ma - 1) * 100 if ma else None
    except Exception:
        return None


# Detecção automática de TÁTICO (cíclica descolada): corr baixa + volatilidade alta.
_TATICO_CORR_MAX = 0.40       # anda pouco com o índice (PETR4 0.26)
_TATICO_SIGMA_MIN = 1.40      # e balança bem mais que o índice
# WHITELIST: empresas de qualidade que a regra de dados poderia marcar errado (corr baixa por
# motivo idiossincrático bom, não por ser cíclica de commodity). NUNCA viram TÁTICO automático.
_TATICO_WHITELIST = {
    "WEGE3.SA", "ITUB4.SA", "ITSA4.SA", "BBSE3.SA", "TAEE11.SA", "EGIE3.SA",
    "VIVT3.SA", "ABEV3.SA", "RADL3.SA", "RENT3.SA", "B3SA3.SA", "WEGE3",
}


# ─────────────────────────── Regime (porte de run_ranking) ───────────────────────────
MULT = {"CAPIT.EXTREMA": 5, "CAPITULACAO": 4, "NEUTRO": 3, "TOPO": 2}

# #15b — financeiras/bancos: no crivo de qualidade, ROIC e FCF não fazem sentido e D/E alto é o
# NEGÓCIO (não risco). Whitelist curada (honesta/barata/auditável — não há setor parseado das fontes).
_FINANCEIRAS = {
    # BR — bancos
    "ITUB4.SA", "ITUB3.SA", "BBAS3.SA", "BBDC4.SA", "BBDC3.SA", "SANB11.SA",
    "BPAC11.SA", "ITSA4.SA", "ITSA3.SA",
    # BR — bolsa / infraestrutura financeira
    "B3SA3.SA",
    # BR — seguradoras (ROE é o pilar; D/E alto e sem ROIC/FCF = mesmo padrão que banco)
    "BBSE3.SA",   # BB Seguridade
    "PSSA3.SA",   # Porto Seguro
    # US — bancos, financeiras, pagamentos
    "JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "SCHW", "AXP", "V", "MA", "BRK-B", "BRK.B",
}


def regime(idx: Optional[np.ndarray]) -> str:
    if idx is None or len(idx) < 210:
        return "NEUTRO"
    ma = np.mean(idx[-200:])
    dist = (idx[-1] / ma - 1) * 100
    hi = np.max(idx[-252:])
    dd = (idx[-1] / hi - 1) * 100
    if dd <= -30:
        return "CAPIT.EXTREMA"
    if dd <= -18 or dist <= -12:
        return "CAPITULACAO"
    if dist >= 10 and dd > -3:
        return "TOPO"
    return "NEUTRO"


def _verdict_order(v: str) -> int:
    order = {"COMPRAR FORTE": 0, "COMPRAR": 1, "JUSTO": 2,
             "ESPECULATIVO": 3, "ESTICADO": 4, "RESERVA": 5}
    return order.get(v, 9)


def _round_or_none(v, ndigits=1):
    return round(v, ndigits) if v is not None else None


# ─────────────────────────── RANKING ───────────────────────────
def _fetch_indices() -> Tuple[Dict[str, Optional[np.ndarray]], Dict[str, Optional[dict]], str]:
    idxc: Dict[str, Optional[np.ndarray]] = {}
    idxdm: Dict[str, Optional[dict]] = {}
    # DX-Y.NYB (DXY) e JPY=X (USD/JPY) entram p/ o REGIME de crypto (proxy de liquidez +
    # carry do iene). São tickers especiais → chart API confiável (mesmo padrão dos índices).
    for ix in set(INDEX_BY_CAT.values()) | {"^GSPC", "DX-Y.NYB", "JPY=X"}:
        # Índices são tickers especiais (^...) → chart API confiável (evita sintético)
        closes, dm = _chart_api_series(ix, 6 * 366)
        idxc[ix] = closes
        idxdm[ix] = dm
    equity_regime = regime(idxc.get("^GSPC"))
    return idxc, idxdm, equity_regime


def _pct_change_recent(closes: Optional[np.ndarray], lookback: int = 63) -> Optional[float]:
    """Variação % nos últimos ~3 meses (63 pregões). Usado p/ DXY/USDJPY no regime crypto.
    None se série ausente/curta (fator omitido → renormaliza no scorer de crypto)."""
    if closes is None or len(closes) < lookback + 1:
        return None
    base = float(closes[-lookback - 1])
    if base == 0:
        return None
    return float((closes[-1] / base - 1) * 100)


def _ma200_slope(a: np.ndarray, lookback: int = 40) -> Optional[float]:
    """Direção da MM200: variação % da média de 200 dias nos últimos ~2 meses.
    >0 = subindo (tendência longa saudável); <0 = caindo (deterioração)."""
    if a is None or len(a) < 200 + lookback:
        return None
    ma = np.convolve(a, np.ones(200) / 200, mode="valid")
    if len(ma) < lookback + 1:
        return None
    base = ma[-1 - lookback]
    return float((ma[-1] / base - 1) * 100) if base else None


def _crypto_verdict(momentum: float, quality: float) -> str:
    """Veredito de aporte p/ CRYPTO. Sobrevivência (quality) é o portão de não-ir-a-zero;
    REGIME+TIMING (momentum) é a oportunidade. Mais conservador que ações: crypto pede
    sobrevivência mínima decente p/ COMPRAR FORTE (sem dividendo/fundamento que ampare)."""
    if momentum >= 65:
        if quality >= 60:
            return "COMPRAR FORTE"
        if quality >= 40:
            return "COMPRAR"
        return "ESPECULATIVO"
    if momentum >= 52:
        if quality >= 40:
            return "COMPRAR"
        return "ESPECULATIVO"
    if momentum >= 42:
        return "JUSTO"
    return "ESTICADO"


def _analyze_crypto(tk, name, bucket, cat, df, a, a_long, current_price=None,
                    sstoch=None, stoch_k=None, stoch_d=None, dma=None,
                    disc=None, rev=None, wclose=None, use_wk=False, idxc=None) -> Optional[dict]:
    """
    Caminho dedicado de scoring p/ CRYPTO (framework ratificado Pal/Hayes/Woo).
    Fatores GRÁTIS: liquidez/marketcap/dominância (CoinGecko), Lindy (tabela estática),
    funding + circuit breaker (Binance free), regime DXY/USDJPY/BTC (Yahoo chart),
    momentum técnico de preço. On-chain pago OMITIDO → renormaliza (REGRA DE OURO).
    Blindado: qualquer falha → None (o chamador cai no genérico). Nunca derruba o ranking.
    """
    try:
        idxc = idxc or {}
        # Fatores externos GRÁTIS (CoinGecko/Binance). CD ausente/falha → tudo None (renormaliza).
        cd = CD.fetch_all(tk) if CD is not None else {}
        symbol = (cd.get("symbol") or tk.upper().replace("-USD", ""))

        # Regime: DXY + USD/JPY (variação ~3m) + regime de preço do próprio BTC.
        dxy_change = _pct_change_recent(idxc.get("DX-Y.NYB"))
        usdjpy_change = _pct_change_recent(idxc.get("JPY=X"))
        btc_reg = regime(idxc.get("BTC-USD"))

        score = S.compute_crypto_score(
            volume_24h=cd.get("volume_24h"), market_cap_rank=cd.get("market_cap_rank"),
            btc_dominance=cd.get("btc_dominance"), age_years=cd.get("age_years"),
            onchain_z=None,   # OMITIDO (Glassnode pago) → renormaliza
            symbol=symbol,
            dxy_change=dxy_change, usdjpy_change=usdjpy_change, btc_regime=btc_reg,
            funding_rate=cd.get("funding_rate"),
            slow_stoch_weekly=sstoch, distance_ma200=dma,
            discount_from_top=disc, reversal_confirmation=rev,
            mvrv_z=None, reserve_risk=None, puell=None, sopr=None,  # OMITIDOS (pago)
            oi_percentile=None, funding_percentile=None,            # sem histórico p90 grátis confiável
        )

        quality = score["quality"]
        momentum = score["momentum"]
        confidence = score["confidence"]

        # Métricas de display (mesmas dos ativos de ações, p/ a linha não ficar vazia).
        dd, dd_full, dd_recent = _drawdown_option_b(a_long)
        shp = _sharpe(a)
        rsi = _rsi(wclose if use_wk else a)
        hist_years = round(len(a_long) / 252.0, 1)
        day_change_pct = ((a[-1] / a[-2] - 1) * 100) if len(a) >= 2 and a[-2] else None

        if bucket == "RESERVA":
            verdict = "RESERVA"
        else:
            verdict = _crypto_verdict(momentum, quality)
            if confidence == "BAIXA" and verdict == "COMPRAR FORTE":
                verdict = "COMPRAR"   # sem on-chain estrutural → não alavanca no talo

        reg_display = btc_reg  # regime da CATEGORIA crypto = regime do BTC (líder)
        mult = MULT.get(reg_display, 3)

        # Alavancagem: teto POR ATIVO (BTC 2x · ETH 1.75x · top-10 1.25x · resto 1x), nunca >3x.
        # Circuit breaker (já refletido em leverage_cap=1 dentro do scorer) força 1x.
        lev_cap = score["leverage_cap"]
        is_buy_candidate = (momentum >= 50 or (dma is not None and dma < -3))
        leverage = float(mult) if (is_buy_candidate and bucket != "RESERVA") else 1.0
        leverage = min(leverage, lev_cap)
        if verdict == "ESPECULATIVO":
            leverage = min(leverage, 2.0)
        leverage = min(leverage, lev_cap)   # teto por ativo é inviolável

        rank = quality * 0.45 + momentum * 0.55
        stops = S.staggered_stops(leverage)

        return {
            "ticker": tk,
            "name": name,
            "bucket": bucket,
            "confidence": confidence,
            "current_price": _round_or_none(current_price, 2),
            "day_change_pct": _round_or_none(day_change_pct, 2),
            "currency": "USD",
            "verdict": verdict,
            "quality": round(quality),
            "momentum": round(momentum),
            "rank": round(rank, 1),
            "quality_breakdown": score["quality_breakdown"],
            "momentum_breakdown": score["momentum_breakdown"],
            "is_crypto": True,
            "crypto_omitted": score["omitted"],
            "circuit_breaker": score["circuit_breaker"],
            "regime_score": score["regime_score"],
            "timing_score": score["timing_score"],
            "survival_score": score["survival_score"],
            "leverage_cap_asset": lev_cap,
            # Fatores brutos p/ display/transparência.
            "volume_24h": cd.get("volume_24h"),
            "market_cap": cd.get("market_cap"),
            "market_cap_rank": cd.get("market_cap_rank"),
            "btc_dominance": _round_or_none(cd.get("btc_dominance"), 1),
            "age_years": cd.get("age_years"),
            "funding_rate": cd.get("funding_rate"),
            "dxy_change_3m": _round_or_none(dxy_change, 1),
            "usdjpy_change_3m": _round_or_none(usdjpy_change, 1),
            "slow_stoch_weekly": _round_or_none(sstoch, 0),
            "stoch_k": _round_or_none(stoch_k, 1),
            "stoch_d": _round_or_none(stoch_d, 1),
            "discount_from_top": _round_or_none(disc, 1),
            "distance_ma200": _round_or_none(dma, 1),
            "rsi": _round_or_none(rsi, 0),
            "beta": None,
            "beta_source": "n/a (crypto)",
            "cagr": None,
            "sharpe": _round_or_none(shp, 2),
            "dividend_yield": None,
            "max_dd": _round_or_none(dd, 0),
            "max_dd_full": _round_or_none(dd_full, 0),
            "max_dd_recent": _round_or_none(dd_recent, 0),
            "hist_years": hist_years,
            "is_tatico": False,
            "leverage": round(leverage, 1),
            "regime": reg_display,
            "staggered_stops": {
                "stop_1_pct": stops.get("stop_1_pct"),
                "stop_2_pct": stops.get("stop_2_pct"),
                "liquidation_pct": stops.get("liquidation_pct"),
            },
            "stop_note": "stop por FECHAMENTO SEMANAL (nunca intraday — wicks liquidam no fundo)",
        }
    except Exception as e:
        logger.warning(f"[RANKING][CRYPTO] {tk} falhou no scorer dedicado: {e}")
        return None


def _analyze(tk: str, bucket: str, name: str, cat: str,
             idxc: dict, idxdm: dict, equity_regime: str) -> Optional[dict]:
    try:
        # PREÇOS via chart API confiável (yfinance cai em SINTÉTICO em prod → preços errados).
        # Fetch LONGO (desde ~2000) p/ TODOS — drawdown histórico real (opção B) + dividendo 10a.
        # want_div=True traz o dividend yield dos dividendos REAIS (yfinance .info falhava → DY nulo).
        is_br = tk.upper().endswith(".SA")
        df_full, dy_chart, annual_dy = _chart_api_df(tk, 25 * 366, want_div=True, want_annual=True)
        if df_full is None or len(df_full) < 200:
            return None
        a_long = df_full["Close"].astype(float).values        # histórico completo (~25a)
        # Janela recente ~6a p/ momentum/CAGR/Sharpe/beta-regressão (mantém o comportamento).
        df = df_full.tail(1500) if len(df_full) > 1500 else df_full
        a = _closes(df)
        if a is None:
            return None

        # Fundamentos REAIS (FMP p/ US/Europa, brapi p/ BR; crypto/índices → None).
        fund = get_fundamentals(tk) or {}
        _idm = idxdm.get(INDEX_BY_CAT.get(cat))
        beta_reg, corr, sigma_ratio = _beta_corr_sigma(df, _idm)              # 1a → tático
        beta_long, _, _ = _beta_corr_sigma(df, _idm, window=1260)             # 5a → valor estável
        # BETA: FMP publicado é primário; senão regressão de 5a (que NÃO dá negativo);
        # 1a só em último caso. A de 1a sozinha dá beta negativo p/ defensivas US (artefato).
        if fund.get("beta") is not None:
            beta, beta_source = fund.get("beta"), (fund.get("source") or "fmp")
        else:
            _note = fund.get("beta_note")
            _suf = f":{_note}" if _note else ""           # diagnóstico do porquê a FMP falhou
            if beta_long is not None:
                beta, beta_source = beta_long, "reg5a" + _suf
            else:
                beta, beta_source = beta_reg, "reg1a" + _suf

        # TÁTICO: cíclica descolada (corr baixa + σ alta) OU bucket curado, exceto whitelist.
        # Auto-detecção limitada ao BRASIL por enquanto (whitelist é BR; americanas serão tratadas
        # num bloco próprio com beta/dividendos da FMP). US/outros usam só o bucket curado.
        auto_tatico = (is_br
                       and corr is not None and sigma_ratio is not None
                       and corr < _TATICO_CORR_MAX and sigma_ratio > _TATICO_SIGMA_MIN
                       and tk.upper() not in _TATICO_WHITELIST)
        is_tatico = (bucket == "TATICO") or auto_tatico

        # Série SEMANAL de fechamentos (inclui a semana corrente) — usada em
        # desconto, reversão e RSI p/ ficar coerente com o gráfico semanal.
        wclose = np.array(_weekly_closes_from_df(df), dtype=float)
        use_wk = len(wclose) >= 20

        dma = _distance_ma200_weekly(df, current_price=a[-1])  # MM200 SEMANAL (bate c/ o gráfico)
        disc = I.distance_from_ath(wclose if use_wk else a) or 0.0
        rev = I.reversal_confirmation(wclose if use_wk else a)
        stoch_k, stoch_d = weekly_stoch_kd(df)                 # %K e %D semanais (máx/mín reais)
        sstoch = stoch_d                                       # linha lenta pontua no score

        # ─────────────────────── CRYPTO: framework SEPARADO ───────────────────────
        # Crypto NÃO usa o blend de ações (sem fundamentos/dividendo/Beta-vs-SPY/SELIC).
        # Roteia p/ compute_crypto_score com fatores GRÁTIS (CoinGecko/Binance/Yahoo).
        # On-chain pago (MVRV-Z/Reserve/Puell/SOPR/z-score) OMITIDO → renormaliza.
        if cat == "CRYPTO":
            res = _analyze_crypto(
                tk, name, bucket, cat, df, a, a_long, current_price=float(a[-1]) if len(a) else None,
                sstoch=sstoch, stoch_k=stoch_k, stoch_d=stoch_d, dma=dma,
                disc=disc, rev=rev, wclose=wclose, use_wk=use_wk,
                idxc=idxc)
            if res is not None:
                return res
            # Falha no caminho crypto → cai no genérico abaixo (blindagem; nunca derruba).

        g5 = _growth5y(a)
        # Drawdown OPÇÃO B: pior tombo da história, ponderando mais os últimos ~10a (BR).
        dd, dd_full, dd_recent = _drawdown_option_b(a_long)
        recovered, recovery_years, years_since_trough = _recovered_after_maxdd(a_long)
        # Modificador de recovery na nota de máxDD (decisão do usuário: só castigo, sem bônus):
        # caiu há >3 anos e NUNCA recuperou = impairment permanente → ×0.7. Recente → não pune.
        if recovered is False and years_since_trough is not None and years_since_trough > 3:
            dd_recovery_mult = 0.7
        else:
            dd_recovery_mult = 1.0
        hist_years = round(len(a_long) / 252.0, 1)            # história real (fetch longo p/ todos)
        hist_curto = hist_years < 15                          # jovem = não testada em crise antiga
        shp = _sharpe(a)
        rsi = _rsi(wclose if use_wk else a)                   # RSI SEMANAL

        # Dividendo por CONSISTÊNCIA (média 10a + pior ano) — BR. Fallback: trailing.
        dy = dy_chart if dy_chart else fund.get("dividend_yield")  # dividendos reais; fallback fund
        dy_avg10, dy_worst = _dividend_consistency(annual_dy)
        cagr = g5  # CAGR de PREÇO (retorno total, ~6 anos) — fica só no anti-faca/display, NÃO na Qualidade

        # CRESCIMENTO REAL da empresa (#15a): receita (60%, menos manipulável que EPS) + lucro/EPS (40%),
        # em %. Substitui o g5 de PREÇO na nota de Qualidade (quebra a circularidade "preço sobe→empresa
        # boa"). Só US (Finnhub) traz; ausente (BR/jovem) → None → o blend renormaliza SEM o crescimento
        # (não injeta 50 falso). NUNCA cair no g5 de preço aqui.
        _rg, _eg = fund.get("rev_growth_5y"), fund.get("eps_growth_5y")
        if _rg is not None and _eg is not None:
            fund_growth = _rg * 0.6 + _eg * 0.4
        else:
            fund_growth = _rg if _rg is not None else _eg   # o que houver; senão None
        # Crescimento RECENTE (TTM) p/ o anti-faca #15c (apodrecimento atual) — mesmo blend 60/40.
        _rt, _et = fund.get("rev_growth_ttm"), fund.get("eps_growth_ttm")
        if _rt is not None and _et is not None:
            recent_growth = _rt * 0.6 + _et * 0.4
        else:
            recent_growth = _rt if _rt is not None else _et

        # Preço atual, variação diária e moeda — para exibição na linha do ranking.
        current_price = float(a[-1]) if len(a) else None
        day_change_pct = ((a[-1] / a[-2] - 1) * 100) if len(a) >= 2 and a[-2] else None
        currency = "BRL" if tk.upper().endswith(".SA") else "USD"
        tsr = (dy or 0.0) + (g5 or 0.0)  # TSR esperado proxy = dividend yield + crescimento

        reg = regime(idxc.get(INDEX_BY_CAT.get(cat)))
        mult = MULT.get(reg, 3)

        # MOMENTO primeiro: o beta da Qualidade é AMPLIFICADOR e depende do momento.
        momentum, mb = S.compute_momentum(
            slow_stoch_weekly=sstoch, discount_from_top=disc,
            reversal_confirmation=rev, distance_ma200=dma,
        )
        quality, qb = S.compute_quality_blend(
            beta=beta, max_dd_pct=dd, dividend_yield=dy, growth_5y=fund_growth,
            roe=fund.get("roe"), debt_to_equity=fund.get("debt_to_equity"),
            payout_ratio=fund.get("payout_ratio"), roic=fund.get("roic"),
            fcf_yield=fund.get("fcf_yield"), sharpe=shp, cagr=cagr, tsr_expected=tsr,
            momentum=momentum, is_tatico=is_tatico,
            dy_avg10=dy_avg10, dy_worst=dy_worst, dd_recovery_mult=dd_recovery_mult,
            # ETF/commodity NÃO são empresas → fundamentos não se aplicam (renormaliza o termo
            # em vez de fingir 50). Ações (BR/US/Europa) mantêm o termo: são empresas — ausência
            # de dado é falta de cobertura, não estrutura (não julgar empresa só pelo preço).
            fundamentals_apply=(cat not in ("ETF", "COMMODITY")),
        )

        # SELO DE CONFIANÇA (movido p/ ANTES do veredito — o crivo #15b precisa dele).
        # Dado faltando não pode parecer "mediano" 50: ALTA = fundamentos + beta publicado (ou
        # crypto/índice, onde preço/momentum bastam); BAIXA = sem fundamentos + beta de regressão.
        _no_fund_cat = (cat == "CRYPTO") or tk.startswith("^") or "=" in tk
        _has_fund = any(fund.get(k) is not None for k in ("roe", "payout_ratio", "debt_to_equity"))
        _beta_pub = beta_source in ("finnhub", "fmp")
        if _no_fund_cat or (_has_fund and _beta_pub):
            confidence = "ALTA"
        elif _has_fund or _beta_pub:
            confidence = "MEDIA"
        else:
            confidence = "BAIXA"

        if bucket == "RESERVA":
            verdict = "RESERVA"
        else:
            verdict = S.aporte_verdict(momentum, quality)

            # ANTI-FACA (#15c): faca = NEGÓCIO encolhendo (crescimento REAL de 5a < 0, OU recente
            # TTM apodrecendo), não só preço barato. Carry ZERO (Quantfury) → sem custo de carrego a
            # vencer. Preço de 6a (cagr) só como FALLBACK sem dado real (BR). Cíclica: queda recente
            # é o CICLO (a compra), não rot → usa só o preço.
            if verdict in ("COMPRAR FORTE", "COMPRAR") and S.is_falling_knife(
                    fund_growth, recent_growth, cagr, is_tatico=is_tatico):
                verdict = "ESPECULATIVO"

            # CRIVO DE QUALIDADE-REAL POR TIPO (#15b): porteira de fundamentos da EMPRESA (não preço).
            # Rebaixa 1 degrau se a qualidade-real não passa o piso (afrouxado pela confiança). Falta de
            # dado NÃO barra (crivo não opina). Tipo: financeira (whitelist)/cíclica (is_tatico)/normal.
            tipo_crivo = ("financeira" if tk.upper() in _FINANCEIRAS
                          else ("ciclica" if is_tatico else "normal"))
            crivo_nota, _crivo_n = S.score_quality_crivo(
                tipo_crivo, roe=fund.get("roe"), roic=fund.get("roic"),
                fcf_yield=fund.get("fcf_yield"), debt_to_equity=fund.get("debt_to_equity"),
                dy_avg10=dy_avg10, dy_worst=dy_worst, dividend_yield=dy,
                growth_5y=fund_growth, confidence=confidence)
            if crivo_nota is not None and crivo_nota < S.crivo_piso(confidence):
                if verdict == "COMPRAR FORTE":
                    verdict = "COMPRAR"
                elif verdict == "COMPRAR":
                    verdict = "JUSTO"

            # Confiança BAIXA não alavanca no talo sobre "50 falso" → no máximo COMPRAR.
            if confidence == "BAIXA" and verdict == "COMPRAR FORTE":
                verdict = "COMPRAR"

        # REGRA DO OURO: ouro em capitulação do mercado de ações → hedge → COMPRAR FORTE (override).
        if tk.upper() in ("GLD", "GC=F") and equity_regime in ("CAPITULACAO", "CAPIT.EXTREMA"):
            verdict = "COMPRAR FORTE"

        rank = quality * 0.45 + momentum * 0.55  # #15b: oportunidade decide o desempate (comprar bem)

        # Alavancagem = multiplicador do regime; só em candidato de compra (não RESERVA)
        is_buy_candidate = (momentum >= 50 or (dma is not None and dma < -3))
        leverage = float(mult) if (is_buy_candidate and bucket != "RESERVA") else 1.0
        # Crypto NÃO segue o 4x/5x do regime — teto 3x (defensivo não convive c/ 5x em BTC).
        if cat == "CRYPTO":
            leverage = min(leverage, 3.0)
        # ESPECULATIVO (faca) → teto 2x. #15b: COMPRAR de qualidade BAIXA (<50) → teto 3x mesmo em
        # capitulação (participa da pechincha, sem o talo de alavancagem sem qualidade comprovada).
        if verdict == "ESPECULATIVO":
            leverage = min(leverage, 2.0)
        elif verdict == "COMPRAR" and quality is not None and quality < 50:
            leverage = min(leverage, 3.0)
        # SHY = reserva: na Quantfury só dá p/ ter até US$10k de notional → "alavancagem" de SHY
        # é irrelevante. Não força leverage aqui; fica fora da medida na carteira.
        stops = S.staggered_stops(leverage)

        return {
            "ticker": tk,
            "name": name,
            "bucket": bucket,
            "confidence": confidence,
            "current_price": _round_or_none(current_price, 2),
            "day_change_pct": _round_or_none(day_change_pct, 2),
            "currency": currency,
            "verdict": verdict,
            "quality": round(quality),
            "momentum": round(momentum),
            "rank": round(rank, 1),
            "quality_breakdown": qb,
            "momentum_breakdown": mb,
            "slow_stoch_weekly": _round_or_none(sstoch, 0),
            "stoch_k": _round_or_none(stoch_k, 1),
            "stoch_d": _round_or_none(stoch_d, 1),
            "discount_from_top": _round_or_none(disc, 1),
            "distance_ma200": _round_or_none(dma, 1),
            "rsi": _round_or_none(rsi, 0),
            "beta": _round_or_none(beta, 2),
            "beta_source": beta_source,
            "cagr": _round_or_none(g5, 0),
            "sharpe": _round_or_none(shp, 2),
            "dividend_yield": _round_or_none(dy, 1),
            "dy_avg10": _round_or_none(dy_avg10, 1),
            "dy_worst_year": _round_or_none(dy_worst, 1),
            "max_dd": _round_or_none(dd, 0),
            "max_dd_full": _round_or_none(dd_full, 0),
            "max_dd_recent": _round_or_none(dd_recent, 0),
            "recovered": recovered,
            "recovery_years": _round_or_none(recovery_years, 1),
            "years_since_trough": _round_or_none(years_since_trough, 1),
            "hist_years": hist_years,
            "hist_curto": hist_curto,
            "is_tatico": is_tatico,
            "tsr_expected": _round_or_none(tsr, 1),
            "leverage": round(leverage, 1),
            "regime": reg,
            "staggered_stops": {
                "stop_1_pct": stops.get("stop_1_pct"),
                "stop_2_pct": stops.get("stop_2_pct"),
                "liquidation_pct": stops.get("liquidation_pct"),
            },
        }
    except Exception as e:
        logger.warning(f"[RANKING] {tk} ({cat}) falhou: {e}")
        return None


import threading as _threading
_bg_refreshing: set = set()
_bg_lock = _threading.Lock()


def _start_bg_refresh() -> None:
    """Recalcula o ranking em segundo plano (1 por vez), sem bloquear quem pediu."""
    with _bg_lock:
        if "ranking" in _bg_refreshing:
            return
        _bg_refreshing.add("ranking")

    def _run():
        try:
            _recompute_ranking()
        except Exception as e:
            logger.warning(f"[RANKING] refresh em background falhou: {e}")
        finally:
            with _bg_lock:
                _bg_refreshing.discard("ranking")

    _threading.Thread(target=_run, daemon=True).start()


def compute_ranking(force: bool = False) -> dict:
    """
    Serve o cache na hora; recalcula em background quando vencido (stale-while-revalidate).
    Só bloqueia no PRIMEIRO cálculo (cache frio) ou com force=True.
    """
    entry = _cache.get("ranking")
    if not force and entry is not None:
        ts, val = entry
        if time.time() - ts < RANKING_TTL:
            return val                 # fresco
        _start_bg_refresh()            # vencido → devolve o velho já e atualiza por trás
        return val
    return _recompute_ranking()        # frio ou force → calcula síncrono


_compute_lock = _threading.Lock()


def _recompute_ranking() -> dict:
    """Cálculo pesado do ranking (~116 tickers, paralelizado). Atualiza o cache.
    Serializado: se outro thread (ex: warm-up) já calculou enquanto esperávamos o
    lock, reaproveita o resultado fresco em vez de recalcular tudo de novo."""
    with _compute_lock:
        entry = _cache.get("ranking")
        if entry is not None and (time.time() - entry[0]) < RANKING_TTL:
            return entry[1]
        return _recompute_ranking_inner()


def _recompute_ranking_inner() -> dict:
    universe = get_universe()
    idxc, idxdm, equity_regime = _fetch_indices()

    # PARALELIZA: ~116 tickers em sequência levam minutos (fetch_price_history +
    # fetch_fundamentals/.info por ticker). São I/O de rede → ThreadPool corta p/ ~dezenas de seg.
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = [(cat, r) for cat, rows in universe.items() for r in rows]
    by_cat: Dict[str, list] = {cat: [] for cat in universe.keys()}

    def _work(cat, r):
        return cat, _analyze(r["ticker"], r["bucket"], r.get("name", r["ticker"]),
                             cat, idxc, idxdm, equity_regime)

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = [ex.submit(_work, cat, r) for cat, r in tasks]
        for fut in as_completed(futures):
            try:
                cat, res = fut.result()
                if res:
                    by_cat[cat].append(res)
            except Exception as e:
                logger.warning(f"[RANKING] análise paralela falhou: {e}")

    categories: Dict[str, dict] = {}
    for cat in universe.keys():
        assets = by_cat.get(cat, [])
        assets.sort(key=lambda x: (_verdict_order(x["verdict"]), -x["rank"]))
        reg = assets[0]["regime"] if assets else regime(idxc.get(INDEX_BY_CAT.get(cat)))
        for a in assets:
            a.pop("regime", None)  # regime fica no nível da categoria
        mult_display = MULT.get(reg, 3)
        if cat == "CRYPTO":
            mult_display = min(mult_display, 3)  # crypto trava 3x → cabeçalho coerente c/ as linhas
        categories[cat] = {
            "regime": reg,
            "multiplier": mult_display,
            "assets": assets,
        }

    result = {"categories": categories, "generated_at": dt.datetime.utcnow().isoformat() + "Z"}
    _cache_set("ranking", result)
    return result


# ─────────────────────────── MARKET BAR ───────────────────────────
_MARKET_BAR_SPEC = [
    ("VIX", "VIX", "^VIX"),
    ("SPY", "SPY", "SPY"),
    ("QQQ", "QQQ", "QQQ"),
    ("IBOV", "IBOV", "^BVSP"),
    ("GOLD", "ouro", "GC=F"),
    ("USDBRL", "USD/BRL", "USDBRL=X"),
    ("BTC", "BTC", "BTC-USD"),
]


def _market_item(key: str, label: str, ticker: str) -> Optional[dict]:
    try:
        # Tickers especiais (^VIX, ^BVSP, GC=F, USDBRL=X, BTC-USD) → chart API confiável.
        a, _ = _chart_api_series(ticker, 2 * 366)
        if a is None or len(a) < 50:
            return None
        value = float(a[-1])
        prev = float(a[-2])
        day_change = (value / prev - 1) * 100 if prev else 0.0

        dma200 = _distance_ma200(a)
        hi52 = float(np.max(a[-252:])) if len(a) >= 252 else float(np.max(a))
        from_top = (value / hi52 - 1) * 100 if hi52 else 0.0

        capitulation = False
        if key == "VIX":
            # VIX alto = medo (não vale a regra de MM200)
            if value >= 30:
                context, status = "extremo", "danger"
            elif value >= 20:
                context, status = "elevado", "warning"
            elif value <= 13:
                context, status = "baixo", "good"
            else:
                context, status = "normal", "neutral"
        else:
            capitulation = (dma200 is not None and dma200 <= -18) or (from_top <= -30)
            if dma200 is not None:
                context = f"{dma200:+.0f}% MM200"
            else:
                context = f"{from_top:+.0f}% topo"
            if capitulation:
                status = "danger"
            elif dma200 is not None and dma200 <= -10:
                status = "warning"
            elif dma200 is not None and dma200 >= 10:
                status = "good"
            else:
                status = "neutral"

        return {
            "key": key,
            "label": label,
            "value": round(value, 2),
            "day_change_pct": round(day_change, 2),
            "context": context,
            "status": status,
            "capitulation": bool(capitulation),
        }
    except Exception as e:
        logger.warning(f"[MARKET BAR] {key} ({ticker}) falhou: {e}")
        return None


def compute_market_bar(force: bool = False) -> dict:
    """Barra de mercado (cache ~5min). Shape no contrato da API."""
    if not force:
        cached = _cache_get("market_bar", MARKET_BAR_TTL)
        if cached is not None:
            return cached

    items = []
    for key, label, ticker in _MARKET_BAR_SPEC:
        it = _market_item(key, label, ticker)
        if it:
            items.append(it)

    result = {"items": items, "generated_at": dt.datetime.utcnow().isoformat() + "Z"}
    _cache_set("market_bar", result)
    return result
