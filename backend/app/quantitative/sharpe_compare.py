"""
Sharpe Ratio comparison for multiple leveraged assets.

For each ticker: simulates a simple fixed-leverage Buy & Hold from the start of the
period and computes risk/return metrics.

Key detail: margin call uses intraday LOW (consistent with the main backtest engine),
not the closing price — making the simulation realistic.
"""
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


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
    Margin call detection uses intraday LOW price (not close).
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

        close_vals = close.values.tolist()
        low_vals   = low.values.tolist()
        dates      = close.index.tolist()

        for i in range(len(dates)):
            price     = float(close_vals[i])
            daily_low = float(low_vals[i]) if i < len(low_vals) else price * 0.99

            # ── Margin call: uses intraday LOW ─────────────────────────────────
            if not margin_called and liq_price > 0 and daily_low <= liq_price:
                margin_called    = True
                margin_call_date = str(dates[i])[:10]
                shares  = 0.0
                borrowed = 0.0

            net = max(0.0, shares * price - borrowed)
            equity_vals.append(net)

        # ── Metrics ──────────────────────────────────────────────────────────
        eq    = pd.Series(equity_vals, index=close.index)
        years = len(eq) / 252
        final = equity_vals[-1]

        if margin_called:
            # Once liquidated, equity steps to 0 and stays there. Computing
            # vol/Sharpe/drawdown over that step-to-zero series yields garbage,
            # so use sentinels representing a total loss instead.
            total_ret  = -100.0
            ann_ret    = -100.0
            ann_vol    = 0.0
            sharpe_val = -99.0   # worst possible — sorts liquidated names last
            max_dd     = -100.0
        else:
            total_ret = (final / capital - 1) * 100 if capital > 0 else 0.0
            ann_ret   = ((final / capital) ** (1 / years) - 1) * 100 if years > 0 and capital > 0 else 0.0

            daily_rets = eq.pct_change().dropna()
            ann_vol    = float(daily_rets.std() * (252 ** 0.5) * 100) if len(daily_rets) > 1 else 0.0

            # Sharpe ratio
            rf_daily   = risk_free / 252
            excess     = daily_rets - rf_daily
            sharpe_val = float(excess.mean() / excess.std() * (252 ** 0.5)) if excess.std() > 0 else 0.0

            # Max drawdown
            roll_max = eq.cummax().replace(0, 1e-10)
            max_dd   = float(((eq - roll_max) / roll_max).min() * 100)

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

        return {
            "ticker":              ticker,
            "retorno_total":       round(total_ret, 2),
            "retorno_anualizado":  round(ann_ret, 2),
            "volatilidade":        round(ann_vol, 2),
            "sharpe":              round(sharpe_val, 3),
            "max_drawdown":        round(max_dd, 2),
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
            "max_drawdown":       0.0,
            "beta":               0.0,
            "final_equity":       0.0,
            "margin_call":        False,
            "margin_call_date":   None,
        }


def run_sharpe_compare(
    price_data: Dict[str, pd.DataFrame],
    capital: float = 10_000.0,
    leverage: float = 3.0,
    risk_free: float = 0.05,
) -> List[Dict]:
    """
    Run leveraged hold simulation for all tickers and return sorted comparison.
    Survivors sorted by Sharpe (desc). Margin-called tickers at the bottom.
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

    survivors  = sorted([r for r in results if not r["margin_call"]], key=lambda x: x["sharpe"], reverse=True)
    # Liquidated names all share the -99 Sharpe sentinel, so rank them by how
    # long they survived (later margin-call date = less bad) instead.
    liquidated = sorted([r for r in results if r["margin_call"]],     key=lambda x: x.get("margin_call_date") or "", reverse=True)

    return survivors + liquidated
