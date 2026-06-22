"""Portfolio metrics calculation service."""
import math
import datetime as dt
import numpy as np
import pandas as pd
from typing import List, Optional, Dict
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.position import Position
from app.services.market_data import get_portfolio_live_data, fetch_price_history
from app.quantitative.indicators import historical_max_drawdown, sharpe_ratio
from app.quantitative.leverage import historical_var, expected_shortfall, annualized_volatility


def _basket_risk(position_data: List[dict]) -> Optional[Dict]:
    """VaR/CVaR/Sharpe/Sortino/maxDD REAIS da CESTA ponderada (não de 1 ticker).
    Usa séries confiáveis (chart API), alinhadas por data, ponderadas por valor."""
    from app.services.ranking_service import _chart_api_df, _dated_closes
    series, weights = {}, {}
    for p in position_data:
        tk = p["ticker"]
        try:
            df, _ = _chart_api_df(tk, 3 * 366, want_div=False)
            if df is not None and len(df) >= 120:
                series[tk] = {d.isoformat(): c for d, c in _dated_closes(df)}
                weights[tk] = float(p.get("current_value") or 0)
        except Exception:
            continue
    if not series:
        return None
    common = None
    for s in series.values():
        ds = set(s.keys())
        common = ds if common is None else (common & ds)
    common = sorted(common or [])
    if len(common) < 120:
        return None
    tot = sum(weights.values()) or 1.0
    port = np.zeros(len(common) - 1)
    for tk, s in series.items():
        prices = np.array([s[d] for d in common], dtype=float)
        port = port + np.diff(np.log(prices)) * (weights[tk] / tot)
    if len(port) < 60:
        return None
    p5 = np.percentile(port, 5)
    cum = np.cumprod(1 + port)
    rm = np.maximum.accumulate(cum)
    dd = (cum - rm) / rm
    downside = port[port < 0]
    return {
        "var": float(-p5 * 100),
        "cvar": float(-port[port <= p5].mean() * 100) if (port <= p5).any() else float(-p5 * 100),
        "sharpe": float(port.mean() / port.std() * math.sqrt(252)) if port.std() > 0 else None,
        "sortino": float(port.mean() / downside.std() * math.sqrt(252)) if len(downside) and downside.std() > 0 else None,
        "max_dd": float(dd.min() * 100),
        "current_dd": float(dd[-1] * 100),
    }


def calculate_portfolio_metrics(portfolio: Portfolio, db: Session) -> Dict:
    positions = db.query(Position).filter(
        Position.portfolio_id == portfolio.id,
        Position.is_active == True,
    ).all()

    if not positions:
        return _empty_metrics()

    tickers = [p.ticker for p in positions]
    live_data = get_portfolio_live_data(tickers)

    total_equity = 0.0
    total_exposure = 0.0
    weighted_beta = 0.0
    weighted_dy = 0.0
    position_data = []

    for pos in positions:
        ld = live_data.get(pos.ticker, {})
        current_price = ld.get("current_price") or pos.avg_price
        current_value = pos.shares * current_price
        notional = current_value * pos.leverage
        pnl = current_value - (pos.shares * pos.avg_price)
        pnl_pct = (current_price / pos.avg_price - 1) * 100 if pos.avg_price > 0 else 0

        total_equity += current_value
        total_exposure += notional

        position_data.append({
            "id": pos.id,
            "ticker": pos.ticker,
            "is_seed": pos.is_seed,
            "is_cycle": pos.is_cycle,
            "shares": pos.shares,
            "avg_price": round(pos.avg_price, 4),
            "current_price": current_price,
            "current_value": round(current_value, 2),
            "notional_value": round(notional, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "leverage": pos.leverage,
            "dy": ld.get("dividend_yield", 0.0),
        })

    effective_leverage = total_exposure / total_equity if total_equity > 0 else 1.0

    weights = [p["current_value"] / total_equity for p in position_data] if total_equity > 0 else []
    weighted_dy = sum(p["dy"] * w for p, w in zip(position_data, weights))

    for p_data in position_data:
        p_data["weight"] = round((p_data["current_value"] / total_equity * 100) if total_equity > 0 else 0, 2)

    # Risco REAL da cesta ponderada (substitui VaR de 1 ticker + números chumbados).
    basket = _basket_risk(position_data) or {}
    # Beta e CAGR da carteira: média ponderada dos valores REAIS do ranking (não 0.75 fixo).
    try:
        rk = _flatten_ranking()
    except Exception:
        rk = {}
    bw = [(rk.get(p["ticker"].upper(), {}).get("beta"), p["current_value"]) for p in position_data]
    bw = [(b, w) for b, w in bw if b is not None]
    portfolio_beta = round(sum(b * w for b, w in bw) / sum(w for _, w in bw), 2) if bw else 0.0
    cw = [(rk.get(p["ticker"].upper(), {}).get("cagr"), p["current_value"]) for p in position_data]
    cw = [(c, w) for c, w in cw if c is not None]
    projected_cagr = round(sum(c * w for c, w in cw) / sum(w for _, w in cw), 2) if cw else 0.0

    deleverage_years = max(0, (effective_leverage - 1.0) / 0.15)
    safety_margin = max(0, (1 / effective_leverage - 0.10) * 100) if effective_leverage > 0 else 90

    return {
        "equity": round(total_equity, 2),
        "total_exposure": round(total_exposure, 2),
        "effective_leverage": round(effective_leverage, 3),
        "portfolio_beta": portfolio_beta,
        "dividend_yield": round(weighted_dy, 2),
        "current_drawdown": round(basket.get("current_dd", 0.0), 1),
        "max_drawdown": round(basket.get("max_dd", 0.0), 1),
        "sharpe_ratio": round(basket["sharpe"], 2) if basket.get("sharpe") is not None else None,
        "sortino_ratio": round(basket["sortino"], 2) if basket.get("sortino") is not None else None,
        "var_95": round(basket.get("var", 0.0), 2),
        "cvar_95": round(basket.get("cvar", 0.0), 2),
        "safety_margin": round(safety_margin, 1),
        "projected_cagr": projected_cagr,
        "deleverage_years": round(deleverage_years, 1),
        "position_data": position_data,
    }


def _empty_metrics() -> Dict:
    return {
        "equity": 0, "total_exposure": 0, "effective_leverage": 1,
        "portfolio_beta": 0, "dividend_yield": 0, "current_drawdown": 0,
        "max_drawdown": 0, "sharpe_ratio": 0, "sortino_ratio": 0,
        "var_95": 0, "cvar_95": 0, "safety_margin": 100,
        "projected_cagr": 0, "deleverage_years": 0, "position_data": [],
    }


# Estrutura-alvo (método adotado — síntese Dalio/Swensen/Core-Satellite × ESTRATÉGIA MASTER).
# Âncoras = CORE estável · Geradores = renda · Aceleradores = satélites de crescimento.
PORTFOLIO_TARGETS = {"ANCORA": 55.0, "GERADOR": 30.0, "ACELERADOR": 15.0}


def _flatten_ranking() -> Dict[str, dict]:
    """ticker(upper) -> asset do ranking (cacheado)."""
    from app.services.ranking_service import compute_ranking
    out: Dict[str, dict] = {}
    ranking = compute_ranking() or {}
    for cat, data in (ranking.get("categories") or {}).items():
        for a in (data.get("assets") or []):
            out[a["ticker"].upper()] = {**a, "category": cat}
    return out


def _bucket_of(ticker: str) -> Optional[str]:
    """Bucket curado do ticker (ANCORA/GERADOR/ACELERADOR/TATICO/RESERVA) via universo."""
    from app.services.ranking_service import get_universe
    tu = ticker.upper()
    for cat, rows in (get_universe() or {}).items():
        for r in rows:
            if r["ticker"].upper() == tu:
                return r.get("bucket")
    return None


def _correlation_matrix(tickers: List[str]) -> Dict:
    """Matriz de correlação dos retornos diários (≈3a) entre os ativos da carteira +
    correlação média (proxy de diversificação). Descorrelação = sua regra de ouro."""
    from app.services.ranking_service import _chart_api_df, _dated_closes
    series = {}
    for tk in tickers:
        try:
            df, _ = _chart_api_df(tk, 3 * 366, want_div=False)
            if df is not None and len(df) >= 120:
                series[tk] = {d.isoformat(): c for d, c in _dated_closes(df)}
        except Exception:
            continue
    valid = list(series.keys())
    matrix, pairs = {}, []
    for i, a in enumerate(valid):
        matrix[a] = {}
        for b in valid:
            common = sorted(set(series[a]) & set(series[b]))
            if len(common) < 60:
                matrix[a][b] = None
                continue
            ra = np.diff(np.log([series[a][d] for d in common]))
            rb = np.diff(np.log([series[b][d] for d in common]))
            c = float(np.corrcoef(ra, rb)[0, 1]) if ra.std() and rb.std() else None
            matrix[a][b] = round(c, 2) if c is not None else None
            if c is not None and b != a and valid.index(b) > i:
                pairs.append((a, b, c))
    avg_corr = round(float(np.mean([p[2] for p in pairs])), 2) if pairs else None
    redundant = sorted([p for p in pairs if p[2] >= 0.8], key=lambda x: -x[2])[:5]
    return {
        "tickers": valid,
        "matrix": matrix,
        "avg_correlation": avg_corr,
        "redundant_pairs": [{"a": a, "b": b, "corr": round(c, 2)} for a, b, c in redundant],
    }


SHY_NOTIONAL_LIMIT = 10000.0   # Quantfury: máx US$10k de notional em SHY


def _cov_analytics(weights_by_ticker: Dict[str, float]) -> Optional[Dict]:
    """Risco REAL via COVARIÂNCIA (item 3) + correlação normal E EM CRISE (item 4).
    weights_by_ticker: {ticker: peso}. Reaproveita séries confiáveis (chart API).
    - contribuição de risco = decomposição de Euler RC_i = w_i·(Σw)_i / (wᵀΣw) — considera
      vol de cada ativo E correlação entre eles (não só beta); hedge (corr neg) REDUZ risco.
    - correlação em crise: pares restritos aos 10% piores dias da própria carteira."""
    from app.services.ranking_service import _chart_api_df, _dated_closes
    tickers = list(weights_by_ticker.keys())
    series = {}
    for tk in tickers:
        try:
            df, _ = _chart_api_df(tk, 3 * 366, want_div=False)
            if df is not None and len(df) >= 120:
                series[tk] = {d.isoformat(): c for d, c in _dated_closes(df)}
        except Exception:
            continue
    valid = [t for t in tickers if t in series]
    if len(valid) < 2:
        return None
    common = sorted(set.intersection(*[set(series[t]) for t in valid]))
    if len(common) < 120:
        return None
    R = np.column_stack([np.diff(np.log([series[t][d] for d in common])) for t in valid])  # T×N
    w = np.array([max(0.0, weights_by_ticker[t]) for t in valid], float)
    w = w / w.sum() if w.sum() > 0 else np.ones(len(valid)) / len(valid)
    cov = np.cov(R, rowvar=False)
    if np.ndim(cov) < 2:
        return None
    vol = np.sqrt(np.clip(np.diag(cov), 0, None)) * math.sqrt(252)
    port_var = float(w @ cov @ w)
    rc = (w * (cov @ w) / port_var) if port_var > 0 else w   # frações (somam ~1; hedge pode dar <0)
    corr = np.corrcoef(R, rowvar=False)
    rp = R @ w
    thr = np.percentile(rp, 10)
    mask = rp <= thr
    corr_crisis = np.corrcoef(R[mask], rowvar=False) if mask.sum() >= 20 else None

    def _wavg_pairs(cmat):
        if cmat is None or np.ndim(cmat) < 2:
            return None
        num = den = 0.0
        for i in range(len(valid)):
            for j in range(i + 1, len(valid)):
                ww = w[i] * w[j]
                num += ww * cmat[i, j]; den += ww
        return round(num / den, 2) if den else None

    redundant = sorted(
        [{"a": valid[i], "b": valid[j], "corr": round(float(corr[i, j]), 2)}
         for i in range(len(valid)) for j in range(i + 1, len(valid)) if corr[i, j] >= 0.8],
        key=lambda x: -x["corr"])[:5]
    return {
        "_series": {t: series[t] for t in valid},   # interno (não vai pro frontend)
        "rc": {valid[i]: round(float(rc[i]) * 100, 1) for i in range(len(valid))},
        "vol": {valid[i]: round(float(vol[i]) * 100, 1) for i in range(len(valid))},
        "correlation": {
            "tickers": valid,
            "matrix": {valid[i]: {valid[j]: round(float(corr[i, j]), 2) for j in range(len(valid))}
                       for i in range(len(valid))},
            "avg_correlation": _wavg_pairs(corr),
            "avg_correlation_crisis": _wavg_pairs(corr_crisis),
            "redundant_pairs": redundant,
        },
    }


def _candidate_max_corr(ticker: str, held_series: Dict[str, dict]) -> Optional[float]:
    """Maior correlação (≈3a) de um CANDIDATO de rotação vs os ativos já em carteira.
    Usado p/ não girar pra algo que anda colado com o que você já tem (item 5/destino)."""
    if not held_series:
        return None
    from app.services.ranking_service import _chart_api_df, _dated_closes
    try:
        df, _ = _chart_api_df(ticker, 3 * 366, want_div=False)
        if df is None or len(df) < 120:
            return None
        cs = {d.isoformat(): c for d, c in _dated_closes(df)}
    except Exception:
        return None
    best = None
    for hs in held_series.values():
        common = sorted(set(cs) & set(hs))
        if len(common) < 60:
            continue
        ra = np.diff(np.log([cs[d] for d in common]))
        rb = np.diff(np.log([hs[d] for d in common]))
        if ra.std() and rb.std():
            c = float(np.corrcoef(ra, rb)[0, 1])
            best = c if best is None else max(best, c)
    return round(best, 2) if best is not None else None


# (nome, início, fim, permite_desconto): GFC é crash SISTÊMICO (correlação→1, oversold não
# protege) → SEM alívio de desconto. COVID/2022 permitem o ajuste de entrada-no-fundo.
_STRESS_DEFS = [
    ("Crise 2008 (GFC)", "2007-10-01", "2009-03-31", False),
    ("COVID 2020", "2020-02-01", "2020-04-30", True),
    ("Bear 2022 (juros)", "2022-01-01", "2022-10-31", True),
]
# Liquidação na QUANTFURY: NÃO há margem de manutenção tradicional — a posição é liquidada
# quando a PERDA acumulada = o equity alocado (equity ZERA → ~-100%; ex: 10x→notional -10%,
# 4x→-25%, 2x→-50%). Buffer de slippage: em pânico/gap você sai um pouco ANTES do zero
# (spread/execução) → liquida a -(100 - buffer)%. _LIQ_BUFFER_PCT ajusta conforme experiência real.
_LIQ_BUFFER_PCT = 3.0
_LIQ_EQUITY_PCT = 100.0 - _LIQ_BUFFER_PCT   # ex: -97% do equity = limiar de liquidação


def _discount_factor(dist_ma200: Optional[float]) -> float:
    """Quanto do crash histórico ainda 'cabe' dado o quão esticado/descontado o ativo está HOJE
    vs a MM200 (estratégia: compra no fundo → menos chão pra cair). PISO CONSERVADOR ×0.85
    (não 0.5) — em carteira alavancada o viés tem que apontar pro pessimista na cauda (anti
    value-trap: oversold pode cair MAIS no crash). +30% (esticado)→1.0; -30% (oversold)→0.85."""
    if dist_ma200 is None:
        return 1.0
    f = 0.85 + (dist_ma200 + 30.0) / 200.0   # +30→1.15→clamp 1.0 ; -30→0.85
    return max(0.85, min(1.0, f))


def _stress_scenarios(rrows: List[dict], equity: float, risk_notional: float) -> List[dict]:
    """STRESS TEST: replay de crashes reais na carteira ATUAL, alavancada.
    Reconstrói a SÉRIE PONDERADA da CESTA na janela (NÃO soma fundos não-simultâneos).
    LIQUIDAÇÃO (regra Quantfury): liquida quando a PERDA = equity alocado (equity zera, ~-100%;
    com buffer de slippage → -_LIQ_EQUITY_PCT). Checada na MÍNIMA INTRADIÁRIA (gap/mínima do dia
    é irreversível), não só no fechamento — path-dependent.
    Dá dois números: pior caso (entrada no início) e ajustado pelo desconto atual."""
    if not (equity and risk_notional > 0 and rrows):
        return []
    from app.services.ranking_service import _chart_api_df, _dated_close_low
    L = risk_notional / equity
    liq_threshold = -_LIQ_EQUITY_PCT     # ex: -97% do equity (≈ zero, com buffer de slippage)
    series = {}
    for r in rrows:
        try:
            df, _ = _chart_api_df(r["ticker"], 25 * 366, want_div=False)
            if df is not None:
                series[r["ticker"]] = list(_dated_close_low(df))   # [(date, close, low)]
        except Exception:
            continue
    out = []
    for name, s, e, allow_disc in _STRESS_DEFS:
        sd, ed = dt.date.fromisoformat(s), dt.date.fromisoformat(e)
        # covered: (notional, start_close, {date:(close,low)}, [datas ordenadas], discount_factor)
        covered = []
        for r in rrows:
            ser = series.get(r["ticker"])
            if not ser:
                continue
            win = sorted((d, c, lo) for d, c, lo in ser if sd <= d <= ed and c and c > 0)
            if len(win) < 5:
                continue                      # ativo não existia/sem dados na época
            f = _discount_factor(r.get("distance_ma200")) if allow_disc else 1.0
            wmap = {d: (c, lo) for d, c, lo in win}
            covered.append((r["notional"], win[0][1], wmap, [d for d, _, _ in win], f))
        tot_w = sum(n for n, *_ in covered)
        if tot_w <= 0:
            continue
        # Eixo de datas = união dos pregões; forward-fill por ativo (ponteiro O(n)).
        # 4 caminhos da cesta (1.0=início): FECHAMENTO (tombo reportado), fechamento×desconto,
        # e os mesmos pela MÍNIMA intradiária (gatilho de liquidação irreversível).
        all_dates = sorted({d for _, _, _, dates, _ in covered for d in dates})
        ptrs = [0] * len(covered)
        last_close = [c[1] for c in covered]                  # começa no start_close (ratio 1.0)
        path, path_adj, path_low, path_low_adj = [], [], [], []
        for d in all_dates:
            vc = vca = vlow = vlowa = 0.0
            for i, (n, start_px, wmap, dates, f) in enumerate(covered):
                low_today = None
                while ptrs[i] < len(dates) and dates[ptrs[i]] <= d:
                    cc, ll = wmap[dates[ptrs[i]]]
                    last_close[i] = cc
                    if dates[ptrs[i]] == d:
                        low_today = ll
                    ptrs[i] += 1
                w = n / tot_w
                cratio = (last_close[i] / start_px) if start_px else 1.0
                lratio = (low_today / start_px) if (low_today and start_px) else cratio
                vc += w * cratio
                vca += w * (1.0 + f * (cratio - 1.0))         # desconto escala só a QUEDA
                vlow += w * lratio
                vlowa += w * (1.0 + f * (lratio - 1.0))
            path.append(vc); path_adj.append(vca); path_low.append(vlow); path_low_adj.append(vlowa)
        basket = (min(path) - 1.0) * 100                       # tombo da cesta no FECHAMENTO
        basket_adj = (min(path_adj) - 1.0) * 100
        eq_min = (min(path) - 1.0) * L * 100                   # equity no pior fechamento
        eq_min_adj = (min(path_adj) - 1.0) * L * 100
        eq_low = (min(path_low) - 1.0) * L * 100               # equity na pior MÍNIMA (liquidação)
        eq_low_adj = (min(path_low_adj) - 1.0) * L * 100
        out.append({
            "scenario": name,
            "basket_pct": round(basket, 1),
            "basket_pct_adj": round(basket_adj, 1),
            "equity_pct": round(max(eq_min, -100.0), 1),
            "equity_pct_adj": round(max(eq_min_adj, -100.0), 1),
            # Liquidação Quantfury (perda=equity, ~-100% com buffer slippage), na MÍNIMA intradiária.
            "liquidated": eq_low <= liq_threshold,
            "liquidated_adj": eq_low_adj <= liq_threshold,
            "coverage": f"{len(covered)}/{len(rrows)}",
        })
    return out


def portfolio_analytics(positions: List[dict], equity: Optional[float] = None,
                        cooldown_tickers: Optional[List[str]] = None) -> Dict:
    """
    Inteligência da carteira (método adotado, modelo Quantfury). `positions`: [{ticker, shares,
    avg_price, is_seed, is_cycle, last_verdict, verdict_since}]. `equity`: equity atual da conta.
    `cooldown_tickers`: tickers vendidos recentemente (não recomendar recompra).
    Notional da posição = shares × preço (Quantfury não tem leverage por posição — ela é MEDIDA).
    Alavancagem efetiva = Σ notional dos ativos de RISCO (exceto SHY) ÷ equity. SHY é reserva:
    fora da alavancagem, limitado a US$10k de notional.
    """
    if not positions:
        return {"assets": [], "totals": {}, "buckets": [], "correlation": {}}

    rk = _flatten_ranking()
    rows = []
    invested = 0.0          # valor de mercado total das posições (base dos pesos)
    risk_notional = 0.0     # exposição de risco (exclui SHY) — numerador da alavancagem
    shy_notional = 0.0
    for p in positions:
        tk = p["ticker"].upper()
        a = rk.get(tk, {})
        price = a.get("current_price") or p.get("avg_price") or 0.0
        shares = float(p.get("shares") or 0)
        notional = shares * price          # exposição (sem multiplicador por posição)
        invested += notional
        is_shy = tk == "SHY"
        if is_shy:
            shy_notional += notional
        else:
            risk_notional += notional
        avg_price = float(p.get("avg_price") or 0)
        pnl_pct = round((price / avg_price - 1) * 100, 1) if avg_price > 0 and price else None
        rows.append({
            "ticker": p["ticker"], "bucket": _bucket_of(tk) or "—",
            "cagr": a.get("cagr"), "dividend_yield": a.get("dividend_yield"),
            "tsr_expected": a.get("tsr_expected"), "beta": a.get("beta"),
            "verdict": a.get("verdict"), "current_price": price,
            "avg_price": round(avg_price, 2) or None, "pnl_pct": pnl_pct,
            "distance_ma200": a.get("distance_ma200"),
            "notional": round(notional, 2), "is_shy": is_shy,
            "is_seed": bool(p.get("is_seed")), "is_cycle": bool(p.get("is_cycle")),
            "last_verdict": p.get("last_verdict"), "verdict_since": p.get("verdict_since"),
        })

    # Pesos por valor de mercado.
    for r in rows:
        r["weight"] = round(r["notional"] / invested * 100, 1) if invested else 0.0

    # CONTRIBUIÇÃO DE RISCO REAL via covariância (item 3) + correlação normal/crise (item 4).
    cov = _cov_analytics({r["ticker"]: r["notional"] for r in rows})
    if cov:
        for r in rows:
            r["risk_contribution"] = cov["rc"].get(r["ticker"])
            r["vol"] = cov["vol"].get(r["ticker"])
        risk_method = "covariância (Euler)"
    else:
        # Fallback (1 ativo / sem série): peso × beta normalizado.
        risk_raw = [(r["weight"] / 100) * abs(r["beta"]) if r.get("beta") else 0.0 for r in rows]
        risk_sum = sum(risk_raw) or 1.0
        for r, rr in zip(rows, risk_raw):
            r["risk_contribution"] = round(rr / risk_sum * 100, 1)
            r["vol"] = None
        risk_method = "peso × beta (fallback)"

    def _wavg(field):
        vals = [(r[field], r["notional"]) for r in rows if r.get(field) is not None]
        tot = sum(v for _, v in vals)
        return round(sum(x * v for x, v in vals) / tot, 2) if tot else None

    eq = float(equity) if equity else None
    totals = {
        "equity": round(eq, 2) if eq else None,
        "invested": round(invested, 2),
        "risk_notional": round(risk_notional, 2),
        "shy_notional": round(shy_notional, 2),
        "shy_over_limit": shy_notional > SHY_NOTIONAL_LIMIT,
        "shy_limit": SHY_NOTIONAL_LIMIT,
        # Alavancagem efetiva = exposição de risco (sem SHY) ÷ equity. Sem equity → None.
        "effective_leverage": round(risk_notional / eq, 2) if eq else None,
        "cagr": _wavg("cagr"), "tsr_expected": _wavg("tsr_expected"),
        "dividend_yield": _wavg("dividend_yield"), "beta": _wavg("beta"),
        "risk_method": risk_method,
    }

    # Estrutura ALVO × REAL por bucket — em % de CAPITAL e em % de RISCO (item 4 da revisão).
    real_by_bucket: Dict[str, float] = {}
    risk_by_bucket: Dict[str, float] = {}
    for r in rows:
        real_by_bucket[r["bucket"]] = real_by_bucket.get(r["bucket"], 0.0) + r["weight"]
        risk_by_bucket[r["bucket"]] = risk_by_bucket.get(r["bucket"], 0.0) + (r.get("risk_contribution") or 0.0)
    buckets = []
    for bk, target in PORTFOLIO_TARGETS.items():
        real = round(real_by_bucket.get(bk, 0.0), 1)
        drift = round(real - target, 1)
        buckets.append({"bucket": bk, "target": target, "real": real, "drift": drift,
                        "risk_pct": round(risk_by_bucket.get(bk, 0.0), 1),
                        "status": ("ok" if abs(drift) <= 5 else ("acima" if drift > 0 else "abaixo"))})
    for bk, real in real_by_bucket.items():       # buckets fora do alvo (TATICO/RESERVA/—)
        if bk not in PORTFOLIO_TARGETS:
            buckets.append({"bucket": bk, "target": None, "real": round(real, 1),
                            "risk_pct": round(risk_by_bucket.get(bk, 0.0), 1),
                            "drift": None, "status": "extra"})

    correlation = cov["correlation"] if cov else _correlation_matrix([r["ticker"] for r in rows])

    # ── SINAL DE VENDA / ROTAÇÃO (item 5: regime + trava de whipsaw) ──────────────
    # Semente nunca vende. Ciclo ESTICADO → vender e girar — MAS só se estiver no lucro
    # (esticado no prejuízo é caso do stop, não da rotação) e fora de capitulação (na
    # capitulação a doutrina manda COMPRAR/deployar SHY, não girar topo).
    try:
        from app.services.ranking_service import compute_ranking as _cr
        _cats = (_cr() or {}).get("categories", {})
        regime_by_cat = {c: ((d or {}).get("regime") or "NEUTRO") for c, d in _cats.items()}
        # Regime da CARTEIRA = regime do mercado de MAIOR EXPOSIÇÃO (corrige o bug de fixar US:
        # carteira BR em capitulação do IBOV não pode ser tratada como TOPO/NEUTRO do S&P).
        exp_by_cat: Dict[str, float] = {}
        for r in rows:
            cat = rk.get(r["ticker"].upper(), {}).get("category")
            if cat:
                exp_by_cat[cat] = exp_by_cat.get(cat, 0.0) + r["notional"]
        if exp_by_cat:
            equity_regime = regime_by_cat.get(max(exp_by_cat, key=exp_by_cat.get), "NEUTRO")
        else:
            equity_regime = regime_by_cat.get("US") or "NEUTRO"
    except Exception:
        regime_by_cat = {}
        equity_regime = "NEUTRO"
    capitulacao = equity_regime in ("CAPITULACAO", "CAPIT.EXTREMA")
    HYST_WEEKS = 2          # esticado precisa PERSISTIR ≥2 semanas (anti-whipsaw)
    today = dt.date.today()

    def _esticado_semanas(r):
        """Há quantas semanas o ativo está ESTICADO de forma contínua (via estado persistido)."""
        if r.get("last_verdict") != "ESTICADO" or not r.get("verdict_since"):
            return 0.0
        try:
            since = dt.date.fromisoformat(str(r["verdict_since"])[:10])
            return (today - since).days / 7.0
        except Exception:
            return 0.0

    held = {r["ticker"].upper() for r in rows}
    signals, n_sell = [], 0
    for r in rows:
        v = r.get("verdict")
        pp = r.get("pnl_pct")
        semanas = _esticado_semanas(r)
        if r.get("is_seed"):
            action, reason = "MANTER", "Semente — âncora permanente, não rotaciona"
        elif capitulacao:
            action, reason = "MANTER", "Mercado em capitulação — segurar e comprar, não girar topo"
        elif v == "ESTICADO" and (pp is None or pp >= 0) and semanas >= HYST_WEEKS:
            action, reason, n_sell = "VENDER", f"Esticado há {semanas:.0f} sem. e no lucro — realizar e girar", n_sell + 1
        elif v == "ESTICADO" and (pp is None or pp >= 0):
            action, reason = "MANTER", f"Esticado recente ({semanas:.0f} sem.) — aguardar confirmação (≥{HYST_WEEKS} sem.)"
        elif v == "ESTICADO":
            action, reason = "MANTER", "Esticado mas no prejuízo — usar o stop, não a rotação"
        elif v is None:
            action, reason = "MANTER", "Fora do universo do ranking — avaliar manualmente"
        else:
            action, reason = "MANTER", f"{v} — segue na carteira"
        signals.append({"ticker": r["ticker"], "verdict": v, "action": action,
                        "reason": reason, "is_seed": r.get("is_seed")})

    # Destino: melhor do ranking não-possuído, FORA do cooldown e que NÃO ande colado (corr<0,8)
    # com o que você já tem (senão piora a diversificação que o painel mede).
    cd = {t.upper() for t in (cooldown_tickers or [])}
    held_series = (cov or {}).get("_series") or {}
    buyable = [a for a in rk.values()
               if a.get("verdict") in ("COMPRAR FORTE", "COMPRAR")
               and a["ticker"].upper() not in held and a["ticker"].upper() not in cd]
    buyable.sort(key=lambda x: -(x.get("rank") or 0))
    rotate_into = []
    for a in buyable:
        if len(rotate_into) >= 5:
            break
        mc = _candidate_max_corr(a["ticker"], held_series)
        if mc is not None and mc >= 0.8:
            continue   # anda colado com uma posição atual → não diversifica, pula
        rotate_into.append({
            "ticker": a["ticker"], "name": a.get("name"), "verdict": a.get("verdict"),
            "rank": a.get("rank"), "quality": a.get("quality"), "momentum": a.get("momentum"),
            "current_price": a.get("current_price"), "dividend_yield": a.get("dividend_yield"),
            "max_corr_held": mc,
        })
    rotation = {"signals": signals, "rotate_into": rotate_into, "n_sell": n_sell}

    # ── STOP DE SOBREVIVÊNCIA (pilar nº1 da doutrina) ─────────────────────────────
    # Caiu ≥10% do PM → vende 1/3 (escalonado: a cada -10% adicional, +1/3). Vale p/ TODAS
    # as posições (ruína não respeita tese — inclusive semente, mas marcamos o flag).
    survival_stops = []
    for r in rows:
        pp = r.get("pnl_pct")
        if pp is None or pp > -10:
            continue
        tercos = min(3, int(abs(pp) // 10))   # -10%→1/3, -20%→2/3, -30%+→3/3
        survival_stops.append({
            "ticker": r["ticker"], "pnl_pct": pp, "thirds": tercos,
            "acao": f"vender {tercos}/3 (stop de sobrevivência)", "is_seed": r.get("is_seed"),
        })
    survival_stops.sort(key=lambda x: x["pnl_pct"])  # mais perdedor primeiro

    # ── RISCO DE SOBREVIVÊNCIA ALAVANCADO + DISTÂNCIA ATÉ A LIQUIDAÇÃO (item 1) ───
    # VaR/maxDD da CESTA DE RISCO (sem SHY, ponderada por notional) e o que isso vira
    # no EQUITY ao multiplicar pela alavancagem. Distância de liquidação = queda da
    # cesta que zera o equity (≈ 1/alavancagem).
    risk = {}
    series = (cov or {}).get("_series") or {}
    rrows = [r for r in rows if not r["is_shy"] and r["ticker"] in series]
    if eq and risk_notional > 0 and rrows:
        try:
            commonr = sorted(set.intersection(*[set(series[r["ticker"]]) for r in rrows]))
            if len(commonr) >= 120:
                wv = np.array([r["notional"] for r in rrows], float)
                wv = wv / wv.sum()
                portr = np.zeros(len(commonr) - 1)
                for r, wi in zip(rrows, wv):
                    portr = portr + np.diff(np.log([series[r["ticker"]][d] for d in commonr])) * wi
                var_d = float(-np.percentile(portr, 5))
                cumr = np.cumprod(1 + portr); rmr = np.maximum.accumulate(cumr)
                maxdd_b = float(((cumr - rmr) / rmr).min() * 100)
                L = risk_notional / eq
                liq_zero = round(100.0 / L, 1) if L > 0 else None             # queda da cesta que ZERA o equity (perda=equity)
                liq_dist = round(_LIQ_EQUITY_PCT / L, 1) if L > 0 else None    # queda que LIQUIDA (Quantfury, com buffer slippage)
                risk = {
                    "leverage": round(L, 2),
                    "var95_equity_daily": round(var_d * 100 * L, 2),       # VaR diário em % do EQUITY
                    "maxdd_basket": round(maxdd_b, 1),                      # pior tombo da cesta (3a)
                    "maxdd_equity": round(max(maxdd_b * L, -100.0), 1),     # como isso bate no equity
                    "liquidation_distance_pct": liq_dist,                  # queda da cesta que liquida (Quantfury: perda=equity)
                    "liquidation_distance_zero": liq_zero,                 # queda que zera exatamente o equity (sem buffer)
                    "liquidated_in_worst": ((maxdd_b * L) <= -_LIQ_EQUITY_PCT) if liq_dist else None,
                }
        except Exception:
            pass

    # ── APORTE pelo BUCKET SUB-ALVO (item 2 — usa o ranking novo, não o screening velho) ──
    # Onde colocar dinheiro novo: bucket(s) abaixo do alvo → melhor ranqueado COMPRAR/FORTE
    # daquele bucket, não-possuído, fora do cooldown e descorrelacionado.
    # Multiplicador dinâmico do regime (doutrina: alavanca o FLUXO NOVO conforme o mercado).
    _MULT = {"CAPIT.EXTREMA": 5, "CAPITULACAO": 4, "NEUTRO": 3, "TOPO": 2}
    mult_aporte = _MULT.get(equity_regime, 3)
    aporte = []
    under = sorted([b for b in buckets if b.get("drift") is not None and b["drift"] < -5],
                   key=lambda b: b["drift"])  # mais abaixo do alvo primeiro
    for b in under:
        cands = [a for a in rk.values()
                 if a.get("verdict") in ("COMPRAR FORTE", "COMPRAR")
                 and a["ticker"].upper() not in held and a["ticker"].upper() not in cd
                 and _bucket_of(a["ticker"]) == b["bucket"]
                 and (_candidate_max_corr(a["ticker"], (cov or {}).get("_series") or {}) or 0) < 0.8]
        cands.sort(key=lambda x: -(x.get("rank") or 0))
        for a in cands[:2]:
            reg_a = regime_by_cat.get(a.get("category"), equity_regime)   # regime do MERCADO do candidato
            mult_a = _MULT.get(reg_a, mult_aporte)
            aporte.append({
                "bucket": b["bucket"], "drift": b["drift"],
                "ticker": a["ticker"], "name": a.get("name"), "verdict": a.get("verdict"),
                "rank": a.get("rank"), "dividend_yield": a.get("dividend_yield"),
                "leverage_sugg": mult_a,
                "rationale": f"{b['bucket']} {abs(b['drift']):.0f}% abaixo do alvo — alavanca o aporte {mult_a}x ({reg_a.lower()})",
            })
    aporte_regime = {
        "regime": equity_regime, "multiplier": mult_aporte,
        "deploy_shy": capitulacao,
        "shy_available": round(shy_notional, 2),
        "nota": ("CAPITULAÇÃO: venda o SHY e deploye o fluxo a %dx nos descontados" % mult_aporte)
                if capitulacao else
                ("Reinvista dividendos/aportes a %dx no bucket sub-alvo" % mult_aporte),
    }

    # STRESS TEST (item 5/sênior): replay de 2008/2020/2022 na carteira atual alavancada.
    stress = _stress_scenarios([r for r in rows if not r["is_shy"]], eq, risk_notional) if eq else []

    # DESALAVANCAGEM NATURAL (doutrina: dívida fixa por fluxo, equity compõe → alav. CAI sozinha).
    deleverage = []
    if eq and risk_notional > eq:
        debt = risk_notional - eq               # parte alavancada (dívida fixa)
        g = (totals.get("cagr") or 8.0) / 100.0
        for y in (1, 3, 5):
            ef = eq * ((1 + g) ** y)
            deleverage.append({"years": y, "leverage": round(1 + debt / ef, 2)})

    import datetime as _dt
    return {
        "assets": rows, "totals": totals, "buckets": buckets,
        "correlation": correlation, "rotation": rotation,
        "survival_stops": survival_stops, "risk": risk,
        "aporte": aporte, "aporte_regime": aporte_regime,
        "stress": stress, "deleverage": deleverage,
        "generated_at": _dt.datetime.utcnow().isoformat() + "Z",
    }


def rotation_signals(portfolio_id: int, db: Session) -> Dict:
    """
    Sinal de VENDA / rotação (estratégia do usuário): SEMENTE nunca vende (âncora
    permanente). Posição de CICLO que ficou ESTICADO no ranking → VENDER e girar o
    capital pro melhor do ranking AGORA que ainda não está na carteira (opção 1).
    Reaproveita o motor de ranking novo (compute_ranking, com cache stale-while-revalidate).
    """
    from app.services.ranking_service import compute_ranking

    positions = db.query(Position).filter(
        Position.portfolio_id == portfolio_id,
        Position.is_active == True,
    ).all()

    ranking = compute_ranking() or {}
    by_ticker: Dict[str, dict] = {}
    all_assets: List[dict] = []
    for cat, data in (ranking.get("categories") or {}).items():
        for a in (data.get("assets") or []):
            item = {**a, "category": cat}
            by_ticker[a["ticker"].upper()] = item
            all_assets.append(item)

    held = {p.ticker.upper() for p in positions}
    signals: List[dict] = []
    n_sell = 0
    for pos in positions:
        asset = by_ticker.get(pos.ticker.upper())
        verdict = asset.get("verdict") if asset else None
        base = {
            "position_id": pos.id, "ticker": pos.ticker,
            "company_name": pos.company_name, "is_seed": pos.is_seed,
            "is_cycle": pos.is_cycle, "verdict": verdict,
            "rank": (asset or {}).get("rank"), "momentum": (asset or {}).get("momentum"),
        }
        if pos.is_seed:
            base.update(action="MANTER", reason="Semente — âncora permanente, não rotaciona")
        elif verdict == "ESTICADO":
            base.update(action="VENDER", reason="Esticado — realizar e girar pro ranking")
            n_sell += 1
        elif verdict is None:
            base.update(action="MANTER", reason="Fora do universo do ranking — avaliar manualmente")
        else:
            base.update(action="MANTER", reason=f"{verdict} — segue na carteira")
        signals.append(base)

    # Destino da rotação (opção 1): melhor do ranking AGORA que NÃO está na carteira.
    buyable = [a for a in all_assets
               if a.get("verdict") in ("COMPRAR FORTE", "COMPRAR")
               and a["ticker"].upper() not in held]
    buyable.sort(key=lambda x: -(x.get("rank") or 0))
    rotate_into = [{
        "ticker": a["ticker"], "name": a.get("name"), "category": a.get("category"),
        "verdict": a.get("verdict"), "rank": a.get("rank"), "quality": a.get("quality"),
        "momentum": a.get("momentum"), "leverage": a.get("leverage"),
        "current_price": a.get("current_price"), "currency": a.get("currency"),
        "dividend_yield": a.get("dividend_yield"),
    } for a in buyable[:5]]

    import datetime as _dt
    return {
        "signals": signals,
        "rotate_into": rotate_into,
        "n_sell": n_sell,
        "generated_at": _dt.datetime.utcnow().isoformat() + "Z",
    }


def suggest_contributions(
    portfolio_id: int,
    available_capital: float,
    risk_profile: str,
    db: Session,
) -> List[Dict]:
    from app.services.market_data import screen_assets
    from app.models.portfolio import Portfolio

    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        return []

    positions = db.query(Position).filter(Position.portfolio_id == portfolio_id).all()
    tickers = [p.ticker for p in positions] if positions else None

    screened_list, _market_state = screen_assets(tickers, risk_profile)
    screened = screened_list[:5]
    suggestions = []

    for asset in screened:
        score = asset["composite_score"]
        weight = score / sum(a["composite_score"] for a in screened)
        amount = round(available_capital * weight, 2)
        suggestions.append({
            "ticker": asset["ticker"],
            "company_name": asset.get("company_name"),
            "suggested_amount": amount,
            "suggested_leverage": asset["recommended_leverage"],
            "rationale": f"Score composto {score:.0f}/100 — {asset['opportunity_rating']}",
            "opportunity_score": asset["opportunity_score"],
            "composite_score": score,
        })

    return suggestions
