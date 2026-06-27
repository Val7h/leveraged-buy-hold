"""
Risk/return comparison for multiple leveraged assets (survival-first).

For each ticker: simulates a simple fixed-leverage Buy & Hold from the start of the
period and computes risk/return metrics.

Key details (doutrina LBH):
  * Margin call uses intraday LOW (consistent with the main backtest engine), not
    the closing price — making the simulation realistic.
  * Carry ZERO (Quantfury): NÃO se debita juro de empréstimo. O custo do leverage
    aparece apenas no risco de liquidação, não num débito de carrego.
  * Ranking é por CALMAR (CAGR / |MaxDD|), a métrica nativa do alavancado — não por
    Sharpe. Sharpe é quase invariante à alavancagem e pune mal a cauda; fica como
    coluna informativa. Sortino (downside deviation) entra como desempate composto.
  * "Margin buffer" = mínimo histórico de (low − liq_price)/liq_price: quão perto o
    ativo CHEGOU da liquidação. É o sinal de cauda survival-first que o Sharpe esconde.
  * "Max leverage survivable" = maior leverage (busca binária) em que o ativo NÃO é
    liquidado no período — output doutrinariamente matador.
"""
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


def _survives_leverage(close_vals: List[float], low_vals: List[float],
                       capital: float, leverage: float) -> bool:
    """True se um B&H fixo nesse leverage NÃO é liquidado (margin call por LOW)."""
    if leverage <= 1.0:
        return True  # sem empréstimo => sem liquidação possível
    price0   = close_vals[0]
    if price0 <= 0:
        return True
    borrowed = capital * (leverage - 1)
    shares   = (capital * leverage) / price0
    liq_price = borrowed / shares if shares > 0 and borrowed > 0 else 0.0
    if liq_price <= 0:
        return True
    for daily_low in low_vals:
        if daily_low <= liq_price:
            return False
    return True


def _max_leverage_survivable(close_vals: List[float], low_vals: List[float],
                             capital: float, lev_cap: float = 20.0) -> float:
    """
    Busca binária pelo maior leverage que sobrevive ao período inteiro.
    Retorna 1 casa decimal. Barato: cada avaliação é um único loop sobre LOW.
    """
    if not _survives_leverage(close_vals, low_vals, capital, 1.5):
        # nem 1.5x sobrevive: devolve o piso 1.0 (B&H sem alavanca sempre sobrevive)
        lo, hi = 1.0, 1.5
    elif _survives_leverage(close_vals, low_vals, capital, lev_cap):
        return round(lev_cap, 1)
    else:
        lo, hi = 1.5, lev_cap
    # 18 iterações => precisão << 0.1
    for _ in range(18):
        mid = (lo + hi) / 2
        if _survives_leverage(close_vals, low_vals, capital, mid):
            lo = mid
        else:
            hi = mid
    return round(lo, 1)


def _simulate_leveraged_hold(
    ticker: str,
    df: pd.DataFrame,
    benchmark_df: Optional[pd.DataFrame],
    capital: float,
    leverage: float,
    risk_free: float,
) -> Dict:
    """
    Simulate a single fixed-leverage B&H and return performance metrics.
    Margin call detection uses intraday LOW price (not close). Carry = ZERO.
    """
    try:
        close = df["Close"].squeeze()
        low   = df["Low"].squeeze() if "Low" in df.columns else close * 0.995

        price0   = float(close.iloc[0])
        borrowed = capital * (leverage - 1)
        shares   = (capital * leverage) / price0
        liq_price = borrowed / shares if shares > 0 and borrowed > 0 else 0.0

        equity_vals    = []
        margin_called  = False
        margin_call_date = None

        close_vals = [float(x) for x in close.values.tolist()]
        low_vals   = [float(x) for x in low.values.tolist()]
        dates      = close.index.tolist()

        # ── Margin buffer: quão perto o LOW chegou do liq_price ─────────────
        # (low - liq_price) / liq_price ; mínimo histórico ATÉ a liquidação.
        # Quanto menor (mais perto de 0 ou negativo), mais perigoso.
        margin_buffer = None  # None quando não há empréstimo (leverage <= 1)

        for i in range(len(dates)):
            price     = float(close_vals[i])
            daily_low = float(low_vals[i]) if i < len(low_vals) else price * 0.99

            if liq_price > 0:
                buf = (daily_low - liq_price) / liq_price
                if margin_buffer is None or buf < margin_buffer:
                    margin_buffer = buf

            # ── Margin call: uses intraday LOW ─────────────────────────────────
            if not margin_called and liq_price > 0 and daily_low <= liq_price:
                margin_called    = True
                margin_call_date = str(dates[i])[:10]
                shares  = 0.0
                borrowed = 0.0
                # buffer já capturou o ponto de liquidação (buf <= 0); para aqui.
                break

            net = max(0.0, shares * price - borrowed)
            equity_vals.append(net)

        # se quebrou: registra o equity zerado do dia da liquidação em diante
        if margin_called:
            equity_vals.append(0.0)
            for _ in range(i + 1, len(dates)):
                equity_vals.append(0.0)

        # ── Metrics ──────────────────────────────────────────────────────────
        eq    = pd.Series(equity_vals, index=close.index[:len(equity_vals)])
        years = len(close) / 252
        final = equity_vals[-1] if equity_vals else 0.0

        if margin_called:
            total_ret = -100.0
            ann_ret   = -100.0
        else:
            total_ret = (final / capital - 1) * 100 if capital > 0 else 0.0
            ann_ret   = ((final / capital) ** (1 / years) - 1) * 100 if years > 0 and capital > 0 else 0.0

        daily_rets = eq.pct_change().dropna()
        ann_vol    = float(daily_rets.std() * (252 ** 0.5) * 100) if len(daily_rets) > 1 else 0.0

        # Sharpe ratio (carry zero — rf entra só como referência da TLR)
        rf_daily   = risk_free / 252
        excess     = daily_rets - rf_daily
        sharpe_val = float(excess.mean() / excess.std() * (252 ** 0.5)) if excess.std() > 0 else 0.0

        # Sortino ratio: penaliza só o downside (retornos abaixo da TLR diária)
        downside        = excess[excess < 0]
        downside_dev    = float(np.sqrt((downside ** 2).mean())) if len(downside) > 0 else 0.0
        if margin_called:
            sortino_val = -99.0
        elif downside_dev > 0:
            sortino_val = float(excess.mean() / downside_dev * (252 ** 0.5))
        else:
            sortino_val = 0.0

        # Max drawdown
        roll_max = eq.cummax().replace(0, 1e-10)
        max_dd   = float(((eq - roll_max) / roll_max).min() * 100) if len(eq) > 1 else 0.0

        # Calmar ratio = CAGR / |MaxDD| — métrica NATIVA do alavancado.
        # MaxDD ~ 0: ativo sem drawdown é o MELHOR caso possível, não neutro.
        # Usa um piso de 0.01% no denominador e capa o resultado, preservando o
        # sinal do CAGR (DD nulo + CAGR>0 => Calmar muito alto; CAGR<=0 => <=0).
        if margin_called:
            calmar_val = -99.0
        else:
            dd_floor   = max(abs(max_dd), 0.01)  # |MaxDD| em %, piso 0.01%
            calmar_val = float(ann_ret / dd_floor)
            calmar_val = max(-99.0, min(calmar_val, 999.0))

        # Beta vs benchmark (SPY or equivalent)
        beta_val = 0.0
        if benchmark_df is not None:
            try:
                bench_close = benchmark_df["Close"].squeeze()
                aligned     = pd.concat([close, bench_close], axis=1, join="inner")
                aligned.columns = ["asset", "bench"]
                asset_rets  = aligned["asset"].pct_change().dropna()
                bench_rets  = aligned["bench"].pct_change().dropna()
                if len(asset_rets) > 30:
                    cov_val    = float(asset_rets.cov(bench_rets))
                    var_bench  = float(bench_rets.var())
                    beta_val   = cov_val / var_bench if var_bench > 0 else 0.0
            except Exception:
                beta_val = 0.0

        # Max leverage survivable (busca binária no LOW)
        max_lev = _max_leverage_survivable(close_vals, low_vals, capital)

        return {
            "ticker":              ticker,
            "retorno_total":       round(total_ret, 2),
            "retorno_anualizado":  round(ann_ret, 2),
            "volatilidade":        round(ann_vol, 2),
            "sharpe":              round(sharpe_val, 3),
            "sortino":             round(sortino_val, 3),
            "calmar":              round(calmar_val, 3),
            "max_drawdown":        round(max_dd, 2),
            "margin_buffer":       round(margin_buffer * 100, 2) if margin_buffer is not None else None,
            "max_leverage":        max_lev,
            "beta":                round(beta_val, 3),
            "final_equity":        round(final, 2),
            "margin_call":         margin_called,
            "margin_call_date":    margin_call_date,
        }

    except Exception as exc:
        logger.error(f"[SharpeCompare] Error simulating {ticker}: {exc}")
        return {
            "ticker":             ticker,
            "retorno_total":      0.0,
            "retorno_anualizado": 0.0,
            "volatilidade":       0.0,
            "sharpe":             0.0,
            "sortino":            0.0,
            "calmar":             0.0,
            "max_drawdown":       0.0,
            "margin_buffer":      None,
            "max_leverage":       1.0,
            "beta":               0.0,
            "final_equity":       0.0,
            "margin_call":        False,
            "margin_call_date":   None,
        }


def _rank_key(r: Dict):
    """
    Critério de ordenação dos SOBREVIVENTES (desc): rank composto Calmar+Sortino,
    com Calmar dominante (métrica nativa do alavancado) e Sortino como desempate
    de cauda. Maior = melhor.
    """
    return (r.get("calmar", 0.0), r.get("sortino", 0.0))


def run_sharpe_compare(
    price_data: Dict[str, pd.DataFrame],
    capital: float = 10_000.0,
    leverage: float = 3.0,
    risk_free: float = 0.05,
) -> List[Dict]:
    """
    Run leveraged hold simulation for all tickers and return sorted comparison.

    Sobreviventes ordenados por CALMAR (CAGR/|MaxDD|), desempate por Sortino — NÃO
    por Sharpe (que é quase invariante à alavancagem e pune mal a cauda). Liquidados
    vão para o fundo, ordenados por Calmar entre si. Carry ZERO.
    Parallelized with ThreadPoolExecutor(max_workers=8).
    """
    benchmark_df = price_data.get("SPY")
    tickers      = [t for t in price_data if t != "SPY"]

    results: List[Dict] = []

    def _task(ticker: str) -> Dict:
        return _simulate_leveraged_hold(
            ticker, price_data[ticker], benchmark_df, capital, leverage, risk_free
        )

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(_task, t): t for t in tickers}
        for fut in as_completed(futures):
            try:
                results.append(fut.result())
            except Exception as exc:
                ticker = futures[fut]
                logger.error(f"[SharpeCompare] Future failed for {ticker}: {exc}")

    survivors  = sorted([r for r in results if not r["margin_call"]], key=_rank_key, reverse=True)
    liquidated = sorted([r for r in results if r["margin_call"]],     key=_rank_key, reverse=True)

    return survivors + liquidated
