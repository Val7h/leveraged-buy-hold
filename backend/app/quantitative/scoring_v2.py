"""
Scoring V2 — Modelo Mestre de Ranking de Alavancagem (FASE 1: ações).
Implementa o design ratificado em MODELO_RANKING_ALAVANCAGEM.md.

Diferenças-chave vs v1:
  - QUALIDADE é PORTÃO (elimina < 70), não peso. 70-84 → máx 3x; ≥85 → libera 4x.
  - RANKING entre elegíveis = 100% Oportunidade (qualidade já filtrou).
  - Quality = Sharpe 30% + MaxDD&Recuperação 25% + Fundamento 20% + Consistência 15%.
    (Beta, Volatilidade e Dividend Yield REMOVIDOS do quality.)
  - Opportunity 2-eixos: MM200 35% + Stochastic 30% + DescontoTopo×Reversão 25% + RSI 10%.
  - BETA = amplificador externo (não penaliza qualidade).
  - SIZING por assimetria Risco:Retorno, com trava (perda×lev ≤ 40% da posição).

Este módulo é PURO (recebe números já calculados). Mantém o v1 100% intacto.
Indicadores novos (recuperação, consistência, distância do topo, reversão) ficam em
indicators_v2.py. Ativado por flag — nunca substitui o v1 automaticamente.
"""
from typing import Dict, Optional, Tuple
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


def score_beta_contextual(beta: Optional[float], momentum: Optional[float] = None) -> float:
    """
    Beta AMPLIFICADOR (decisão do usuário): a nota do beta depende do momento.
      - Beta BAIXO (≤0.9): defensivo, bom sempre.
      - Beta ALTO (≥1.2): depende do momento — oversold/boa entrada (momento alto) AMPLIFICA
        (beta alto em ativo de qualidade no fundo = recupera mais forte, ex MSFT); sobrecomprado
        (momento baixo) PENALIZA (cai mais forte na virada).
    """
    if beta is None:
        return 55.0
    if beta <= 0.9:
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


def compute_quality_blend(beta=None, max_dd_pct=None, dividend_yield=None,
                          growth_5y=None, roe=None, debt_to_equity=None,
                          payout_ratio=None, roic=None, fcf_yield=None,
                          sharpe=None, cagr=None, tsr_expected=None,
                          momentum=None):
    """
    Qualidade (0-100) — pesos (nada exclui). Beta é CONTEXTUAL (amplificador):
    oversold + beta alto = bônus; sobrecomprado + beta alto = penalidade (depende do momento).
    """
    s_beta = score_beta_contextual(beta, momentum)
    s_dd = score_maxdd_quality(max_dd_pct)
    s_sharpe = score_sharpe(sharpe)
    s_cagr = score_cagr(cagr if cagr is not None else growth_5y)
    s_gro = score_growth_5y(growth_5y)
    s_tsr = score_tsr_expected(tsr_expected)
    s_div = score_dividend_q(dividend_yield)
    s_fun = score_fundamental_health(payout_ratio, debt_to_equity, roe, roic, fcf_yield)
    breakdown = {"beta": round(s_beta), "max_drawdown": round(s_dd),
                 "sharpe": round(s_sharpe), "cagr": round(s_cagr),
                 "crescimento_5a": round(s_gro), "tsr_esperado": round(s_tsr),
                 "dividendos": round(s_div), "fundamentos": round(s_fun)}
    # Pesos ajustados (gestor sênior): menos retrovisor, mais forward/solidez.
    q = (s_beta*0.10 + s_dd*0.15 + s_sharpe*0.10 + s_cagr*0.08
         + s_gro*0.11 + s_tsr*0.16 + s_div*0.14 + s_fun*0.16)
    return round(_clamp(q), 1), breakdown


def compute_momentum(slow_stoch_weekly=None, discount_from_top=None,
                     reversal_confirmation=None, distance_ma200=None):
    """Momento de entrada (0-100): Stoch LENTO semanal (principal) + desconto×reversão + MM200."""
    s_stoch = score_slow_stoch_weekly(slow_stoch_weekly)
    s_disc = score_discount_from_top(discount_from_top, reversal_confirmation)
    s_ma = score_distance_ma200(distance_ma200)
    breakdown = {"stoch_lento_semanal": round(s_stoch),
                 "desconto_x_reversao": round(s_disc),
                 "distancia_ma200": round(s_ma)}
    # Stoch não decide sozinho metade; desconto×reversão (anti-faca) sobe.
    m = s_stoch*0.40 + s_disc*0.35 + s_ma*0.25
    return round(_clamp(m), 1), breakdown


def aporte_verdict(momentum: float, quality: float) -> str:
    """
    Veredito de ENTRADA — combina momento E qualidade (anti-faca).
    Nada exclui (todos rankeiam), mas 'COMPRAR FORTE' exige qualidade decente:
    descontado + qualidade fraca = ESPECULATIVO (provável faca caindo), não compra forte.
    """
    if momentum >= 70:
        if quality >= 62:
            return "COMPRAR FORTE"
        if quality >= 45:
            return "COMPRAR"
        return "ESPECULATIVO"      # muito descontado, mas qualidade fraca = faca
    if momentum >= 55:
        if quality >= 50:
            return "COMPRAR"
        return "ESPECULATIVO"
    if momentum >= 42:
        return "JUSTO"             # boa empresa, hora mediana — aguardar entrada melhor
    return "ESTICADO"              # sem desconto agora (NÃO é exclusão)


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
