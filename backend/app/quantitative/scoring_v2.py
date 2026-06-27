"""
Scoring V2 — funções puras de pontuação (recebem números já calculados).

⚠️ ESTE MÓDULO CONTÉM DOIS MODELOS. Não confundir (dívida de governança resolvida
na Fase 2 — antes os dois rodavam no app vivo e se contradiziam):

  1) MODELO VIVO (ratificado, em uso) — "Ranking de Aporte" / blend "nada exclui".
     Funções: compute_quality_blend · compute_momentum · aporte_verdict · staggered_stops
       (+ helpers: score_beta_contextual, score_dividend_sustainable, score_*).
     Filosofia: NADA exclui um ativo — Qualidade e Momento são PESOS, não portões.
     Consumido por: app/services/ranking_service.py (aba Ranking, caminho de produção).

  2) MODELO LEGADO (quality-gate) — backtest-only, NÃO roda no app vivo.
     Funções: compute_quality_score_v2 · quality_gate · compute_opportunity_score_v2 ·
       beta_amplifier · classify_profile · regime_from_multiplier · leverage_recommendation ·
       leverage_from_asymmetry · entry_confirmed · leverage_from_opportunity · score_beta_low.
     Filosofia: QUALIDADE é PORTÃO (elimina < 70) — contradiz o "nada exclui" do modelo vivo.
     Consumido por: SÓ os estudos de backtest (backtest/engine.py, engine2.py). Foi REMOVIDO
     do caminho vivo (market_data.py) na Fase 2 — era saída órfã que o frontend nunca lia.
     NÃO reintroduzir no app sem revisar a doutrina. Mantido aqui apenas para os backtests.

Indicadores (recuperação, consistência, distância do topo, reversão) ficam em indicators_v2.py.
"""
from typing import Dict, Optional, Tuple
import math
import numpy as np

# Piso de elegibilidade e piso para liberar 4x
QUALITY_GATE_MIN = 70.0
QUALITY_GATE_4X = 85.0

# Teto de alavancagem por faixa de qualidade
QUALITY_CAP_HIGH = 4.0   # qualidade >= 85
QUALITY_CAP_MID = 3.0    # qualidade 70-84

# Trava de ferro: perda até o stop × alavancagem ≤ 40% da posição
TRAVA_PERDA_POSICAO = 0.40


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


# ─────────────────────────── QUALITY SCORE (portão) ───────────────────────────

def score_sharpe(sharpe: Optional[float]) -> float:
    if sharpe is None:
        return 40.0
    if sharpe >= 2.0:
        return 100.0
    if sharpe <= -1.0:
        return 0.0
    return _clamp((sharpe + 1.0) / 3.0 * 100)


def score_drawdown_recovery(
    max_dd_pct: Optional[float],
    recovery_days: Optional[float] = None,
) -> float:
    """
    Combina profundidade do drawdown (60%) com tempo de recuperação (40%).
    max_dd_pct é negativo (ex: -45). recovery_days = dias para voltar ao topo
    anterior; None = nunca recuperou (penaliza forte).
    """
    if max_dd_pct is None:
        dd_component = 50.0
    else:
        dd = abs(max_dd_pct)
        if dd <= 10:
            dd_component = 100.0
        elif dd >= 80:
            dd_component = 0.0
        else:
            dd_component = _clamp(100 - ((dd - 10) / 70) * 100)

    if recovery_days is None:
        # Ainda não recuperou: penalidade (mas não zera — pode estar em recuperação)
        rec_component = 15.0
    elif recovery_days <= 180:
        rec_component = 100.0
    elif recovery_days >= 1095:  # 3 anos
        rec_component = 0.0
    else:
        rec_component = _clamp(100 - ((recovery_days - 180) / 915) * 100)

    return _clamp(dd_component * 0.60 + rec_component * 0.40)


def score_fundamental_health(
    payout_ratio: Optional[float],
    debt_to_equity: Optional[float],
    roe: Optional[float],
    roic: Optional[float] = None,
    fcf_yield: Optional[float] = None,
) -> float:
    """
    Fundamento: prioriza ROIC e FCF Yield quando disponíveis (mais preditivos
    que ROE — Buffett). Cai para payout/D-E/ROE como fallback.
    """
    scores = []
    if roic is not None:
        if roic >= 0.15:
            scores.append(100.0)
        elif roic <= 0:
            scores.append(0.0)
        else:
            scores.append(_clamp(roic / 0.15 * 100))
    if fcf_yield is not None:
        if fcf_yield >= 0.08:
            scores.append(100.0)
        elif fcf_yield <= 0:
            scores.append(10.0)
        else:
            scores.append(_clamp(fcf_yield / 0.08 * 100))
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


def score_consistency(annual_return_std_pct: Optional[float]) -> float:
    """
    Consistência = baixa dispersão dos retornos anuais. std em %.
    Retorno previsível pontua alto; caótico pontua baixo.
    """
    if annual_return_std_pct is None:
        return 50.0
    std = abs(annual_return_std_pct)
    if std <= 10:
        return 100.0
    if std >= 60:
        return 0.0
    return _clamp(100 - ((std - 10) / 50) * 100)


# ══════════════════════════════════════════════════════════════════════════════
# MODELO LEGADO (quality-gate) — BACKTEST-ONLY. Daqui até leverage_from_asymmetry
# NÃO roda no app vivo (ver docstring do módulo). Usado só por backtest/engine*.py.
# Os helpers acima (score_sharpe, score_fundamental_health) são COMPARTILHADOS com o
# blend vivo — não são legado. A partir daqui, é portão (elimina < 70) = legado.
# ══════════════════════════════════════════════════════════════════════════════

def compute_quality_score_v2(
    sharpe: Optional[float] = None,
    max_drawdown_pct: Optional[float] = None,
    recovery_days: Optional[float] = None,
    payout_ratio: Optional[float] = None,
    debt_to_equity: Optional[float] = None,
    roe: Optional[float] = None,
    roic: Optional[float] = None,
    fcf_yield: Optional[float] = None,
    annual_return_std_pct: Optional[float] = None,
) -> Tuple[float, Dict[str, float]]:
    s_sharpe = score_sharpe(sharpe)
    s_dd = score_drawdown_recovery(max_drawdown_pct, recovery_days)
    s_fund = score_fundamental_health(payout_ratio, debt_to_equity, roe, roic, fcf_yield)
    s_cons = score_consistency(annual_return_std_pct)

    breakdown = {
        "sharpe_score": round(s_sharpe, 2),
        "drawdown_recovery_score": round(s_dd, 2),
        "fundamental_score": round(s_fund, 2),
        "consistency_score": round(s_cons, 2),
    }
    composite = (
        s_sharpe * 0.30
        + s_dd * 0.25
        + s_fund * 0.20
        + s_cons * 0.15
    ) / 0.90  # re-normaliza (pesos somam 0.90 no design; normaliza para 0-100)
    return round(_clamp(composite), 2), breakdown


def quality_gate(quality_score: float) -> Dict:
    """Portão: define elegibilidade e teto de alavancagem por qualidade."""
    if quality_score >= QUALITY_GATE_4X:
        return {"eligible": True, "leverage_cap": QUALITY_CAP_HIGH, "tier": "ALTA"}
    if quality_score >= QUALITY_GATE_MIN:
        return {"eligible": True, "leverage_cap": QUALITY_CAP_MID, "tier": "MEDIA"}
    return {"eligible": False, "leverage_cap": 1.0, "tier": "ELIMINADO"}


# ─────────────────────────── OPPORTUNITY SCORE (2 eixos) ───────────────────────────

def score_rsi(rsi: Optional[float]) -> float:
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


def score_discount_from_top(
    discount_pct: Optional[float],
    reversal_confirmation: Optional[float] = None,
) -> float:
    """
    discount_pct: quanto caiu do topo (positivo, ex: 45 = -45% do topo).
    reversal_confirmation: 0-1.

    Lógica (não penaliza ativo em tendência de força):
      - Pouco/nenhum desconto (<8%): NEUTRO (~45) — não pune o ativo perto da máxima.
      - Desconto + reversão confirmada: BÔNUS crescente com a profundidade (até 100).
      - Desconto SEM reversão (faca caindo): PENALIDADE crescente com a profundidade.
    """
    if discount_pct is None:
        return 45.0
    disc = abs(discount_pct)
    conf = 0.0 if reversal_confirmation is None else _clamp(reversal_confirmation, 0.0, 1.0)

    if disc < 8:
        return 45.0  # perto da máxima → neutro (a força entra pela MM200/momentum)

    depth = _clamp(disc / 50 * 100)  # 0..100 conforme profundidade (satura em -50%)
    if conf >= 0.5:
        # reversão confirmada: quanto mais fundo o desconto recuperado, melhor
        return _clamp(55 + depth * 0.45)        # ~55..100
    if conf >= 0.25:
        return _clamp(45 + depth * 0.10)        # reversão fraca: leve bônus
    # ainda caindo = faca: penaliza, fundo mais profundo = pior
    return _clamp(40 - depth * 0.40)            # ~40..0


def compute_opportunity_score_v2(
    distance_ma200: Optional[float] = None,
    stoch_k: Optional[float] = None,
    discount_from_top: Optional[float] = None,
    reversal_confirmation: Optional[float] = None,
    rsi: Optional[float] = None,
) -> Tuple[float, Dict[str, float]]:
    s_ma200 = score_distance_ma200(distance_ma200)
    s_stoch = score_stochastic(stoch_k)
    s_disc = score_discount_from_top(discount_from_top, reversal_confirmation)
    s_rsi = score_rsi(rsi)

    breakdown = {
        "ma200_distance_score": round(s_ma200, 2),
        "stochastic_score": round(s_stoch, 2),
        "discount_top_score": round(s_disc, 2),
        "rsi_score": round(s_rsi, 2),
    }
    composite = (
        s_ma200 * 0.35
        + s_stoch * 0.30
        + s_disc * 0.25
        + s_rsi * 0.10
    )
    return round(_clamp(composite), 2), breakdown


# ─────────────────────────── BETA AMPLIFICADOR ───────────────────────────

def beta_amplifier(opportunity_score: float, beta: Optional[float]) -> Dict:
    """
    Beta amplifica o sinal — para cima (oversold) ou para baixo (sobrecomprado).
    Retorna fator multiplicador e rótulo. Beta < 1.2 = neutro.
    """
    if beta is None or beta < 1.2:
        return {"factor": 1.0, "label": "NEUTRO"}
    # quanto de amplificação (cap em ±15%)
    amp = _clamp((beta - 1.2) / 1.3, 0.0, 1.0) * 0.15
    if opportunity_score >= 70:
        return {"factor": round(1.0 + amp, 3), "label": "ALTA CONVICCAO"}
    if opportunity_score <= 40:
        return {"factor": round(1.0 - amp, 3), "label": "ALTO RISCO"}
    return {"factor": 1.0, "label": "NEUTRO"}


# ─────────────────────────── ENTRADA + SIZING GRADUADO ───────────────────────────

def entry_confirmed(
    distance_ma200: Optional[float],
    rsi: Optional[float],
    reversal_confirmation: Optional[float],
) -> Dict:
    """
    Libera alavancagem em DUAS situações boas (não só em queda profunda):
      A) TENDÊNCIA DE FORÇA: perto/acima da MM200 e não sobrecomprado (Druckenmiller).
      B) REVERSÃO CONFIRMADA: a faca parou de cair (reversal ≥ 0.5).
    Sem nenhuma das duas → não confirma (evita pegar faca).
    """
    uptrend = (
        distance_ma200 is not None
        and distance_ma200 >= -5.0
        and (rsi is None or rsi < 68)
    )
    turned = reversal_confirmation is not None and reversal_confirmation >= 0.5
    if turned:
        return {"confirmed": True, "mode": "REVERSAO"}
    if uptrend:
        return {"confirmed": True, "mode": "TENDENCIA"}
    return {"confirmed": False, "mode": "AGUARDAR"}


def leverage_from_opportunity(
    opportunity_score: float,
    quality_score: float,
    leverage_cap: float,
    stop_distance_pct: Optional[float],
    entry_ok: bool,
) -> Dict:
    """
    Alavancagem GRADUADA pela qualidade do setup (opportunity), entre os elegíveis.
      opp < 50      → 1x (aguardar)
      opp 50-65     → 1.25x a 1.5x
      opp 65-80     → 1.5x a 2.5x
      opp 80+       → 2.5x a 4x (4x só com qualidade ≥ 85)
    Travas: teto do portão de qualidade + trava de ferro (perda×lev ≤ 40% posição).
    Entrada não confirmada → 1x mesmo com score alto (não pega faca).
    """
    if not entry_ok:
        return {"leverage": 1.0, "reason": "entrada não confirmada — aguardar reversão ou força"}

    opp = _clamp(opportunity_score)
    if opp < 50:
        base = 1.0
    elif opp < 65:
        base = 1.25 + (opp - 50) / 15 * 0.25     # 1.25 → 1.5
    elif opp < 80:
        base = 1.5 + (opp - 65) / 15 * 1.0        # 1.5 → 2.5
    else:
        base = 2.5 + (opp - 80) / 20 * 1.5        # 2.5 → 4.0

    if quality_score < QUALITY_GATE_4X:
        base = min(base, 3.0)

    lev = min(base, leverage_cap)

    trava_note = None
    if stop_distance_pct and stop_distance_pct > 0:
        lev_trava = TRAVA_PERDA_POSICAO / (stop_distance_pct / 100.0)
        if lev_trava < lev:
            trava_note = f"limitado pela trava 40% (stop {stop_distance_pct:.0f}%)"
            lev = lev_trava

    return {
        "leverage": round(_clamp(lev, 1.0, leverage_cap), 2),
        "reason": trava_note or f"opp {opp:.0f} → base {base:.2f}x",
    }


# ─────────────────────────── PERFIL + MATRIZ DE ALAVANCAGEM POR REGIME ───────────────────────────
# Estratégia do investidor: comprar DESCONTADO + BETA BAIXO + BONS DIVIDENDOS p/ longo prazo.
# Alavancagem por regime de mercado: capitulação 4x · neutro 2x · defensiva/oportunidade 3x ·
# topo evita (só com tendência clara 2x). Stop escalonado (1/3 + 1/3) evita liquidação.

def classify_profile(
    beta: Optional[float],
    dividend_yield: Optional[float],
    discount_from_top: Optional[float],
    reversal_confirmation: Optional[float] = None,
) -> Dict:
    """
    Classifica o ativo nos tipos que o investidor quer privilegiar:
      - DEFENSIVA: beta baixo (≤0.9) + dividendo bom (≥3%)
      - OPORTUNIDADE: descontado (≥12% do topo)
    """
    is_defensive = (
        beta is not None and beta <= 0.9
        and dividend_yield is not None and dividend_yield >= 3.0
    )
    is_discounted = discount_from_top is not None and discount_from_top >= 12.0
    turned = reversal_confirmation is not None and reversal_confirmation >= 0.5
    labels = []
    if is_defensive:
        labels.append("DEFENSIVA")
    if is_discounted:
        labels.append("DESCONTADA")
    if turned:
        labels.append("REVERSAO")
    return {
        "is_defensive": is_defensive,
        "is_opportunity": is_discounted,
        "turned": turned,
        "labels": labels or ["NEUTRA"],
    }


def regime_from_multiplier(market_multiplier: int) -> str:
    """4 = capitulação (comprar forte), 3 = neutro, 2 = topo (evitar)."""
    if market_multiplier >= 4:
        return "CAPITULACAO"
    if market_multiplier <= 2:
        return "TOPO"
    return "NEUTRO"


def staggered_stops(leverage: float) -> Dict:
    """
    Stop ESCALONADO dinâmico, atado à alavancagem p/ evitar liquidação:
      - vende 1/3 no stop_1, +1/3 no stop_2, mantém 1/3 de núcleo.
    Os níveis ficam SEMPRE antes da liquidação (~100/lev %).
    """
    lev = max(1.0, leverage)
    liq = 100.0 / lev
    return {
        "stop_1_pct": round(liq * 0.55, 1),   # reduz 1/3
        "stop_2_pct": round(liq * 0.80, 1),   # reduz +1/3
        "liquidation_pct": round(liq, 1),
        "note": "vende 1/3 no stop_1, +1/3 no stop_2, mantém 1/3 de núcleo",
    }


def leverage_recommendation(
    market_regime: str,
    profile: Dict,
    quality_score: float,
    leverage_cap: float,
    clear_trend: bool = False,
) -> Dict:
    """
    Matriz de alavancagem (palavras do investidor):
      CAPITULAÇÃO → 4x      |  NEUTRO → 2x base, defensiva/oportunidade → 3x
      TOPO → evita (1x), só com tendência clara → 2x
    Teto por qualidade (4x só ≥85) e pelo portão. Stop escalonado anexado.
    """
    if market_regime == "CAPITULACAO":
        base = 4.0
        reason = "capitulação de mercado — comprar forte"
    elif market_regime == "TOPO":
        if clear_trend:
            base = 2.0
            reason = "topo, mas tendência clara"
        else:
            base = 1.0
            reason = "topo de mercado — evitar nova compra alavancada"
    else:  # NEUTRO
        if profile.get("is_defensive") or profile.get("is_opportunity"):
            base = 3.0
            reason = "mercado neutro + ativo defensivo/oportunidade"
        else:
            base = 2.0
            reason = "mercado neutro"

    # 4x exige qualidade alta
    if quality_score < QUALITY_GATE_4X:
        base = min(base, 3.0)

    lev = round(_clamp(min(base, leverage_cap), 1.0, leverage_cap), 2)
    return {
        "leverage": lev,
        "reason": reason,
        "stops": staggered_stops(lev),
    }


# ─────────────────────────── SIZING POR ASSIMETRIA (R:R — métrica auxiliar) ───────────────────────────

def leverage_from_asymmetry(
    rr_ratio: Optional[float],
    quality_score: float,
    leverage_cap: float,
    stop_distance_pct: Optional[float] = None,
) -> Dict:
    """
    Alavancagem amarrada na razão Risco:Retorno até o stop (não no score).
      < 2:1  → não opera
      2-3:1  → 1-2x
      3-5:1  → 2-3x
      5:1+   → 3-4x (4x só se qualidade ≥ 85)
    Trava de ferro: perda até o stop × alavancagem ≤ 40% da posição.
    """
    if rr_ratio is None or rr_ratio < 2.0:
        return {"leverage": 1.0, "reason": "R:R < 2:1 — não opera alavancado", "rr_ratio": rr_ratio}

    if rr_ratio < 3.0:
        base = 1.0 + (rr_ratio - 2.0)            # 1x → 2x
    elif rr_ratio < 5.0:
        base = 2.0 + (rr_ratio - 3.0) / 2.0      # 2x → 3x
    else:
        base = 3.0 + min((rr_ratio - 5.0) / 5.0, 1.0)  # 3x → 4x

    # 4x só com qualidade >= 85
    if quality_score < QUALITY_GATE_4X:
        base = min(base, 3.0)

    # teto do portão de qualidade
    lev = min(base, leverage_cap)

    # trava de ferro pela distância do stop
    trava_note = None
    if stop_distance_pct and stop_distance_pct > 0:
        lev_trava = TRAVA_PERDA_POSICAO / (stop_distance_pct / 100.0)
        if lev_trava < lev:
            trava_note = f"limitado pela trava 40% (stop {stop_distance_pct:.0f}%)"
            lev = lev_trava

    return {
        "leverage": round(_clamp(lev, 1.0, leverage_cap), 2),
        "reason": trava_note or f"R:R {rr_ratio:.1f}:1",
        "rr_ratio": rr_ratio,
    }


# ══════════════════════════════════════════════════════════════════════════════
# FIM DO MODELO LEGADO ↑ · INÍCIO DO MODELO VIVO ↓ (ratificado, em produção)
# ══════════════════════════════════════════════════════════════════════════════
# ─────────────────────────── RANKING DE APORTE (Qualidade + Momento) ───────────────────────────
# Filosofia do investidor: NADA exclui um ativo. Qualidade e Momento são PESOS,
# não portões. Uma ótima empresa (WEGE, ITUB) sempre mostra Qualidade alta;
# o Momento só diz se AGORA é boa hora de aportar. Stochastic LENTO SEMANAL é o
# gatilho de entrada principal (preferência testada do investidor).

def _floor(v, piso=15.0):
    """Nenhum sub-score zera — nada 'exclui' o ativo."""
    return max(piso, v)


def score_beta_low(beta: Optional[float]) -> float:
    if beta is None:
        return 55.0
    if beta <= 0.5:
        return 100.0
    if beta >= 1.8:
        return _floor(20.0)
    return _floor(100 - (beta - 0.5) / 1.3 * 80)


def score_beta_contextual(beta: Optional[float], momentum: Optional[float] = None,
                          is_tatico: bool = False) -> float:
    """
    Beta AMPLIFICADOR (decisão do usuário): a nota do beta depende do momento.
      - Beta BAIXO (≤0.9): defensivo, bom sempre.
      - Beta ALTO (≥1.2): depende do momento — oversold/boa entrada (momento alto) AMPLIFICA
        (beta alto em ativo de qualidade no fundo = recupera mais forte, ex MSFT); sobrecomprado
        (momento baixo) PENALIZA (cai mais forte na virada).
    is_tatico: cíclica descolada (PETR4/VALE3) tem beta baixo FALSO (anda por petróleo/minério,
      não pelo índice) → NÃO ganha o bônus de "defensivo"; trata como neutro.
    """
    if beta is None:
        return 55.0
    if beta <= 0.9:
        if is_tatico:
            return 62.0                                 # cíclica: beta baixo é falso → neutro
        return _floor(100 - (beta / 0.9) * 25)          # 0→100, 0.9→75 (defensivo)
    if beta < 1.2:
        return 62.0                                      # neutro
    amp = _clamp((beta - 1.2) / 1.3, 0.0, 1.0)           # 0..1 conforme quão alto
    m = momentum if momentum is not None else 50.0
    if m >= 60:                                          # oversold / boa entrada → amplifica
        return _floor(62 + amp * 38)                     # até 100
    if m <= 40:                                          # sobrecomprado → penaliza
        return _floor(45 - amp * 30)                     # até 15
    return _floor(55 - amp * 8)                          # neutro


def score_maxdd_quality(max_dd_pct: Optional[float]) -> float:
    if max_dd_pct is None:
        return 55.0
    dd = abs(max_dd_pct)
    if dd <= 15:
        return 100.0
    if dd >= 60:
        return _floor(20.0)
    return _floor(100 - (dd - 15) / 45 * 80)


def score_dividend_q(dy: Optional[float]) -> float:
    if dy is None:
        return 50.0
    if dy <= 0:
        return 40.0
    if dy < 3:
        return _floor(40 + dy / 3 * 40)        # 40→80
    if dy <= 7:
        return _floor(80 + (dy - 3) / 4 * 20)  # 80→100
    return _floor(100 - (dy - 7) * 5)          # yield alto demais penaliza leve


def _is_compounder(roe: Optional[float], roic: Optional[float]) -> bool:
    """Compounder de alta rentabilidade: ROIC alto (≥15%) OU ROE alto (≥18%).
    São negócios que reinvestem o lucro a alta taxa em vez de distribuir (RADL3/ADBE).
    Usado p/ desarmar o castigo de yield baixo na QUALIDADE (yield baixo aqui é OPÇÃO de
    reinvestir growth, não fraqueza)."""
    return (roic is not None and roic >= 0.15) or (roe is not None and roe >= 0.18)


# Yield abaixo disto, num compounder, é "opção de reinvestir" (não renda) → não pune qualidade.
_COMPOUNDER_LOW_YIELD = 3.0


def score_dividend_sustainable(avg10: Optional[float], worst_year: Optional[float],
                               trailing: Optional[float] = None,
                               roe: Optional[float] = None,
                               roic: Optional[float] = None) -> float:
    """
    Dividendo por CONSISTÊNCIA (decisão do usuário): nível ao longo do ciclo × nunca cortou.
      - nível = nota sobre a MÉDIA de 10 anos (não o pico de um ano de bonança).
      - consistência RELATIVA (neutro de mercado): pior_ano / média. Funciona tanto p/
        aristocrata US de yield baixo (KO ~2.5% mas nunca corta → ratio ~0.9) quanto p/
        high-yielder BR (PETR4 cortou a 0% → ratio 0). Absoluto puniria a KO injustamente.
        ratio≥0.6 → ×1.0 · 0.4–0.6 → ×0.7 · <0.4 → ×0.4 (cortou feio em algum ano).
    Growth/não-renda (média <1.5%): pontua só o nível, SEM castigo de corte (dividendo
    simbólico oscila muito em termos relativos — não tankar NVDA/GOOGL por isso).
    GROWTH GUARD do compounder (#2, sep. QUALIDADE×VALUATION): yield BAIXO (<3%) num
    COMPOUNDER de alta rentabilidade (ROIC≥15% ou ROE≥18%, ex RADL3/ADBE) NÃO pune a
    qualidade — o yield baixo é OPÇÃO de reinvestir (growth), não fraqueza do negócio.
    Devolve nota NEUTRA-ALTA p/ o termo não derrubar a Qualidade (a doutrina de renda
    continua valendo p/ quem ESCOLHE ser pagador: yield alto consistente ainda pontua alto).
    Sem média 10a (jovem/sem dados) → cai no score trailing tradicional (com o mesmo guard).
    """
    if avg10 is None:
        # compounder de yield baixo (trailing) não é punido pelo dividendo na qualidade
        if (trailing is not None and 0 <= trailing < _COMPOUNDER_LOW_YIELD
                and _is_compounder(roe, roic)):
            return 75.0
        return score_dividend_q(trailing)
    # GROWTH GUARD: compounder de yield baixo → neutro-alto (não derruba a qualidade)
    if avg10 < _COMPOUNDER_LOW_YIELD and _is_compounder(roe, roic):
        return 75.0
    nivel = score_dividend_q(avg10)
    if avg10 < 1.5 or worst_year is None:
        return nivel                                  # growth/sem renda ou histórico curto
    ratio = worst_year / avg10 if avg10 > 0 else 1.0
    if ratio >= 0.6:
        mult = 1.0
    elif ratio >= 0.4:
        mult = 0.7
    else:
        mult = 0.4
    return _floor(nivel * mult)


def score_growth_5y(cagr_pct: Optional[float]) -> float:
    """Crescimento consistente nos últimos 5 anos (lucro/receita; proxy preço no demo)."""
    if cagr_pct is None:
        return 50.0
    if cagr_pct >= 15:
        return 100.0
    if cagr_pct <= -5:
        return _floor(20.0)
    return _floor(20 + (cagr_pct + 5) / 20 * 80)


def score_cagr(cagr_pct: Optional[float]) -> float:
    """CAGR de retorno total realizado (preço + dividendos)."""
    if cagr_pct is None:
        return 50.0
    if cagr_pct >= 15:
        return 100.0
    if cagr_pct <= -5:
        return _floor(20.0)
    return _floor(20 + (cagr_pct + 5) / 20 * 80)


def score_tsr_expected(tsr_pct: Optional[float]) -> float:
    """TSR esperado = dividend yield + crescimento esperado (retorno total forward)."""
    if tsr_pct is None:
        return 50.0
    if tsr_pct >= 14:
        return 100.0
    if tsr_pct <= 2:
        return _floor(30.0)
    return _floor(30 + (tsr_pct - 2) / 12 * 70)


def score_slow_stoch_weekly(slow_k: Optional[float]) -> float:
    """Stochastic LENTO semanal — gatilho de entrada principal. Baixo = entrada."""
    if slow_k is None:
        return 50.0
    if slow_k <= 20:
        return 100.0
    if slow_k <= 40:
        return _floor(75 + (40 - slow_k) / 20 * 25)   # 75→100 (zona de compra)
    if slow_k <= 60:
        return _floor(45 + (60 - slow_k) / 20 * 30)
    if slow_k <= 80:
        return _floor(20 + (80 - slow_k) / 20 * 25)
    return _floor(10.0)


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 1 — QUALIDADE DO NEGÓCIO (desenho TRAVADO por painel de especialistas + dono)
# ══════════════════════════════════════════════════════════════════════════════
# A Camada 1 mede SÓ o NEGÓCIO — independente de PREÇO/BETA/DRAWDOWN/SHARPE/ALAVANCAGEM.
# Risco de PREÇO (beta/maxDD/Sharpe) SAIU da qualidade (vai p/ Camada 3 depois; por ora só
# deixa de entrar aqui). Isso conserta o caso ADBE: negócio excelente (ROIC 36%) NÃO leva
# nota baixa só porque o preço caiu.
#
# Pesos TRAVADOS (empresa "normal"):
#   ROIC nível (>ROE sempre) ........ 22%
#   ROIIC / alocação de capital ..... 16%  (geralmente AUSENTE → renormaliza p/ fora)
#   Safety / saúde do balanço (D/E) . 18%
#   FCF / conversão de caixa ........ 16%
#   Moat / durabilidade ............. 16%  (geralmente AUSENTE → renormaliza p/ fora)
#   Crescimento (só se ROIC>WACC) ... 12%
#
# REGRAS INVIOLÁVEIS:
#  1) ROIC > ROE sempre. ROE = ROIC × alavancagem (inflado por dívida). Com ROIC presente,
#     ele DOMINA o pilar; ROE só é fallback FRACO quando ROIC ausente, e NUNCA premia ROE
#     alto com D/E alto (alavancagem disfarçada).
#  2) Crescimento só pontua se ROIC > WACC (proxy ~10%). ROIC ≤ 10% → crescer destrói capital
#     → crescimento NÃO pontua positivo (entra neutro-baixo). ROIC ausente → crescimento
#     entra neutro-conservador.
#  3) NUNCA fabricar dado. Pilar sem dado → o termo SAI e os pesos RENORMALIZAM (não injeta 50).
#  4) ROIIC e Moat quase sempre faltam (precisam de histórico multi-ano que provedor grátis não
#     dá) → termos OPCIONAIS que renormalizam p/ fora quando ausentes. Na prática a Camada 1 roda
#     com ROIC+safety+FCF+crescimento renormalizados — e é honesto (≈ QMJ: profitability+safety+
#     growth).
#  5) Valuation (P/L, EV/FCF) NÃO entra na qualidade (não há, e não entra).
#  6) DIVIDENDO (NÍVEL de DY) SAIU da qualidade (decisão travada → Camada 3 cuida do DY).

_WACC_PROXY = 0.10   # proxy de custo de capital p/ a regra "crescimento só conta se ROIC>WACC"


def _q_roic_level(roic: Optional[float], roe: Optional[float],
                  debt_to_equity: Optional[float]) -> Optional[float]:
    """Pilar ROIC NÍVEL (>ROE sempre). ROIC presente DOMINA; ROE só fallback FRACO se ROIC
    ausente, e NUNCA premiando ROE alto com D/E alto (alavancagem disfarçada).
    None se nem ROIC nem ROE existem (renormaliza)."""
    if roic is not None:
        return _q_roic(roic)
    if roe is None:
        return None
    # Fallback FRACO por ROE (sem ROIC): teto 70 — ROE não é tão preditivo quanto ROIC e pode
    # estar inflado por alavancagem. E NUNCA premiar ROE alto com D/E alto.
    base = min(_q_roe(roe), 70.0)
    if debt_to_equity is not None and debt_to_equity >= 1.5:
        # ROE alto + dívida alta = alavancagem disfarçada → corta o "prêmio" do ROE.
        base = min(base, 45.0)
    return base


def _q_safety(debt_to_equity: Optional[float]) -> Optional[float]:
    """Pilar SAFETY / saúde do balanço = D/E. None se ausente (renormaliza)."""
    return _q_debt(debt_to_equity)


def _q_growth_conditional(growth_5y: Optional[float], roic: Optional[float]) -> Optional[float]:
    """Pilar CRESCIMENTO REAL, condicionado a ROIC>WACC (regra 2).
      - growth ausente → None (renormaliza; não injeta 50).
      - ROIC > WACC (~10%) → crescimento pontua normal (score_growth_5y).
      - ROIC ≤ WACC → crescer destruindo capital NÃO é qualidade → teto neutro-baixo (não premia).
      - ROIC ausente → neutro-conservador (não sabemos se cria valor): teto 50."""
    if growth_5y is None:
        return None
    g = score_growth_5y(growth_5y)
    if roic is None:
        return min(g, 50.0)            # sem ROIC: crescimento entra neutro-conservador
    if roic > _WACC_PROXY:
        return g                       # ROIC>WACC: crescimento cria valor → pontua cheio
    return min(g, 40.0)                # ROIC≤WACC: crescer destrói capital → não premia


def compute_quality_blend(beta=None, max_dd_pct=None, dividend_yield=None,
                          growth_5y=None, roe=None, debt_to_equity=None,
                          payout_ratio=None, roic=None, fcf_yield=None,
                          sharpe=None, cagr=None, tsr_expected=None,
                          momentum=None, is_tatico=False,
                          dy_avg10=None, dy_worst=None, dd_recovery_mult=1.0,
                          fundamentals_apply=True,
                          roiic=None, roic_history=None, margin_stability=None):
    """
    CAMADA 1 — QUALIDADE DO NEGÓCIO (0-100). Mede SÓ o NEGÓCIO, independente de preço.

    Pilares (peso travado): ROIC nível 22% · ROIIC 16% · Safety/D-E 18% · FCF 16% ·
    Moat/Durabilidade 16% · Crescimento (só se ROIC>WACC) 12%.

    beta/max_dd_pct/sharpe/cagr/tsr_expected/dividend_yield/dy_avg10/dy_worst/momentum/
    dd_recovery_mult ficam na ASSINATURA por COMPAT com o call-site, mas NÃO entram mais no
    score nem no breakdown (risco de PREÇO e DY são Camada 3). Ver doutrina acima.

    roiic / roic_history / margin_stability: pilares OPCIONAIS de histórico multi-ano. Os
    provedores grátis quase nunca trazem → ausentes → o termo SAI e os pesos RENORMALIZAM.
      - roiic: ΔNOPAT/ΔCapital (qualidade da alocação de capital). Quando vier, 0-100 esperado
        OU fração (≥15% → 100). Honesto só com dado real; senão omite.
      - roic_history: lista de ROIC anuais → proxy HONESTO de Moat/durabilidade (persistência:
        média alta + baixa dispersão = fosso). Senão margin_stability; senão omite.
      - margin_stability: 0-1 (estabilidade de margem) como proxy conservador de durabilidade.

    fundamentals_apply=False (ETF/COMMODITY): não são empresas → TODOS os pilares de negócio
    saem; sem termo presente a nota cai em 50 neutro (o ETF é avaliado por preço/momento alhures).
    """
    # ── Pilares de NEGÓCIO (cada um None se sem dado → renormaliza, regra 3) ──
    s_roic = _q_roic_level(roic, roe, debt_to_equity) if fundamentals_apply else None
    s_safety = _q_safety(debt_to_equity) if fundamentals_apply else None
    s_fcf = _q_fcf(fcf_yield) if fundamentals_apply else None
    s_growth = _q_growth_conditional(growth_5y, roic) if fundamentals_apply else None

    # ROIIC (qualidade da alocação) — OPCIONAL, quase sempre ausente.
    s_roiic = None
    if fundamentals_apply and roiic is not None:
        # aceita fração (0.18) ou já-nota (0..100). Heurística: ≤1.5 trata como fração.
        s_roiic = _q_roic(roiic) if abs(roiic) <= 1.5 else _clamp(roiic)

    # MOAT / durabilidade — OPCIONAL. Proxy HONESTO só se houver histórico de ROIC (persistência)
    # ou estabilidade de margem; senão OMITE (não fabrica).
    s_moat = None
    if fundamentals_apply:
        if roic_history is not None and len(roic_history) >= 3:
            hist = [h for h in roic_history if h is not None]
            if len(hist) >= 3:
                mean_roic = float(np.mean(hist))
                disp = float(np.std(hist))
                # fosso = ROIC médio alto (≥15%) E persistente (baixa dispersão).
                lvl = _q_roic(mean_roic)
                # dispersão de ROIC: 0 → ×1.0 ; ≥0.10 (10pp) → ×0.6 (errático = fosso fraco).
                stab = _clamp(1.0 - min(disp / 0.10, 1.0) * 0.4, 0.6, 1.0)
                s_moat = _clamp(lvl * stab)
        elif margin_stability is not None:
            s_moat = _clamp(margin_stability * 100.0)

    breakdown = {}
    comps = []
    # (score, peso, chave). Termos None NÃO entram (regra 3) e renormalizam.
    pilares = [
        (s_roic, 0.22, "roic_nivel"),
        (s_roiic, 0.16, "roiic"),
        (s_safety, 0.18, "safety"),
        (s_fcf, 0.16, "fcf"),
        (s_moat, 0.16, "moat"),
        (s_growth, 0.12, "crescimento"),
    ]
    for s, w, k in pilares:
        if s is not None:
            comps.append((s, w))
            breakdown[k] = round(s)

    wsum = sum(w for _, w in comps)
    q = (sum(s * w for s, w in comps) / wsum) if wsum > 0 else 50.0
    return round(_clamp(q), 1), breakdown


# ─────────────── GUARDRAIL: QUALIDADE DE DADO FINO NÃO LIDERA VEREDITO FORTE (Bug D) ───────────────
# Quando o scrape fundamental BR quebra (Fundamentus falha), a Qualidade da Camada 1 sai de POUCOS
# pilares reais e RENORMALIZA — bom (não fabrica), MAS a nota fica FRÁGIL e pode estourar (ITSA4 q3
# por só-ROE-fallback, ou vários q100 por 1 pilar generoso). Essa nota magra NÃO pode liderar um
# veredito COMPRAR FORTE/ESPECULATIVO nem liberar alavancagem alta. A ideia é DESCONFIAR de nota
# magra (rebaixar confiança + capar veredito), NÃO inventar dado.
#
# Pilares-NÚCLEO da Camada 1 (os que SEMPRE se tentam quando há fundamentos da empresa): ROIC nível,
# Safety/D-E, FCF, Crescimento. ROIIC e Moat são OPCIONAIS (histórico multi-ano que provedor grátis
# quase nunca dá) → contam como bônus se vierem, mas a contagem-núcleo é o que define "dado fino".
_QUALITY_CORE_PILLARS = ("roic_nivel", "safety", "fcf", "crescimento")
_QUALITY_BONUS_PILLARS = ("roiic", "moat")
# Mínimo de pilares-núcleo reais p/ a Qualidade ser "comprovada" (libera FORTE/alavancagem alta).
# < isto = dado fino → CONF BAIXA + veredito capado. 3 de 4 núcleo é o piso ratificado (survival).
QUALITY_MIN_PILARES_REAIS = 3
# Notas extremas com dado fino = bandeira vermelha (provável artefato de renormalização magra).
_QUALITY_SANITY_LOW = 10.0
_QUALITY_SANITY_HIGH = 100.0


def quality_pilares_reais(breakdown: Optional[Dict]) -> int:
    """Conta os pilares-NÚCLEO REAIS usados na Qualidade (Camada 1), a partir do breakdown que
    compute_quality_blend devolve (termo ausente NÃO está no breakdown — não fabrica). Bônus
    (ROIIC/Moat) contam por cima se vierem. ETF/COMMODITY (breakdown sem pilares de negócio) → 0.
    Não muda o score; só MEDE de quantos pilares reais a nota nasceu."""
    if not breakdown:
        return 0
    core = sum(1 for k in _QUALITY_CORE_PILLARS if k in breakdown)
    bonus = sum(1 for k in _QUALITY_BONUS_PILLARS if k in breakdown)
    return core + bonus


def quality_data_confidence(breakdown: Optional[Dict], quality: Optional[float] = None) -> str:
    """Confiança do DADO por trás da Qualidade (ALTA/MEDIA/BAIXA), pela contagem de pilares reais.
      • núcleo ≥ QUALITY_MIN_PILARES_REAIS (3) → ALTA (qualidade comprovada por dado real abundante).
      • núcleo == 2 → MEDIA.
      • núcleo ≤ 1 → BAIXA (nota nasceu de 1 pilar — frágil; ex ITSA4 só-ROE-fallback).
    Nota EXTREMA (≤10 ou =100) com núcleo < 3 também rebaixa p/ no mínimo BAIXA: extremo magro =
    provável artefato de renormalização, não convicção."""
    if not breakdown:
        return "BAIXA"
    core = sum(1 for k in _QUALITY_CORE_PILLARS if k in breakdown)
    if core >= QUALITY_MIN_PILARES_REAIS:
        conf = "ALTA"
    elif core == 2:
        conf = "MEDIA"
    else:
        conf = "BAIXA"
    if quality is not None and core < QUALITY_MIN_PILARES_REAIS:
        if quality <= _QUALITY_SANITY_LOW or quality >= _QUALITY_SANITY_HIGH:
            conf = "BAIXA"      # extremo nascido de dado fino → desconfia
    return conf


def quality_data_thin(breakdown: Optional[Dict]) -> bool:
    """True se a Qualidade veio de MENOS pilares-núcleo reais que o mínimo (QUALITY_MIN_PILARES_REAIS)
    → nota frágil que NÃO pode liderar COMPRAR FORTE/ESPECULATIVO nem liberar alavancagem alta."""
    if not breakdown:
        return True
    core = sum(1 for k in _QUALITY_CORE_PILLARS if k in breakdown)
    return core < QUALITY_MIN_PILARES_REAIS


def score_etf_vehicle_quality(dy_avg10=None, dy_worst=None, dividend_yield=None,
                              max_dd_pct=None, dd_recovery_mult=1.0, sharpe=None):
    """QUALIDADE DO VEÍCULO (0-100) — para ETF/COMMODITY, que NÃO têm negócio (sem ROIC/FCF).
    Responde "é um bom lugar pra parar o dinheiro?" — LEVERAGE-INDEPENDENTE (≠ aptidão/Camada 3,
    que pergunta "alavancar isso me liquida?"). Os insumos se sobrepõem (ambos olham queda), mas a
    PERGUNTA é outra: aqui é mérito do veículo como renda/defensivo; lá é sobrevivência alavancado.

    Pilares (renormalizam quando ausente — nunca fabrica):
      • Dividendo consistente 40% (a função do veículo numa estratégia de renda)
      • Resiliência de queda 30% (máxDD raso + recuperou = bom porto)
      • Retorno risco-ajustado 30% (Sharpe — p/ veículo, o preço É o mérito; não há negócio atrás)
    Sem nenhum pilar → 50 neutro (honesto). Ex: JEPI (dividendo alto consistente + queda rasa +
    Sharpe ok) → alto; ETF lixo (sem dividendo + queda funda + Sharpe ruim) → baixo."""
    s_div = (score_dividend_sustainable(dy_avg10, dy_worst, dividend_yield)
             if (dy_avg10 is not None or dividend_yield is not None) else None)
    s_dd = (_clamp(score_maxdd_quality(max_dd_pct) * dd_recovery_mult)
            if max_dd_pct is not None else None)
    s_shp = score_sharpe(sharpe) if sharpe is not None else None
    comps = []
    bd = {}
    for s, w, k in ((s_div, 0.40, "dividendos"), (s_dd, 0.30, "resiliencia_queda"),
                    (s_shp, 0.30, "risco_ajustado")):
        if s is not None:
            comps.append((s, w))
            bd[k] = round(s)
    wsum = sum(w for _, w in comps)
    q = (sum(s * w for s, w in comps) / wsum) if wsum > 0 else 50.0
    return round(_clamp(q), 1), bd


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 2 — MOMENTO DE ENTRADA (desenho TRAVADO por painel: entrada-tática ×
#            trend-follower × contrarian + dono).
# ══════════════════════════════════════════════════════════════════════════════
# Princípio do dono: "COMPRE O DESCONTO, ALAVANQUE NO QUIQUE". O desconto manda na
# COMPRA (veredito); a tendência FREIA a alavancagem (Camada 3), não a compra.
#
# Pesos TRAVADOS (somam 100%):
#   Desconto × reversão CONFIRMADA .. 28%  (barato + virou; anti-faca; coração da tese)
#   Tendência primária de LP ........ 22%  (MM200 semanal + preço vs médias longas)
#   Valuation relativo .............. 18%  (yield atual vs banda histórica dy_avg10)
#   Osciladores (sobrevenda+DIVERG) . 14%  (stoch/RSI sobrevendido SÓ com divergência/virada)
#   Momentum relativo ............... 10%  (força cross-sectional vs universo; best-effort)
#   Estrutura de reversão / suporte .  8%  (higher-low / fechou > máxima anterior / suporte)
#
# GATE DE REVERSÃO (o mais importante): SEM reversão confirmada, o momento tem TETO=JUSTO
# (≤ _GATE_REVERSAO_TETO=50), INDEPENDENTE do desconto. Desconto profundo sem reversão =
# faca = nunca chega a COMPRAR. É um GATE (teto), não soma ponderada. Deliberadamente covarde:
# pro alavancado, pegar faca é catastrófico; chegar tarde é só ruído.
#
# Termo SEM dado renormaliza (sai do breakdown), nunca injeta "50 falso".

_GATE_REVERSAO_TETO = 50.0     # teto JUSTO quando NÃO há reversão confirmada
_REVERSAO_MIN_CONF = 0.5       # reversal_confirmation ≥ isto = "virou" (libera o teto)
_DESCONTO_GATE_MIN = 8.0       # só faz sentido falar de "faca/reversão" com desconto ≥ isto


def score_valuation_relativo(dy: Optional[float], dy_avg10: Optional[float]) -> Optional[float]:
    """Valuation RELATIVO à PRÓPRIA história: yield atual vs banda histórica (dy_avg10).
    Quanto mais o yield atual supera a média de 10a, mais BARATO vs si mesmo (preço caiu →
    yield subiu). yield << média = ESTICADO. P/L histórico não temos; yield-banda é o viável.
      ratio = dy / dy_avg10 :  ≤0.7 → ~25 (caro vs si) · 1.0 → 60 (na média) · ≥1.6 → 100 (barato).
    None se sem dado real (renormaliza). Yield ~0 (growth/não-pagador) → None (não opina:
    valuation-por-yield não se aplica a quem não paga; outros termos carregam)."""
    if dy is None or dy_avg10 is None or dy_avg10 <= 0 or dy <= 0:
        return None
    ratio = dy / dy_avg10
    if ratio <= 0.7:
        return _clamp(25.0)
    if ratio <= 1.0:
        return _clamp(25 + (ratio - 0.7) / 0.3 * 35)      # 0.7→25, 1.0→60
    if ratio <= 1.6:
        return _clamp(60 + (ratio - 1.0) / 0.6 * 40)      # 1.0→60, 1.6→100
    return 100.0


def score_tendencia_primaria(ma200_slope_weekly: Optional[float],
                             distance_ma200: Optional[float]) -> Optional[float]:
    """Tendência primária de LP (uptrend secular = promoção; downtrend = faca).
      • inclinação da MM200 SEMANAL (ma200_slope_weekly, %): >0 sobe (saudável), <0 cai (deteriora).
      • posição preço vs MM200 longa (distance_ma200, %): ACIMA da média longa = estrutura de alta.
    Combina (slope 60% — a inclinação é a tendência; posição 40%). Renormaliza se um faltar.
    None se ambos ausentes."""
    s_slope = None
    if ma200_slope_weekly is not None:
        sl = ma200_slope_weekly
        if sl >= 3.0:
            s_slope = 100.0
        elif sl <= -3.0:
            s_slope = 10.0
        else:
            s_slope = _clamp(10 + (sl + 3.0) / 6.0 * 90)   # -3→10, 0→55, +3→100
    s_pos = None
    if distance_ma200 is not None:
        d = distance_ma200
        if d >= 15:
            s_pos = 100.0                                  # bem acima da média longa = alta firme
        elif d <= -25:
            s_pos = 10.0                                   # bem abaixo = tendência de baixa
        else:
            s_pos = _clamp(10 + (d + 25) / 40 * 90)        # -25→10, +15→100
    comps = []
    if s_slope is not None:
        comps.append((s_slope, 0.60))
    if s_pos is not None:
        comps.append((s_pos, 0.40))
    if not comps:
        return None
    wsum = sum(w for _, w in comps)
    return _clamp(sum(s * w for s, w in comps) / wsum)


def score_osciladores(stoch_k: Optional[float], rsi: Optional[float],
                      divergence: Optional[float] = None) -> Optional[float]:
    """Osciladores (sobrevenda) que SÓ contam com DIVERGÊNCIA/virada — não nível cru.
    Decisão travada: stoch/RSI sobrevendido sem divergência é só "barato e seguindo barato".
    O sinal real é: preço fez nova MÍNIMA mas o oscilador NÃO (divergência altista), ou o
    oscilador VIROU pra cima.
      • base = quão sobrevendido (stoch 60% + rsi 40%, renormaliza).
      • divergence (0-1): sem ela, a sobrevenda é DESCONTADA (×0.4..1.0 conforme divergence).
    None se nem stoch nem rsi. RSI deixa de ser decorativo — entra aqui."""
    s_stoch = score_slow_stoch_weekly(stoch_k) if stoch_k is not None else None
    s_rsi = score_rsi(rsi) if rsi is not None else None
    comps = []
    if s_stoch is not None:
        comps.append((s_stoch, 0.60))
    if s_rsi is not None:
        comps.append((s_rsi, 0.40))
    if not comps:
        return None
    wsum = sum(w for _, w in comps)
    base = _clamp(sum(s * w for s, w in comps) / wsum)
    # Sobrevenda só "conta" com divergência/virada. Sem ela (div=0), desconta a 40% do sinal
    # (puxa pro neutro 50). Com divergência plena (div=1), o sinal vale inteiro.
    div = 0.0 if divergence is None else _clamp(divergence, 0.0, 1.0)
    fator = 0.4 + 0.6 * div
    return _clamp(50 + (base - 50) * fator)


def score_momentum_relativo(rel_percentile: Optional[float]) -> Optional[float]:
    """Momentum RELATIVO cross-sectional: força do ativo vs universo (percentil DENTRO da
    categoria, 0-1). Alto percentil (líder de força) → nota alta. Best-effort: calculado
    em 2 passos no ranking_service (retorno por ativo → percentila pós-loop → injeta aqui).
    None se não houver percentil (renormaliza — nunca fabrica um proxy fingido)."""
    if rel_percentile is None:
        return None
    return _clamp(rel_percentile * 100.0)


def score_estrutura_reversao(estrutura: Optional[float]) -> Optional[float]:
    """Estrutura de reversão / suporte (0-1 → 0-100): higher-low / fechamento > máxima anterior /
    suporte recuperado. Computado dos arrays no ranking_service. None se ausente (renormaliza)."""
    if estrutura is None:
        return None
    return _clamp(estrutura * 100.0)


def compute_momentum(slow_stoch_weekly=None, discount_from_top=None,
                     reversal_confirmation=None, distance_ma200=None,
                     rsi=None, ma200_slope_weekly=None, dy=None, dy_avg10=None,
                     divergence=None, rel_momentum_percentile=None, estrutura=None):
    """
    CAMADA 2 — MOMENTO DE ENTRADA (0-100). Desenho TRAVADO. Retorna (score, breakdown).

    breakdown tem EXATAMENTE as chaves (termo sem dado SAI e renormaliza, nunca "50 falso"):
      desconto_reversao · tendencia_primaria · valuation_relativo · osciladores ·
      momentum_relativo · estrutura  (valores int 0-100).

    Pesos (somam 100%): desconto×reversão 28 · tendência 22 · valuation 18 · osciladores 14 ·
      momentum relativo 10 · estrutura 8.

    GATE DE REVERSÃO: sem reversão confirmada (reversal < 0.5) E havendo desconto real
    (≥8%), o score é CAPADO em JUSTO (≤50) — desconto-sem-reversão não vira COMPRAR (faca).
    Deliberadamente covarde (alavancado: faca = catastrófico; tarde = ruído).
    """
    # Desconto × reversão CONFIRMADA (coração da tese; já era anti-faca).
    s_disc = score_discount_from_top(discount_from_top, reversal_confirmation)
    # Tendência primária de LP (inclinação MM200 semanal + posição vs média longa).
    s_trend = score_tendencia_primaria(ma200_slope_weekly, distance_ma200)
    # Valuation relativo (yield atual vs banda histórica própria).
    s_val = score_valuation_relativo(dy, dy_avg10)
    # Osciladores (sobrevenda SÓ com divergência/virada — RSI entra aqui).
    s_osc = score_osciladores(slow_stoch_weekly, rsi, divergence)
    # Momentum relativo cross-sectional (best-effort).
    s_rel = score_momentum_relativo(rel_momentum_percentile)
    # Estrutura de reversão / suporte.
    s_est = score_estrutura_reversao(estrutura)

    pilares = [
        (s_disc, 0.28, "desconto_reversao"),
        (s_trend, 0.22, "tendencia_primaria"),
        (s_val, 0.18, "valuation_relativo"),
        (s_osc, 0.14, "osciladores"),
        (s_rel, 0.10, "momentum_relativo"),
        (s_est, 0.08, "estrutura"),
    ]
    breakdown = {}
    comps = []
    for s, w, k in pilares:
        if s is not None:
            comps.append((s, w))
            breakdown[k] = round(s)
    wsum = sum(w for _, w in comps)
    m = (sum(s * w for s, w in comps) / wsum) if wsum > 0 else 50.0

    # ── GATE DE REVERSÃO (teto JUSTO ≤50 sem reversão confirmada) ──
    # Só morde quando há desconto real a explorar (≥8%): perto da máxima não há "faca".
    conf = 0.0 if reversal_confirmation is None else _clamp(reversal_confirmation, 0.0, 1.0)
    disc = abs(discount_from_top) if discount_from_top is not None else 0.0
    if disc >= _DESCONTO_GATE_MIN and conf < _REVERSAO_MIN_CONF:
        m = min(m, _GATE_REVERSAO_TETO)

    return round(_clamp(m), 1), breakdown


# ─────────────────── GATE DE TENDÊNCIA → CAPA A ALAVANCAGEM (Camada 2) ───────────────────
# Decisão travada: a tendência primária NÃO veta a COMPRA (compra-se descontado mesmo em baixa),
# mas CAPA a ALAVANCAGEM do fluxo. Downtrend primário FORTE (preço << MM200 longa E MM200 caindo)
# = "pegar faca alavancado é catastrófico" → teto 2x. Integra com os tetos da Camada 3 via MIN
# no ranking_service (nunca SOBE alavancagem; só capa). Conservador: na dúvida (dado ausente),
# NÃO capa (não fabrica downtrend).
_DOWNTREND_DIST_FORTE = -12.0    # preço ≥12% ABAIXO da MM200 longa = bem abaixo da média
_DOWNTREND_SLOPE_CAI = 0.0       # E a MM200 inclinando p/ baixo (<0)
_TETO_LEV_DOWNTREND = 2.0


def teto_leverage_tendencia(distance_ma200: Optional[float],
                            ma200_slope_weekly: Optional[float]) -> Optional[float]:
    """Teto de alavancagem pela TENDÊNCIA primária (capa, não veta a compra).
    Downtrend FORTE (preço << MM200 longa E MM200 caindo) → teto 2x. Senão None (não capa).
    Precisa dos DOIS sinais (posição E inclinação) p/ ser conservador — preço abaixo da média
    numa MM200 ainda subindo é só pullback (não capa); MM200 caindo perto da média é início de
    deterioração mas ainda não 'faca' (não capa). Só a combinação << + caindo = downtrend real."""
    if distance_ma200 is None or ma200_slope_weekly is None:
        return None
    if distance_ma200 <= _DOWNTREND_DIST_FORTE and ma200_slope_weekly < _DOWNTREND_SLOPE_CAI:
        return _TETO_LEV_DOWNTREND
    return None


# #15b — "número ótimo" (qualidade importa E não perde pechincha):
_VERDICT_PISO_FORTE = 58.0      # boa-o-suficiente p/ COMPRAR FORTE quando a pechincha é forte
_VERDICT_EXCELENCIA = 75.0      # excelente "compra" o momento que falta (FORTE com momento só bom)
_VERDICT_PISO_COMPRAR = 45.0    # abaixo disto = ESPECULATIVO (faca), momento nenhum salva


def aporte_verdict(momentum: float, quality: float) -> str:
    """Veredito de ENTRADA (#15b). DUAS faixas de qualidade acima do piso:
      - PECHINCHA FORTE (momentum≥70): empresa boa-o-suficiente (≥58) já alcança COMPRAR FORTE
        (não perde a pechincha por a empresa não ser excelente).
      - MOMENTO BOM (60-69): só a EXCELENTE (≥75) sobe a FORTE (qualidade recompensada).
      - quality < 45 → ESPECULATIVO (faca). Nada exclui (segue no ranking).
    Por cima disto, o CRIVO de fundamentos por TIPO + confiança (ranking_service) rebaixa 1 degrau."""
    if momentum >= 70:
        if quality >= _VERDICT_PISO_FORTE:
            return "COMPRAR FORTE"
        if quality >= _VERDICT_PISO_COMPRAR:
            return "COMPRAR"
        return "ESPECULATIVO"      # pechincha forte, mas qualidade fraca = faca
    if momentum >= 60:
        if quality >= _VERDICT_EXCELENCIA:
            return "COMPRAR FORTE"   # excelência compra o momento que falta
        if quality >= _VERDICT_PISO_COMPRAR:
            return "COMPRAR"
        return "ESPECULATIVO"
    if momentum >= 50:
        if quality >= _VERDICT_PISO_COMPRAR:
            return "COMPRAR"
        return "ESPECULATIVO"
    if momentum >= 42:
        return "JUSTO"             # boa empresa, hora mediana — aguardar entrada melhor
    return "ESTICADO"              # sem desconto agora (NÃO é exclusão)


# ─────────────────── ANTI-FACA POR DECLÍNIO DO NEGÓCIO (#15c) ───────────────────
# Faca = empresa ENCOLHENDO (não só preço barato). Quantfury é CARRY ZERO → NÃO há "custo de
# carrego" a vencer (o sênior assumiu juro de margem; não se aplica). O corte é o NEGÓCIO declinante.
_KNIFE_RECENT_PCT = -8.0   # encolhimento RECENTE (TTM) que conta como "apodrecendo agora"


def is_falling_knife(growth_5y_real, recent_growth, price_cagr, is_tatico=False):
    """True se é faca (rebaixa COMPRAR/FORTE → ESPECULATIVO). #15c:
      - CÍCLICA (is_tatico): crescimento real é enganoso (fase do ciclo) → usa SÓ o preço de 6a
        (anti-faca clássico). Queda recente de receita numa cíclica é o CICLO (a compra), não rot.
      - NÃO-cíclica: faca = negócio encolhendo de VERDADE — crescimento real de 5a < 0 (estrutural),
        OU crescimento RECENTE (TTM) muito negativo (< -8% = boa empresa apodrecendo agora, que a
        média de 6a esconde).
      - SEM dado real de crescimento (BR/jovem): NÃO marca faca pelo PREÇO. Punia empresa BOA que
        só caiu de preço (ex RADL3 q100 virava ESPECULATIVO). Faca é NEGÓCIO encolhendo, não preço
        caindo; sem dado, dá o benefício da dúvida — o CRIVO de qualidade + a confiança já cuidam do
        BR. (O preço só vale p/ CÍCLICA — is_tatico — onde crescimento real é fase de ciclo.)"""
    if is_tatico:
        return price_cagr is not None and price_cagr <= 0
    if growth_5y_real is not None and growth_5y_real < 0:
        return True
    if recent_growth is not None and recent_growth < _KNIFE_RECENT_PCT:
        return True
    return False


# ─────────────────── CRIVO DE QUALIDADE-REAL POR TIPO (#15b) ───────────────────
# Porteira que julga SÓ fundamentos da EMPRESA (não preço), por TIPO, e SÓ com dado que EXISTE
# (ausente SAI, não vira "50 falso"). Renormaliza sobre os termos presentes. Piso afrouxa pela
# confiança (menos dado → mais tolerante; não pune a empresa pela cegueira do provedor).
_CRIVO_PISO_BASE = 58.0
_CRIVO_CONF_ADJ = {"ALTA": 0.0, "MEDIA": 6.0, "BAIXA": 12.0}


def crivo_piso(confidence: str = "ALTA") -> float:
    """Piso de qualidade-real p/ liberar COMPRAR FORTE, afrouxado pela confiança dos dados."""
    return _CRIVO_PISO_BASE - _CRIVO_CONF_ADJ.get(confidence, 0.0)


def _q_roic(v):
    if v is None: return None
    if v >= 0.15: return 100.0
    if v <= 0: return 0.0
    return _clamp(v / 0.15 * 100)


def _q_fcf(v):
    if v is None: return None
    if v >= 0.08: return 100.0
    if v <= 0: return 10.0
    return _clamp(v / 0.08 * 100)


def _q_roe(v):
    if v is None: return None
    if v >= 0.20: return 100.0
    if v <= 0: return 0.0
    return _clamp(v / 0.20 * 100)


def _q_debt(v):
    if v is None: return None
    if v <= 0.5: return 100.0
    if v >= 3.0: return 10.0
    return _clamp(100 - ((v - 0.5) / 2.5) * 90)


def score_quality_crivo(tipo, roe=None, roic=None, fcf_yield=None, debt_to_equity=None,
                        dy_avg10=None, dy_worst=None, dividend_yield=None,
                        growth_5y=None, confidence="ALTA"):
    """Nota do CRIVO (0-100) por TIPO, sobre fundamentos REAIS presentes. Retorna (nota, n_termos);
    (None, 0) se < 2 termos reais (crivo NÃO opina — falta de dado não barra).
      - financeira: ROE pilar; IGNORA roic/fcf/D-E (D/E alto é o modelo do banco, não risco).
      - ciclica (is_tatico): D/E pilar; ROIC com TETO 70 (pico de ciclo engana); crescimento meio-peso.
      - normal: roic+fcf+dividendo+D/E+roe+crescimento."""
    s_div = (score_dividend_sustainable(dy_avg10, dy_worst, dividend_yield, roe=roe, roic=roic)
             if dy_avg10 is not None
             else (score_dividend_q(dividend_yield) if dividend_yield is not None else None))
    s_gro = score_growth_5y(growth_5y) if growth_5y is not None else None
    s_roe, s_roic, s_fcf, s_de = _q_roe(roe), _q_roic(roic), _q_fcf(fcf_yield), _q_debt(debt_to_equity)

    # COMPOUNDER de yield baixo (#2): yield <3% + ROIC≥15%/ROE≥18% → o dividendo NÃO julga o negócio
    # (é opção de reinvestir). Tira o termo de dividendos do crivo "normal" e renormaliza, p/ ROIC/
    # FCF/ROE dominarem (RADL3/ADBE não são rebaixadas por yield baixo). Pagador de renda mantém.
    _div_yield = dividend_yield if dy_avg10 is None else dy_avg10
    _compounder_low_yield = (_is_compounder(roe, roic) and _div_yield is not None
                             and 0 <= _div_yield < _COMPOUNDER_LOW_YIELD)

    if tipo == "financeira":
        comps = [(s_roe, 0.45), (s_div, 0.30), (s_gro, 0.25)]
    elif tipo == "ciclica":
        s_roic_cap = min(s_roic, 70.0) if s_roic is not None else None   # ROIC de pico não "compra 100"
        comps = [(s_de, 0.35), (s_div, 0.30), (s_roic_cap, 0.20), (s_gro, 0.15)]
    else:  # normal
        s_div_norm = None if _compounder_low_yield else s_div   # compounder de yield baixo: dividendo SAI
        comps = [(s_roic, 0.28), (s_fcf, 0.22), (s_div_norm, 0.20), (s_de, 0.15), (s_roe, 0.15), (s_gro, 0.15)]

    present = [(s, w) for s, w in comps if s is not None]
    if len(present) < 2:
        return None, 0                 # crivo não opina (sem dado suficiente)
    wsum = sum(w for _, w in present)
    nota = sum(s * w for s, w in present) / wsum if wsum > 0 else 50.0
    return round(_clamp(nota), 1), len(present)


# ─────────────────────────── RATINGS ───────────────────────────

def risk_rating(quality_score: float) -> str:
    if quality_score >= 85:
        return "BAIXO"
    if quality_score >= 70:
        return "MODERADO"
    if quality_score >= 50:
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


# ══════════════════════════════════════════════════════════════════════════════
# SCORE DE CRYPTO (framework SEPARADO — ratificado por Pal/Hayes/Woo)
# ══════════════════════════════════════════════════════════════════════════════
# Doutrina (MODELO_RANKING_ALAVANCAGEM.md §🪙): crypto NÃO usa fundamentos, dividendo,
# Beta-vs-SPY nem SELIC. Estrutura ratificada:
#   • Portão de Sobrevivência: Liquidez 30% + MarketCap/Dominância 25% + Saúde on-chain 25% + Lindy 20%
#   • REGIME domina ~60% (liquidez global, carry iene, crédito China, DXY, dominância BTC, halving)
#   • TIMING ~40% (MVRV-Z 30% + Reserve Risk 20% + Funding 20% + Puell 15% + SOPR 15%)
#   • Leverage por ativo: BTC 2x · ETH 1.75x · top-10 1.25x · resto 1x (teto crypto 3x)
#   • Stop = fechamento SEMANAL · risk-free 0% · circuit breaker OI>p90 E funding>p90
#
# REGRA DE OURO: fator sem fonte GRÁTIS confiável SAI do score e os pesos RENORMALIZAM
# (mesmo padrão de fundamentals_apply=False). Em PRODUÇÃO, com fontes grátis, OMITIMOS:
#   • Saúde on-chain z-score, MVRV-Z, Reserve Risk, Puell, SOPR  → Glassnode (PAGO)
#   • Liquidez líquida global (Fed-RRP-TGA), crédito China        → macro pago/frágil
# IMPLEMENTADOS com fonte grátis: Liquidez (CoinGecko volume), MarketCap/Dominância
# (CoinGecko), Lindy (tabela estática), DXY + USD/JPY + BTC-regime (Yahoo chart),
# Funding contrarian + circuit breaker (Binance free), momentum/MM200 técnico (preço).
# Cada função abaixo é PURA: recebe números já buscados; None = fator ausente (renormaliza).

# Tetos de alavancagem por ativo (decisão usuário: teto crypto 3x).
CRYPTO_LEV_CAP = 3.0
CRYPTO_LEV_BY_ASSET = {"BTC": 2.0, "ETH": 1.75}   # demais: top-10 1.25x, resto 1x


def crypto_leverage_cap(symbol: Optional[str], market_cap_rank: Optional[int]) -> float:
    """
    Teto de alavancagem POR ATIVO (doutrina §5): BTC 2x · ETH 1.75x · top-10 1.25x ·
    resto 1x. Nunca acima do teto-classe crypto (3x). symbol já sem sufixo (ex 'BTC').
    market_cap_rank do CoinGecko define o top-10 (rank None → conservador: 1x).
    """
    sym = (symbol or "").upper().strip()
    if sym in CRYPTO_LEV_BY_ASSET:
        return min(CRYPTO_LEV_BY_ASSET[sym], CRYPTO_LEV_CAP)
    if market_cap_rank is not None and market_cap_rank <= 10:
        return min(1.25, CRYPTO_LEV_CAP)
    return 1.0


# ─────────────────────── Portão de Sobrevivência (sub-scores) ───────────────────────
def score_crypto_liquidity(volume_24h: Optional[float]) -> Optional[float]:
    """Liquidez real (proxy: volume 24h em USD). None se ausente (renormaliza).
    Escala log: $10M→~10 · $100M→~40 · $1B→~70 · $10B→100 (BTC/ETH saturam no topo)."""
    v = volume_24h
    if v is None or v <= 0:
        return None
    import math as _m
    # log10(1e7)=7 → 0 ; log10(1e10)=10 → 100. Faixa $10M..$10B.
    sc = (_m.log10(v) - 7.0) / 3.0 * 100.0
    return _clamp(sc)


def score_crypto_marketcap(market_cap_rank: Optional[int],
                           btc_dominance: Optional[float] = None,
                           symbol: Optional[str] = None) -> Optional[float]:
    """MarketCap/Dominância (sobrevivência). Rank baixo = mais estabelecido = nota alta.
    rank 1→100 · 5→~85 · 10→~70 · 50→~25 · 100+→~10. None se rank ausente (renormaliza).
    Dominância só ajusta BTC (dominância alta = BTC forte na rotação)."""
    if market_cap_rank is None:
        return None
    r = market_cap_rank
    if r <= 1:
        base = 100.0
    elif r <= 10:
        base = _clamp(100 - (r - 1) / 9 * 30)        # 1→100, 10→70
    elif r <= 50:
        base = _clamp(70 - (r - 10) / 40 * 45)       # 10→70, 50→25
    elif r <= 100:
        base = _clamp(25 - (r - 50) / 50 * 15)       # 50→25, 100→10
    else:
        base = 10.0
    # Dominância: tempera o BTC (alta dominância = liderança na rotação de risco).
    if (symbol or "").upper() == "BTC" and btc_dominance is not None:
        if btc_dominance >= 55:
            base = _clamp(base + 0)        # já no teto
        elif btc_dominance <= 40:
            base = _clamp(base - 5)        # dominância baixa = alts liderando
    return _clamp(base)


def score_crypto_lindy(age_years: Optional[float]) -> Optional[float]:
    """Efeito Lindy: idade da rede (anos desde a gênese). Fato público imutável.
    0a→20 · 3a→~50 · 8a→~85 · 15a+→100. None se gênese desconhecida (renormaliza)."""
    if age_years is None:
        return None
    a = max(0.0, age_years)
    if a >= 15:
        return 100.0
    return _clamp(20 + a / 15 * 80)


def compute_crypto_survival(volume_24h=None, market_cap_rank=None, btc_dominance=None,
                            age_years=None, onchain_z=None, symbol=None):
    """
    PORTÃO DE SOBREVIVÊNCIA (0-100) — Liquidez 30% + MarketCap/Dom 25% + on-chain 25% + Lindy 20%.
    on-chain z-score OMITIDO em produção (Glassnode pago) → None → termo SAI e RENORMALIZA.
    Cada fator ausente SAI; se TODOS faltarem → (None, {}, omits). Woo: alt sem on-chain
    não é excluída — perde o componente e renormaliza (a penalidade no teto vem da confiança).
    """
    s_liq = score_crypto_liquidity(volume_24h)
    s_mc = score_crypto_marketcap(market_cap_rank, btc_dominance, symbol)
    s_oc = None if onchain_z is None else _clamp(50 + onchain_z * 15)   # z→nota (ausente=None)
    s_lindy = score_crypto_lindy(age_years)
    comps = [(s_liq, 0.30, "liquidez"), (s_mc, 0.25, "marketcap_dominancia"),
             (s_oc, 0.25, "saude_onchain"), (s_lindy, 0.20, "lindy")]
    present = [(s, w, k) for s, w, k in comps if s is not None]
    omits = [k for s, w, k in comps if s is None]
    breakdown = {k: round(s) for s, w, k in present}
    if not present:
        return None, breakdown, omits
    wsum = sum(w for _, w, _ in present)
    score = sum(s * w for s, w, _ in present) / wsum
    return round(_clamp(score), 1), breakdown, omits


# ─────────────────────── REGIME de liquidez (domina ~60%) ───────────────────────
def score_crypto_regime(dxy_change=None, usdjpy_change=None, btc_regime=None,
                        btc_dominance=None):
    """
    REGIME (0-100) — "a liquidez é o oceano" (Pal). Quanto MAIS expansiva a liquidez,
    melhor p/ crypto. Fatores GRÁTIS implementados:
      • DXY (proxy inverso de liquidez): dólar caindo = liquidez expansiva = bom.
      • USD/JPY (carry iene): iene fortalecendo forte (USD/JPY caindo) = desmonte de
        carry = RUIM (ago/2024). Subindo moderado = carry estável = neutro/bom.
      • Regime de preço do BTC (já temos regime()): capitulação = oceano vazio/baixa;
        topo = euforia (regime quente, mas o TIMING cuida do "sair antes").
    OMITIDOS (fonte paga/frágil → renormaliza): liquidez líquida global (Fed-RRP-TGA),
    crédito China, crédito HY OAS, halving. dxy_change/usdjpy_change = variação % recente.
    """
    comps = []
    breakdown = {}
    omits = ["liquidez_global_fed_rrp_tga", "credito_china", "credito_hy_oas", "halving"]

    if dxy_change is not None:
        # DXY subindo = aperto (ruim). +5% → ~20 ; 0 → 60 ; -5% → 100.
        s_dxy = _clamp(60 - dxy_change * 8)
        comps.append((s_dxy, 0.35))
        breakdown["dxy"] = round(s_dxy)
    if usdjpy_change is not None:
        # Desmonte de carry = USD/JPY CAINDO forte = ruim. -5% → ~25 ; 0 → 60 ; +3% → ~85.
        # Subida forte demais (>+8%) tampouco é "boa" p/ crypto, mas não penaliza aqui.
        s_jpy = _clamp(60 + usdjpy_change * 7) if usdjpy_change <= 5 else 90.0
        comps.append((s_jpy, 0.25))
        breakdown["carry_iene_usdjpy"] = round(s_jpy)
    if btc_regime is not None:
        reg_map = {"CAPIT.EXTREMA": 30.0, "CAPITULACAO": 45.0, "NEUTRO": 65.0, "TOPO": 55.0}
        s_reg = reg_map.get(btc_regime, 60.0)
        comps.append((s_reg, 0.40))
        breakdown["regime_preco_btc"] = round(s_reg)

    if not comps:
        return None, breakdown, omits
    wsum = sum(w for _, w in comps)
    score = sum(s * w for s, w in comps) / wsum
    return round(_clamp(score), 1), breakdown, omits


# ─────────────────────── TIMING (~40%) ───────────────────────
def score_crypto_funding(funding_rate: Optional[float]) -> Optional[float]:
    """
    Funding rate CONTRARIAN (Woo/Hayes): funding NEGATIVO = capitulação/compra (nota alta);
    funding muito POSITIVO = excesso de alavancagem comprada = topo (nota baixa).
    funding_rate em FRAÇÃO por janela (ex 0.0001 = 0.01%). None se ausente (renormaliza).
      ≤ -0.0005 (capitulação) → 100 · 0 → 60 · +0.0003 (neutro-alto) → ~35 · ≥+0.001 → 0.
    """
    f = funding_rate
    if f is None:
        return None
    if f <= -0.0005:
        return 100.0
    if f >= 0.001:
        return 0.0
    # interpola linear de (-0.0005→100) a (0.001→0)
    return _clamp(100 - (f + 0.0005) / 0.0015 * 100)


def score_crypto_timing_technical(slow_stoch_weekly=None, distance_ma200=None,
                                  discount_from_top=None, reversal_confirmation=None):
    """
    TIMING técnico LEVE (confirmação tática — doutrina: peso reduzido pois sobrepõe MVRV).
    Reusa os scorers de preço já existentes (stoch lento semanal, MM200, desconto×reversão).
    None só se TODOS ausentes. Em produção é o grosso do TIMING (MVRV/Reserve/Puell/SOPR
    são Glassnode pago → OMITIDOS e renormalizados)."""
    comps = []
    breakdown = {}
    if slow_stoch_weekly is not None:
        s = score_slow_stoch_weekly(slow_stoch_weekly)
        comps.append((s, 0.45)); breakdown["stoch_lento_semanal"] = round(s)
    if distance_ma200 is not None:
        s = score_distance_ma200(distance_ma200)
        comps.append((s, 0.30)); breakdown["distancia_ma200"] = round(s)
    if discount_from_top is not None:
        s = score_discount_from_top(discount_from_top, reversal_confirmation)
        comps.append((s, 0.25)); breakdown["desconto_x_reversao"] = round(s)
    if not comps:
        return None, breakdown
    wsum = sum(w for _, w in comps)
    return round(_clamp(sum(s * w for s, w in comps) / wsum), 1), breakdown


def compute_crypto_timing(funding_rate=None, slow_stoch_weekly=None, distance_ma200=None,
                          discount_from_top=None, reversal_confirmation=None,
                          mvrv_z=None, reserve_risk=None, puell=None, sopr=None):
    """
    TIMING (0-100). Pesos ratificados: MVRV-Z 30% + Reserve Risk 20% + Funding 20% +
    Puell 15% + SOPR 15% (+ técnico como confirmação leve). MVRV-Z/Reserve/Puell/SOPR
    são Glassnode (PAGO) → OMITIDOS em produção → None → SAEM e RENORMALIZAM. Restam
    Funding (Binance free) + técnico de preço. Cada fator ausente SAI.
    """
    comps = []
    breakdown = {}
    omits = []
    s_fund = score_crypto_funding(funding_rate)
    if s_fund is not None:
        comps.append((s_fund, 0.20)); breakdown["funding_contrarian"] = round(s_fund)
    else:
        omits.append("funding_contrarian")
    s_tech, tech_bd = score_crypto_timing_technical(
        slow_stoch_weekly, distance_ma200, discount_from_top, reversal_confirmation)
    if s_tech is not None:
        comps.append((s_tech, 0.20)); breakdown["tecnico_preco"] = round(s_tech)
        breakdown.update(tech_bd)
    # On-chain pago: cada um, se vier (None em prod), entra com seu peso.
    for val, w, key in ((mvrv_z, 0.30, "mvrv_z"), (reserve_risk, 0.20, "reserve_risk"),
                        (puell, 0.15, "puell"), (sopr, 0.15, "sopr")):
        if val is not None:
            comps.append((_clamp(val), w)); breakdown[key] = round(_clamp(val))
        else:
            omits.append(key)
    if not comps:
        return None, breakdown, omits
    wsum = sum(w for _, w in comps)
    return round(_clamp(sum(s * w for s, w in comps) / wsum), 1), breakdown, omits


# ─────────────────────── CIRCUIT BREAKER (Hayes — binário) ───────────────────────
def crypto_circuit_breaker(oi_percentile=None, funding_percentile=None) -> bool:
    """
    Circuit breaker de liquidação em cascata (binário, não ponderado): OI > p90 E
    funding > p90 → 'SOBREALAVANCADO' → trava entradas + força 1x. Percentis 0-100.
    Ambos ausentes (sem histórico de OI/funding) → False (não trava sem evidência).
    """
    if oi_percentile is None or funding_percentile is None:
        return False
    return oi_percentile > 90.0 and funding_percentile > 90.0


def crypto_confidence(survival_omits, regime_omits, timing_omits) -> str:
    """
    Confiança do score de crypto pela QUANTIDADE de fatores on-chain/macro omitidos.
    Em produção (só fontes grátis) muitos on-chain saem → confiança no MÁXIMO MEDIA
    (honestidade: não alavancar no talo sobre fatores ausentes). Conta as omissões de
    on-chain pago + macro pago (não as omissões 'esperadas' já contabilizadas).
    """
    paid_onchain = {"saude_onchain", "mvrv_z", "reserve_risk", "puell", "sopr"}
    omitted_paid = (set(survival_omits or []) | set(timing_omits or [])) & paid_onchain
    n = len(omitted_paid)
    if n >= 4:
        return "BAIXA"     # quase todo o on-chain estrutural ausente
    if n >= 1:
        return "MEDIA"
    return "ALTA"


def compute_crypto_score(volume_24h=None, market_cap_rank=None, btc_dominance=None,
                         age_years=None, onchain_z=None, symbol=None,
                         dxy_change=None, usdjpy_change=None, btc_regime=None,
                         funding_rate=None, slow_stoch_weekly=None, distance_ma200=None,
                         discount_from_top=None, reversal_confirmation=None,
                         mvrv_z=None, reserve_risk=None, puell=None, sopr=None,
                         oi_percentile=None, funding_percentile=None):
    """
    SCORE DE CRYPTO consolidado (framework separado, ratificado Pal/Hayes/Woo).

    Composição (doutrina):
      • Sobrevivência → vira QUALIDADE (portão de não-ir-a-zero).
      • REGIME (~60%) + TIMING (~40%) → vira MOMENTO/oportunidade de aporte.
    Pesos renormalizam quando faltam fatores (REGRA DE OURO — nada fabricado).

    Retorna dict com chaves compatíveis com a linha do ranking:
      quality, momentum, quality_breakdown, momentum_breakdown, confidence,
      leverage_cap, circuit_breaker, omitted (fatores que saíram, p/ transparência).
    Score nunca lança; faixas sempre 0-100. Fatores ausentes documentados em 'omitted'.
    """
    survival, surv_bd, surv_omits = compute_crypto_survival(
        volume_24h=volume_24h, market_cap_rank=market_cap_rank, btc_dominance=btc_dominance,
        age_years=age_years, onchain_z=onchain_z, symbol=symbol)
    regime_s, reg_bd, reg_omits = score_crypto_regime(
        dxy_change=dxy_change, usdjpy_change=usdjpy_change, btc_regime=btc_regime,
        btc_dominance=btc_dominance)
    timing_s, tim_bd, tim_omits = compute_crypto_timing(
        funding_rate=funding_rate, slow_stoch_weekly=slow_stoch_weekly,
        distance_ma200=distance_ma200, discount_from_top=discount_from_top,
        reversal_confirmation=reversal_confirmation, mvrv_z=mvrv_z,
        reserve_risk=reserve_risk, puell=puell, sopr=sopr)

    # MOMENTO = REGIME (~60%) + TIMING (~40%). Se um faltar, o outro carrega (renormaliza).
    mcomps = []
    if regime_s is not None:
        mcomps.append((regime_s, 0.60))
    if timing_s is not None:
        mcomps.append((timing_s, 0.40))
    if mcomps:
        mwsum = sum(w for _, w in mcomps)
        momentum = round(_clamp(sum(s * w for s, w in mcomps) / mwsum), 1)
    else:
        momentum = 50.0

    quality = survival if survival is not None else 50.0

    breaker = crypto_circuit_breaker(oi_percentile, funding_percentile)
    lev_cap = crypto_leverage_cap(symbol, market_cap_rank)
    if breaker:
        lev_cap = 1.0   # SOBREALAVANCADO → força sizing 1x (Hayes)

    momentum_breakdown = {}
    if regime_s is not None:
        momentum_breakdown["regime"] = round(regime_s)
    if timing_s is not None:
        momentum_breakdown["timing"] = round(timing_s)
    momentum_breakdown.update({f"regime_{k}": v for k, v in reg_bd.items()})
    momentum_breakdown.update({f"timing_{k}": v for k, v in tim_bd.items()})

    confidence = crypto_confidence(surv_omits, reg_omits, tim_omits)

    return {
        "quality": round(quality, 1),
        "momentum": momentum,
        "regime_score": regime_s,
        "timing_score": timing_s,
        "survival_score": survival,
        "quality_breakdown": surv_bd,
        "momentum_breakdown": momentum_breakdown,
        "confidence": confidence,
        "leverage_cap": lev_cap,
        "circuit_breaker": breaker,
        "omitted": {
            "survival": surv_omits,
            "regime": reg_omits,
            "timing": tim_omits,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# CAMADA 3 — APTIDÃO PRA ALAVANCAR (parte POR-ATIVO). Passo 2 do motor de 3 camadas.
# ══════════════════════════════════════════════════════════════════════════════
# A Camada 1 mede o NEGÓCIO (independente de preço). A Camada 3 recebe o RISCO DE PREÇO
# (máxDD/σ/gap/beta/DY/recuperação) e responde: "quanto dá pra alavancar este ativo com
# segurança — sobreviver ao PIOR tombo?". Mecânica Quantfury: CARRY ZERO; a liquidação
# ocorre quando a perda ≈ equity → 2x liquida em −50%, 3x em −33%, 4x em −25%, 5x em −20%
# (DESCONTO DE REALIDADE: usamos o ponto de liquidação real por alavancagem, NÃO o −97%
# teórico). Esta camada NÃO faz os disjuntores de PORTFÓLIO (C.2/C.3) — isso é passo futuro.
#
# DUAS entregas:
#   A) score_aptidao(...)  → nota 0-100 (MODULADOR, pesos travados) + teto de alavancagem
#      pelo MIN de todos os tetos de sobrevivência (sobrevivência é MÍNIMO, nunca média).
#   B) Em ativos SEM negócio (ETF/COMMODITY), o score de aptidão VIRA a "qualidade" do
#      ranking (risco-perfil), porque a Camada 1 achata esses em 50 (JEPI = ETF lixo).
#
# REGRAS DE FERRO:
#   • Sobrevivência = MÍNIMO. O score de aptidão NUNCA SOBE o teto definido pelos gates/MIN;
#     só MODULA o tamanho do aporte (e, em ETF, a posição no rank). Teto = MIN dos tetos.
#   • Arredonda alavancagem PRA BAIXO (floor). Caudas não se calibram com decimais.
#   • NUNCA fabrica dado: fator ausente RENORMALIZA o score; teto ausente NÃO entra no MIN.

# Pontos de liquidação por alavancagem (perda ≈ equity → liquida). DESCONTO DE REALIDADE.
LIQUIDATION_PCT_BY_LEV = {1: 100.0, 2: 50.0, 3: 100.0 / 3.0, 4: 25.0, 5: 20.0}
_LEV_TIERS = [1, 2, 3, 4, 5]

# FOLGA sobre o máxDD (a liquidação tem de ficar ABAIXO do máxDD × folga). DECISÃO DO DONO
# (fat tails, survival-first): PISO de 1,8× — "o pior tombo ainda não aconteceu" (quant de cauda).
# Consequência: máxDD −50% → 1x ; máxDD −30% → 1,5x ; máxDD ≤−28% → 2x. História CURTA (<15a, não
# testada em crise antiga) ou σ ALTO endurece p/ 2,5×. Não brigar por decimais: a ORDEM é robusta.
_FOLGA_BASE = 1.8
_FOLGA_DURA = 2.5


def _floor_lev(lev: float) -> float:
    """Arredonda alavancagem PRA BAIXO p/ o tier inteiro (conservador). Piso 1x, teto 5x."""
    if lev is None:
        return 1.0
    return float(max(1, min(5, int(math.floor(lev + 1e-9)))))


def aptidao_volatility_annualized(returns) -> Optional[float]:
    """σ TOTAL anualizada (volatilidade própria) a partir dos retornos DIÁRIOS:
    desvio-padrão × √252. `returns` = iterável de retornos diários (frações, ex 0.012).
    Série curta/ausente (< 30 retornos) → None (renormaliza no score; teto não entra no MIN).
    NUNCA fabrica."""
    if returns is None:
        return None
    arr = np.asarray([r for r in returns if r is not None], dtype=float)
    if arr.size < 30:
        return None
    sd = float(np.std(arr))
    if not np.isfinite(sd) or sd <= 0:
        return None
    return float(sd * math.sqrt(252.0) * 100.0)   # em % anualizado


def aptidao_gap(returns) -> Optional[float]:
    """GAP / pior salto plausível = MAIOR |retorno diário| da série (proxy conservador do pior
    movimento diário/overnight). Em %. Série ausente → None (renormaliza; teto não entra)."""
    if returns is None:
        return None
    arr = np.asarray([abs(r) for r in returns if r is not None], dtype=float)
    if arr.size < 5:
        return None
    g = float(np.max(arr))
    if not np.isfinite(g) or g <= 0:
        return None
    return float(g * 100.0)   # em %


# ─────────────────────────── sub-scores de APTIDÃO (0-100) ───────────────────────────
def _apt_maxdd(max_dd_pct: Optional[float]) -> Optional[float]:
    """Profundidade do máxDD histórico. Raso = apto (alto); fundo = inapto. None se ausente."""
    if max_dd_pct is None:
        return None
    dd = abs(max_dd_pct)
    if dd <= 10:
        return 100.0
    if dd >= 70:
        return 0.0
    return _clamp(100 - (dd - 10) / 60 * 100)


def _apt_sigma(sigma_pct: Optional[float]) -> Optional[float]:
    """σ total anualizada. Baixa vol = apto. <15%→100 · 25%→~60 · 35%→~25 · ≥55%→0. None ausente."""
    if sigma_pct is None:
        return None
    s = abs(sigma_pct)
    if s <= 15:
        return 100.0
    if s >= 55:
        return 0.0
    return _clamp(100 - (s - 15) / 40 * 100)


def _apt_gap(gap_pct: Optional[float]) -> Optional[float]:
    """Gap/pior salto diário. Salto pequeno = apto. ≤5%→100 · 12%→~50 · ≥25%→0. None ausente.
    (Liquidez entra aqui SE houver volume; sem volume não veta — não fabrica.)"""
    if gap_pct is None:
        return None
    g = abs(gap_pct)
    if g <= 5:
        return 100.0
    if g >= 25:
        return 0.0
    return _clamp(100 - (g - 5) / 20 * 100)


def _apt_dividend_saturated(dy: Optional[float]) -> Optional[float]:
    """DY recorrente SATURADO: dividendo consistente é bom, mas yield ALTO (>6-7%) NÃO premia —
    REBAIXA (suspeita de yield-trap / risco). 0%→50 · 3-5%→~85-100 (zona saudável) · 6%→~75 ·
    7%→60 · ≥10%→~30. None se ausente (renormaliza)."""
    if dy is None:
        return None
    if dy <= 0:
        return 50.0
    if dy <= 5:
        return _clamp(55 + dy / 5 * 45)        # 0→55, 5→100 (zona saudável premia)
    if dy <= 7:
        return _clamp(100 - (dy - 5) / 2 * 40)  # 5→100, 7→60 (começa a desconfiar)
    return _clamp(60 - (dy - 7) * 10)           # 7→60, 10→30 (trap → rebaixa)


def _apt_recovery(recovered: Optional[bool], recovery_years: Optional[float],
                  hist_curto: Optional[bool]) -> Optional[float]:
    """Testado/recuperado em crise. Recuperou rápido = apto; nunca recuperou = inapto; história
    curta (não testada) = neutro-baixo. None só se NADA disso veio."""
    if recovered is None and recovery_years is None and hist_curto is None:
        return None
    if recovered is False:
        return 20.0                              # caiu e NUNCA recuperou = impairment
    if recovered is True:
        if recovery_years is None:
            return 75.0
        if recovery_years <= 1:
            return 100.0
        if recovery_years >= 5:
            return 40.0
        return _clamp(100 - (recovery_years - 1) / 4 * 60)
    # recovered None mas sabemos da história: curta = não testada (neutro-baixo), longa = neutro
    return 45.0 if hist_curto else 60.0


def _apt_beta(beta: Optional[float]) -> Optional[float]:
    """Beta como aptidão: baixo = apto. <0.8→100 · 1.15→~70 · 1.45→~45 · ≥1.8→15. None ausente.
    Beta NEGATIVO já é sanitizado no ranking_service (guard) — aqui trata |beta| conservador."""
    if beta is None:
        return None
    b = abs(beta)
    if b < 0.8:
        return 100.0
    if b >= 1.8:
        return 15.0
    return _clamp(100 - (b - 0.8) / 1.0 * 85)


def score_aptidao(max_dd_pct=None, sigma_pct=None, gap_pct=None, dividend_yield=None,
                  recovered=None, recovery_years=None, hist_curto=None, beta=None):
    """
    ENTREGA A — Score de APTIDÃO PRA ALAVANCAR (0-100). MODULADOR (nunca sobe teto).
    Pesos TRAVADOS: máxDD 25% · σ total 25% · gap/liquidez 20% · DY saturado 12% ·
    recuperação 8% · beta 10%. Fator ausente SAI e os pesos RENORMALIZAM (regra: não fabrica).
    Retorna (nota 0-100, breakdown). Sem nenhum fator → (50.0, {}) neutro.
    """
    s_dd = _apt_maxdd(max_dd_pct)
    s_sig = _apt_sigma(sigma_pct)
    s_gap = _apt_gap(gap_pct)
    s_div = _apt_dividend_saturated(dividend_yield)
    s_rec = _apt_recovery(recovered, recovery_years, hist_curto)
    s_beta = _apt_beta(beta)

    fatores = [
        (s_dd, 0.25, "maxdd"),
        (s_sig, 0.25, "sigma_total"),
        (s_gap, 0.20, "gap_liquidez"),
        (s_div, 0.12, "dy_saturado"),
        (s_rec, 0.08, "recuperacao"),
        (s_beta, 0.10, "beta"),
    ]
    breakdown = {}
    comps = []
    for s, w, k in fatores:
        if s is not None:
            comps.append((s, w))
            breakdown[k] = round(s)
    wsum = sum(w for _, w in comps)
    nota = (sum(s * w for s, w in comps) / wsum) if wsum > 0 else 50.0
    return round(_clamp(nota), 1), breakdown


# ─────────────────────────── TETOS de sobrevivência (cada um → leverage) ───────────────────────────
def teto_maxdd(max_dd_pct: Optional[float], hist_curto: bool = False,
               sigma_pct: Optional[float] = None) -> Optional[float]:
    """A liquidação (100/lev) tem de ficar ABAIXO do máxDD × FOLGA. FOLGA: 1,8× base
    (_FOLGA_BASE); 2,5× dura (_FOLGA_DURA) se história curta (<15a) ou σ alto (>35%). Escolhe o
    MAIOR tier cuja liquidação ainda sobrevive
    ao tombo exigido. None se máxDD ausente (não entra no MIN). Ex (ratificado): −50%→1x · −30%
    longo→2x."""
    if max_dd_pct is None:
        return None
    dd = abs(max_dd_pct)
    if dd <= 0:
        return 5.0
    sigma_alto = sigma_pct is not None and sigma_pct > 35.0
    folga = _FOLGA_DURA if (hist_curto or sigma_alto) else _FOLGA_BASE
    required = dd * folga                                  # profundidade que precisa sobreviver
    best = 1.0
    for L in _LEV_TIERS:
        if LIQUIDATION_PCT_BY_LEV[L] >= required:          # liquidação mais funda que o exigido
            best = float(L)
    return best


def teto_sigma(sigma_pct: Optional[float], floor_min_pct: Optional[float] = None) -> Optional[float]:
    """σ TOTAL anualizada — capa SÓ OS EXTREMOS (perfil agressivo do dono). A DOUTRINA manda no resto
    (alavancagem do REGIME 2/3/4/5x); a rede de sobrevivência é o CAP AGREGADO C.3 (carteira), não o
    por-fluxo apertado. A tabela antiga (σ<15→4x · 15-25→2x · 25-35→1,5x) colapsava ação normal
    (MSFT σ27→1x) = conservador demais. AGRESSIVO: σ<35%→SEM cap · 35-50%→3x · 50-65%→2x · ≥65%→1x.

    PERFIL (produto): `floor_min_pct` antecipa o cap p/ assinantes menos agressivos — σ em
    [floor_min_pct, 35) já capa a 2x (ação de vol elevada não pega lev cheia). None = comportamento
    agressivo atual (só extremos ≥35). Presets: conservador 25 · moderado 30 · agressivo None."""
    if sigma_pct is None:
        return None
    s = abs(sigma_pct)
    if floor_min_pct is not None and floor_min_pct <= s < 35:
        return 2.0               # vol elevada (perfil cauteloso) → capa antes do extremo
    if s < 35:
        return None              # vol normal → doutrina/regime manda (não capa)
    if s <= 50:
        return 3.0
    if s <= 65:
        return 2.0
    return 1.0                   # σ ≥ 65% (cripto-like/alavancado) → só à vista


# Piso de cauda de gap (Fix 2 — survival): o gap OBSERVADO (maior |retorno diário| numa janela ~6a)
# SUBESTIMA o gap de cauda de um ativo estruturalmente "gappy" que simplesmente não teve um crash
# NESSA janela. Confiar no "nunca gapeou em 6a" libera alavancagem alta indevida. Correção
# conservadora: ao computar o teto, usa-se um gap EFETIVO = gap_observado × multiplicador de cauda,
# e/ou um PISO ABSOLUTO de gap-risk para ativos sem histórico longo (hist_curto) ou de alta σ — onde
# a janela é menos confiável p/ revelar o pior salto plausível. Conservador, não fabrica número
# absurdo; só não deixa o teto liberar lev alta com base só na ausência de crash recente.
_GAP_TAIL_MULT = 1.3          # cauda além do observado (gap_efetivo = gap_obs × 1,3)
_GAP_FLOOR_HIST_CURTO = 10.0  # piso de gap (%) p/ ativo sem histórico longo (janela não testou crise)
_GAP_FLOOR_SIGMA_ALTO = 12.0  # piso de gap (%) p/ ativo de alta σ (≥40% a.a.) — propenso a saltos


def teto_gap(gap_pct: Optional[float], hist_curto: bool = False,
             sigma_pct: Optional[float] = None) -> Optional[float]:
    """Sobreviver ao PIOR gap plausível × 2,0× (folga INEGOCIÁVEL). O gap (salto overnight, sem
    chance de stop) é o risco mais LETAL do sistema — por isso carrega a MAIOR folga, não a menor.
    A liquidação (100/lev) tem de ficar abaixo do gap×2,0. Escolhe o maior tier que sobrevive.
    None se gap ausente (não fabrica).

    PISO DE CAUDA (Fix 2): o gap observado numa janela ~6a subestima a cauda. Aplica-se:
      • multiplicador de cauda fixo (gap_efetivo = max(gap_obs, gap_obs × 1,3)); e
      • um piso ABSOLUTO de gap-risk quando a janela é pouco confiável: hist_curto (não viu crise
        antiga) → piso 10% ; alta σ (≥40% a.a., propenso a saltos) → piso 12%.
    Assim o teto não libera lev alta confiando só no "nunca gapeou nesta janela"."""
    if gap_pct is None:
        return None
    g = abs(gap_pct)
    if g <= 0 and not hist_curto and not (sigma_pct is not None and abs(sigma_pct) >= 40.0):
        return 5.0
    # gap EFETIVO conservador: cauda além do observado + piso por característica do ativo.
    g_eff = max(g, g * _GAP_TAIL_MULT)
    if hist_curto:
        g_eff = max(g_eff, _GAP_FLOOR_HIST_CURTO)
    if sigma_pct is not None and abs(sigma_pct) >= 40.0:
        g_eff = max(g_eff, _GAP_FLOOR_SIGMA_ALTO)
    required = g_eff * 2.0
    best = 1.0
    for L in _LEV_TIERS:
        if LIQUIDATION_PCT_BY_LEV[L] >= required:
            best = float(L)
    return best


def teto_beta(beta: Optional[float]) -> Optional[float]:
    """Beta → teto (já existe a trava ≥1,45→2x no ranking; aqui é a tabela completa):
    |beta|<0,8 → SEM cap (None, não entra no MIN) · 0,8-1,15→4x · 1,15-1,45→3x · 1,45-1,8→2x ·
    >1,8→1x. Beta ausente → None (não entra)."""
    if beta is None:
        return None
    b = abs(beta)
    if b < 0.8:
        return None                  # beta baixo não impõe teto → fora do MIN
    if b <= 1.15:
        return 4.0
    if b <= 1.45:
        return 3.0
    if b <= 1.8:
        return 2.0
    return 1.0


# Teto do prêmio esperado do Kelly (Fix 1 — survival, anti return-chasing). O μ do Kelly costuma vir
# do CAGR de PREÇO passado − rf, o que é PRÓ-CÍCLICO: ativo que já subiu muito vira "μ alto" → Kelly
# mais GENEROSO → mais alavancagem no TOPO do ciclo (viés exatamente errado). Cap conservador: nenhum
# prêmio de risco esperado SUSTENTÁVEL passa de ~12% a.a.; acima disso é provável extrapolação de um
# rali passado, não edge forward. Capar μ impede o Kelly de superdimensionar lev em vencedores
# recentes. (TSR forward = DY + crescimento real seria o ideal; quando indisponível, capamos o μ.)
MU_EXCESS_CAP = 0.12             # teto do μ de excesso anual (12% a.a.) no Kelly


def teto_kelly(mu_excess_annual: Optional[float], sigma_pct: Optional[float]) -> Optional[float]:
    """¼·Kelly (conservador): 0,25 × (μ_excesso / σ²). μ_excesso e σ EM FRAÇÃO anual (σ% / 100).
    Arredonda PRA BAIXO. None se faltar μ ou σ, ou se μ≤0 (sem edge → não justifica alavancar →
    1x). Resultado mínimo 1x quando há edge fraco.

    Fix 1: o μ de excesso é CAPADO em MU_EXCESS_CAP (12% a.a.) antes de entrar no Kelly. Como o μ
    normalmente é o CAGR de preço passado − rf, valores altos refletem rali passado (pró-cíclico),
    não prêmio forward sustentável — capar evita superdimensionar lev no topo do ciclo."""
    if mu_excess_annual is None or sigma_pct is None:
        return None
    sig = abs(sigma_pct) / 100.0
    if sig <= 0:
        return None
    if mu_excess_annual <= 0:
        return 1.0                   # sem prêmio esperado → não alavanca
    mu = min(mu_excess_annual, MU_EXCESS_CAP)   # Fix 1: capa μ (anti return-chasing pró-cíclico)
    kelly = mu / (sig * sig)
    quarter = 0.25 * kelly
    return float(max(1.0, quarter))  # o floor final cuida do arredondamento pra baixo


def gate_liquidez(volume: Optional[float], min_volume: float = 5_000_000.0) -> bool:
    """GATE eliminatório de liquidez: ADV-$ (volume financeiro diário médio, US$) MUITO baixo
    (< US$ 5M) → True (zera a alavancagem → 1x à vista). Large-caps passam folgado; só micro-caps
    ilíquidas (onde a saída alavancada escorrega/não executa) são vetadas. Sem dado de volume
    (None) → NÃO veta (não fabrica liquidez ruim). Conservador só com evidência."""
    if volume is None:
        return False
    return volume < min_volume


def teto_alavancagem_aptidao(max_dd_pct=None, sigma_pct=None, gap_pct=None, beta=None,
                             mult_regime=None, mu_excess_annual=None,  # DEPRECATED: ignorado.
                             hist_curto=False, volume=None,
                             gap_risk_extremo: bool = False,
                             leverage_cap=None, sigma_floor_min_pct=None):  # PERFIL (produto)
    # NOTA (Fix 1): `mu_excess_annual` é VESTIGIAL e IGNORADO — ¼·Kelly NÃO entra no MIN por-fluxo
    # (vive só no agregado C.3 e no score). Mantido na assinatura só p/ compat; não reintroduzir.
    """
    ENTREGA A — TETO de alavancagem POR-FLUXO = MIN dos tetos de risco FORWARD (sobrevivência é
    MÍNIMO, nunca média). Tetos ausentes (dado faltando) NÃO entram no MIN. Arredonda PRA BAIXO.

      lev = MIN( teto_σ, teto_gap, teto_beta, mult_regime )

    NÃO inclui teto_máxDD NEM ¼·Kelly: ambos são travas de AGREGADO (C.3, portfolio_service),
    NÃO por-fluxo. Pela doutrina (alavancagem sobre FLUXO, não posição), um fluxo a Nx NÃO precisa
    sobreviver sozinho ao máxDD histórico do ativo nem carregar o Kelly de patrimônio-inteiro — o
    cofre acumulado absorve, e a sobrevivência real é o cap de alavancagem efetiva AGREGADA.
    Aplicados por-fluxo, AMBOS colapsavam a estratégia a 1x: folga 1,8× sobre o máxDD completo
    capava TODA ação de qualidade (JNJ/KO −40% em 2008) a 1x; e ¼·Kelly de um ativo isolado
    (excesso ~8%, σ ~20%) dá ~0,5x ("nem 100% investido"). Risco FORWARD por-fluxo = σ+gap+beta+regime
    (σ é o governador: 20% vol → 2x). máxDD e Kelly vivem: (a) no SCORE de aptidão (risco relativo)
    e (b) na trava de sobrevivência AGREGADA da carteira (C.3). teto_maxdd/teto_kelly seguem
    existindo como funções p/ o agregado usar.

    GATES eliminatórios → forçam 1x à vista: liquidez muito baixa (só se houver volume) ou
    gap-risk extremo. Sem volume, NÃO veta por liquidez. Retorna (leverage_floor, detalhe_dict).
    """
    tetos = {
        # PERFIL: sigma_floor_min_pct antecipa o cap p/ perfis cautelosos (None = agressivo atual).
        "sigma": teto_sigma(sigma_pct, floor_min_pct=sigma_floor_min_pct),
        # Fix 2: piso de cauda de gap — gap_obs×1,3 + piso por hist_curto / alta σ (janela pouco
        # confiável). Não deixa o teto liberar lev alta confiando só em "nunca gapeou nesta janela".
        "gap": teto_gap(gap_pct, hist_curto=hist_curto, sigma_pct=sigma_pct),
        "beta": teto_beta(beta),
        "regime": (float(mult_regime) if mult_regime is not None else None),
        # PERFIL: teto DURO de alavancagem do preset (conservador 2 · moderado 3 · agressivo 5).
        # None = sem teto de perfil (comportamento atual). Entra no MIN como qualquer outro teto.
        "perfil": (float(leverage_cap) if leverage_cap is not None else None),
    }
    presentes = {k: v for k, v in tetos.items() if v is not None}

    # GATES eliminatórios (zeram → 1x). Liquidez só veta COM volume (não fabrica).
    gate_liq = gate_liquidez(volume)
    if gate_liq or gap_risk_extremo:
        return 1.0, {"tetos": presentes, "binding": "GATE",
                     "gate_liquidez": gate_liq, "gate_gap_extremo": bool(gap_risk_extremo),
                     "leverage_raw": 1.0}

    if presentes:
        binding = min(presentes, key=lambda k: presentes[k])
        lev_raw = presentes[binding]
    else:
        binding = None
        lev_raw = 1.0                # sem nenhum teto disponível → conservador 1x

    lev = _floor_lev(lev_raw)
    return lev, {"tetos": presentes, "binding": binding,
                 "gate_liquidez": gate_liq, "gate_gap_extremo": bool(gap_risk_extremo),
                 "leverage_raw": round(lev_raw, 3)}
