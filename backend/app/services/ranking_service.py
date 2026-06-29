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
from app.quantitative import profiles
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
# Fallback SEM verificação de cert (MITM-risk). Gateado por env. Default "1" PRESERVA a coleta
# (não arrisca tela branca em prod onde a verificação de cert possa falhar). HARDENING: setar
# ALLOW_INSECURE_SSL=0 no Render APÓS confirmar AO VIVO que os preços carregam verificados —
# passo deliberado/observado, não default às cegas (não dá p/ validar de fora do Render).
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


# ─────────────────────── Dividendo EXTRAORDINÁRIO → DY RECORRENTE ────────────────
# Diagnóstico do gestor sênior (jun/2026): o DY headline mistura dividendo recorrente com
# pagamento EXTRAORDINÁRIO/único, inflando picks e alavancando 3x sobre um carry que NÃO se
# repete (ITUB4 8,4% com R$2,12 de 1 extraordinário de dez/2025; recorrente ~3-4%). Para uma
# estratégia de dividendos, o yield correto é o RECORRENTE TRAILING — não o forward nem o
# inflado por extraordinário. CONSERVADOR: na dúvida, SUBESTIMA (nunca infla); se não dá p/
# detectar com segurança, mantém o valor original (NUNCA fabrica).
_EXTRA_PAGTO_MULT = 2.0     # 1 pagamento > 2× a MEDIANA dos pagamentos regulares do ano = outlier
_EXTRA_ANUAL_MULT = 1.8     # OU o total do ano salta > 1,8× a mediana dos demais anos = ano inflado


def _recurring_annual_amount(year_amounts: list, peer_year_totals: list) -> Optional[float]:
    """Total RECORRENTE de dividendos de UM ano, removendo o excesso extraordinário.

    `year_amounts`: lista dos pagamentos individuais DAQUELE ano (nominal, R$/US$).
    `peer_year_totals`: totais anuais dos OUTROS anos (p/ a 2ª trava de "ano que salta").
    Retorna o total recorrente (≤ total bruto), ou None se nada a corrigir / inseguro.

    Regra de detecção (precisa de ≥3 pagamentos p/ ter mediana robusta dos regulares):
      (a) um pagamento individual > 2× a MEDIANA dos demais pagamentos do ano → é outlier;
          o recorrente substitui esse outlier pela mediana dos regulares (normaliza, não zera).
      (b) o TOTAL do ano > 1,8× a mediana dos totais dos outros anos → ano inflado; capa o
          total no maior dos pares "normais" (mediana × 1,8) — só quando há ≥2 anos de par.
    Conservador: aplica a correção que der o MENOR total recorrente (subestima na dúvida)."""
    amts = sorted(float(x) for x in year_amounts if x and x > 0)
    if not amts:
        return None
    bruto = sum(amts)
    recorrente = bruto

    # (a) outlier de PAGAMENTO dentro do ano (precisa de base de ≥3 pagamentos)
    if len(amts) >= 3:
        for i, pago in enumerate(amts):
            regulares = amts[:i] + amts[i + 1:]
            med_reg = float(np.median(regulares))
            if med_reg > 0 and pago > _EXTRA_PAGTO_MULT * med_reg:
                # substitui o outlier pela mediana dos regulares (normaliza o excesso)
                cand = bruto - pago + med_reg
                recorrente = min(recorrente, cand)

    # (b) ANO que salta vs. os outros anos (precisa de ≥2 anos de par)
    peers = [float(p) for p in peer_year_totals if p and p > 0]
    if len(peers) >= 2:
        med_peer = float(np.median(peers))
        if med_peer > 0 and bruto > _EXTRA_ANUAL_MULT * med_peer:
            cand = _EXTRA_ANUAL_MULT * med_peer   # capa no teto "normal" (não no exato p/ não exagerar)
            recorrente = min(recorrente, cand)

    if recorrente < bruto - 1e-9:
        return round(recorrente, 6)
    return None


def _chart_api_df(ticker: str, days: int, want_div: bool = False, want_annual: bool = False):
    """
    (DataFrame[index=datetime, Close], dy_trailing[, annual_dy]) via Yahoo chart API.
    Substitui fetch_price_history (que cai em dados SINTÉTICOS qd yfinance falha).
    dy_trailing = soma de dividendos RECORRENTES dos últimos 365d / preço atual × 100
    (extraordinário removido; None se não pediu).
    want_annual=True → retorna também {ano: dy_anual_RECORRENTE_%}, p/ score de consistência
    do dividendo (média 10a + pior ano). Retorna (None, None[, None]).
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
        raw_cl = q.get("close") or []          # close NÃO-ajustado p/ casar com o volume (notional real)
        vol = q.get("volume") or []            # CAMADA 3: volume diário (OHLCV vem na mesma chamada)
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
            # ADV-$ usa preço BRUTO × volume (notional negociado real). adjclose × volume infla/deturpa.
            rc = raw_cl[i] if (i < len(raw_cl) and raw_cl[i] and raw_cl[i] > 0) else c
            vi = vol[i] if (i < len(vol) and vol[i] is not None and vol[i] > 0) else None
            rows.append((t, float(c), float(h), float(l), float(rc), (float(vi) if vi is not None else None)))
        if len(rows) < 60:
            return (None, None, None) if want_annual else (None, None)
        idx = pd.to_datetime([r[0] for r in rows], unit="s")
        df = pd.DataFrame(
            {"Close": [r[1] for r in rows], "High": [r[2] for r in rows], "Low": [r[3] for r in rows]},
            index=idx,
        )
        # CAMADA 3 — gate de liquidez: ADV-$ (mediana de preço_bruto×volume dos últimos pregões).
        # Guardado em df.attrs p/ NÃO mudar a assinatura do retorno. None se o provedor não mandou
        # volume confiável (a maioria manda OHLCV junto, mas Stooq/fallback pode não ter) → não fabrica.
        try:
            import numpy as _np
            _adv = [r[4] * r[5] for r in rows if r[5] is not None and r[4] > 0]
            df.attrs["adv_dollar"] = (float(_np.median(_adv[-60:])) if len(_adv) >= 30 else None)
        except Exception:
            df.attrs["adv_dollar"] = None
        pairs = [(r[0], r[1]) for r in rows]  # mantido p/ o cálculo de dividendos abaixo

        dy = None
        annual = {}
        if want_div or want_annual:
            divs = (res.get("events") or {}).get("dividends") or {}
            price = float(pairs[-1][1])  # preço atual (ajuste≈1 na última data) → DY trailing OK
            cutoff = end - 365 * 86400

            # PAGAMENTOS por ano (lista) p/ detectar EXTRAORDINÁRIO; e o TS de cada pagamento
            # (p/ saber quais entram no trailing 365d). Mantém o ano-base do pagamento.
            pagtos_ano: Dict[int, list] = {}      # {ano: [amount, ...]}  (todos os anos com dado)
            for k, v in divs.items():
                try:
                    tsd = int(v.get("date", k))
                    amt = float(v.get("amount", 0) or 0)
                    if amt <= 0:
                        continue
                    pagtos_ano.setdefault(dt.datetime.utcfromtimestamp(tsd).year, []).append((tsd, amt))
                except Exception:
                    continue

            # Total RECORRENTE por ano (remove o excesso extraordinário). by_year_brut = headline.
            by_year: Dict[int, float] = {y: sum(a for _, a in lst) for y, lst in pagtos_ano.items()}
            by_year_rec: Dict[int, float] = {}
            for y, lst in pagtos_ano.items():
                amts = [a for _, a in lst]
                peers = [tot for yy, tot in by_year.items() if yy != y]
                rec = _recurring_annual_amount(amts, peers)
                by_year_rec[y] = rec if rec is not None else by_year[y]

            # TRAILING 365d: usa os pagamentos reais dos últimos 365d, MAS escala pelo fator
            # recorrente/bruto do ano de cada pagamento (assim o extraordinário do ano sai do
            # trailing também). Conservador: nunca infla o trailing.
            total_brut = 0.0
            total_rec = 0.0
            for y, lst in pagtos_ano.items():
                fator = (by_year_rec[y] / by_year[y]) if by_year.get(y) else 1.0
                for tsd, amt in lst:
                    if tsd >= cutoff:
                        total_brut += amt
                        total_rec += amt * fator
            dy = round(total_rec / price * 100, 2) if (price and total_rec > 0) else 0.0
            # Headline informativo (DY bruto, com extraordinário) — só p/ display/transparência.
            # NÃO entra no score. Guardado em df.attrs p/ não mudar a assinatura do retorno.
            try:
                df.attrs["dy_headline"] = (round(total_brut / price * 100, 2)
                                           if (price and total_brut > 0) else 0.0)
            except Exception:
                pass

            if want_annual:
                # DY anual histórico CORRETO: dividendo RECORRENTE nominal ÷ preço BRUTO médio
                # DAQUELE ano. (usar preço de hoje subestima; usar preço AJUSTADO infla.)
                raw = q.get("close") or cl
                px_year: Dict[int, list] = {}
                for i, t in enumerate(ts):
                    rc = raw[i] if i < len(raw) else None
                    if rc and rc > 0:
                        px_year.setdefault(dt.datetime.utcfromtimestamp(int(t)).year, []).append(float(rc))
                avg_px = {y: sum(v) / len(v) for y, v in px_year.items() if v}
                annual = {y: round(amt / avg_px[y] * 100, 2)
                          for y, amt in by_year_rec.items() if avg_px.get(y)}
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


def _rank_alavancado_v2(rank: float, leverage: float,
                        sigma_total: Optional[float]) -> float:
    """RANK DUPLO v2 (quant/Kelly) — alavancagem como DESEMPATE, não dominância.
    bonus = ganho linear (L−1) MENOS o volatility drag CÔNCAVO ½(L²−1)σ² (σ em fração anual).
    mult = 1 + 0,12·bonus, travado em [1,0 ; 1,35]. σ ausente → sig=0 (sem desconto de drag).
    GATE ANTI-JUNK: rank < 40 NÃO ganha bônus (mult=1) — alavancagem não resgata mérito baixo.
    Substitui a v1 linear (rank×(1+0,25(L−1))), que deixava a alavancagem substituir mérito."""
    sig = (sigma_total or 0.0) / 100.0          # σ em fração anual; ausente → 0 (sem desconto)
    bonus = (leverage - 1.0) - 0.5 * (leverage ** 2 - 1.0) * (sig ** 2)
    mult = 1.0 + 0.12 * bonus
    mult = max(1.0, min(1.35, mult))            # teto duro 1,35× e piso 1,0×
    if rank < 40:                               # gate anti-junk: mérito baixo não ganha bônus
        mult = 1.0
    return round(rank * mult, 1)


def _daily_log_returns(a: np.ndarray) -> Optional[np.ndarray]:
    """Retornos log diários da janela disponível (Camada 3: σ/gap). None se série curta."""
    if a is None or len(a) < 31:
        return None
    a = np.asarray(a, dtype=float)
    if np.any(a <= 0):
        a = a[a > 0]
        if len(a) < 31:
            return None
    r = np.diff(np.log(a))
    return r if r.size >= 30 else None


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
    # BR — compounders / defensivas estruturais
    "WEGE3.SA", "ITUB4.SA", "ITSA4.SA", "BBSE3.SA", "TAEE11.SA", "EGIE3.SA",
    "VIVT3.SA", "ABEV3.SA", "RADL3.SA", "RENT3.SA", "B3SA3.SA", "WEGE3",
    # US — compounders / defensivas a PROTEGER de falso-tático. corr/σ contra ^GSPC é
    # ruidoso (S&P concentrado em tech → defensivas parecem "descoladas"); marcar um
    # compounder como tático mataria INDEVIDAMENTE o bônus de beta defensivo. Lista curada
    # com todo compounder/defensiva do universo US (universe.py categoria US).
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "AVGO", "ORCL", "ADBE", "CSCO",
    "BRK-B", "BRK.B", "JPM", "V", "MA", "BAC", "AXP",
    "UNH", "LLY", "JNJ", "ABBV", "MRK", "TMO",
    "PG", "KO", "PEP", "WMT", "COST", "HD", "MCD", "NKE",
    "HON", "VZ", "O", "MAIN",
}

# WHITELIST POSITIVA de cíclicas estruturais US: ativos que DEVEM ser táticos (perdem o bônus
# de "beta defensivo falso", crivo de qualidade = cíclica). Lista CURADA — não depende de corr/σ
# (que é ruidoso p/ US contra ^GSPC). Só inclui cíclicas genuínas presentes no universo US/EUROPE:
# energia integrada (XOM, CVX, SHEL, TTE), industriais cíclicas (CAT), mineração/materiais (RIO).
# Esses tickers normalmente já vêm com bucket="TATICO" no universo; a whitelist é a rede de
# segurança doutrinária (cobre overrides do usuário e torna a regra explícita/testável).
_TATICO_US = {
    "XOM", "CVX", "CAT", "SHEL", "TTE", "RIO",
}


# ─────────────────────────── Regime (porte de run_ranking) ───────────────────────────
MULT = {"CAPIT.EXTREMA": 5, "CAPITULACAO": 4, "NEUTRO": 3, "TOPO": 2}

# #15b — financeiras/bancos: no crivo de qualidade, ROIC e FCF não fazem sentido e D/E alto é o
# NEGÓCIO (não risco). Whitelist curada (honesta/barata/auditável — não há setor parseado das fontes).
_FINANCEIRAS = {
    # BR — bancos
    "ITUB4.SA", "ITUB3.SA", "BBAS3.SA", "BBDC4.SA", "BBDC3.SA", "SANB11.SA",
    "BPAC11.SA", "ITSA4.SA", "ITSA3.SA", "ABCB4.SA", "BRSR6.SA",
    # BR — bolsa / infraestrutura financeira
    "B3SA3.SA",
    # BR — seguradoras (ROE é o pilar; D/E alto e sem ROIC/FCF = mesmo padrão que banco)
    "BBSE3.SA",   # BB Seguridade
    "PSSA3.SA",   # Porto Seguro
    "CXSE3.SA",   # Caixa Seguridade
    # US — bancos, financeiras, pagamentos, seguros, gestoras
    "JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "SCHW", "AXP", "V", "MA", "BRK-B", "BRK.B",
    "BLK", "SPGI", "CB", "PGR",
    # EUROPA — bancos
    "HSBC", "SAN", "BBVA", "UBS", "ING",
}

# HOLDINGS de participações (equity-method): o valor está nas PARTICIPADAS, não em operação própria
# da controladora → ROIC/FCF da controladora dão ~0 e a Camada 1 operacional dava nota ABSURDA (ITSA4
# q3, BRAP4/CXSE3 q0), jogando a holding pro fundo do ranking injustamente. Crivo análogo ao de
# ETF/financeira: a Qualidade vem de DIVIDENDO consistente + SAFETY da controladora (score_holding_quality),
# não de métricas operacionais ausentes. Set CURADO e explícito (mesmo padrão de _FINANCEIRAS/_TATICO_US)
# — holding não é detectável com segurança só por dado de fonte grátis; a curadoria evita falso-positivo
# (zero regressão p/ operacional normal). Detecção secundária por setor/indústria "Holding"/"Participações"
# quando a fonte trouxer (ver _is_holding).
_HOLDINGS = {
    "ITSA4.SA", "ITSA3.SA",     # Itaúsa (Itaú, Alpargatas, Dexco, Aegea...)
    "BRAP4.SA", "BRAP3.SA",     # Bradespar (participação na Vale)
    "CXSE3.SA",                 # Caixa Seguridade (holding de seguros da Caixa)
    "SIMH3.SA",                 # Simpar (Movida, JSL, Vamos, Automob...)
    "SIMH4.SA",
    "PEAB4.SA", "PEAB3.SA",     # Participações Industriais (Votorantim/Hejoassu) — quando no universo
    "MOAR3.SA",                 # Monteiro Aranha (participação em Klabin/3M...)
}

# Termos de setor/indústria que caracterizam holding pura de participações (detecção secundária,
# só quando a fonte de fundamentos trouxer setor/indústria — não fabrica).
_HOLDING_SECTOR_HINTS = ("holding", "participaç", "participac", "diversified holding")

# FINANCEIRAS (bancos + seguradoras operacionais) — painel sênior 4/4: o ROIC INDUSTRIAL
# NOPAT/(PL+dívida) é INVÁLIDO p/ o setor (depósito/funding é insumo, não capital; float de
# seguradora é alavanca de retorno). Resultado era ruído (ITUB4 Q47, BPAC11 Q19, BRSR6 Q80).
# Estas usam a QUALIDADE FINANCEIRA (ROE-âncora + dividendo + resiliência). NÃO inclui holdings
# (CXSE3 já é holding) nem a B3 (bolsa, ROIC industrial faz sentido).
_FINANCIALS = {
    "ITUB4.SA", "ITUB3.SA",     # Itaú
    "BBDC4.SA", "BBDC3.SA",     # Bradesco
    "BBAS3.SA",                 # Banco do Brasil
    "SANB11.SA", "SANB4.SA", "SANB3.SA",  # Santander
    "BPAC11.SA", "BPAC3.SA",    # BTG Pactual
    "ABCB4.SA",                 # ABC Brasil
    "BRSR6.SA", "BRSR3.SA",     # Banrisul
    "BBSE3.SA",                 # BB Seguridade (seguradora)
    "PSSA3.SA",                 # Porto Seguro
    "BBSE3.SA",
}

# UTILITIES REGULADAS / FLUXO CONTRATADO (transmissão, geração contratada, saneamento) — painel
# sênior 2/4: têm RAP/concessão contratada (IPCA+, risco de demanda ~zero, beta ~0,3) → são as MAIS
# defensivas/previdenciárias da B3, mas o ROIC contábil baixo (capital-intensivo regulado) as jogava
# em "ESPECULATIVO" Q35-42. Recebem um pilar de PREVISIBILIDADE (fluxo contratado) na Camada 1.
_REGULATED_BR = {
    "TAEE11.SA", "TAEE4.SA", "TAEE3.SA",  # Taesa (transmissão)
    "ALUP11.SA", "ALUP4.SA",              # Alupar (transmissão)
    "ISAE4.SA", "ISAE3.SA", "TRPL4.SA",   # ISA Energia/CTEEP (transmissão)
    "EGIE3.SA",                           # Engie (geração contratada)
    "NEOE3.SA",                           # Neoenergia (distribuição/transmissão regulada)
    "EQTL3.SA",                           # Equatorial (distribuição regulada)
    "CPFE3.SA",                           # CPFL (distribuição/geração regulada)
    "ENGI11.SA", "ENGI4.SA",              # Energisa (distribuição regulada)
    "CMIG4.SA", "CMIG3.SA",               # Cemig (G/T/D regulada)
    "ALUP3.SA",
    "SBSP3.SA",                           # Sabesp (saneamento concedido)
    "SAPR11.SA", "SAPR4.SA",              # Sanepar (saneamento concedido)
    "CSMG3.SA",                           # Copasa (saneamento concedido)
}


# Kill-switch de alavancagem por drawdown histórico extremo (painel CRO): pior que isto → só à vista.
_MAXDD_KILL_LEVERAGE = -70.0
# SANITIZAÇÃO (painel CRO 2ª rodada): drawdown ≤ -95% num histórico longo é quase certamente ARTEFATO
# de dado (split/bonificação não-ajustada pré-2000) — empresa viva não vai a zero. Esses -100% falsos
# (UGPA3/CMIG4/GGBR4...) faziam o kill-switch travar 16/17 ativos legítimos ("ETF caro"). Ignoramos
# valores ≤ isto como suspeitos; o kill-switch só morde sobre drawdown SANO.
_MAXDD_ARTIFACT = -95.0


def _worst_sane_dd(*vals):
    """Pior (mais negativo) drawdown DESCARTANDO artefatos ≤ _MAXDD_ARTIFACT. None se todos suspeitos."""
    sane = [v for v in vals if v is not None and v > _MAXDD_ARTIFACT]
    return min(sane) if sane else None


def _is_financial(ticker: str) -> bool:
    return ticker.upper() in _FINANCIALS


def _is_regulated(ticker: str) -> bool:
    return ticker.upper() in _REGULATED_BR


def _is_holding(ticker: str, fund: dict) -> bool:
    """True se o ativo é uma HOLDING de participações (equity-method) — set CURADO (explícito) OU,
    como rede secundária, setor/indústria 'Holding'/'Participações' vindo da fonte (quando houver).
    Conservador: na ausência de dado de setor, decide SÓ pela whitelist (zero falso-positivo)."""
    if ticker.upper() in _HOLDINGS:
        return True
    try:
        meta = " ".join(str(fund.get(k, "") or "") for k in ("sector", "industry")).lower()
        return any(h in meta for h in _HOLDING_SECTOR_HINTS) if meta.strip() else False
    except Exception:
        return False


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


def _verdict_from_momentum(momentum: float, st: dict, cat: str) -> str:
    """Re-deriva o veredito a partir de um NOVO momento (2º passo do momentum relativo da Camada 2),
    reaplicando os mesmos ajustadores momento-INDEPENDENTES já decididos no 1º passo (anti-faca,
    crivo, confiança-BAIXA, regra do ouro). Espelha a cadeia de _analyze sem refazer fetch."""
    if st.get("bucket") == "RESERVA":
        return "RESERVA"
    quality = st.get("quality", 50.0)
    if cat == "CRYPTO":
        verdict = _crypto_verdict(momentum, quality)
    else:
        verdict = S.aporte_verdict(momentum, quality)
    if verdict in ("COMPRAR FORTE", "COMPRAR") and st.get("knife"):
        verdict = "ESPECULATIVO"
    if st.get("crivo_rebaixa"):
        if verdict == "COMPRAR FORTE":
            verdict = "COMPRAR"
        elif verdict == "COMPRAR":
            verdict = "JUSTO"
    if st.get("conf_baixa") and verdict == "COMPRAR FORTE":
        verdict = "COMPRAR"
    # GUARDRAIL Bug D (espelha _analyze): qualidade de dado fino não vira FORTE nem ESPECULATIVO falso.
    if st.get("quality_thin"):
        if verdict == "COMPRAR FORTE":
            verdict = "COMPRAR"
        elif verdict == "ESPECULATIVO" and not st.get("knife"):
            verdict = "JUSTO"
    if st.get("gold_override"):
        verdict = "COMPRAR FORTE"
    return verdict


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


def _ma200_slope_weekly(df, lookback_weeks: int = 13) -> Optional[float]:
    """Inclinação da MM200 SEMANAL (≈4 anos): variação % da média de 200 semanas vs ~3 meses
    atrás (13 semanas). >0 = uptrend secular saudável; <0 = deterioração estrutural (faca).
    Camada 2 — tendência primária. None se série semanal curta (renormaliza; nunca fabrica)."""
    try:
        _, _, C = _weekly_ohlc(df)
        if C is None or len(C) < 200 + lookback_weeks:
            return None
        ma = np.convolve(C, np.ones(200) / 200, mode="valid")   # MM200 semanal ao longo do tempo
        if len(ma) < lookback_weeks + 1:
            return None
        base = ma[-1 - lookback_weeks]
        return float((ma[-1] / base - 1) * 100) if base else None
    except Exception:
        return None


def _divergence_bullish(closes: np.ndarray, stoch_k: Optional[float],
                        stoch_d: Optional[float], rsi: Optional[float]) -> Optional[float]:
    """Divergência ALTISTA (0-1): preço fez NOVA MÍNIMA recente MAS o oscilador NÃO acompanhou,
    OU o oscilador VIROU pra cima. Camada 2 — a sobrevenda só conta com isto. None se sem dado.
      • preço em nova mínima (mín das últimas ~6 barras ≈ mín das ~12) + stoch/rsi já saindo do
        fundo (não cravado no piso) = divergência clássica (oscilador não confirma o fundo).
      • OU stoch %K > %D (linha rápida cruzou a lenta p/ cima) = virada do oscilador.
    Conservador: combina os sinais disponíveis, satura em 1.0."""
    try:
        if closes is None or len(closes) < 12:
            return None
        score = 0.0
        seen = False
        recent = closes[-6:]
        prior = closes[-12:-6]
        preco_nova_min = float(np.min(recent)) <= float(np.min(prior))
        # Divergência clássica: preço em nova mínima MAS oscilador acima do extremo de sobrevenda.
        osc = stoch_d if stoch_d is not None else stoch_k
        if osc is not None:
            seen = True
            if preco_nova_min and osc > 25:
                score += 0.6        # nova mínima de preço sem nova mínima do oscilador
        if rsi is not None:
            seen = True
            if preco_nova_min and rsi > 32:
                score += 0.3        # RSI não confirma o fundo
        # Virada do oscilador: %K cruzou %D p/ cima (momentum de curtíssimo virando).
        if stoch_k is not None and stoch_d is not None:
            seen = True
            if stoch_k > stoch_d:
                score += 0.4
        if not seen:
            return None
        return float(max(0.0, min(1.0, score)))
    except Exception:
        return None


def _estrutura_reversao(closes: np.ndarray) -> Optional[float]:
    """Estrutura de reversão / suporte (0-1): Camada 2.
      • higher-low: mínimas RECENTES ascendentes (mín das ~6 últimas > mín das ~6 anteriores) 0.45
      • fechamento > máxima da janela anterior (rompeu resistência de curto prazo)            0.35
      • suporte recuperado: preço voltou acima da média de ~10 barras                          0.20
    None se série curta (renormaliza; nunca fabrica)."""
    try:
        if closes is None or len(closes) < 12:
            return None
        vals = np.asarray(closes, dtype=float)
        score = 0.0
        recent_low = float(np.min(vals[-6:]))
        prior_low = float(np.min(vals[-12:-6]))
        if recent_low > prior_low:
            score += 0.45
        prior_high = float(np.max(vals[-12:-1]))   # máxima da janela anterior (exclui a atual)
        if vals[-1] >= prior_high:
            score += 0.35
        ma10 = float(np.mean(vals[-10:]))
        if vals[-1] > ma10:
            score += 0.20
        return float(max(0.0, min(1.0, score)))
    except Exception:
        return None


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
                    disc=None, rev=None, wclose=None, use_wk=False, idxc=None,
                    profile="agressivo") -> Optional[dict]:
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
        # TETO DURO DO PERFIL (produto): conservador=2 · moderado=3 · agressivo=5. Mantém o teto 3x
        # de cripto e os caps por-ativo (BTC2x/ETH1.75x) via MIN — sobrevivência só DESCE. Agressivo
        # (cap=5) não morde aqui (cripto já trava em ≤3x) → ZERO regressão p/ a doutrina do dono.
        _prof_cap = int(profiles.profile_leverage_params(profile)["leverage_cap"])
        leverage = min(leverage, float(_prof_cap))

        rank = quality * 0.45 + momentum * 0.55
        # rank duplo v2 (ver _analyze): crypto não calcula σ TOTAL anualizada aqui → sigma=None →
        # sig=0 (sem desconto de drag; conservador, mantém o bônus pequeno). Mesmo teto 1,35×/anti-junk.
        rank_alavancado = _rank_alavancado_v2(rank, leverage, None)
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
            "rank_alavancado": rank_alavancado,
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
            # 2 casas: o teto por ativo é fracionário (ETH 1.75x, top10 1.25x) e é
            # número de SOBREVIVÊNCIA — round(…,1) faria 1.75→1.8 (parecer furar o teto).
            "leverage": round(leverage, 2),
            "regime": reg_display,
            # ── INSUMOS BRUTOS p/ RE-DERIVAR a leverage de cripto POR-PERFIL sem refetch.
            # A cripto não passa pelo MIN de tetos da Camada 3 (caminho próprio): a leverage é
            # min(mult_regime[≤3x], lev_cap_ativo, 2x_se_ESPECULATIVO, teto_perfil). Guardamos os
            # ingredientes p/ apply_profile_to_ranking refazer só o teto_perfil (≠agressivo).
            "_profile_inputs": {
                "regime": reg_display,
                "mult": int(mult),
                "lev_cap_asset": lev_cap,
                "is_buy_candidate": is_buy_candidate,
                "bucket": bucket,
                "verdict": verdict,
                "is_crypto": True,
            },
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
             idxc: dict, idxdm: dict, equity_regime: str,
             profile: str = "agressivo") -> Optional[dict]:
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

        # GUARD DE BETA IMPLAUSÍVEL (#3): beta NEGATIVO para ativo de RISCO (ação/ETF de equity)
        # é ARTEFATO de janela/regressão (TTE −0,17 é impossível p/ petrolífera), NÃO sinal de
        # defensividade. Beta negativo alimentaria INDEVIDAMENTE o bônus de "defensivo" no scoring
        # → red flag. Regra (conservadora, NUNCA fabrica): se o beta final for < 0 e o ativo for de
        # risco (não SHY/ouro/cripto/índice), rejeita o artefato em cascata:
        #   1) tenta a regressão LONGA de 5a, se ainda não foi a fonte e for ≥ 0 (mais estável);
        #   2) senão, piso SETORIAL conservador: cíclica (is_tatico/_TATICO_US) ~1.0, defensiva ~0.5.
        # Petrolíferas com beta ~0.1-0.2 são SUSPEITAS mas POSSÍVEIS (janela) → mantidas; só o
        # NEGATIVO é inaceitável. SHY/ouro/cripto ficam de fora (beta baixo/negativo é o papel deles).
        _is_risk_asset = (cat not in ("CRYPTO", "COMMODITY")
                          and not tk.startswith("^") and "=" not in tk
                          and tk.upper() not in ("SHY", "GLD", "GC=F"))
        if _is_risk_asset and beta is not None and beta < 0.0:
            _tku = tk.upper()
            _ciclica = (bucket == "TATICO") or (_tku in _TATICO_US)
            if "reg5a" not in beta_source and beta_long is not None and beta_long >= 0.0:
                beta, beta_source = beta_long, "reg5a:beta_neg_guard"
            else:
                _piso = 1.0 if _ciclica else 0.5
                logger.info(f"[RANKING][BETA GUARD] {tk}: beta {beta:.2f} NEGATIVO (artefato) → "
                            f"piso setorial {_piso} ({'ciclica' if _ciclica else 'defensiva'})")
                beta, beta_source = _piso, "piso_setorial:beta_neg_guard"

        # TÁTICO: cíclica descolada OU bucket curado OU cíclica US curada, exceto whitelist.
        #
        # BR: auto-detecção por dados (corr baixa + σ alta), protegida pela whitelist.
        #
        # US: corr/σ contra ^GSPC é RUIDOSO (o S&P é concentrado em tech, então defensivas
        # parecem "descoladas" e cíclicas correlacionadas parecem "coladas"). Pelo mesmo motivo
        # que o beta é lixo p/ US, corr/σ também é. Marcar um compounder (MSFT/AAPL/JNJ/KO) como
        # tático por engano MATA o bônus de beta defensivo dele — prejuízo real. Por isso a
        # auto-detecção corr/σ fica DESLIGADA para US: confiamos só na whitelist POSITIVA curada
        # (_TATICO_US) de cíclicas estruturais conhecidas. Conservador: melhor um cíclico escapar
        # do que punir um compounder. (Se um dia quisermos religar, usar limiares bem mais
        # exigentes — ex corr<0.30 E σ>1.60 — e manter a proteção da _TATICO_WHITELIST.)
        tku = tk.upper()
        auto_tatico = (is_br
                       and corr is not None and sigma_ratio is not None
                       and corr < _TATICO_CORR_MAX and sigma_ratio > _TATICO_SIGMA_MIN
                       and tku not in _TATICO_WHITELIST)
        us_curated_tatico = (tku in _TATICO_US and tku not in _TATICO_WHITELIST)
        is_tatico = (bucket == "TATICO") or auto_tatico or us_curated_tatico

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
                idxc=idxc, profile=profile)
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
        # dy_chart já é o DY RECORRENTE (extraordinário/forward removidos em _chart_api_df) — é o
        # que entra no score. O headline (bruto, com extraordinário) fica só p/ display.
        dy = dy_chart if dy_chart else fund.get("dividend_yield")  # dividendos reais; fallback fund
        try:
            _dyh = df_full.attrs.get("dy_headline")
        except Exception:
            _dyh = None
        _dy_headline = _round_or_none(_dyh, 1) if _dyh is not None else _round_or_none(dy, 1)
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
        # Multiplicador do fluxo por regime CONFORME O PERFIL (agressivo = tabela atual MULT).
        _plp = profiles.profile_leverage_params(profile)
        mult = profiles.regime_multiplier(profile, reg)

        # ─────────────────── CAMADA 2 — MOMENTO DE ENTRADA (inputs) ───────────────────
        # Tendência primária: inclinação da MM200 SEMANAL (≈3 meses) — uptrend secular = promoção.
        ma200_slope_wk = _ma200_slope_weekly(df)
        # Divergência altista (preço nova mínima sem nova mínima do oscilador / virada do stoch).
        _mom_series = wclose if use_wk else a
        divergence = _divergence_bullish(_mom_series, stoch_k, stoch_d, rsi)
        # Estrutura de reversão / suporte (higher-low / rompeu máxima anterior / recuperou suporte).
        estrutura = _estrutura_reversao(_mom_series)
        # Retorno 6-12m (proxy ~252 pregões) p/ o MOMENTUM RELATIVO cross-sectional (2º passo:
        # percentila DENTRO da categoria após o loop, em _recompute_ranking_inner). Guardado cru aqui.
        rel_return_raw = None
        try:
            if a is not None and len(a) >= 252 and a[-252]:
                rel_return_raw = float((a[-1] / a[-252] - 1) * 100)
        except Exception:
            rel_return_raw = None

        # MOMENTO primeiro: o beta da Qualidade é AMPLIFICADOR e depende do momento.
        # momentum_relativo entra None aqui (renormaliza) e é re-injetado pós-loop (cross-sectional).
        momentum, mb = S.compute_momentum(
            slow_stoch_weekly=sstoch, discount_from_top=disc,
            reversal_confirmation=rev, distance_ma200=dma,
            rsi=rsi, ma200_slope_weekly=ma200_slope_wk, dy=dy, dy_avg10=dy_avg10,
            divergence=divergence, rel_momentum_percentile=None,
            estrutura=estrutura,
        )
        # HOLDING de participações (equity-method, ex ITSA4/BRAP4/CXSE3): o valor está nas
        # participadas, NÃO em operação própria → ROIC/FCF da controladora dão ~0 e a Camada 1
        # operacional dava nota ABSURDA (ITSA4 q3, BRAP4/CXSE3 q0), afundando a holding no ranking.
        # Crivo de HOLDING (análogo ao ETF/financeira): a Qualidade vem de dividendo consistente +
        # safety da controladora — não de métricas operacionais ausentes. Set CURADO (_is_holding).
        is_holding = (cat not in ("ETF", "COMMODITY", "CRYPTO")) and _is_holding(tk, fund)
        # FINANCEIRA (banco/seguradora) e REGULADA (utility de fluxo contratado) — painel sênior.
        # Holding tem precedência (CXSE3 é holding de seguros, não vai p/ financeira).
        is_financial = (not is_holding) and (cat not in ("ETF", "COMMODITY", "CRYPTO")) and _is_financial(tk)
        is_regulated = (not is_holding and not is_financial) and _is_regulated(tk)
        # Mercado p/ o SHRINKAGE da nota (Camada 1): BR conta a cobertura contra os 3 pilares
        # OBTENÍVEIS no BR (roic+safety+fcf) → BR bem-coberto (3/3) sai ILESO (w=1). HOLDING/FINANCIAL
        # usam o crivo próprio. Mesmo _qmkt usado depois no guardrail Bug D.
        _qmkt = ("HOLDING" if is_holding else "FINANCIAL" if is_financial
                 else ("BR" if is_br else "US"))
        # fcf_yield DERIVADO da CVM (cobre TODA a B3; brapi free não dá market cap): FCF absoluto
        # ÷ (preço × nº de ações ON+PN). Aproxima o market cap pelo preço-do-ticker × ações totais —
        # ON/PN andam juntos no BR; suficiente p/ o pilar fcf (bucketizado por limiares). SÓ se a
        # fonte não trouxe fcf_yield (não sobrescreve dado direto do brapi/FMP). NÃO fabrica.
        if (fund.get("fcf_yield") is None and fund.get("fcf") is not None
                and fund.get("shares") and len(a)):
            _mc = float(a[-1]) * float(fund["shares"])
            if _mc > 0:
                fund["fcf_yield"] = fund["fcf"] / _mc
        quality, qb = S.compute_quality_blend(
            beta=beta, max_dd_pct=dd, dividend_yield=dy, growth_5y=fund_growth,
            roe=fund.get("roe"), debt_to_equity=fund.get("debt_to_equity"),
            payout_ratio=fund.get("payout_ratio"), roic=fund.get("roic"),
            fcf_yield=fund.get("fcf_yield"), sharpe=shp, cagr=cagr, tsr_expected=tsr,
            momentum=momentum, is_tatico=is_tatico, market=_qmkt,
            roic_history=fund.get("roic_history"),
            dy_avg10=dy_avg10, dy_worst=dy_worst, dd_recovery_mult=dd_recovery_mult,
            # ETF/commodity NÃO são empresas → fundamentos não se aplicam (renormaliza o termo
            # em vez de fingir 50). Ações (BR/US/Europa) mantêm o termo: são empresas — ausência
            # de dado é falta de cobertura, não estrutura (não julgar empresa só pelo preço).
            fundamentals_apply=(cat not in ("ETF", "COMMODITY")),
            regulated=is_regulated,   # utility regulada → pilar de fluxo contratado (previsibilidade)
        )
        # Substitui a Qualidade OPERACIONAL pela QUALIDADE DE HOLDING (leverage-independente, NÃO
        # fabrica). Itaúsa/Bradespar com dividendo+safety reais voltam a uma Qualidade RAZOÁVEL
        # (~55-75) em vez de 3/0. Holding sem NENHUM dado real → (None, {}) → mantém a nota
        # operacional magra (segue honestamente baixa/CONF BAIXA, não inventa nota).
        if is_holding:
            _hq, _hqb = S.score_holding_quality(
                dy_avg10=dy_avg10, dy_worst=dy_worst, dividend_yield=dy,
                debt_to_equity=fund.get("debt_to_equity"), max_dd_pct=dd,
                dd_recovery_mult=dd_recovery_mult, roe=fund.get("roe"), roic=fund.get("roic"))
            if _hq is not None:
                quality, qb = _hq, _hqb
        # FINANCEIRA: ROIC industrial é inválido p/ banco/seguradora (painel 4/4) → usa o crivo
        # FINANCEIRO (ROE-âncora + dividendo + resiliência). Sem ROE nem dividendo → (None,{}) mantém
        # a nota operacional (segue thin honesta). Resgata ITUB4/BBDC/BPAC do fundo do ranking.
        elif is_financial:
            # roe_alt = ROE de MERCADO (brapi/fundamentus TTM) capturado ANTES do override CVM.
            # Evita que o ROE-CVM ruidoso (ex Bradesco 5,4% vs real ~14%) destrua a nota do banco.
            _roe_financeiro = fund.get("roe_alt") or fund.get("roe")
            _fq, _fqb = S.score_financial_quality(
                roe=_roe_financeiro, dy_avg10=dy_avg10, dy_worst=dy_worst, dividend_yield=dy,
                max_dd_pct=dd, dd_recovery_mult=dd_recovery_mult,
                payout_ratio=fund.get("payout_ratio"))
            if _fq is not None:
                quality, qb = _fq, _fqb

        # ─── GUARDRAIL Bug D: QUALIDADE DE DADO FINO NÃO LIDERA VEREDITO FORTE NEM ALAVANCA ───
        # Quando o scrape fundamental BR quebra, a Qualidade da Camada 1 nasce de POUCOS pilares
        # reais e RENORMALIZA — não fabrica, mas a nota fica FRÁGIL e pode estourar (ITSA4 q3 por
        # só-ROE-fallback; vários q100 por 1 pilar generoso). Contamos os pilares-NÚCLEO reais de
        # que a nota nasceu; abaixo do mínimo (QUALITY_MIN_PILARES_REAIS) o ativo é "dado fino" →
        # CONF cai p/ BAIXA + veredito capado (não FORTE/ESPECULATIVO) + alavancagem não liberada.
        # SÓ vale p/ ações (a qualidade de NEGÓCIO); ETF/COMMODITY usam qualidade-de-veículo (logo
        # abaixo) e CRYPTO tem caminho próprio — esses NÃO sofrem o guardrail (zero regressão).
        # LIMIAR POR-MERCADO: BR não tem crescimento real grátis (sem Finnhub p/ BR) → contamos
        # contra os pilares-núcleo OBTENÍVEIS no mercado (BR: roic+safety+fcf; US: +crescimento).
        # Ação BR bem-coberta (3 reais) deixa de ser injustamente "dado fino"; só-ROE-fallback segue.
        # Mercado p/ o guardrail: HOLDING conta os pilares do crivo de holding (dividendo+safety)
        # como núcleo obtenível — uma holding bem-coberta NÃO é "dado fino" pelo guardrail de "<3
        # pilares operacionais" (que não se aplica a ela; o crivo de holding os substitui). Holding
        # sem o crivo (qb operacional magro) cai no critério BR/US e segue thin honestamente.
        # (_qmkt já definido acima, no call-site da compute_quality_blend — mesmo valor.)
        _quality_thin = False
        _quality_pilares = None
        if cat not in ("ETF", "COMMODITY", "CRYPTO"):
            _quality_pilares = S.quality_pilares_reais(qb, market=_qmkt)
            _quality_thin = S.quality_data_thin(qb, market=_qmkt)

        # ─────────────────── CAMADA 3 — APTIDÃO PRA ALAVANCAR (por-ativo) ───────────────────
        # σ TOTAL anualizada e GAP (pior salto diário) calculados do df de preço já buscado
        # (janela recente ~6a). Série curta → None → o termo renormaliza / o teto não entra no MIN.
        _ret = _daily_log_returns(a)
        sigma_total = S.aptidao_volatility_annualized(_ret) if _ret is not None else None
        gap_pct = S.aptidao_gap(_ret) if _ret is not None else None

        # Score de aptidão (0-100): risco-perfil do ativo (MODULADOR — nunca sobe teto).
        aptidao, aptidao_bd = S.score_aptidao(
            max_dd_pct=dd, sigma_pct=sigma_total, gap_pct=gap_pct, dividend_yield=dy,
            recovered=recovered, recovery_years=recovery_years, hist_curto=hist_curto, beta=beta,
        )

        # ETF/COMMODITY não têm NEGÓCIO → a Camada 1 os achata em 50. Para esses, a "qualidade" que
        # entra no veredito/rank é a QUALIDADE DO VEÍCULO (LEVERAGE-INDEPENDENTE): dividendo
        # consistente + queda rasa + retorno risco-ajustado = "bom porto pra renda". É DIFERENTE da
        # aptidão (Camada 3, que pergunta "alavancar isso me liquida?"). Assim a indicação de
        # compra/venda do ETF NÃO depende da Camada 3 (que é só o overlay de alavancagem). AÇÕES
        # mantêm a Camada 1 (negócio); a aptidão de TODOS só define a alavancagem.
        if cat in ("ETF", "COMMODITY"):
            quality, qb = S.score_etf_vehicle_quality(
                dy_avg10=dy_avg10, dy_worst=dy_worst, dividend_yield=dy,
                max_dd_pct=dd, dd_recovery_mult=dd_recovery_mult, sharpe=shp)

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
        # GUARDRAIL Bug D: a Qualidade nasceu de pilares-núcleo de MENOS (dado fino) → desconfia da
        # nota (mesmo que algum beta/payout solto tenha dado "MEDIA"): CONF cai p/ BAIXA. Não fabrica
        # — só reflete que a Camada 1 não tem base real p/ liderar uma compra forte.
        if _quality_thin:
            confidence = "BAIXA"

        _knife = False
        _crivo_rebaixa = False
        if bucket == "RESERVA":
            verdict = "RESERVA"
        else:
            verdict = S.aporte_verdict(momentum, quality)

            # ANTI-FACA (#15c): faca = NEGÓCIO encolhendo (crescimento REAL de 5a < 0, OU recente
            # TTM apodrecendo), não só preço barato. Carry ZERO (Quantfury) → sem custo de carrego a
            # vencer. Preço de 6a (cagr) só como FALLBACK sem dado real (BR). Cíclica: queda recente
            # é o CICLO (a compra), não rot → usa só o preço.
            _knife = S.is_falling_knife(fund_growth, recent_growth, cagr, is_tatico=is_tatico)
            if verdict in ("COMPRAR FORTE", "COMPRAR") and _knife:
                verdict = "ESPECULATIVO"

            # CRIVO DE QUALIDADE-REAL POR TIPO (#15b): porteira de fundamentos da EMPRESA (não preço).
            # Rebaixa 1 degrau se a qualidade-real não passa o piso (afrouxado pela confiança). Falta de
            # dado NÃO barra (crivo não opina). Tipo: financeira (whitelist)/cíclica (is_tatico)/normal.
            # HOLDING tem precedência sobre financeira (ITSA4/CXSE3 estão em ambos os sets): o crivo
            # de holding julga dividendo+D/E da controladora, não ROE operacional (que o equity-method
            # distorce). Senão: financeira (ROE) / cíclica (D/E) / normal (ROIC+FCF).
            tipo_crivo = ("holding" if is_holding
                          else ("financeira" if tk.upper() in _FINANCEIRAS
                                else ("ciclica" if is_tatico else "normal")))
            crivo_nota, _crivo_n = S.score_quality_crivo(
                tipo_crivo, roe=fund.get("roe"), roic=fund.get("roic"),
                fcf_yield=fund.get("fcf_yield"), debt_to_equity=fund.get("debt_to_equity"),
                dy_avg10=dy_avg10, dy_worst=dy_worst, dividend_yield=dy,
                growth_5y=fund_growth, confidence=confidence)
            _crivo_rebaixa = (crivo_nota is not None and crivo_nota < S.crivo_piso(confidence))
            if _crivo_rebaixa:
                if verdict == "COMPRAR FORTE":
                    verdict = "COMPRAR"
                elif verdict == "COMPRAR":
                    verdict = "JUSTO"

            # Confiança BAIXA não alavanca no talo sobre "50 falso" → no máximo COMPRAR.
            if confidence == "BAIXA" and verdict == "COMPRAR FORTE":
                verdict = "COMPRAR"

            # GUARDRAIL Bug D — veredito FORTE/ESPECULATIVO NÃO pode nascer de qualidade frágil:
            #   • COMPRAR FORTE → COMPRAR (a pechincha vale, mas sem o talo de "qualidade comprovada").
            #   • ESPECULATIVO de qualidade EXTREMA-baixa (≤45) com dado fino é um ALARME FALSO (ITSA4
            #     q3 por só-ROE-fallback) → vira JUSTO ("dados insuficientes", cauteloso) em vez de
            #     marcar faca sobre uma nota fabricada-baixa. Faca de VERDADE (knife/crivo) já rebaixou
            #     acima; aqui só impedimos que a CEGUEIRA do provedor vire um veredito direcional forte.
            if _quality_thin:
                if verdict == "COMPRAR FORTE":
                    verdict = "COMPRAR"
                elif verdict == "ESPECULATIVO" and not _knife:
                    verdict = "JUSTO"

        # REGRA DO OURO: ouro em capitulação do mercado de ações → hedge → COMPRAR FORTE (override).
        _gold_override = (tk.upper() in ("GLD", "GC=F")
                          and equity_regime in ("CAPITULACAO", "CAPIT.EXTREMA"))
        if _gold_override:
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
        # GUARDRAIL Bug D — qualidade de DADO FINO não libera alavancagem alta por "qualidade não
        # comprovada". A nota pode estar estourada (q100 de 1 pilar) → não dá p/ alavancar no talo
        # sobre ela. Teto 2x (mesmo patamar do ESPECULATIVO/beta-alto). NÃO exclui o ativo (segue no
        # ranking, participando da pechincha pelo MOMENTO), só nega o talo de alavancagem sem base.
        if _quality_thin:
            leverage = min(leverage, 2.0)
        # TRAVA DE ALAVANCAGEM POR BETA ALTO (#3) — REGRA Nº1 = SOBREVIVÊNCIA. beta ≥ 1.45 já é
        # ~1,5x de sensibilidade ao mercado; 3x×1,5 = ~4,5x de exposição EFETIVA num drawdown =
        # risco de LIQUIDAÇÃO (B3SA3 1,48, ADBE 1,46). O 2x topo/3x neutro/4-5x capitulação do
        # regime NÃO se aplica a beta tão alto. CAPE a alavancagem em 2.0x — teto INVIOLÁVEL,
        # igual ao teto por ativo de crypto. NÃO é exclusão (o ativo continua no ranking), só capa
        # a alavancagem sugerida. Aplicado por ÚLTIMO p/ prevalecer sobre os tetos acima.
        if beta is not None and beta >= 1.45:
            leverage = min(leverage, 2.0)

        # GATE DE TENDÊNCIA (Camada 2) → CAPA A ALAVANCAGEM, não a compra. Downtrend primário
        # FORTE (preço << MM200 longa E MM200 SEMANAL caindo) = "pegar faca alavancado é
        # catastrófico" → teto 2x. NÃO veta a compra (segue descontado no ranking); só capa a
        # leverage do fluxo, integrando com os tetos da Camada 3 via MIN. Conservador: dado
        # ausente NÃO capa (não fabrica downtrend).
        _teto_trend = S.teto_leverage_tendencia(dma, ma200_slope_wk)
        teto_lev_tendencia = _teto_trend
        if _teto_trend is not None:
            leverage = min(leverage, _teto_trend)

        # ─── CAMADA 3 — TETO DE SOBREVIVÊNCIA POR ATIVO (MIN de todos os tetos) ───
        # "Quanto dá pra alavancar este ativo e SOBREVIVER ao pior tombo?" Sobrevivência = MÍNIMO.
        # Integra (não duplica) a trava beta≥1,45→2x: teto_beta tem a tabela completa e o MIN abaixo
        # capa de novo. mult_regime entra como mais um teto (o leverage do regime já foi aplicado
        # acima). Arredonda PRA BAIXO. NOTA: ¼·Kelly NÃO entra no MIN por-fluxo (vive só no agregado
        # C.3 e no score). O μ por-fluxo era CAGR de preço − rf — PRÓ-CÍCLICO (return-chasing) e, além
        # disso, alimentava só um parâmetro VESTIGIAL de teto_alavancagem_aptidao (que ignora μ).
        # Removido (Fix 1): não reintroduzir Kelly no MIN por-fluxo.
        # GATE DE LIQUIDEZ (vivo): ADV-$ vindo do próprio OHLCV (df_full.attrs, calculado em
        # _chart_api_df). None → não veta (não fabrica). Large-cap passa folgado; micro-cap ilíquida → 1x.
        _adv_dollar = None
        try:
            _adv_dollar = df_full.attrs.get("adv_dollar")
        except Exception:
            _adv_dollar = None
        teto_lev, teto_det = S.teto_alavancagem_aptidao(
            max_dd_pct=dd, sigma_pct=sigma_total, gap_pct=gap_pct, beta=beta,
            mult_regime=leverage,
            hist_curto=hist_curto, volume=_adv_dollar,
            # VÁLVULA gap-risk extremo (agora ARMADA): gap histórico ≥20% = ativo estruturalmente
            # gappy (salto overnight sem chance de stop) → força 1x à vista. Antes era default False.
            gap_risk_extremo=(gap_pct is not None and abs(gap_pct) >= 20.0),
            # TETO DURO + PISO DE σ DO PERFIL (agressivo: cap=5, sigma_floor=None → comportamento atual).
            leverage_cap=_plp["leverage_cap"],
            sigma_floor_min_pct=_plp["sigma_floor_min_pct"],
        )
        leverage = min(leverage, teto_lev)   # MIN inviolável (sobrevivência nunca sobe o teto)

        # ── TRAVAS SURVIVAL-FIRST DA ALAVANCAGEM (painel CRO) ──
        # (a) DADO FINO NÃO ALAVANCA: a Qualidade thin/CONF BAIXA (<piso de pilares-núcleo reais)
        #     capava o veredito mas NÃO travava a leverage (BBSE3 thin liberava lev 83; SANB11 pil2
        #     liberava 74). Survival-first: qualidade não-comprovada → SÓ à vista (1x) até provar.
        # (b) KILL-SWITCH POR MAXDD: tombo histórico extremo (pior que -70%) = cauda de ruína →
        #     alavancar é convite a margin-call (LREN3 -86%). Sem alavancagem, independente do rank.
        if _quality_thin:
            leverage = 1.0
        _wdd = _worst_sane_dd(dd, dd_full)   # ignora artefatos -100% (split não-ajustado)
        if _wdd is not None and _wdd <= _MAXDD_KILL_LEVERAGE:
            leverage = 1.0

        # RANK DUPLO (decisão do dono): a indicação de compra/venda (rank base + veredito) depende
        # SÓ de Qualidade + Momento — leverage-independente. A Camada 3 é um OVERLAY opcional (botão):
        #   • rank (base, SEM alavancagem) = mérito de compra puro → ordena o ranking padrão.
        #   • rank_alavancado (COM alavancagem) = mérito × quanto dá p/ alavancar com segurança →
        #     re-ordena quando o usuário liga a Camada 3. Ativo ótimo alavancável 3x sobe; ótimo mas
        #     σ-alto (só 1x) desce. Amplificação MODERADA (mérito domina; não promove faca, que já
        #     tem rank baixo E leverage capada).
        # FÓRMULA v2 (quant/Kelly): alavancagem é DESEMPATE, não dominância. Ganho linear da
        # alavancagem MENOS o volatility drag CÔNCAVO (−½(L²−1)σ²); teto duro 1,35×, piso 1,0×.
        # GATE ANTI-JUNK: mérito < 40 NÃO ganha bônus (não resgata lixo). σ ausente → sem desconto.
        rank_alavancado = _rank_alavancado_v2(rank, leverage, sigma_total)

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
            "rank_alavancado": rank_alavancado,
            "quality_breakdown": qb,
            "momentum_breakdown": mb,
            # GUARDRAIL Bug D — transparência: de quantos pilares-núcleo REAIS a Qualidade nasceu e se
            # é "dado fino" (frágil). O frontend já mostra a confiança; estes sinalizam o PORQUÊ.
            "quality_pilares_reais": _quality_pilares,
            "quality_data_thin": _quality_thin,
            "ma200_slope_weekly": _round_or_none(ma200_slope_wk, 1),
            "leverage_teto_tendencia": teto_lev_tendencia,
            # ── Camada 2 — insumos p/ o 2º passo do MOMENTUM RELATIVO (cross-sectional).
            # Recomputa momento+veredito+rank pós-loop quando o percentil de força da categoria
            # estiver pronto. Os flags abaixo deixam re-derivar o veredito sem refazer fetch/fundamentos.
            "_rel_return_raw": rel_return_raw,
            "_mom_inputs": {
                "slow_stoch_weekly": sstoch, "discount_from_top": disc,
                "reversal_confirmation": rev, "distance_ma200": dma, "rsi": rsi,
                "ma200_slope_weekly": ma200_slope_wk, "dy": dy, "dy_avg10": dy_avg10,
                "divergence": divergence, "estrutura": estrutura,
            },
            "_verdict_state": {
                "bucket": bucket, "quality": quality, "knife": _knife,
                "crivo_rebaixa": _crivo_rebaixa, "conf_baixa": (confidence == "BAIXA"),
                "gold_override": _gold_override, "sigma_total": sigma_total,
                "leverage": leverage,
                "quality_thin": _quality_thin,
            },
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
            "dividend_yield_headline": _dy_headline,
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
            "aptidao": round(aptidao),
            "aptidao_breakdown": aptidao_bd,
            "sigma_total": _round_or_none(sigma_total, 1),
            "gap_max": _round_or_none(gap_pct, 1),
            "leverage_teto_camada3": teto_lev,
            "leverage_teto_binding": teto_det.get("binding"),
            "leverage": round(leverage, 1),
            # ── INSUMOS BRUTOS p/ RE-DERIVAR a leverage POR-PERFIL sem refetch (apply_profile_to_ranking).
            # São os MESMOS inputs que o caminho ao vivo usa no MIN de tetos da Camada 3; guardados crus
            # (não arredondados) p/ a re-derivação bater bit-a-bit com _analyze. Barato (~10 floats).
            "_profile_inputs": {
                "regime": reg,
                "sigma_total": sigma_total,
                "gap_pct": gap_pct,
                "beta": beta,
                "max_dd": dd,
                "max_dd_full": dd_full,      # pior tombo histórico (kill-switch survival-first)
                "hist_curto": hist_curto,
                "adv_dollar": _adv_dollar,
                "gap_risk_extremo": (gap_pct is not None and abs(gap_pct) >= 20.0),
                "distance_ma200": dma,
                "teto_lev_tendencia": teto_lev_tendencia,
                "verdict": verdict,
                "bucket": bucket,
                "quality": quality,
                "is_buy_candidate": is_buy_candidate,
                "is_crypto": False,
                "quality_thin": _quality_thin,
            },
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
    return _recompute_ranking(force=force)   # frio ou force → calcula síncrono


_compute_lock = _threading.Lock()


def _recompute_ranking(force: bool = False) -> dict:
    """Cálculo pesado do ranking (~116 tickers, paralelizado). Atualiza o cache.
    Serializado: se outro thread (ex: warm-up) já calculou enquanto esperávamos o
    lock, reaproveita o resultado fresco em vez de recalcular tudo de novo.

    force=True: IGNORA o cache fresco e recalcula de verdade. BUG corrigido — antes
    o re-check de TTL aqui dentro anulava o force vindo do endpoint (?force=true),
    deixando o ranking CONGELADO por até RANKING_TTL mesmo após dado novo (ex: CVM
    populou o disco mas o ranking servia o cache thin do boot)."""
    with _compute_lock:
        entry = _cache.get("ranking")
        if not force and entry is not None and (time.time() - entry[0]) < RANKING_TTL:
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

    # ── CAMADA 2 — 2º PASSO do MOMENTUM RELATIVO (cross-sectional, best-effort) ──
    # Agora que TODOS os ativos da categoria foram analisados, percentila a força (retorno 6-12m)
    # DENTRO da categoria e re-injeta no momento (peso 10%), recomputando veredito+rank. Ativos sem
    # retorno (série curta) ficam de fora do percentil → momentum_relativo renormaliza (não fabrica).
    for cat, assets in by_cat.items():
        rets = [(a, a.get("_rel_return_raw")) for a in assets]
        valid = [(a, r) for a, r in rets if r is not None]
        if len(valid) >= 3:                       # percentil só faz sentido com amostra mínima
            ordered = sorted(valid, key=lambda x: x[1])
            n = len(ordered)
            for rank_i, (a, _r) in enumerate(ordered):
                pct = rank_i / (n - 1) if n > 1 else 0.5      # 0..1 (mais forte = maior)
                st = a.get("_verdict_state") or {}
                mi = a.get("_mom_inputs") or {}
                try:
                    new_m, new_bd = S.compute_momentum(
                        rel_momentum_percentile=pct, **mi)
                except Exception:
                    continue
                a["momentum"] = round(new_m)
                a["momentum_breakdown"] = new_bd
                a["verdict"] = _verdict_from_momentum(new_m, st, cat)
                a["rank"] = round(st.get("quality", 50.0) * 0.45 + new_m * 0.55, 1)
                a["rank_alavancado"] = _rank_alavancado_v2(
                    a["rank"], st.get("leverage", 1.0), st.get("sigma_total"))
        # limpa as chaves de rascunho (não vão no contrato da API)
        for a in assets:
            a.pop("_rel_return_raw", None)
            a.pop("_mom_inputs", None)
            a.pop("_verdict_state", None)

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


# ─────────────────────────── PERFIL no RANKING (re-derivação SEM refetch) ───────────────────────────
# A aba Ranking servia o cache CANÔNICO (agressivo) a TODOS — incoerente com Screening/Aporte, que já
# respeitam o perfil do assinante. Corrigimos RE-DERIVANDO a alavancagem de cada ativo a partir dos
# tetos JÁ COMPUTADOS no payload cacheado (sigma/beta/gap/regime/etc., guardados crus em _profile_inputs
# por _analyze/_analyze_crypto). Sem refazer fetch nem _analyze. Survival só DESCE (todo cap é MIN).
# Agressivo/None → ranking idêntico ao cache (re-derivação NÃO dispara; só limpa _profile_inputs).

def _strip_profile_inputs(asset: dict) -> dict:
    """Cópia do ativo SEM a chave interna _profile_inputs (não vai no contrato da API)."""
    out = dict(asset)
    out.pop("_profile_inputs", None)
    return out


def _rederive_leverage_for_profile(asset: dict, profile: str) -> Optional[float]:
    """Re-deriva a alavancagem de UM ativo para `profile` a partir dos insumos brutos cacheados
    (_profile_inputs), reaplicando a MESMA cadeia de tetos de _analyze — SEM refetch. Retorna a nova
    leverage (float) ou None quando não há insumos (mantém a do cache). Sobrevivência só DESCE."""
    pin = asset.get("_profile_inputs")
    if not pin:
        return None
    _plp = profiles.profile_leverage_params(profile)

    # ── CRYPTO: caminho próprio (não passa pelo MIN da Camada 3). leverage =
    #    min(mult_regime[≤3x], lev_cap_ativo, 2x_se_ESPECULATIVO, teto_perfil).
    if pin.get("is_crypto"):
        bucket = pin.get("bucket")
        if not pin.get("is_buy_candidate") or bucket == "RESERVA":
            lev = 1.0
        else:
            lev = float(pin.get("mult", 3))
        lev = min(lev, float(pin.get("lev_cap_asset", lev)))
        if pin.get("verdict") == "ESPECULATIVO":
            lev = min(lev, 2.0)
        lev = min(lev, float(pin.get("lev_cap_asset", lev)))
        lev = min(lev, float(int(_plp["leverage_cap"])))
        return round(lev, 2)

    # ── AÇÕES/ETF/COMMODITY: replica a cadeia de leverage de _analyze (1428-1485) com o regime_mult
    #    e os caps do perfil. mult_regime do perfil; is_buy_candidate/verdict/quality já decididos
    #    (leverage-independentes); depois ESPECULATIVO/COMPRAR-baixa, beta≥1,45, gate de tendência e o
    #    MIN da Camada 3 (teto_alavancagem_aptidao com leverage_cap + sigma_floor do perfil).
    regime_name = pin.get("regime", "NEUTRO")
    mult = profiles.regime_multiplier(profile, regime_name)
    bucket = pin.get("bucket")
    verdict = pin.get("verdict")
    quality = pin.get("quality")
    beta = pin.get("beta")
    dma = pin.get("distance_ma200")

    leverage = float(mult) if (pin.get("is_buy_candidate") and bucket != "RESERVA") else 1.0
    if verdict == "ESPECULATIVO":
        leverage = min(leverage, 2.0)
    elif verdict == "COMPRAR" and quality is not None and quality < 50:
        leverage = min(leverage, 3.0)
    # TRAVAS SURVIVAL-FIRST (painel CRO) — espelham as de _analyze também na re-derivação por perfil
    # (este é o caminho que produz a leverage EXIBIDA p/ moderado/conservador). Antes só capava em 2x.
    if pin.get("quality_thin"):          # dado fino/CONF BAIXA NÃO alavanca — só à vista até comprovar
        leverage = 1.0
    _wdd = _worst_sane_dd(pin.get("max_dd"), pin.get("max_dd_full"))   # ignora artefatos -100%
    if _wdd is not None and _wdd <= _MAXDD_KILL_LEVERAGE:   # pior tombo SANO extremo → sem alavancagem
        leverage = 1.0
    if beta is not None and beta >= 1.45:
        leverage = min(leverage, 2.0)
    _teto_trend = pin.get("teto_lev_tendencia")
    if _teto_trend is not None:
        leverage = min(leverage, _teto_trend)

    sigma_total = pin.get("sigma_total")
    gap_pct = pin.get("gap_pct")
    teto_lev, _ = S.teto_alavancagem_aptidao(
        max_dd_pct=pin.get("max_dd"), sigma_pct=sigma_total, gap_pct=gap_pct, beta=beta,
        mult_regime=leverage,
        hist_curto=pin.get("hist_curto", False), volume=pin.get("adv_dollar"),
        gap_risk_extremo=bool(pin.get("gap_risk_extremo")),
        leverage_cap=_plp["leverage_cap"], sigma_floor_min_pct=_plp["sigma_floor_min_pct"],
    )
    leverage = min(leverage, teto_lev)
    return round(leverage, 1)


def apply_profile_to_ranking(ranking: dict, profile: Optional[str] = None) -> dict:
    """Aplica o PERFIL do assinante ao ranking CANÔNICO (agressivo) SEM refetch.

    profile agressivo/None → retorna o ranking idêntico (só remove a chave interna _profile_inputs).
    profile conservador/moderado → RE-DERIVA leverage/rank_alavancado de cada ativo a partir dos tetos
    já computados no payload (via _profile_inputs), aplicando regime_multiplier(profile,…) + leverage_cap
    + sigma_floor via o MESMO MIN de teto_alavancagem_aptidao (survival só desce). A ORDEM do ranking é
    PRESERVADA (perfil só mexe na alavancagem, não no mérito de compra). Blindado: qualquer falha por
    ativo mantém os valores do cache (nunca derruba/ fabrica)."""
    prof = profiles.normalize_profile(profile)
    cats_in = (ranking or {}).get("categories", {}) or {}
    cats_out: Dict[str, dict] = {}
    is_aggr = (prof == "agressivo")

    for cat_name, cat in cats_in.items():
        assets_out = []
        for a in cat.get("assets", []):
            if is_aggr:
                assets_out.append(_strip_profile_inputs(a))   # ZERO regressão: idêntico ao cache
                continue
            try:
                new_lev = _rederive_leverage_for_profile(a, prof)
            except Exception as e:
                logger.warning(f"[RANKING][PERFIL] {a.get('ticker')} re-derivação falhou: {e}")
                new_lev = None
            out = _strip_profile_inputs(a)
            if new_lev is not None:
                out["leverage"] = new_lev
                # rank_alavancado coerente com a nova leverage (mesma fórmula v2; σ do cache).
                pin = a.get("_profile_inputs") or {}
                _sig = pin.get("sigma_total")   # None p/ cripto (mesmo comportamento do caminho ao vivo)
                try:
                    out["rank_alavancado"] = _rank_alavancado_v2(out.get("rank", 0.0), new_lev, _sig)
                except Exception:
                    pass
                # stops escalonados coerentes com a nova leverage.
                try:
                    _st = S.staggered_stops(new_lev)
                    out["staggered_stops"] = {
                        "stop_1_pct": _st.get("stop_1_pct"),
                        "stop_2_pct": _st.get("stop_2_pct"),
                        "liquidation_pct": _st.get("liquidation_pct"),
                    }
                except Exception:
                    pass
            assets_out.append(out)
        # multiplier do cabeçalho coerente com o perfil (cripto continua travada em ≤3x).
        reg = cat.get("regime", "NEUTRO")
        mult_display = profiles.regime_multiplier(prof, reg)
        if cat_name == "CRYPTO":
            mult_display = min(mult_display, 3)
        cats_out[cat_name] = {**cat, "assets": assets_out, "multiplier": mult_display}

    out = {**(ranking or {}), "categories": cats_out, "profile": prof}
    return out


# ─────────────────────────── SCREENING / WATCHLIST (motor REAL) ───────────────────────────
# Screening e Watchlist pediam sinais a uma HEURÍSTICA no Node (lib/yfinance) — divergente do
# motor REAL de 3 camadas (Qualidade/Momento/Aptidão) da aba Ranking. analyze_tickers roda o
# MESMO motor para uma lista arbitrária de tickers, garantindo que os números BATAM com o Ranking:
#   • ticker DENTRO do universo → reaproveita o resultado de compute_ranking() (cache) → MESMOS
#     números (quality/momentum/verdict/leverage/rank etc.) que a aba Ranking mostra.
#   • ticker FORA do universo → roda _analyze com categoria inferida (.SA→BR, -USD/USDT→CRYPTO,
#     senão US), bucket default "ACELERADOR" e o regime do índice da categoria. Sem dado → failed.
# NUNCA fabrica: ticker sem dado entra em failed_tickers (a UI avisa em vez de inventar).

def _infer_category(ticker: str) -> str:
    """Categoria de um ticker FORA do universo (p/ rodar o motor real com o índice certo)."""
    t = (ticker or "").upper().strip()
    if t.endswith(".SA"):
        return "BR"
    if t.endswith("-USD") or t.endswith("USDT") or t.endswith("USD"):
        return "CRYPTO"
    if "." in t and not t.endswith(".SA"):  # ex: SAN.PA, ASML.AS → bolsa europeia
        return "EUROPE"
    return "US"


def _index_universe() -> Dict[str, Tuple[str, dict]]:
    """{TICKER_UPPER: (categoria, row)} do universo curado+overrides — lookup O(1) por ticker."""
    idx: Dict[str, Tuple[str, dict]] = {}
    for cat, rows in get_universe().items():
        for r in rows:
            idx[r["ticker"].upper()] = (cat, r)
    return idx


def _find_in_ranking(ticker: str, ranking: dict) -> Optional[dict]:
    """Acha o ativo já calculado no resultado de compute_ranking() (MESMOS números do Ranking)."""
    tku = (ticker or "").upper()
    try:
        for cat in ranking.get("categories", {}).values():
            for a in cat.get("assets", []):
                if (a.get("ticker") or "").upper() == tku:
                    out = _strip_profile_inputs(a)
                    out.setdefault("regime", cat.get("regime"))  # regime fica no nível da categoria
                    return out
    except Exception:
        pass
    return None


def analyze_tickers(tickers: List[str], profile: str = "agressivo") -> List[dict]:
    """Roda o MOTOR REAL de 3 camadas para os tickers pedidos.

    Universo (cache do Ranking) p/ os conhecidos; _analyze ao vivo p/ o resto. Cada item é o MESMO
    dict que a aba Ranking produz (quality/momentum/verdict/leverage/rank...) + 'failed': bool quando
    o ticker não retornou dado (NUNCA fabrica). Resultado na ORDEM dos tickers pedidos."""
    out: List[dict] = []
    if not tickers:
        return out

    # 1) Ranking já calculado (cache) → mesmos números da aba Ranking p/ tickers do universo.
    try:
        ranking = compute_ranking()
    except Exception as e:
        logger.warning(f"[SCREEN] compute_ranking falhou (segue só com _analyze ao vivo): {e}")
        ranking = {"categories": {}}

    uni = _index_universe()

    # O cache do Ranking é CANÔNICO (perfil agressivo = doutrina/comportamento atual). Só dá p/
    # reaproveitá-lo quando o assinante pediu agressivo; para conservador/moderado é preciso rodar
    # _analyze AO VIVO com o perfil (caps diferentes) — o cache não reflete esses tetos.
    _reuse_cache = (profiles.normalize_profile(profile) == "agressivo")

    # 2) Tickers que precisam de _analyze ao vivo → busca os índices UMA vez só.
    #    Com perfil não-agressivo, TODOS rodam ao vivo (cache canônico não serve).
    fora = [t for t in tickers
            if (not _reuse_cache) or t.upper() not in uni or _find_in_ranking(t, ranking) is None]
    idxc = idxdm = None
    equity_regime = "NEUTRO"
    if fora:
        try:
            idxc, idxdm, equity_regime = _fetch_indices()
        except Exception as e:
            logger.warning(f"[SCREEN] _fetch_indices falhou: {e}")
            idxc, idxdm = {}, {}

    # Pré-resolve por índice: (a) reaproveita o cache (sem I/O); (b) marca os que precisam de
    # _analyze AO VIVO. A ORDEM dos tickers pedidos é preservada (slot por índice).
    results: List[Optional[dict]] = [None] * len(tickers)
    live_jobs: List[Tuple[int, str, str, str, str]] = []   # (idx, tk, bucket, name, cat)
    for i, tk in enumerate(tickers):
        tku = tk.upper()
        # a) no universo E já no ranking E perfil agressivo → reaproveita (mesmos números).
        res = _find_in_ranking(tk, ranking) if (_reuse_cache and tku in uni) else None
        if res is not None:
            res["failed"] = False
            results[i] = res
            continue
        # b) fora do universo / perfil não-agressivo → _analyze ao vivo COM o perfil.
        cat, row = uni.get(tku, (_infer_category(tk), None))
        bucket = (row or {}).get("bucket", "ACELERADOR")
        name = (row or {}).get("name", tk)
        live_jobs.append((i, tk, bucket, name, cat))

    # PARALELIZA o screen AO VIVO (mesmo padrão de _recompute_ranking_inner): N fetches em série
    # estouravam o timeout do BFF (120s) p/ perfil≠agressivo. ThreadPoolExecutor(8) — I/O de rede.
    def _live(job):
        i, tk, bucket, name, cat = job
        try:
            res = _analyze(tk, bucket, name, cat, idxc or {}, idxdm or {}, equity_regime,
                           profile=profile)
        except Exception as e:
            logger.warning(f"[SCREEN] _analyze {tk} falhou: {e}")
            res = None
        if res is None:
            return i, {"ticker": tk, "failed": True}     # sem dado → flag (não fabrica)
        res["failed"] = False
        res.setdefault("category", cat)
        return i, res

    if live_jobs:
        from concurrent.futures import ThreadPoolExecutor, as_completed
        with ThreadPoolExecutor(max_workers=8) as ex:
            futures = [ex.submit(_live, job) for job in live_jobs]
            for fut in as_completed(futures):
                try:
                    i, res = fut.result()
                    results[i] = res
                except Exception as e:
                    logger.warning(f"[SCREEN] job paralelo falhou: {e}")

    # Preenche eventuais slots vazios (falha rara no future) com flag de falha, na ordem pedida.
    out = [r if r is not None else {"ticker": tickers[i], "failed": True}
           for i, r in enumerate(results)]
    return out


def screen_assets(tickers: List[str], profile: str = "agressivo") -> dict:
    """Endpoint helper: {assets:[...], market_state:{...}, failed_tickers:[...]} com o motor REAL.
    market_state vem do REAL (regime do S&P via compute_market_bar/regime), NÃO hardcoded."""
    analyzed = analyze_tickers(tickers or [], profile=profile)
    assets = [a for a in analyzed if not a.get("failed")]
    failed = [a["ticker"] for a in analyzed if a.get("failed")]

    # market_state REAL: regime do S&P 500 (^GSPC) — mesma fonte/regra do Ranking. NÃO hardcoded.
    state, mult = "NEUTRO", 3
    try:
        idxc, _, _ = _fetch_indices()
        state = regime(idxc.get("^GSPC")) or "NEUTRO"
        mult = MULT.get(state, 3)
    except Exception as e:
        logger.warning(f"[SCREEN] market_state real falhou: {e}")

    return {
        "assets": assets,
        "failed_tickers": failed,
        "attempted_count": len(tickers or []),
        "market_state": {"state": state, "multiplier": mult},
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
    }


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
