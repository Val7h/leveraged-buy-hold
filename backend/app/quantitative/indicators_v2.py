"""
Indicadores novos exigidos pelo Scoring V2 (FASE 1: ações).
Todos recebem uma série/df de preços e retornam números puros, com defesa total
contra dados faltantes (nunca levantam exceção — retornam None em caso de dúvida).

  - recovery_days_from_max_dd : tempo para recuperar do pior drawdown
  - annual_return_std         : dispersão dos retornos anuais (consistência)
  - distance_from_ath         : % abaixo do topo histórico
  - distance_from_52w_high    : % abaixo da máxima de 52 semanas
  - reversal_confirmation     : 0-1, "a faca parou de cair?" (anti-faca-caindo)
"""
from typing import Optional
import numpy as np
import pandas as pd


def _series(close) -> Optional[pd.Series]:
    try:
        s = pd.Series(close).dropna()
        s = s.astype(float)
        return s if len(s) >= 30 else None
    except Exception:
        return None


def recovery_days_from_max_dd(close) -> Optional[float]:
    """
    Dias entre o fundo do maior drawdown e a recuperação do topo anterior.
    Retorna None se nunca recuperou (ainda abaixo do topo pré-queda).
    Assume índice diário (aproxima dias por número de barras).
    """
    s = _series(close)
    if s is None:
        return None
    try:
        running_max = s.cummax()
        drawdown = (s - running_max) / running_max
        trough_idx = int(np.argmin(drawdown.values))
        peak_value = float(running_max.iloc[trough_idx])
        # procura, após o fundo, a primeira barra que volta ao topo anterior
        after = s.iloc[trough_idx:]
        recovered = after[after >= peak_value]
        if len(recovered) == 0:
            return None
        first_recovery_pos = int(np.where(after.values >= peak_value)[0][0])
        return float(first_recovery_pos)  # nº de barras ≈ dias de pregão
    except Exception:
        return None


def annual_return_std(close) -> Optional[float]:
    """Desvio-padrão dos retornos anuais, em %. Menor = mais consistente."""
    s = _series(close)
    if s is None:
        return None
    try:
        idx = pd.to_datetime(pd.Series(s.index))
        if idx.notna().all():
            tmp = pd.Series(s.values, index=idx)
            yearly = tmp.resample("YE").last() if hasattr(tmp, "resample") else None
        else:
            yearly = None
        if yearly is None or len(yearly.dropna()) < 2:
            # fallback: divide em blocos de ~252 barras
            vals = s.values
            blocks = [vals[i:i + 252] for i in range(0, len(vals), 252)]
            rets = [(b[-1] / b[0] - 1) * 100 for b in blocks if len(b) > 1 and b[0] != 0]
        else:
            yv = yearly.dropna().values
            rets = [(yv[i] / yv[i - 1] - 1) * 100 for i in range(1, len(yv)) if yv[i - 1] != 0]
        if len(rets) < 2:
            return None
        return float(np.std(rets))
    except Exception:
        return None


def distance_from_ath(close) -> Optional[float]:
    """% abaixo do topo histórico (positivo). Ex: 45 = -45% do topo."""
    s = _series(close)
    if s is None:
        return None
    try:
        ath = float(s.max())
        cur = float(s.iloc[-1])
        if ath <= 0:
            return None
        return float((ath - cur) / ath * 100)
    except Exception:
        return None


def distance_from_52w_high(close) -> Optional[float]:
    """% abaixo da máxima de 52 semanas (~252 barras)."""
    s = _series(close)
    if s is None:
        return None
    try:
        window = s.iloc[-252:] if len(s) >= 252 else s
        hi = float(window.max())
        cur = float(s.iloc[-1])
        if hi <= 0:
            return None
        return float((hi - cur) / hi * 100)
    except Exception:
        return None


def reversal_confirmation(close) -> Optional[float]:
    """
    "A faca parou de cair?" — 0 a 1. Combina sinais de reversão:
      - Higher low (fundo recente mais alto que o anterior)         0.30
      - Inclinação da MM200 deixou de cair                          0.25
      - Preço recuperou a MM50                                      0.20
      - Fechamento recente acima da máxima das últimas ~20 barras   0.25
    Preço ainda fazendo fundos mais baixos → perto de 0 (é faca).
    """
    s = _series(close)
    if s is None or len(s) < 60:
        return None
    try:
        vals = s.values
        score = 0.0

        # 1) Higher low: mínimo das últimas 20 barras > mínimo das 20 anteriores
        recent_low = float(np.min(vals[-20:]))
        prior_low = float(np.min(vals[-40:-20])) if len(vals) >= 40 else recent_low
        if recent_low > prior_low:
            score += 0.30

        # 2) MM200 deixou de cair (inclinação atual >= de 10 barras atrás)
        if len(vals) >= 210:
            ma200 = pd.Series(vals).rolling(200).mean().values
            if not np.isnan(ma200[-1]) and not np.isnan(ma200[-11]):
                slope_now = ma200[-1] - ma200[-11]
                if slope_now >= 0:
                    score += 0.25

        # 3) Preço acima da MM50
        if len(vals) >= 50:
            ma50 = float(np.mean(vals[-50:]))
            if vals[-1] > ma50:
                score += 0.20

        # 4) Fechamento acima da máxima das últimas ~20 barras (excluindo a atual)
        if len(vals) >= 21:
            prior_window_high = float(np.max(vals[-21:-1]))
            if vals[-1] >= prior_window_high:
                score += 0.25

        return float(max(0.0, min(1.0, score)))
    except Exception:
        return None
