"""Portfolio metrics calculation service."""
import math
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


def portfolio_analytics(positions: List[dict], equity: Optional[float] = None) -> Dict:
    """
    Inteligência da carteira (método adotado, modelo Quantfury). `positions`: [{ticker, shares,
    avg_price}]. `equity`: equity atual da conta (denominador da alavancagem).
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
            "notional": round(notional, 2), "is_shy": is_shy,
            "is_seed": bool(p.get("is_seed")), "is_cycle": bool(p.get("is_cycle")),
        })

    # Pesos por valor de mercado; contribuição de risco (Dalio: peso × beta, normalizado).
    for r in rows:
        r["weight"] = round(r["notional"] / invested * 100, 1) if invested else 0.0
    risk_raw = [(r["weight"] / 100) * abs(r["beta"]) if r.get("beta") else 0.0 for r in rows]
    risk_sum = sum(risk_raw) or 1.0
    for r, rr in zip(rows, risk_raw):
        r["risk_contribution"] = round(rr / risk_sum * 100, 1)

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
    }

    # Estrutura ALVO × REAL por bucket.
    real_by_bucket: Dict[str, float] = {}
    for r in rows:
        real_by_bucket[r["bucket"]] = real_by_bucket.get(r["bucket"], 0.0) + r["weight"]
    buckets = []
    for bk, target in PORTFOLIO_TARGETS.items():
        real = round(real_by_bucket.get(bk, 0.0), 1)
        drift = round(real - target, 1)
        buckets.append({"bucket": bk, "target": target, "real": real, "drift": drift,
                        "status": ("ok" if abs(drift) <= 5 else ("acima" if drift > 0 else "abaixo"))})
    for bk, real in real_by_bucket.items():       # buckets fora do alvo (TATICO/RESERVA/—)
        if bk not in PORTFOLIO_TARGETS:
            buckets.append({"bucket": bk, "target": None, "real": round(real, 1),
                            "drift": None, "status": "extra"})

    correlation = _correlation_matrix([r["ticker"] for r in rows])

    # ── SINAL DE VENDA / ROTAÇÃO ──────────────────────────────────────────────────
    # Semente nunca vende. Ciclo (não-semente) que ficou ESTICADO → vender e girar pro
    # melhor do ranking AGORA que ainda não está na carteira (opção 1, diversifica).
    held = {r["ticker"].upper() for r in rows}
    signals, n_sell = [], 0
    for r in rows:
        v = r.get("verdict")
        if r.get("is_seed"):
            action, reason = "MANTER", "Semente — âncora permanente, não rotaciona"
        elif v == "ESTICADO":
            action, reason, n_sell = "VENDER", "Esticado — realizar e girar pro ranking", n_sell + 1
        elif v is None:
            action, reason = "MANTER", "Fora do universo do ranking — avaliar manualmente"
        else:
            action, reason = "MANTER", f"{v} — segue na carteira"
        signals.append({"ticker": r["ticker"], "verdict": v, "action": action,
                        "reason": reason, "is_seed": r.get("is_seed")})
    buyable = [a for a in rk.values()
               if a.get("verdict") in ("COMPRAR FORTE", "COMPRAR")
               and a["ticker"].upper() not in held]
    buyable.sort(key=lambda x: -(x.get("rank") or 0))
    rotate_into = [{
        "ticker": a["ticker"], "name": a.get("name"), "verdict": a.get("verdict"),
        "rank": a.get("rank"), "quality": a.get("quality"), "momentum": a.get("momentum"),
        "current_price": a.get("current_price"), "dividend_yield": a.get("dividend_yield"),
    } for a in buyable[:5]]
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

    import datetime as _dt
    return {
        "assets": rows, "totals": totals, "buckets": buckets,
        "correlation": correlation, "rotation": rotation,
        "survival_stops": survival_stops,
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
