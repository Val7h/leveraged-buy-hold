"""
Market State Detector — classifica o mercado como TOPO, NORMAL ou CAPITULAÇÃO
usando SPY (proxy do mercado americano) com RSI semanal, distância da MM200
e distância do topo das últimas 52 semanas.

Drives o multiplicador dinâmico de entrada:
  TOPO        → 2x  (valuations esticados, preservar pólvora)
  NORMAL      → 3x  (condição padrão da estratégia)
  CAPITULAÇÃO → 4x  (valuations comprimidos, máxima agressividade)
"""
import numpy as np
import pandas as pd
from typing import Dict, Optional

from app.quantitative.indicators import calculate_rsi, calculate_stochastic, _safe_float


# ─── Market State ────────────────────────────────────────────────────────────

def detect_market_state(df: pd.DataFrame) -> Dict:
    """
    df: daily OHLCV para o proxy de mercado (SPY).
    Retorna dict com state, multiplier, score, description, color, signals.
    """
    try:
        close = df["Close"].squeeze()

        # Weekly RSI (sinal primário)
        weekly = df.resample("W-FRI").agg({
            "Close": "last",
            "High":  "max",
            "Low":   "min",
        }).dropna()

        rsi_w: Optional[float] = None
        if len(weekly) >= 20:
            rsi_series = calculate_rsi(weekly["Close"], 14)
            rsi_w = _safe_float(rsi_series.iloc[-1])

        # Distância da MM200 diária
        ma200 = close.rolling(200).mean()
        ma200_val = float(ma200.iloc[-1])
        dist_ma200 = float((close.iloc[-1] / ma200_val - 1) * 100) if not np.isnan(ma200_val) else 0.0

        # Distância do topo das últimas 52 semanas
        high_52w = close.rolling(252).max()
        high_52w_val = float(high_52w.iloc[-1])
        dist_from_high = float((close.iloc[-1] / high_52w_val - 1) * 100) if not np.isnan(high_52w_val) else 0.0

        # ── Pontuação ────────────────────────────────────────────────────────
        score = 0

        # RSI semanal (–40 a +40)
        if rsi_w is not None:
            if rsi_w < 30:    score -= 40
            elif rsi_w < 40:  score -= 20
            elif rsi_w < 50:  score -=  5
            elif rsi_w < 60:  score +=  0
            elif rsi_w < 70:  score += 20
            else:             score += 40

        # Distância MM200 (–30 a +30)
        if dist_ma200 < -15:   score -= 30
        elif dist_ma200 < -8:  score -= 15
        elif dist_ma200 > 15:  score += 30
        elif dist_ma200 > 8:   score += 15

        # Distância topo 52s (–20 a +20)
        if dist_from_high < -25:   score -= 20
        elif dist_from_high < -15: score -= 10
        elif dist_from_high > -3:  score += 20
        elif dist_from_high > -8:  score += 10

        # ── Classificação ────────────────────────────────────────────────────
        if score <= -35:
            state       = "CAPITULAÇÃO"
            multiplier  = 4
            description = "Valuations comprimidos — máxima agressividade permitida"
            color       = "green"
        elif score >= 35:
            state       = "TOPO"
            multiplier  = 2
            description = "Valuations esticados — preservar pólvora, max 2x"
            color       = "red"
        else:
            state       = "NORMAL"
            multiplier  = 3
            description = "Condição padrão da estratégia"
            color       = "yellow"

        return {
            "state":       state,
            "multiplier":  multiplier,
            "score":       round(score, 1),
            "description": description,
            "color":       color,
            "signals": {
                "rsi_semanal_spy":       round(rsi_w, 1) if rsi_w is not None else None,
                "distancia_ma200_pct":   round(dist_ma200, 2),
                "distancia_topo_52s_pct": round(dist_from_high, 2),
            },
        }

    except Exception:
        return _default_state()


def _default_state() -> Dict:
    return {
        "state":       "NORMAL",
        "multiplier":  3,
        "score":       0,
        "description": "Sem dados suficientes — usando condição padrão",
        "color":       "yellow",
        "signals": {
            "rsi_semanal_spy":        None,
            "distancia_ma200_pct":    None,
            "distancia_topo_52s_pct": None,
        },
    }


# ─── Entry Signal ─────────────────────────────────────────────────────────────

def compute_entry_signal(
    rsi_weekly: Optional[float],
    dist_ma200: Optional[float],
    market_multiplier: int = 3,
) -> Dict:
    """
    Dado RSI semanal do ativo + distância da MM200 + multiplicador do estado
    de mercado, retorna:
      - signal:          ENTRAR FORTE / ENTRAR / AGUARDAR / EVITAR
      - signal_color:    green / yellow / red
      - entry_leverage:  leverage sugerida para entrada
      - rationale:       explicação em português
    """
    if rsi_weekly is None:
        return {
            "signal":         "SEM DADOS",
            "signal_color":   "gray",
            "entry_leverage": float(market_multiplier),
            "rationale":      "RSI semanal indisponível — usando multiplicador de mercado",
        }

    # ── Limiar único de entrada: RSI semanal ≤ 38 ────────────────────────────
    # RSI ≤ 25: capitulação do ativo, sinal mais forte (mesmo threshold, mais convicção)
    # RSI ≤ 38: entrada confirmada
    # RSI ≤ 65: aguardar recuo
    # RSI > 65: sobrecomprado, evitar
    if rsi_weekly <= 25:
        signal    = "ENTRAR FORTE"
        color     = "green"
        rationale = f"RSI semanal {rsi_weekly:.1f} — capitulação do ativo (< 25), entrada forte"
    elif rsi_weekly <= 38:
        signal    = "ENTRAR"
        color     = "green"
        rationale = f"RSI semanal {rsi_weekly:.1f} — abaixo do limiar de entrada (≤ 38)"
    elif rsi_weekly <= 65:
        signal    = "AGUARDAR"
        color     = "yellow"
        rationale = f"RSI semanal {rsi_weekly:.1f} — aguardar recuo para ≤ 38"
    else:
        signal    = "EVITAR"
        color     = "red"
        rationale = f"RSI semanal {rsi_weekly:.1f} — sobrecomprado, evitar entrada"

    # ── Alavancagem: exatamente o multiplicador de mercado quando entrando ────
    # Não há modificador — o estado do mercado já definiu o multiplicador correto
    if signal in ("ENTRAR FORTE", "ENTRAR"):
        entry_leverage = float(market_multiplier)
        # Aviso extra quando mercado está em topo
        if market_multiplier == 2:
            signal    = "ENTRAR (mercado em topo)"
            color     = "yellow"
            rationale += " | mercado em topo — máximo 2x"
    else:
        entry_leverage = 1.0

    return {
        "signal":         signal,
        "signal_color":   color,
        "entry_leverage": round(entry_leverage, 1),
        "rationale":      rationale,
    }
