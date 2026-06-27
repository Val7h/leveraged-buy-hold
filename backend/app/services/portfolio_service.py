"""Portfolio metrics calculation service."""
import math
import logging
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
from app.quantitative import profiles

logger = logging.getLogger(__name__)


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


# ══════════════════════════════════════════════════════════════════════════════
# COCKPIT DE SOBREVIVÊNCIA — 6 blocos que os investidores sênior pediram p/ o Dashboard.
# Doutrina: B&H ALAVANCADO PREVIDENCIÁRIO (10-15a), survival-first. TUDO aqui responde
# "ajuda o aporte certo OU a não quebrar em 15 anos?". É SÓ EXPOR/CALCULAR dado de
# sobrevivência — nada de sinal de curto prazo, nada de market-timing. Survival só DESCE:
# faltou dado → status/coverage honesto, NUNCA número fabricado. Tudo blindado.
# ══════════════════════════════════════════════════════════════════════════════

# Faixas de status da DISTÂNCIA até a liquidação (folga = quanto a cesta ainda pode cair
# antes de liquidar). Survival: folga pequena = perto da ruína. distance_pct é NEGATIVO
# (queda necessária p/ liquidar); usamos o valor absoluto (a folga) p/ classificar.
_LIQWATCH_CRITICO_PCT = 15.0   # folga < 15% até liquidar = crítico (beira da ruína)
_LIQWATCH_ALERTA_PCT = 25.0    # folga < 25% = alerta

# Estrutura-alvo POR PERFIL (Âncora/Gerador/Acelerador + Reserva). Conservador carrega mais
# Âncora+Reserva; agressivo mais Acelerador. A Reserva (SHY) vem do reserve_pct do perfil
# (profiles), e o restante (1-reserva) é distribuído nos 3 buckets de risco. Survival: o
# alvo do perfil é só o ESPELHO p/ comparar com o real — não força nada.
# Frações de risco (somam 1.0) ANTES de descontar a reserva.
_STRUCTURE_RISK_SPLIT = {
    "conservador": {"ANCORA": 0.65, "GERADOR": 0.27, "ACELERADOR": 0.08},
    "moderado":    {"ANCORA": 0.55, "GERADOR": 0.30, "ACELERADOR": 0.15},
    "agressivo":   {"ANCORA": 0.45, "GERADOR": 0.30, "ACELERADOR": 0.25},
}


def _coverage(rows: List[dict], cov_series: Optional[Dict]) -> Dict:
    """BLOCO 6 — COVERAGE das médias ponderadas: beta/CAGR são média de X de N ativos (alguns
    falham no ranking); correlação/risco cobrem só os ativos com SÉRIE confiável. Exibir média
    de carteira PARCIAL como se fosse a inteira engana. Survival = honestidade: reporta a
    fração coberta. Ex: {"beta": "5/7", "pct_notional_coberto": 0.82}.

    pct_notional_coberto = (notional dos ativos com o dado) / (notional total). NÃO fabrica:
    só conta o que existe em `rows`."""
    n = len(rows)
    total_notional = sum(float(r.get("notional") or 0.0) for r in rows) or 0.0

    def _frac(field):
        have = [r for r in rows if r.get(field) is not None]
        cov_notional = sum(float(r.get("notional") or 0.0) for r in have)
        return {
            "count": f"{len(have)}/{n}",
            "pct_notional_coberto": round(cov_notional / total_notional, 2) if total_notional > 0 else None,
        }

    # Correlação/risco cobrem só os ativos que tiveram série confiável (cov._series).
    series_tk = set((cov_series or {}).keys())
    corr_have = [r for r in rows if r["ticker"] in series_tk]
    corr_notional = sum(float(r.get("notional") or 0.0) for r in corr_have)

    beta_cov = _frac("beta")
    cagr_cov = _frac("cagr")
    return {
        "beta": beta_cov["count"],
        "cagr": cagr_cov["count"],
        "dividend_yield": _frac("dividend_yield")["count"],
        "tsr_expected": _frac("tsr_expected")["count"],
        "correlacao": f"{len(corr_have)}/{n}",
        # campo agregado pedido no contrato: cobertura de notional da média principal (beta).
        "pct_notional_coberto": beta_cov["pct_notional_coberto"],
        "pct_notional_coberto_correlacao": (round(corr_notional / total_notional, 2)
                                            if total_notional > 0 else None),
        "n_ativos": n,
    }


def _liquidation_watch(rows: List[dict], equity: Optional[float],
                       risk_block: Optional[Dict]) -> Dict:
    """BLOCO 1 — LIQUIDATION WATCH (o item nº1 da doutrina: 'vigiar a liq. price').
    Por posição alavancada E AGREGADO, a distância % até a liquidação (queda que zera o
    equity, regra Quantfury: perda = equity alocado, com buffer de slippage).

    distance_pct é a queda (NEGATIVA) que a posição/cesta ainda aguenta antes de liquidar:
      por posição: a posição NÃO tem leverage individual no modelo Quantfury (notional =
      shares×preço, leverage é MEDIDA no agregado). Então a 'distância' por posição é
      reportada relativa à alavancagem AGREGADA da carteira (cada ativo de risco compartilha
      o mesmo equity comum) — é onde a ruína mora. status por faixa de FOLGA.

    AGREGADO reaproveita liquidation_distance_pct que o bloco `risk` já calcula (queda da
    cesta de risco que liquida). Sem equity / sem alavancagem → status 'indisponivel',
    NÃO fabrica número."""
    out: Dict = {"aggregate": None, "por_posicao": [], "status": "indisponivel",
                 "faixas": {"critico_folga_pct": _LIQWATCH_CRITICO_PCT,
                            "alerta_folga_pct": _LIQWATCH_ALERTA_PCT}}
    risk_rows = [r for r in rows if not r.get("is_shy")]
    risk_notional = sum(float(r.get("notional") or 0.0) for r in risk_rows)
    if not equity or equity <= 0 or risk_notional <= 0 or not risk_rows:
        out["nota"] = ("Sem equity ou sem exposição de risco — impossível medir distância de "
                       "liquidação sem fabricar. Survival: status indisponível, não número falso.")
        return out
    L = risk_notional / equity

    def _status(folga_abs: float) -> str:
        if folga_abs < _LIQWATCH_CRITICO_PCT:
            return "critico"
        if folga_abs < _LIQWATCH_ALERTA_PCT:
            return "alerta"
        return "ok"

    # AGREGADO: usa a distância que o bloco risk já reconstruiu (cesta ponderada). Fallback
    # honesto: _LIQ_EQUITY_PCT / L (mesma fórmula do risk) se o risk não veio.
    agg_dist = None
    if risk_block and risk_block.get("liquidation_distance_pct") is not None:
        agg_dist = float(risk_block["liquidation_distance_pct"])
    elif L > 0:
        agg_dist = round(_LIQ_EQUITY_PCT / L, 1)
    if agg_dist is not None:
        distance_pct = -abs(agg_dist)   # queda NEGATIVA até liquidar
        st = _status(abs(distance_pct))
        out["aggregate"] = {"distance_pct": round(distance_pct, 1),
                            "leverage": round(L, 2), "status": st}
        out["status"] = st

    # POR POSIÇÃO: a folga compartilhada (mesma alavancagem agregada). Reportamos a distância
    # agregada por ativo de risco — todas as posições de risco partilham o equity comum, então
    # a liquidação é um evento da CARTEIRA, não isolado. (Survival: não inventa leverage por
    # posição que o modelo Quantfury não tem.)
    if agg_dist is not None:
        for r in risk_rows:
            out["por_posicao"].append({
                "ticker": r["ticker"],
                "leverage": round(L, 2),
                "distance_pct": round(-abs(agg_dist), 1),
                "status": _status(abs(agg_dist)),
            })
    return out


def _aporte_vs_agregado(aporte_regime: Dict, leverage_agregado: Dict) -> Dict:
    """BLOCO 2 — APORTE vs AGREGADO: cruza o multiplicador sugerido p/ o próximo aporte com
    a alavancagem efetiva atual vs o teto agregado (cap C.3). Survival: se o aporte sugerido
    FURARIA o teto, sinaliza (headroom=False). Reaproveita max_lev_novo_fluxo (o VETO que o
    agregado já calcula) — NÃO inventa nova regra de market-timing.

    headroom=True → o aporte Nx cabe sem estourar o teto; False → estouraria (o cap já o
    teria segurado). Sem dados → headroom=None com nota honesta."""
    mult_sugerido = (aporte_regime or {}).get("multiplier")
    mult_regime = (aporte_regime or {}).get("multiplier_regime")
    efetiva = (leverage_agregado or {}).get("effective_leverage")
    efetiva_corr = (leverage_agregado or {}).get("effective_leverage_corr")
    teto = (leverage_agregado or {}).get("cap")
    cap_novo = (leverage_agregado or {}).get("max_lev_novo_fluxo")

    out: Dict = {
        "mult_sugerido": mult_sugerido,        # já com veto do agregado E disjuntor
        "mult_regime": mult_regime,            # o que o regime sozinho pediria
        "max_lev_novo_fluxo": cap_novo,        # teto DURO que o agregado impõe ao fluxo
        "efetiva_atual": efetiva,
        "efetiva_corr": efetiva_corr,
        "teto": teto,
        "headroom": None,
        "nota": "",
    }
    # headroom: o multiplicador que o REGIME queria caberia sem o cap puxar pra baixo?
    if mult_regime is not None and cap_novo is not None:
        cabe = mult_regime <= cap_novo
        out["headroom"] = bool(cabe)
        if cabe:
            out["nota"] = (f"Aporte {int(mult_regime)}x cabe no teto agregado "
                           f"(cap de fluxo {cap_novo:.0f}x).")
        else:
            out["nota"] = (f"Aporte {int(mult_regime)}x ESTOURARIA o teto agregado — "
                           f"o cap segurou para {int(mult_sugerido or 1)}x "
                           f"(cap de fluxo {cap_novo:.0f}x; carteira já alavancada).")
    else:
        out["nota"] = ("Sem base p/ medir headroom (equity/cap agregado indisponível). "
                       "Survival default: tratar como sem folga.")
    return out


def _structure_targets(profile: str) -> Dict:
    """BLOCO 3 — STRUCTURE TARGETS por PERFIL: o alvo 55/30/15 deixa de ser constante global
    e varia por perfil (conservador = mais Âncora+Reserva; agressivo = mais Acelerador). A
    Reserva (SHY) vem do reserve_pct do perfil; os 3 buckets de risco repartem o (1-reserva).
    Survival: é só o ESPELHO p/ o bloco `buckets` comparar alvo×real — não força rotação."""
    prof = profiles.normalize_profile(profile)
    try:
        reserve = float(profiles.profile_leverage_params(prof).get("reserve_pct") or 0.0)
    except Exception:
        reserve = 0.0
    reserve = max(0.0, min(0.5, reserve))
    split = _STRUCTURE_RISK_SPLIT.get(prof, _STRUCTURE_RISK_SPLIT["moderado"])
    risk_share = 1.0 - reserve
    targets = {bk: round(frac * risk_share * 100.0, 1) for bk, frac in split.items()}
    targets["RESERVA"] = round(reserve * 100.0, 1)
    return {
        "profile": prof,
        "reserve_pct": round(reserve * 100.0, 1),
        "targets": targets,     # {ANCORA, GERADOR, ACELERADOR, RESERVA} em % do capital total
    }


def _equity_stale(equity: Optional[float], risk_notional: float, shy_notional: float,
                  invested: float) -> Dict:
    """BLOCO 5 — EQUITY STALE: flag quando o currentEquity (manual) está inconsistente com o
    notional das posições. TODO o painel de sobrevivência depende do equity certo — se o
    equity manual está velho, liquidation_watch / efetiva / stress ficam errados.

    Gatilhos (survival = falso positivo ok):
      • equity ausente/zero → não dá p/ medir nada.
      • equity << soma das posições (invested): no modelo Quantfury à vista, equity ≈ valor
        das posições + caixa. Se equity é muito MENOR que o notional investido, ou é alavancado
        de verdade (ok) OU o equity manual está desatualizado. Sinalizamos p/ o usuário conferir.
    NÃO fabrica: só compara dois números que já existem; se não dá p/ comparar → stale=None."""
    out: Dict = {"stale": None, "motivo": "", "equity": equity,
                 "invested": round(invested, 2) if invested else 0.0,
                 "risk_notional": round(risk_notional, 2) if risk_notional else 0.0}
    if not equity or equity <= 0:
        out["stale"] = True
        out["motivo"] = ("Equity manual ausente ou zero — todo o painel de sobrevivência "
                         "(liquidação, alavancagem, stress) depende dele. Preencha o equity atual.")
        return out
    if invested <= 0:
        out["stale"] = False
        out["motivo"] = "Sem posições para comparar — nada a sinalizar."
        return out
    # equity muito menor que o investido → ou alavancagem real alta OU equity velho.
    # Limiar conservador: equity < 30% do notional investido = suspeito de desatualização
    # (alavancagem efetiva > ~3.3x só de posições à vista é improvável sem ser erro de equity).
    ratio = equity / invested
    if ratio < 0.30:
        out["stale"] = True
        out["motivo"] = (f"Equity (US${equity:,.0f}) é só {ratio*100:.0f}% do notional investido "
                         f"(US${invested:,.0f}) — equity manual pode estar desatualizado vs notional. "
                         "Confira antes de confiar no painel de sobrevivência.")
    else:
        out["stale"] = False
        out["motivo"] = "Equity consistente com o notional das posições."
    return out


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


# ══════════════════════════════════════════════════════════════════════════════
# TRAVAS DE PORTFÓLIO (Fase 2) — rede de segurança AGREGADA. Doutrina: prefira FALSO
# POSITIVO (alertar à toa) a FALSO NEGATIVO. Nunca fabrica dado: fonte falha → trava
# silenciosa com flag, não inventa número.
# ══════════════════════════════════════════════════════════════════════════════

# Limiares (conservadores — sobrevivência é a regra nº1).
_THESIS_ROIC_FLOOR = 0.05          # ROIC abaixo disso (quando tese era saudável) = quebra
_THESIS_ROIC_ABS = 0.03            # gatilho absoluto sem histórico
_DURATION_MONTHS_MAX = 24          # > 24 meses parado sem tese se realizando
_CREDIT_VIX_THRESHOLD = 30.0       # VIX ≥ 30 = regime de stress (proxy de crédito)
_CONCENTRATION_PCT_MAX = 25.0      # maior posição > 25% do notional de risco = alerta
_CLUSTER_CORR = 0.8                # ativos com corr ≥ 0.8 = cluster de risco oculto


def _thesis_stops(rows: List[dict]) -> List[dict]:
    """TRAVA 1 — STOP DE TESE OBJETIVO (não de preço): sai quando o FUNDAMENTO quebra,
    independente do preço. Diferente do stop de sobrevivência (-10%/⅓) e do stop de preço.

    Gatilhos (qualquer um dispara):
      • fcf_yield < 0          → empresa QUEIMANDO caixa
      • roic < 0.03 (absoluto) → retorno sobre capital ruído/destruição de valor
      • dividend_yield == 0 quando dy_worst_year do ranking também == 0 → corte de dividendo
    NÃO aplica a SHY/reserva, crypto, índices, câmbio (sem fundamentos).
    is_seed NÃO é imune (se a tese quebrou, até âncora deve ser revista) — mas flag p/
    o usuário decidir. Fonte falha → posição fica silenciosa (não inventa número)."""
    from app.services.fundamentals_provider import get_fundamentals, _is_no_fundamentals
    out = []
    for r in rows:
        tk = r["ticker"]
        tu = tk.upper()
        if r.get("is_shy") or tu == "SHY" or _is_no_fundamentals(tu):
            continue
        try:
            f = get_fundamentals(tu)
        except Exception:
            continue
        if not f:
            continue
        fcf = f.get("fcf_yield")
        roic = f.get("roic")
        dy = f.get("dividend_yield")
        reasons = []
        # FCF negativo — queimando caixa (gatilho mais duro).
        if fcf is not None and fcf < 0:
            reasons.append("FCF yield negativo — empresa queimando caixa")
        # ROIC desabou. Sem histórico de "saudável", usamos o gatilho absoluto 0.03.
        # (mantemos a constante de piso 0.05 documentada caso haja histórico no futuro).
        if roic is not None and roic < _THESIS_ROIC_ABS:
            reasons.append(f"ROIC {roic*100:.1f}% — retorno sobre capital quebrado (<{_THESIS_ROIC_ABS*100:.0f}%)")
        # Corte de dividendo: DY zerou E o pior-ano do ranking também é 0 (sinal de corte,
        # não apenas empresa que nunca pagou). dy_worst_year vem do ranking cache.
        dy_worst = r.get("dy_worst_year")
        if dy is not None and dy == 0 and dy_worst is not None and dy_worst == 0 and r.get("dividend_yield"):
            # r["dividend_yield"] (do ranking) já indicava DY > 0 antes → agora zerou.
            reasons.append("dividendo cortado — DY despencou a zero")
        if not reasons:
            continue
        out.append({
            "ticker": tk,
            "reason": "; ".join(reasons),
            "fcf_yield": round(fcf, 4) if fcf is not None else None,
            "roic": round(roic, 4) if roic is not None else None,
            "dividend_yield": round(dy, 2) if dy is not None else None,
            "is_seed": bool(r.get("is_seed")),
            "source": f.get("source"),
        })
    return out


def _duration_warnings(rows: List[dict], positions: List[dict]) -> List[dict]:
    """TRAVA 2 — DURAÇÃO (tempo mata, não preço): posição alavancada PARADA tempo demais
    (openedAt > 24 meses) E que está ESTICADO ou JUSTO no ranking (sem upside, tese não
    se realizando) → alerta 'duração longa sem tese se realizando, considerar girar capital'.
    Só ALERTA, não força. Reaproveita o verdict do ranking cache (já em rows).
    openedAt vem das positions (Prisma)."""
    opened_by_tk: Dict[str, str] = {}
    for p in positions:
        oa = p.get("openedAt") or p.get("opened_at")
        if oa:
            opened_by_tk[p["ticker"].upper()] = oa
    out = []
    today = dt.date.today()
    for r in rows:
        tu = r["ticker"].upper()
        oa = opened_by_tk.get(tu)
        if not oa:
            continue
        try:
            opened = dt.date.fromisoformat(str(oa)[:10])
        except Exception:
            continue
        months = (today - opened).days / 30.44
        if months < _DURATION_MONTHS_MAX:
            continue
        v = r.get("verdict")
        if v not in ("ESTICADO", "JUSTO"):
            continue
        out.append({
            "ticker": r["ticker"],
            "months_held": round(months, 1),
            "verdict": v,
            "is_seed": bool(r.get("is_seed")),
            "reason": (f"Parada há {months/12:.1f} anos e {v.lower()} (sem upside) — "
                       "duração longa sem tese se realizando, considerar girar capital"),
        })
    out.sort(key=lambda x: -x["months_held"])
    return out


def _credit_shock() -> Dict:
    """TRAVA 3 — GATILHO DE CHOQUE DE CRÉDITO (desalavanca TUDO). Sinal macro GRÁTIS.

    PROXY (limitação assumida): NÃO temos spread de crédito puro (OAS HY) de graça.
    Usamos como proxy de stress:
      1. VIX ≥ 30 (medo extremo) — já buscado na market-bar; sinal principal.
      2. (reforço) HYG (junk bonds) caindo forte vs LQD (investment grade) nos últimos
         ~20 pregões — quando o spread de crédito abre, HYG cai MAIS que LQD. Se as duas
         séries vierem grátis via chart API, computamos o diferencial; senão, fica só VIX.
    ⚠ HONESTIDADE: VIX é volatilidade de equity, NÃO spread de crédito. Pode dar falso
    positivo (vol alta sem stress de crédito) — e a doutrina ACEITA isso (preferimos
    falso positivo a falso negativo na rede de segurança). Fonte falha → triggered=False
    com nota, nunca fabrica número."""
    from app.services.ranking_service import _chart_api_series
    vix = None
    signals = []
    triggered = False
    try:
        a, _ = _chart_api_series("^VIX", 90)
        if a is not None and len(a):
            vix = float(a[-1])
    except Exception:
        vix = None
    if vix is not None and vix >= _CREDIT_VIX_THRESHOLD:
        triggered = True
        signals.append(f"VIX {vix:.1f} ≥ {_CREDIT_VIX_THRESHOLD:.0f} (regime de medo extremo)")

    # Reforço opcional: HYG vs LQD (spread proxy via ETFs). Best-effort, grátis.
    hyg_lqd_spread = None
    try:
        from app.services.ranking_service import _chart_api_df, _dated_closes
        dfh, _ = _chart_api_df("HYG", 120, want_div=False)
        dfl, _ = _chart_api_df("LQD", 120, want_div=False)
        if dfh is not None and dfl is not None:
            ch = {d.isoformat(): c for d, c in _dated_closes(dfh)}
            cl = {d.isoformat(): c for d, c in _dated_closes(dfl)}
            common = sorted(set(ch) & set(cl))
            if len(common) >= 25:
                # retorno relativo dos últimos ~20 pregões (HYG - LQD). Muito negativo = stress.
                rh = ch[common[-1]] / ch[common[-21]] - 1
                rl = cl[common[-1]] / cl[common[-21]] - 1
                hyg_lqd_spread = round((rh - rl) * 100, 2)
                # HYG sub-performando LQD em > 3pp em 20 pregões = crédito abrindo.
                if hyg_lqd_spread <= -3.0:
                    triggered = True
                    signals.append(f"HYG vs LQD {hyg_lqd_spread:+.1f}pp/20d (junk apanhando — spread de crédito abrindo)")
    except Exception:
        hyg_lqd_spread = None

    if triggered:
        signal = " · ".join(signals)
        rec = ("REGIME DE STRESS DE CRÉDITO: reduza a alavancagem geral (desalavanque TUDO) — "
               "corte exposição de risco, suba o equity/reserva. Rede de segurança: ato preventivo.")
    else:
        signal = (f"VIX {vix:.1f}" if vix is not None else "VIX indisponível") + " — sem sinal de stress"
        rec = "Sem gatilho de choque de crédito agora — manter o plano."

    return {
        "triggered": bool(triggered),
        "signal": signal,
        "recommendation": rec,
        "vix": round(vix, 1) if vix is not None else None,
        "vix_threshold": _CREDIT_VIX_THRESHOLD,
        "hyg_lqd_spread_20d": hyg_lqd_spread,
        "proxy_note": ("Proxy GRÁTIS: VIX (vol de equity) + HYG/LQD (ETFs de crédito). "
                       "NÃO é spread de crédito puro (OAS HY) — pode dar falso positivo. "
                       "A doutrina aceita: melhor alertar à toa que não alertar."),
    }


def _exposure_caps(rows: List[dict], buckets: List[dict], correlation: Dict,
                   risk_notional: float, effective_leverage: Optional[float]) -> Dict:
    """TRAVA 4 — EXPOSIÇÃO AGREGADA + CONCENTRAÇÃO. Além do effective_leverage (já existe):
      • CONCENTRAÇÃO de ativo único: maior posição como % do notional de RISCO (sem SHY).
        Alerta se > 25%.
      • CONCENTRAÇÃO de bucket: bucket acima do alvo+banda (Acelerador/satélite estourando).
      • CLUSTER OCULTO: soma das posições que andam coladas (corr ≥ 0.8 entre si) — risco
        que a diversificação aparente esconde. Usa a matriz que portfolio_analytics já calcula.
    Retorna alertas estruturados (lista) + métricas. Só alerta — não força."""
    alerts = []
    risk_rows = [r for r in rows if not r.get("is_shy")]
    risk_tot = sum(r["notional"] for r in risk_rows) or (risk_notional if risk_notional else 0.0)

    # 1) Concentração de ativo único (% do notional de risco).
    top_position = None
    if risk_tot > 0:
        biggest = max(risk_rows, key=lambda r: r["notional"], default=None)
        if biggest:
            pct = round(biggest["notional"] / risk_tot * 100, 1)
            top_position = {"ticker": biggest["ticker"], "pct_of_risk_notional": pct,
                            "limit": _CONCENTRATION_PCT_MAX}
            if pct > _CONCENTRATION_PCT_MAX:
                alerts.append({
                    "type": "concentracao_ativo",
                    "severity": "warning",
                    "ticker": biggest["ticker"],
                    "value": pct,
                    "limit": _CONCENTRATION_PCT_MAX,
                    "message": (f"{biggest['ticker']} é {pct:.0f}% do notional de risco "
                                f"(> {_CONCENTRATION_PCT_MAX:.0f}%) — concentração perigosa, "
                                "considere reduzir/diversificar."),
                })

    # 2) Concentração de bucket: real acima do alvo + banda de 5%.
    bucket_breaches = []
    for b in buckets:
        target = b.get("target")
        real = b.get("real")
        if target is None or real is None:
            continue
        band = target + 5.0
        if real > band:
            bucket_breaches.append({"bucket": b["bucket"], "real": real, "target": target})
            alerts.append({
                "type": "concentracao_bucket",
                "severity": "warning",
                "bucket": b["bucket"],
                "value": real,
                "limit": band,
                "message": (f"Bucket {b['bucket']} em {real:.0f}% (alvo {target:.0f}% + banda 5%) — "
                            "acima do limite, rebalancear."),
            })

    # 3) Cluster oculto: posições com corr ≥ 0.8 entre si — soma do notional de risco.
    clusters = []
    pairs = (correlation or {}).get("redundant_pairs") or []
    if pairs and risk_tot > 0:
        # agrupa tickers conectados por pares ≥0.8 (componentes conexos simples).
        notional_by_tk = {r["ticker"]: r["notional"] for r in risk_rows}
        adj: Dict[str, set] = {}
        for p in pairs:
            a, b = p.get("a"), p.get("b")
            if a is None or b is None:
                continue
            adj.setdefault(a, set()).add(b)
            adj.setdefault(b, set()).add(a)
        seen = set()
        for node in list(adj.keys()):
            if node in seen:
                continue
            stack, comp = [node], []
            while stack:
                n = stack.pop()
                if n in seen:
                    continue
                seen.add(n)
                comp.append(n)
                stack.extend(adj.get(n, set()) - seen)
            if len(comp) < 2:
                continue
            comp_notional = sum(notional_by_tk.get(t, 0.0) for t in comp)
            pct = round(comp_notional / risk_tot * 100, 1)
            clusters.append({"tickers": sorted(comp), "pct_of_risk_notional": pct})
            if pct > _CONCENTRATION_PCT_MAX:
                alerts.append({
                    "type": "cluster_correlacao",
                    "severity": "warning",
                    "tickers": sorted(comp),
                    "value": pct,
                    "limit": _CONCENTRATION_PCT_MAX,
                    "message": (f"Cluster {', '.join(sorted(comp))} (corr ≥ {_CLUSTER_CORR}) soma "
                                f"{pct:.0f}% do notional de risco — diversificação aparente, "
                                "risco real concentrado."),
                })
    clusters.sort(key=lambda c: -c["pct_of_risk_notional"])

    return {
        "effective_leverage": effective_leverage,
        "top_position": top_position,
        "bucket_breaches": bucket_breaches,
        "clusters": clusters,
        "alerts": alerts,
        "concentration_limit_pct": _CONCENTRATION_PCT_MAX,
    }


# ══════════════════════════════════════════════════════════════════════════════
# CAP AGREGADO DE ALAVANCAGEM (Camada 3 nível portfólio / C.3) — O BLOQUEANTE.
#
# A Camada 3 POR-FLUXO (no ranking, teto_alavancagem_aptidao) capa cada aporte por
# σ/gap/beta/regime. máxDD e ¼·Kelly foram EXILADOS pro AGREGADO — e até aqui o
# agregado só ALERTAVA (_exposure_caps). Isto FORÇA: dá um teto DURO de alavancagem
# efetiva da CARTEIRA e calcula a alavancagem MÁXIMA que um aporte novo pode ter sem
# estourar esse teto. A guidance de aporte passa a usar MIN(o que já calcula, esse teto)
# → o agregado tem VETO sobre o fluxo individual.
#
# Survival-first: sem isto, 2x em 8 ações correlacionadas passa cada fluxo isolado
# enquanto a carteira fica a ~16x de exposição a um único fator.
# ══════════════════════════════════════════════════════════════════════════════

# Cap DURO da alavancagem efetiva (corr-ajustada) da carteira. Acima disto, nenhum
# fluxo novo pode adicionar alavancagem (max_lev_novo_fluxo cai a 1x = sem alavanca).
_LEV_EFETIVA_CAP = 2.5
# Alerta antes do cap: zona amarela, ainda permite mas avisa.
_LEV_EFETIVA_ALERTA = 2.0
# Folga sobre o máxDD da CESTA (consistente com teto_maxdd por-fluxo, 1,8× base).
_FOLGA_MAXDD_CESTA = 1.8


def _effective_leverage_corr(risk_rows: List[dict], equity: Optional[float],
                             correlation: Optional[Dict]) -> Optional[float]:
    """Alavancagem efetiva AJUSTADA POR CORRELAÇÃO.

    A efetiva normal (Σnotional_risco / equity) trata todo ativo como independente —
    subestima o risco quando a carteira tem clusters que andam colados (corr≥0.8): 4
    ações de um mesmo fator a 0.5x cada NÃO diversificam, comportam-se como UM bloco a 2x.

    FÓRMULA (proxy honesto):
      1. Agrupa tickers em clusters por componentes conexos dos pares corr≥0.8 (a mesma
         lógica que _exposure_caps usa). Ativos sem par ≥0.8 = cluster de 1 (independentes).
      2. Para cada cluster, soma os notionais → notional do BLOCO. Um cluster conta como
         um único fator concentrado.
      3. effective_leverage_corr = eff_normal × penalidade_de_concentração. A penalidade
         compara a diversificação que você TERIA com N ativos independentes contra a que
         você REALMENTE tem com os blocos correlacionados:
            div_assets = (Σ notional_ativo)² / Σ (notional_ativo²)   (Nº efetivo de ATIVOS)
            div_blocks = (Σ bloco_i)²        / Σ (bloco_i²)          (Nº efetivo de BLOCOS)
         Sob diversificação ideal (independentes, iguais), o σ da cesta escala com 1/sqrt(N).
         Ao colapsar N ativos em menos blocos efetivos, a redução de risco que você
         esperava (sqrt(div_assets)) NÃO se materializa (só sqrt(div_blocks)). A exposição
         efetiva ao fator SOBE por esse fator:
            penalty = sqrt(div_assets / div_blocks)   (≥ 1)
            eff_corr = eff_normal × penalty
         - Sem clusters (cada ativo = 1 bloco): div_assets == div_blocks → penalty=1 → eff_corr = eff_normal.
         - Todos num cluster: div_blocks=1 (1 bloco) mas div_assets=N → penalty=sqrt(N) → eff_corr sobe forte.

    Sem equity ou sem rows → None (não fabrica)."""
    if not equity or equity <= 0 or not risk_rows:
        return None
    notional_by_tk = {r["ticker"]: float(r.get("notional") or 0.0) for r in risk_rows}
    total_notional = sum(notional_by_tk.values())
    if total_notional <= 0:
        return None
    eff_normal = total_notional / equity

    # Componentes conexos dos pares corr≥0.8 (mesma lógica de _exposure_caps).
    pairs = (correlation or {}).get("redundant_pairs") or []
    adj: Dict[str, set] = {}
    for p in pairs:
        a, b = p.get("a"), p.get("b")
        if a in notional_by_tk and b in notional_by_tk:
            adj.setdefault(a, set()).add(b)
            adj.setdefault(b, set()).add(a)
    seen = set()
    blocks: List[float] = []          # notional somado por bloco/cluster
    for tk in notional_by_tk:
        if tk in seen:
            continue
        # BFS/DFS componente conexo
        stack, comp = [tk], []
        while stack:
            n = stack.pop()
            if n in seen:
                continue
            seen.add(n)
            comp.append(n)
            stack.extend(adj.get(n, set()) - seen)
        blocks.append(sum(notional_by_tk.get(t, 0.0) for t in comp))

    blocks = [b for b in blocks if b > 0]
    asset_notionals = [n for n in notional_by_tk.values() if n > 0]
    if not blocks or not asset_notionals:
        return round(eff_normal, 3)
    # Número EFETIVO de ATIVOS e de BLOCOS (índice de Herfindahl invertido).
    sum_a = sum(asset_notionals); sum_a2 = sum(n * n for n in asset_notionals)
    sum_b = sum(blocks); sum_b2 = sum(b * b for b in blocks)
    div_assets = (sum_a * sum_a) / sum_a2 if sum_a2 > 0 else 1.0
    div_blocks = (sum_b * sum_b) / sum_b2 if sum_b2 > 0 else 1.0
    # Penalidade: a diversificação que NÃO se materializou por causa dos clusters (≥1).
    penalty = math.sqrt(div_assets / div_blocks) if div_blocks > 0 else 1.0
    penalty = max(1.0, penalty)
    eff_corr = eff_normal * penalty
    return round(eff_corr, 3)


def _aggregate_leverage_cap(rows: List[dict], equity: Optional[float],
                            correlation: Optional[Dict], risk_obj: Optional[Dict],
                            totals: Dict) -> Dict:
    """C.3 — CAP AGREGADO QUE FORÇA. Retorna o bloco `leverage_agregado`.

    Combina:
      • cap DURO de alavancagem efetiva corr-ajustada (_LEV_EFETIVA_CAP = 2.5);
      • teto_maxdd da CESTA (máxDD agregado × folga 1,8× — onde o máxDD finalmente morde);
      • ¼·Kelly do PORTFÓLIO (μ/σ da cesta — onde o Kelly finalmente morde).

    `max_lev_novo_fluxo` = MIN dos três, arredondado PRA BAIXO. É o teto que a guidance de
    aporte passa a respeitar (VETO do agregado sobre o fluxo). Quando a efetiva já está alta,
    esse número CAI até 1x (sem alavanca nova).

    Dado ausente NÃO entra no MIN (não fabrica) — segue a doutrina das travas por-fluxo."""
    from app.quantitative.scoring_v2 import teto_maxdd, teto_kelly

    risk_rows = [r for r in rows if not r.get("is_shy")]
    eff_normal = totals.get("effective_leverage")            # já = risk_notional/equity (ou None)
    eff_corr = _effective_leverage_corr(risk_rows, equity, correlation)

    out: Dict = {
        "effective_leverage": eff_normal,
        "effective_leverage_corr": eff_corr,
        "cap": _LEV_EFETIVA_CAP,
        "alerta": _LEV_EFETIVA_ALERTA,
        "status": "ok",
        "max_lev_novo_fluxo": None,
        "caps_aplicados": {},          # rastreabilidade: qual teto mordeu
        "nota": "",
    }

    # Sem equity → não há como medir alavancagem efetiva. Survival default: 1x (sem alavanca).
    if not equity or equity <= 0 or not risk_rows:
        out["status"] = "indisponivel"
        out["max_lev_novo_fluxo"] = 1.0
        out["nota"] = ("Equity ausente — sem base p/ medir alavancagem efetiva. "
                       "Survival default: nenhum aporte novo deve alavancar (1x).")
        return out

    eff_use = eff_corr if eff_corr is not None else eff_normal
    if eff_use is None:
        out["status"] = "indisponivel"
        out["max_lev_novo_fluxo"] = 1.0
        return out

    # STATUS pela efetiva corr-ajustada.
    if eff_use >= _LEV_EFETIVA_CAP:
        out["status"] = "estourado"
    elif eff_use >= _LEV_EFETIVA_ALERTA:
        out["status"] = "alerta"
    else:
        out["status"] = "ok"

    # ── TETO 1: cap DURO de alavancagem efetiva corr-ajustada ─────────────────────
    # A alavancagem MÁXIMA que um aporte novo (de tamanho típico) pode ter sem a carteira
    # passar do cap. Modelo: o cap limita o notional de RISCO total a (cap × equity). A folga
    # que sobra (headroom) é o notional adicional possível; um aporte usa parte dela. Mas o
    # SINAL que importa é o teto de MULTIPLICADOR: se a efetiva já está no/acima do cap, o
    # multiplicador do fluxo novo cai a 1x. Escala linear entre alerta e cap.
    risk_notional = totals.get("risk_notional") or sum(r["notional"] for r in risk_rows)
    headroom_notional = max(0.0, _LEV_EFETIVA_CAP * equity - (risk_notional or 0.0))
    # ajuste corr: se a efetiva corr é maior que a normal, o headroom REAL é menor.
    if eff_corr and eff_normal and eff_normal > 0:
        headroom_notional *= (eff_normal / eff_corr)        # encolhe o espaço pela concentração
    # Teto de multiplicador pelo cap: decai de 5x (efetiva baixa) a 1x (efetiva no cap).
    if eff_use >= _LEV_EFETIVA_CAP:
        cap_lev = 1.0
    else:
        # folga relativa até o cap → vira teto de multiplicador (até 5x).
        folga_rel = (_LEV_EFETIVA_CAP - eff_use) / _LEV_EFETIVA_CAP
        cap_lev = max(1.0, min(5.0, 1.0 + folga_rel * 5.0))
    out["caps_aplicados"]["cap_efetivo"] = round(cap_lev, 2)
    out["headroom_notional"] = round(headroom_notional, 2)

    candidates = [cap_lev]

    # ── TETO 2: máxDD da CESTA (onde o máxDD finalmente morde) ────────────────────
    # Reaproveita o máxDD da cesta de risco que o `risk` já reconstruiu (série ponderada).
    maxdd_cesta = None
    if risk_obj and risk_obj.get("maxdd_basket") is not None:
        maxdd_cesta = risk_obj["maxdd_basket"]
    sigma_cesta_pct = totals.get("_sigma_basket_pct")        # opcional (vol da cesta), se disponível
    if maxdd_cesta is not None:
        # teto_maxdd já aplica a folga 1,8× internamente (consistente com _FOLGA_MAXDD_CESTA).
        t_dd = teto_maxdd(maxdd_cesta, sigma_pct=sigma_cesta_pct)
        if t_dd is not None:
            candidates.append(t_dd)
            out["caps_aplicados"]["maxdd_cesta"] = t_dd
            out["maxdd_cesta"] = round(maxdd_cesta, 1)

    # ── TETO 3: ¼·Kelly do PORTFÓLIO (onde o Kelly finalmente morde) ──────────────
    # μ da cesta ≈ CAGR ponderado − rf ; σ da cesta = vol anualizada da cesta de risco.
    rf = 4.0                                                 # taxa livre de risco aprox. (% a.a.)
    cagr_cesta = totals.get("cagr")                          # CAGR ponderado da carteira (% a.a.)
    mu_excess = None
    if cagr_cesta is not None:
        mu_excess = (cagr_cesta - rf) / 100.0                # em FRAÇÃO anual
        # Fix 1 (anti return-chasing PRÓ-CÍCLICO): μ aqui é CAGR de PREÇO passado − rf. Cesta que
        # já subiu muito → μ alto → ¼·Kelly libera MAIS lev no TOPO do ciclo (viés errado). Capa o
        # prêmio esperado em ~12% a.a. (sem TSR forward por cesta disponível, capar é o conservador).
        # teto_kelly também capa internamente; aqui deixamos explícito p/ o mu_excess_cesta reportado.
        from app.quantitative.scoring_v2 import MU_EXCESS_CAP
        mu_excess = min(mu_excess, MU_EXCESS_CAP)
    if mu_excess is not None and sigma_cesta_pct is not None:
        t_kelly = teto_kelly(mu_excess, sigma_cesta_pct)
        if t_kelly is not None:
            candidates.append(t_kelly)
            out["caps_aplicados"]["kelly_cesta"] = round(t_kelly, 2)
            out["mu_excess_cesta"] = round(mu_excess * 100, 2)
            out["sigma_cesta_pct"] = round(sigma_cesta_pct, 1)

    # MIN dos tetos válidos, arredonda PRA BAIXO (survival = MÍNIMO).
    max_lev = min(candidates) if candidates else 1.0
    max_lev = max(1.0, math.floor(max_lev))
    out["max_lev_novo_fluxo"] = float(max_lev)

    # ── C.2 (best-effort): disjuntor de fluxos consecutivos ───────────────────────
    # ESPEC: degradar o multiplicador (5x→3x→2x→1x) a cada aporte CONSECUTIVO no MESMO
    # ativo em queda (abaixo da MM / em drawdown). DADO AUSENTE: o modelo Position guarda
    # apenas opened_at + shares/avg_price agregados — NÃO há histórico de aportes individuais
    # (quantos aportes consecutivos foram feitos, quando, a que preço). Sem tabela de
    # aporte-history NÃO dá pra contar fluxos consecutivos sem FABRICAR. Doutrina: não inventa.
    out["disjuntor_fluxos"] = {
        "implementado": False,
        "motivo": ("Requer histórico de aportes por ativo (tabela aporte-history): nº de aportes "
                   "consecutivos, datas e preços. O modelo Position só tem opened_at + shares/avg_price "
                   "agregados — impossível contar fluxos consecutivos sem fabricar."),
        "degradacao_alvo": "5x→3x→2x→1x por aporte consecutivo em ativo abaixo da MM/em drawdown",
        "falta": "tabela aporte-history (contribution log) com [ticker, data, preço, abaixo_MM, drawdown]",
    }

    # Nota legível.
    quem = min(out["caps_aplicados"], key=out["caps_aplicados"].get) if out["caps_aplicados"] else "cap_efetivo"
    nomes = {"cap_efetivo": "cap de alavancagem efetiva", "maxdd_cesta": "máxDD da cesta",
             "kelly_cesta": "¼·Kelly da carteira"}
    if max_lev <= 1.0:
        out["nota"] = (f"Carteira a {eff_use:.2f}x efetiva (corr-ajustada) — sem espaço para "
                       f"alavancar fluxo novo. Teto que mordeu: {nomes.get(quem, quem)}.")
    else:
        out["nota"] = (f"Fluxo novo limitado a {max_lev:.0f}x (efetiva corr {eff_use:.2f}x; "
                       f"teto vinculante: {nomes.get(quem, quem)}).")
    return out


# ══════════════════════════════════════════════════════════════════════════════
# C.2 — DISJUNTOR DE FLUXOS CONSECUTIVOS (a trava que o CRO exigiu).
#
# Doutrina: empilhar aportes ALAVANCADOS no MESMO ativo enquanto ele CAI =
# averaging-down alavancado (primo do martingale) → liquida ANTES da recuperação.
# Regra: o 1º fluxo entra no multiplicador cheio do regime; cada aporte CONSECUTIVO
# num ativo CAINDO (abaixo da MM200 / em drawdown / verdict ruim / capitulação)
# DEGRADA o multiplicador um degrau, com PISO 1x (à vista). Ativo SUBINDO/recuperado
# → sem degradação (aporte normal). Survival-first: o disjuntor só DEGRADA, nunca sobe.
# Sem histórico (aportes_recentes=0) → não degrada (NÃO fabrica).
#
# Ladder: mult_efetivo = max(1, mult_regime − aportes_recentes). Ex (mult_regime=5):
#   1 aporte consecutivo → 4x ; 2 → 3x ; 3 → 2x ; 4+ → 1x (à vista). Zera após N≈mult_regime.
# ══════════════════════════════════════════════════════════════════════════════

def _esta_caindo(r: dict, capitulacao: bool) -> bool:
    """Ativo CAINDO p/ fins do disjuntor (reaproveita o que já existe, sem rede nova):
      • verdict ESPECULATIVO/JUSTO/ESTICADO (sem upside / esticado = topo arriscado), OU
      • distance_ma200 < 0 (abaixo da MM200), OU
      • pnl_pct < 0 (em drawdown vs PM), OU
      • regime de capitulação (mercado despencando).
    Survival: na dúvida (verdict ruim) considera caindo — preferimos falso positivo."""
    if capitulacao:
        return True
    v = r.get("verdict")
    if v in ("ESPECULATIVO", "JUSTO", "ESTICADO"):
        return True
    dma = r.get("distance_ma200")
    if dma is not None and dma < 0:
        return True
    pp = r.get("pnl_pct")
    if pp is not None and pp < 0:
        return True
    return False


def _disjuntor_fluxos(rows: List[dict], mult_regime: int, capitulacao: bool) -> Dict:
    """C.2 — computa a degradação por ativo a partir de aportes_recentes (PositionEvent).
    Retorna o bloco `disjuntor_fluxos` (implementado:true) com os ativos AFETADOS.

    Para cada ativo CAINDO com aportes_recentes>=1: mult_degradado = max(1, mult_regime −
    aportes_recentes). is_seed NÃO é imune (reforçar âncora em queda é o risco). Ativo
    subindo/recuperado ou sem aporte recente → não entra (aporte normal)."""
    afetados = []
    for r in rows:
        if r.get("is_shy"):
            continue
        n = int(r.get("aportes_recentes") or 0)
        if n < 1:
            continue                      # sem histórico de aporte consecutivo → não degrada
        if not _esta_caindo(r, capitulacao):
            continue                      # subindo/recuperado → aporte normal, não degrada
        mult_degradado = max(1, mult_regime - n)
        if mult_degradado >= mult_regime:
            continue                      # nada a degradar
        afetados.append({
            "ticker": r["ticker"],
            "aportes_recentes": n,
            "mult_original": mult_regime,
            "mult_degradado": mult_degradado,
            "is_seed": bool(r.get("is_seed")),
            "verdict": r.get("verdict"),
            "distance_ma200": r.get("distance_ma200"),
            "pnl_pct": r.get("pnl_pct"),
            "motivo": (f"{n} aporte(s) consecutivo(s) num ativo em queda — averaging-down "
                       f"alavancado: degrada {mult_regime}x → {mult_degradado}x"
                       + (" (piso 1x à vista)" if mult_degradado <= 1 else "")),
        })
    afetados.sort(key=lambda x: (x["mult_degradado"], -x["aportes_recentes"]))
    return {
        "implementado": True,
        "ladder": "mult_efetivo = max(1, mult_regime − aportes_consecutivos) · piso 1x",
        "regra_caindo": ("verdict ESPECULATIVO/JUSTO/ESTICADO, OU distance_ma200<0 (abaixo da MM200), "
                         "OU pnl_pct<0 (drawdown vs PM), OU regime de capitulação"),
        "mult_regime": mult_regime,
        "afetados": afetados,
        "n_afetados": len(afetados),
    }


def portfolio_analytics(positions: List[dict], equity: Optional[float] = None,
                        cooldown_tickers: Optional[List[str]] = None,
                        profile: str = "agressivo") -> Dict:
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
            # C.2 — nº de aportes (COMPRA) consecutivos recentes no MESMO ativo (vem da BFF/Prisma
            # PositionEvent). Sem histórico → 0 → disjuntor não degrada (não fabrica).
            "aportes_recentes": int(p.get("aportes_recentes") or 0),
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
    # Alvos POR PERFIL (bloco 3): o 55/30/15 deixa de ser constante global. RESERVA também
    # ganha alvo (reserve_pct do perfil). Survival: só espelho alvo×real, não força nada.
    _st = _structure_targets(profile)
    _profile_targets = _st["targets"]   # {ANCORA, GERADOR, ACELERADOR, RESERVA}
    buckets = []
    for bk, target in _profile_targets.items():
        real = round(real_by_bucket.get(bk, 0.0), 1)
        drift = round(real - target, 1)
        buckets.append({"bucket": bk, "target": target, "real": real, "drift": drift,
                        "risk_pct": round(risk_by_bucket.get(bk, 0.0), 1),
                        "status": ("ok" if abs(drift) <= 5 else ("acima" if drift > 0 else "abaixo"))})
    for bk, real in real_by_bucket.items():       # buckets fora do alvo (TATICO/—)
        if bk not in _profile_targets:
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
    HYST_WEEKS_TATICO = 1   # tático/ciclo: position trade, gira mais rápido (1 sem.)
    for r in rows:
        v = r.get("verdict")
        pp = r.get("pnl_pct")
        semanas = _esticado_semanas(r)
        # is_tatico vem do ranking cache (campo "is_tatico" do asset); default False se ausente.
        is_tatico = bool(rk.get(r["ticker"].upper(), {}).get("is_tatico", False))
        is_cycle = bool(r.get("is_cycle"))
        weeks_esticado = 0.0
        if r.get("is_seed"):
            action, reason = "MANTER", "Semente — âncora permanente, não rotaciona"
        elif capitulacao:
            action, reason = "MANTER", "Mercado em capitulação — segurar e comprar, não girar topo"
        elif v == "ESTICADO" and (pp is None or pp >= 0) and (is_tatico or is_cycle) and semanas >= HYST_WEEKS_TATICO:
            weeks_esticado = semanas
            n = int(semanas)
            action, reason, n_sell = "VENDER", f"Tático/ciclo esticado há {n} sem. — girar para próximo do ranking", n_sell + 1
        elif v == "ESTICADO" and (pp is None or pp >= 0) and (is_tatico or is_cycle):
            action, reason = "MANTER", f"Tático/ciclo esticado recente ({semanas:.0f} sem.) — aguardar confirmação (≥{HYST_WEEKS_TATICO} sem.)"
        elif v == "ESTICADO" and (pp is None or pp >= 0) and semanas >= HYST_WEEKS:
            weeks_esticado = semanas
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
                        "reason": reason, "is_seed": r.get("is_seed"),
                        "weeks_esticado": round(weeks_esticado, 1)})

    # Destino: melhor do ranking não-possuído, FORA do cooldown e que NÃO ande colado (corr<0,8)
    # com o que você já tem (senão piora a diversificação que o painel mede).
    # rotate_into é sempre calculado (n_sell=0 → mode="opportunity"; n_sell>0 → mode="sell").
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
    rotate_into_mode = "sell" if n_sell > 0 else "opportunity"
    rotation = {"signals": signals, "rotate_into": rotate_into, "n_sell": n_sell,
                "rotate_into_mode": rotate_into_mode}

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
                # CVaR 95% (Expected Shortfall): perda MÉDIA nos 5% piores dias — a cauda que
                # o VaR esconde. Mais honesto p/ carteira alavancada (item 4 do cockpit).
                p5r = np.percentile(portr, 5)
                cvar_d = float(-portr[portr <= p5r].mean()) if (portr <= p5r).any() else var_d
                cumr = np.cumprod(1 + portr); rmr = np.maximum.accumulate(cumr)
                maxdd_b = float(((cumr - rmr) / rmr).min() * 100)
                # σ anualizada da cesta de risco (alimenta ¼·Kelly e teto_maxdd do agregado).
                sigma_basket_pct = float(portr.std() * math.sqrt(252) * 100) if portr.std() > 0 else None
                totals["_sigma_basket_pct"] = round(sigma_basket_pct, 2) if sigma_basket_pct is not None else None
                L = risk_notional / eq
                liq_zero = round(100.0 / L, 1) if L > 0 else None             # queda da cesta que ZERA o equity (perda=equity)
                liq_dist = round(_LIQ_EQUITY_PCT / L, 1) if L > 0 else None    # queda que LIQUIDA (Quantfury, com buffer slippage)
                risk = {
                    "leverage": round(L, 2),
                    "var95_equity_daily": round(var_d * 100 * L, 2),       # VaR diário em % do EQUITY
                    "cvar95_equity_daily": round(cvar_d * 100 * L, 2),     # CVaR/ES diário em % do EQUITY (cauda)
                    "var95_basket_daily": round(var_d * 100, 2),           # VaR da cesta (sem alavancar)
                    "cvar95_basket_daily": round(cvar_d * 100, 2),         # CVaR da cesta (perda média na cauda)
                    "maxdd_basket": round(maxdd_b, 1),                      # pior tombo da cesta (3a)
                    "maxdd_equity": round(max(maxdd_b * L, -100.0), 1),     # como isso bate no equity
                    "liquidation_distance_pct": liq_dist,                  # queda da cesta que liquida (Quantfury: perda=equity)
                    "liquidation_distance_zero": liq_zero,                 # queda que zera exatamente o equity (sem buffer)
                    "liquidated_in_worst": ((maxdd_b * L) <= -_LIQ_EQUITY_PCT) if liq_dist else None,
                }
        except Exception:
            pass

    # ── CAP AGREGADO DE ALAVANCAGEM (C.3) — o BLOQUEANTE que FORÇA ────────────────
    # Calculado ANTES do aporte: max_lev_novo_fluxo vira VETO sobre a alavancagem sugerida.
    try:
        leverage_agregado = _aggregate_leverage_cap(rows, eq, correlation, risk, totals)
    except Exception as e:
        logger.warning(f"[C.3] leverage_agregado falhou: {e}")
        # Survival default: na dúvida, não alavanca fluxo novo.
        leverage_agregado = {
            "effective_leverage": totals.get("effective_leverage"),
            "effective_leverage_corr": None, "cap": _LEV_EFETIVA_CAP,
            "alerta": _LEV_EFETIVA_ALERTA, "status": "indisponivel",
            "max_lev_novo_fluxo": 1.0, "caps_aplicados": {},
            "nota": "Cap agregado indisponível — survival default 1x.",
        }
    cap_novo_fluxo = leverage_agregado.get("max_lev_novo_fluxo")

    # ── APORTE pelo BUCKET SUB-ALVO (item 2 — usa o ranking novo, não o screening velho) ──
    # Onde colocar dinheiro novo: bucket(s) abaixo do alvo → melhor ranqueado COMPRAR/FORTE
    # daquele bucket, não-possuído, fora do cooldown e descorrelacionado.
    # Multiplicador dinâmico do regime CONFORME O PERFIL (agressivo = tabela/doutrina atual).
    # TETO DURO do perfil (cap2/3/5) entra como MIN — junto do cap agregado C.3 e do disjuntor;
    # survival nunca SOBE por causa do perfil, só pode descer.
    _plp = profiles.profile_leverage_params(profile)
    _profile_cap = _plp["leverage_cap"]
    mult_aporte = min(profiles.regime_multiplier(profile, equity_regime), int(_profile_cap))

    # ── C.2 — DISJUNTOR DE FLUXOS CONSECUTIVOS (a trava do CRO) ───────────────────
    # Calcula a degradação por ativo (aportes consecutivos no MESMO ativo em queda).
    # Reforçar uma posição já em carteira que está caindo derruba o multiplicador.
    try:
        disjuntor_fluxos = _disjuntor_fluxos(rows, mult_aporte, capitulacao)
    except Exception as e:
        logger.warning(f"[C.2] disjuntor_fluxos falhou: {e}")
        disjuntor_fluxos = {"implementado": True, "afetados": [], "n_afetados": 0,
                            "mult_regime": mult_aporte}
    # Mapa ticker(upper) → mult degradado (o piso que o disjuntor impõe naquele ativo).
    _degrade_by_tk = {a["ticker"].upper(): a["mult_degradado"]
                      for a in disjuntor_fluxos.get("afetados", [])}

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
            # Multiplicador do regime do candidato CONFORME O PERFIL, já capado pelo teto duro.
            mult_regime_a = min(profiles.regime_multiplier(profile, reg_a), int(_profile_cap))
            # VETO do AGREGADO (C.3): a alavancagem sugerida = MIN(regime, cap agregado).
            # Se a carteira está alavancada demais, o cap puxa pra baixo (até 1x = sem alavanca).
            if cap_novo_fluxo is not None:
                mult_a = int(min(mult_regime_a, cap_novo_fluxo))
            else:
                mult_a = mult_regime_a
            mult_a = max(1, mult_a)
            capped = cap_novo_fluxo is not None and mult_a < mult_regime_a
            # DISJUNTOR C.2: se este ativo já está sendo reforçado consecutivamente em queda,
            # o disjuntor impõe um piso degradado (MIN com o que já temos). Só DEGRADA.
            disj_floor = _degrade_by_tk.get(a["ticker"].upper())
            disjuntado = disj_floor is not None and disj_floor < mult_a
            if disjuntado:
                mult_a = max(1, disj_floor)
            rationale = (f"{b['bucket']} {abs(b['drift']):.0f}% abaixo do alvo — "
                         f"alavanca o aporte {mult_a}x ({reg_a.lower()})")
            if capped:
                rationale += (f" · CAP AGREGADO limitou de {mult_regime_a}x → {mult_a}x "
                              f"(alavancagem efetiva da carteira)")
            if disjuntado:
                rationale += (f" · DISJUNTOR DE FLUXOS limitou a {mult_a}x "
                              f"(aportes consecutivos em ativo caindo)")
            aporte.append({
                "bucket": b["bucket"], "drift": b["drift"],
                "ticker": a["ticker"], "name": a.get("name"), "verdict": a.get("verdict"),
                "rank": a.get("rank"), "dividend_yield": a.get("dividend_yield"),
                "leverage_sugg": mult_a,
                "leverage_regime": mult_regime_a,
                "capped_by_aggregate": capped,
                "degraded_by_disjuntor": disjuntado,
                "rationale": rationale,
            })
    # Multiplicador EFETIVO do regime = MIN(regime, cap agregado C.3). O agregado tem VETO.
    mult_regime_headline = mult_aporte
    if cap_novo_fluxo is not None:
        mult_aporte_efetivo = max(1, int(min(mult_aporte, cap_novo_fluxo)))
    else:
        mult_aporte_efetivo = mult_aporte
    regime_capped = mult_aporte_efetivo < mult_regime_headline
    # DISJUNTOR C.2 no headline: o piso mais profundo entre os ativos afetados puxa o
    # multiplicador do aporte pra baixo (averaging-down alavancado num ativo em queda).
    mult_pos_disjuntor = mult_aporte_efetivo
    if _degrade_by_tk:
        disj_floor_headline = min(_degrade_by_tk.values())
        mult_pos_disjuntor = max(1, min(mult_aporte_efetivo, disj_floor_headline))
    regime_disjuntado = mult_pos_disjuntor < mult_aporte_efetivo
    mult_final = mult_pos_disjuntor
    aporte_regime = {
        "regime": equity_regime,
        "profile": profiles.normalize_profile(profile),   # perfil do assinante que governou os caps
        "profile_leverage_cap": _profile_cap,             # teto duro do perfil (MIN aplicado)
        "multiplier": mult_final,                     # já com veto do agregado E disjuntor
        "multiplier_regime": mult_regime_headline,    # o que o regime sozinho pediria
        "multiplier_pre_disjuntor": mult_aporte_efetivo,  # após cap agregado, antes do disjuntor
        "capped_by_aggregate": regime_capped,
        "degraded_by_disjuntor": regime_disjuntado,
        "deploy_shy": capitulacao,
        "shy_available": round(shy_notional, 2),
        "nota": (("CAPITULAÇÃO: venda o SHY e deploye o fluxo a %dx nos descontados" % mult_final)
                 if capitulacao else
                 ("Reinvista dividendos/aportes a %dx no bucket sub-alvo" % mult_final))
                + (f" · CAP AGREGADO segurou {mult_regime_headline}x→{mult_aporte_efetivo}x (carteira já alavancada)"
                   if regime_capped else "")
                + (f" · DISJUNTOR DE FLUXOS segurou {mult_aporte_efetivo}x→{mult_final}x (aportes consecutivos em ativo caindo)"
                   if regime_disjuntado else ""),
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

    # ── TRAVAS DE PORTFÓLIO (Fase 2) — rede de segurança agregada ─────────────────
    # Cada trava é blindada: fonte falha → fica silenciosa (lista vazia / triggered=False),
    # nunca derruba o analytics nem fabrica número.
    try:
        thesis_stops = _thesis_stops(rows)
    except Exception as e:
        logger.warning(f"[TRAVAS] thesis_stops falhou: {e}")
        thesis_stops = []
    try:
        duration_warnings = _duration_warnings(rows, positions)
    except Exception as e:
        logger.warning(f"[TRAVAS] duration_warnings falhou: {e}")
        duration_warnings = []
    try:
        credit_shock = _credit_shock()
    except Exception as e:
        logger.warning(f"[TRAVAS] credit_shock falhou: {e}")
        credit_shock = {"triggered": False, "signal": "indisponível",
                        "recommendation": "Sinal macro indisponível — manter o plano."}
    try:
        exposure_caps = _exposure_caps(rows, buckets, correlation, risk_notional,
                                       totals.get("effective_leverage"))
    except Exception as e:
        logger.warning(f"[TRAVAS] exposure_caps falhou: {e}")
        exposure_caps = {"alerts": [], "clusters": [], "bucket_breaches": []}

    # C.2 — o disjuntor real (computado dos PositionEvent) SUBSTITUI o stub flagado-como-falso
    # que _aggregate_leverage_cap deixa quando não há dados de aporte. implementado:true.
    try:
        leverage_agregado["disjuntor_fluxos"] = disjuntor_fluxos
    except Exception:
        pass

    # ── COCKPIT DE SOBREVIVÊNCIA — 6 blocos (sênior). Cada um blindado: faltou dado →
    # status/coverage honesto, NUNCA derruba o payload nem fabrica número. ──────────
    try:
        liquidation_watch = _liquidation_watch(rows, eq, risk)
    except Exception as e:
        logger.warning(f"[COCKPIT] liquidation_watch falhou: {e}")
        liquidation_watch = {"aggregate": None, "por_posicao": [], "status": "indisponivel"}
    try:
        aporte_vs_agregado = _aporte_vs_agregado(aporte_regime, leverage_agregado)
    except Exception as e:
        logger.warning(f"[COCKPIT] aporte_vs_agregado falhou: {e}")
        aporte_vs_agregado = {"headroom": None, "nota": "indisponível"}
    try:
        structure_targets = _structure_targets(profile)
    except Exception as e:
        logger.warning(f"[COCKPIT] structure_targets falhou: {e}")
        structure_targets = {"profile": profiles.normalize_profile(profile), "targets": {}}
    try:
        equity_stale = _equity_stale(eq, risk_notional, shy_notional, invested)
    except Exception as e:
        logger.warning(f"[COCKPIT] equity_stale falhou: {e}")
        equity_stale = {"stale": None, "motivo": "indisponível"}
    try:
        coverage = _coverage(rows, (cov or {}).get("_series"))
    except Exception as e:
        logger.warning(f"[COCKPIT] coverage falhou: {e}")
        coverage = {"beta": f"0/{len(rows)}", "pct_notional_coberto": None}
    # CVaR no payload de totais (ao lado do VaR) — bloco 4. Vem do `risk` (cesta de risco).
    if risk:
        totals["cvar95_basket_daily"] = risk.get("cvar95_basket_daily")
        totals["cvar95_equity_daily"] = risk.get("cvar95_equity_daily")

    import datetime as _dt
    totals.pop("_sigma_basket_pct", None)        # interno (alimentou Kelly/máxDD) — não vaza
    return {
        "assets": rows, "totals": totals, "buckets": buckets,
        "correlation": correlation, "rotation": rotation,
        "survival_stops": survival_stops, "risk": risk,
        "aporte": aporte, "aporte_regime": aporte_regime,
        "stress": stress, "deleverage": deleverage,
        # ── COCKPIT DE SOBREVIVÊNCIA (6 blocos sênior) ──
        "liquidation_watch": liquidation_watch,
        "aporte_vs_agregado": aporte_vs_agregado,
        "structure_targets": structure_targets,
        "equity_stale": equity_stale,
        "coverage": coverage,
        # C.2 — DISJUNTOR DE FLUXOS CONSECUTIVOS (a trava do CRO):
        "disjuntor_fluxos": disjuntor_fluxos,
        # C.3 — CAP AGREGADO DE ALAVANCAGEM (o bloqueante que FORÇA):
        "leverage_agregado": leverage_agregado,
        # Travas Fase 2:
        "thesis_stops": thesis_stops,
        "duration_warnings": duration_warnings,
        "credit_shock": credit_shock,
        "exposure_caps": exposure_caps,
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
