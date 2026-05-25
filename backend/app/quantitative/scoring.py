"""
Proprietary composite scoring algorithm for defensive asset selection
and adaptive leverage recommendation.

Weights:
  Quality (fundamental):
    - Beta                 20%
    - Historical drawdown  25%
    - Dividend yield       10%
    - Sharpe ratio         15%
    - Volatility           15%
    - Fundamental health   15%

  Opportunity (technical):
    - RSI                  25%
    - Slow Stochastic      25%
    - Distance from MA200  30%
    - Bollinger position   20%
"""
from typing import Dict, Optional, Tuple
import numpy as np

RISK_PROFILE_LEVERAGE = {
    "conservative": {"max_score_90": 2.0, "max_score_80": 1.5, "max_score_70": 1.25, "no_leverage": 60},
    "balanced":     {"max_score_90": 3.0, "max_score_80": 2.0, "max_score_70": 1.5,  "no_leverage": 60},
    "aggressive":   {"max_score_90": 4.0, "max_score_80": 3.0, "max_score_70": 2.0,  "no_leverage": 50},
}


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def score_beta(beta: Optional[float]) -> float:
    """Lower beta = better defensive quality. Score 0-100."""
    if beta is None:
        return 50.0
    if beta <= 0.3:
        return 100.0
    if beta >= 2.0:
        return 0.0
    return _clamp(100 - ((beta - 0.3) / 1.7) * 100)


def score_max_drawdown(max_dd_pct: Optional[float]) -> float:
    """max_dd_pct is negative (e.g. -45). Less negative = better."""
    if max_dd_pct is None:
        return 50.0
    dd = abs(max_dd_pct)
    if dd <= 10:
        return 100.0
    if dd >= 80:
        return 0.0
    return _clamp(100 - ((dd - 10) / 70) * 100)


def score_dividend_yield(dy: Optional[float]) -> float:
    """Higher yield is better, but above 12% penalize (unsustainable)."""
    if dy is None:
        return 30.0
    if dy <= 0:
        return 10.0
    if 2.0 <= dy <= 8.0:
        return _clamp(50 + (dy - 2.0) / 6.0 * 50)
    if dy > 8.0:
        return _clamp(100 - (dy - 8.0) * 8)
    return _clamp(dy / 2.0 * 50)


def score_sharpe(sharpe: Optional[float]) -> float:
    if sharpe is None:
        return 40.0
    if sharpe >= 2.0:
        return 100.0
    if sharpe <= -1.0:
        return 0.0
    return _clamp((sharpe + 1.0) / 3.0 * 100)


def score_volatility(vol_annualized_pct: Optional[float]) -> float:
    """Annualized vol in %. Lower is better for defensive assets."""
    if vol_annualized_pct is None:
        return 50.0
    vol = abs(vol_annualized_pct)
    if vol <= 8:
        return 100.0
    if vol >= 50:
        return 0.0
    return _clamp(100 - ((vol - 8) / 42) * 100)


def score_fundamental_health(
    payout_ratio: Optional[float],
    debt_to_equity: Optional[float],
    roe: Optional[float],
) -> float:
    scores = []
    if payout_ratio is not None:
        if 0.2 <= payout_ratio <= 0.7:
            scores.append(90.0)
        elif payout_ratio > 1.0:
            scores.append(10.0)
        else:
            scores.append(50.0)
    if debt_to_equity is not None:
        if debt_to_equity <= 0.5:
            scores.append(100.0)
        elif debt_to_equity >= 3.0:
            scores.append(10.0)
        else:
            scores.append(_clamp(100 - ((debt_to_equity - 0.5) / 2.5) * 90))
    if roe is not None:
        if roe >= 0.20:
            scores.append(100.0)
        elif roe <= 0:
            scores.append(0.0)
        else:
            scores.append(roe / 0.20 * 100)
    return float(np.mean(scores)) if scores else 50.0


def compute_quality_score(
    beta: Optional[float] = None,
    max_drawdown_pct: Optional[float] = None,
    dividend_yield: Optional[float] = None,
    sharpe: Optional[float] = None,
    volatility_pct: Optional[float] = None,
    payout_ratio: Optional[float] = None,
    debt_to_equity: Optional[float] = None,
    roe: Optional[float] = None,
) -> Tuple[float, Dict[str, float]]:
    s_beta = score_beta(beta)
    s_dd = score_max_drawdown(max_drawdown_pct)
    s_dy = score_dividend_yield(dividend_yield)
    s_sharpe = score_sharpe(sharpe)
    s_vol = score_volatility(volatility_pct)
    s_fund = score_fundamental_health(payout_ratio, debt_to_equity, roe)

    breakdown = {
        "beta_score": round(s_beta, 2),
        "drawdown_score": round(s_dd, 2),
        "dividend_score": round(s_dy, 2),
        "sharpe_score": round(s_sharpe, 2),
        "volatility_score": round(s_vol, 2),
        "fundamental_score": round(s_fund, 2),
    }

    composite = (
        s_beta * 0.20
        + s_dd * 0.25
        + s_dy * 0.10
        + s_sharpe * 0.15
        + s_vol * 0.15
        + s_fund * 0.15
    )
    return round(_clamp(composite), 2), breakdown


def score_rsi(rsi: Optional[float]) -> float:
    """RSI < 30 = oversold (max opportunity). RSI > 70 = overbought (0 opportunity)."""
    if rsi is None:
        return 50.0
    if rsi <= 20:
        return 100.0
    if rsi <= 30:
        return _clamp(80 + (30 - rsi) / 10 * 20)
    if rsi <= 50:
        return _clamp(50 + (50 - rsi) / 20 * 30)
    if rsi <= 70:
        return _clamp(50 - (rsi - 50) / 20 * 50)
    return 0.0


def score_stochastic(stoch_k: Optional[float]) -> float:
    """Below 20 = oversold = high opportunity."""
    if stoch_k is None:
        return 50.0
    if stoch_k <= 10:
        return 100.0
    if stoch_k <= 20:
        return _clamp(80 + (20 - stoch_k) / 10 * 20)
    if stoch_k <= 50:
        return _clamp(50 + (50 - stoch_k) / 30 * 30)
    if stoch_k <= 80:
        return _clamp(50 - (stoch_k - 50) / 30 * 50)
    return 0.0


def score_distance_ma200(distance_pct: Optional[float]) -> float:
    """
    distance_pct: negative means below MA200.
    More below = higher opportunity (but not free fall).
    """
    if distance_pct is None:
        return 50.0
    d = distance_pct
    if d <= -30:
        return 100.0
    if d <= -15:
        return _clamp(70 + (abs(d) - 15) / 15 * 30)
    if d <= 0:
        return _clamp(50 + abs(d) / 15 * 20)
    if d <= 10:
        return _clamp(50 - d / 10 * 20)
    if d <= 30:
        return _clamp(30 - (d - 10) / 20 * 30)
    return 0.0


def score_bollinger_position(bb_pos: Optional[float]) -> float:
    """0 = at lower band, 1 = at upper band, <0 = below lower (extreme opportunity)."""
    if bb_pos is None:
        return 50.0
    if bb_pos <= 0:
        return _clamp(80 + abs(bb_pos) * 20)
    if bb_pos <= 0.2:
        return _clamp(80 - bb_pos / 0.2 * 30)
    if bb_pos <= 0.5:
        return _clamp(50 - (bb_pos - 0.2) / 0.3 * 20)
    if bb_pos <= 0.8:
        return _clamp(30 - (bb_pos - 0.5) / 0.3 * 20)
    return _clamp(10 - (bb_pos - 0.8) / 0.2 * 10)


def compute_opportunity_score(
    rsi: Optional[float] = None,
    stoch_k: Optional[float] = None,
    distance_ma200: Optional[float] = None,
    bb_position: Optional[float] = None,
) -> Tuple[float, Dict[str, float]]:
    s_rsi = score_rsi(rsi)
    s_stoch = score_stochastic(stoch_k)
    s_dist = score_distance_ma200(distance_ma200)
    s_bb = score_bollinger_position(bb_position)

    breakdown = {
        "rsi_score": round(s_rsi, 2),
        "stochastic_score": round(s_stoch, 2),
        "ma200_distance_score": round(s_dist, 2),
        "bollinger_score": round(s_bb, 2),
    }

    composite = (
        s_rsi * 0.25
        + s_stoch * 0.25
        + s_dist * 0.30
        + s_bb * 0.20
    )
    return round(_clamp(composite), 2), breakdown


def compute_composite_score(quality: float, opportunity: float) -> float:
    """
    Composite = 60% quality (defensive) + 40% opportunity (timing).
    This bias ensures we never sacrifice quality for timing alone.
    """
    return round(_clamp(quality * 0.60 + opportunity * 0.40), 2)


def leverage_from_score(
    composite_score: float,
    risk_profile: str = "balanced",
) -> Dict[str, float]:
    """
    Returns max, recommended, and conservative leverage based on composite score
    and risk profile. Uses quarter/half-Kelly philosophy.
    """
    cfg = RISK_PROFILE_LEVERAGE.get(risk_profile, RISK_PROFILE_LEVERAGE["balanced"])

    if composite_score >= 90:
        max_lev = cfg["max_score_90"]
    elif composite_score >= 80:
        max_lev = cfg["max_score_80"]
    elif composite_score >= 70:
        max_lev = cfg["max_score_70"]
    elif composite_score >= 60:
        max_lev = 1.0
    else:
        max_lev = 1.0

    recommended = max_lev * 0.5 if max_lev > 1.0 else 1.0
    conservative = max(1.0, max_lev * 0.25 + 0.75)

    return {
        "max_leverage": round(max_lev, 2),
        "recommended_leverage": round(recommended, 2),
        "conservative_leverage": round(conservative, 2),
    }


def risk_rating(quality_score: float) -> str:
    if quality_score >= 80:
        return "BAIXO"
    if quality_score >= 60:
        return "MODERADO"
    if quality_score >= 40:
        return "ELEVADO"
    return "ALTO"


def opportunity_rating(opportunity_score: float) -> str:
    if opportunity_score >= 80:
        return "EXCELENTE"
    if opportunity_score >= 65:
        return "BOA"
    if opportunity_score >= 50:
        return "NEUTRA"
    if opportunity_score >= 35:
        return "FRACA"
    return "SOBRECOMPRADO"
