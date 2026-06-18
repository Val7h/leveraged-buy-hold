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
# Fallback p/ ambientes sem CA bundle (dado público via GET, sem credenciais).
_CHART_CTX_NOVERIFY = _ssl.create_default_context()
_CHART_CTX_NOVERIFY.check_hostname = False
_CHART_CTX_NOVERIFY.verify_mode = _ssl.CERT_NONE


def _chart_api_series(ticker: str, days: int):
    """(closes np.array, {date_iso: close}) via Yahoo chart API. (None, None) em falha."""
    try:
        end = int(_time.time())
        start = end - int(days * 86400)
        url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
               f"?period1={start}&period2={end}&interval=1d")
        req = _urlreq.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            r = _urlreq.urlopen(req, timeout=20, context=_CHART_CTX)
        except Exception:
            # CA bundle indisponível / erro de cert → tenta sem verificação (dado público)
            r = _urlreq.urlopen(req, timeout=20, context=_CHART_CTX_NOVERIFY)
        with r:
            d = _json.loads(r.read())
        res = d["chart"]["result"][0]
        ts = res["timestamp"]
        q = res["indicators"]["quote"][0]
        adj = (res["indicators"].get("adjclose") or [{}])[0].get("adjclose")
        cl = adj or q.get("close") or []
        pairs = [(t, c) for t, c in zip(ts, cl) if c is not None]
        if len(pairs) < 2:
            return None, None
        closes = np.array([c for _, c in pairs], dtype=float)
        dm = {dt.date.fromtimestamp(t).isoformat(): float(c) for t, c in pairs}
        return closes, dm
    except Exception as e:
        logger.warning(f"[CHART API] {ticker} falhou: {e}")
        return None, None


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


def _weekly_closes_from_df(df) -> List[float]:
    wk = {}
    for d, c in _dated_closes(df):
        y, w, _ = d.isocalendar()
        wk[(y, w)] = c
    return [wk[k] for k in sorted(wk)]


def slow_stoch_weekly(df, n: int = 14) -> Optional[float]:
    """Stochastic LENTO semanal (slow %K = SMA3 do %K) — porte de run_ranking."""
    wc = _weekly_closes_from_df(df)
    if len(wc) < n + 3:
        return None
    wc = np.array(wc, dtype=float)
    fast = []
    for i in range(n - 1, len(wc)):
        win = wc[i - n + 1:i + 1]
        lo, hi = win.min(), win.max()
        fast.append((wc[i] - lo) / (hi - lo) * 100 if hi > lo else 50.0)
    if len(fast) >= 3:
        return float(np.mean(fast[-3:]))
    return float(fast[-1]) if fast else None


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


# ─────────────────────────── Regime (porte de run_ranking) ───────────────────────────
MULT = {"CAPIT.EXTREMA": 5, "CAPITULACAO": 4, "NEUTRO": 3, "TOPO": 2}


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
    for ix in set(INDEX_BY_CAT.values()) | {"^GSPC"}:
        # Índices são tickers especiais (^...) → chart API confiável (evita sintético)
        closes, dm = _chart_api_series(ix, 6 * 366)
        idxc[ix] = closes
        idxdm[ix] = dm
    equity_regime = regime(idxc.get("^GSPC"))
    return idxc, idxdm, equity_regime


def _analyze(tk: str, bucket: str, name: str, cat: str,
             idxc: dict, idxdm: dict, equity_regime: str) -> Optional[dict]:
    try:
        df = fetch_price_history(tk, period="6y")
        if df is None or len(df) < 200:
            return None
        a = _closes(df)
        if a is None:
            return None

        fund = fetch_fundamentals(tk) or {}
        beta = beta_aligned(df, idxdm.get(INDEX_BY_CAT.get(cat)))
        if beta is None:
            beta = fund.get("beta")

        dma = _distance_ma200(a)
        disc = I.distance_from_ath(a) or 0.0
        rev = I.reversal_confirmation(a)
        sstoch = slow_stoch_weekly(df)
        g5 = _growth5y(a)
        dd = _max_dd(a)
        shp = _sharpe(a)
        rsi = _rsi(a)

        dy = fund.get("dividend_yield")
        cagr = g5  # CAGR de preço (proxy de retorno total)
        tsr = (dy or 0.0) + (g5 or 0.0)  # TSR esperado proxy = dividend yield + crescimento

        reg = regime(idxc.get(INDEX_BY_CAT.get(cat)))
        mult = MULT.get(reg, 3)

        quality, qb = S.compute_quality_blend(
            beta=beta, max_dd_pct=dd, dividend_yield=dy, growth_5y=g5,
            roe=fund.get("roe"), debt_to_equity=fund.get("debt_to_equity"),
            payout_ratio=fund.get("payout_ratio"), roic=fund.get("roic"),
            fcf_yield=fund.get("fcf_yield"), sharpe=shp, cagr=cagr, tsr_expected=tsr,
        )
        momentum, mb = S.compute_momentum(
            slow_stoch_weekly=sstoch, discount_from_top=disc,
            reversal_confirmation=rev, distance_ma200=dma,
        )

        if bucket == "RESERVA":
            verdict = "RESERVA"
        else:
            verdict = S.aporte_verdict(momentum, quality)
        # REGRA DO OURO: ouro em capitulação do mercado de ações → hedge → comprar forte
        if tk.upper() in ("GLD", "GC=F") and equity_regime in ("CAPITULACAO", "CAPIT.EXTREMA"):
            verdict = "COMPRAR FORTE"

        rank = quality * 0.55 + momentum * 0.45  # qualidade manda (hold de décadas)

        # Alavancagem = multiplicador do regime; só em candidato de compra (não RESERVA)
        is_buy_candidate = (momentum >= 50 or (dma is not None and dma < -3))
        leverage = float(mult) if (is_buy_candidate and bucket != "RESERVA") else 1.0
        stops = S.staggered_stops(leverage)

        return {
            "ticker": tk,
            "name": name,
            "bucket": bucket,
            "verdict": verdict,
            "quality": round(quality),
            "momentum": round(momentum),
            "rank": round(rank, 1),
            "quality_breakdown": qb,
            "momentum_breakdown": mb,
            "slow_stoch_weekly": _round_or_none(sstoch, 0),
            "discount_from_top": _round_or_none(disc, 1),
            "distance_ma200": _round_or_none(dma, 1),
            "rsi": _round_or_none(rsi, 0),
            "beta": _round_or_none(beta, 2),
            "cagr": _round_or_none(g5, 0),
            "sharpe": _round_or_none(shp, 2),
            "dividend_yield": _round_or_none(dy, 1),
            "max_dd": _round_or_none(dd, 0),
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


def compute_ranking(force: bool = False) -> dict:
    """Recalcula o ranking por categoria (cache ~20min). Shape no contrato da API."""
    if not force:
        cached = _cache_get("ranking", RANKING_TTL)
        if cached is not None:
            return cached

    universe = get_universe()
    idxc, idxdm, equity_regime = _fetch_indices()

    categories: Dict[str, dict] = {}
    for cat, rows in universe.items():
        assets = []
        for r in rows:
            res = _analyze(r["ticker"], r["bucket"], r.get("name", r["ticker"]),
                           cat, idxc, idxdm, equity_regime)
            if res:
                assets.append(res)
        assets.sort(key=lambda x: (_verdict_order(x["verdict"]), -x["rank"]))
        reg = assets[0]["regime"] if assets else regime(idxc.get(INDEX_BY_CAT.get(cat)))
        for a in assets:
            a.pop("regime", None)  # regime fica no nível da categoria
        categories[cat] = {
            "regime": reg,
            "multiplier": MULT.get(reg, 3),
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
