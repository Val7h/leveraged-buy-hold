"""
Modelo de ACUMULAÇÃO CONTRACÍCLICA (Fase 1.5) — sinais de COMPRA e VENDA.
Estratégia ratificada com o investidor:
  - Comprar MUITO no fundo (ativos de qualidade descontados/em capitulação).
  - Alavancagem escala pela PROFUNDIDADE do desconto (fundo = mais), teto 3x.
  - Sobrevive a quedas de ~-65% do topo SEM stop apertado e SEM liquidar
    (pior caso ≈ -60% de drawdown de capital, tolerado).
  - VENDER (distribuir) quando recupera para o CARO/esticado.

A sacada: quanto mais fundo o ativo já caiu, MENOS ele ainda pode cair até o
piso histórico (~-65%), então mais alavancagem é segura ali.
"""
from typing import Dict, Optional

# Parâmetros do meio-termo (escolha do investidor)
FLOOR_PCT = 65.0          # piso histórico assumido p/ ativo de qualidade (% abaixo do topo)
DD_TOLERANCE = 60.0       # drawdown de capital tolerado em grande crise (%)
LEV_CAP = 3.0             # teto de alavancagem (abre mão do 4x p/ sobreviver)


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def depth_leverage(
    discount_from_ath: Optional[float],
    floor: float = FLOOR_PCT,
    dd_tol: float = DD_TOLERANCE,
    cap: float = LEV_CAP,
) -> float:
    """
    Alavancagem segura pela profundidade da compra.
    discount_from_ath: quanto o ativo está abaixo do topo (positivo, ex: 50).
    Lógica: do ponto de compra até o piso (floor), quanto o preço ainda pode cair?
            leverage × essa_queda ≈ DD tolerado  →  leverage = dd_tol / queda_restante.
    """
    d = discount_from_ath or 0.0
    if d >= floor:
        return cap  # já está no piso ou abaixo → downside mínimo → teto
    # queda restante do preço, em % do preço de entrada, até o piso
    further = (floor - d) / (100.0 - d) * 100.0
    if further <= 0:
        return cap
    lev = dd_tol / further
    return round(_clamp(lev, 1.0, cap), 2)


def cycle_zone(
    discount_from_ath: Optional[float],
    distance_ma200: Optional[float],
    rsi: Optional[float],
) -> str:
    """Classifica a posição no ciclo: BARATO / JUSTO / CARO / EXTREMO_CARO."""
    d = discount_from_ath if discount_from_ath is not None else 0.0
    dma = distance_ma200
    r = rsi

    # EXTREMO_CARO: recuperou tudo + muito esticado + euforia
    if d <= 3 and ((dma is not None and dma >= 30) or (r is not None and r >= 78)):
        return "EXTREMO_CARO"
    # CARO: perto do topo e esticado
    if d <= 6 and (dma is not None and dma >= 15) and (r is None or r >= 62):
        return "CARO"
    # BARATO: descontado o suficiente para começar a acumular
    if d >= 15:
        return "BARATO"
    return "JUSTO"


def cycle_signal(
    discount_from_ath: Optional[float],
    distance_ma200: Optional[float],
    rsi: Optional[float],
    quality_eligible: bool,
    market_regime: str = "NEUTRO",
) -> Dict:
    """
    Sinal completo de COMPRA/VENDA/SEGURAR com alavancagem-alvo.
      BARATO    → COMPRAR, alavancagem pela profundidade (capitulação empurra mais)
      CARO      → VENDER (distribuir parcial), tira alavancagem
      EXTREMO   → VENDER mais (vai a caixa/baixa exposição)
      JUSTO     → SEGURAR unlevered
      sem qual. → EVITAR
    """
    zone = cycle_zone(discount_from_ath, distance_ma200, rsi)

    if not quality_eligible:
        return {"action": "EVITAR", "zone": zone, "target_leverage": 0.0,
                "reason": "qualidade abaixo do portão"}

    if zone == "BARATO":
        lev = depth_leverage(discount_from_ath)
        # capitulação de mercado dá um empurrão (compra mais forte o pânico geral)
        if market_regime == "CAPITULACAO":
            lev = round(min(LEV_CAP, lev + 0.3), 2)
        return {"action": "COMPRAR", "zone": zone, "target_leverage": lev,
                "reason": f"descontado -{(discount_from_ath or 0):.0f}% → acumular {lev}x"}

    if zone == "EXTREMO_CARO":
        # NUNCA vai a caixa (sentar em caixa perde pro B&H) — só trima um pouco
        return {"action": "VENDER", "zone": zone, "target_leverage": 0.85,
                "reason": "muito esticado/euforia → trim parcial, trava ganho"}

    if zone == "CARO":
        # apenas TIRA a alavancagem (vende o excesso alavancado), mantém o núcleo
        return {"action": "REDUZIR", "zone": zone, "target_leverage": 1.0,
                "reason": "caro/esticado → desalavancar p/ núcleo (1x)"}

    return {"action": "SEGURAR", "zone": zone, "target_leverage": 1.0,
            "reason": "zona justa → segurar o núcleo (1x)"}
