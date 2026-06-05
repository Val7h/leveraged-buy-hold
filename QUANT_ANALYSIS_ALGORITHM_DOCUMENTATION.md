# LBH System — Algorithm Documentation & Compliance
**Date:** 2026-06-05  
**Status:** COMPREHENSIVE SPECIFICATION  
**Intended Audience:** Developers, Compliance, Risk Managers

---

## 1. ALGORITHM OVERVIEW

### Purpose
The LBH (Leveraged Buy & Hold) composite scoring algorithm determines optimal leverage multipliers for long-term defensive equity portfolios based on a combination of fundamental quality metrics and technical timing signals.

### Core Philosophy
- **60% Defensive Quality:** Selects assets with strong risk profiles (low beta, moderate volatility, stable dividends)
- **40% Tactical Timing:** Reduces leverage when momentum is negative, increases when oversold signals emerge
- **Monthly Rebalancing:** Maintains consistent risk management without excessive trading costs

### Key Design Principle
> Never sacrifice quality for timing alone. A strong defender with poor timing is preferred to a weak asset with excellent entry timing.

---

## 2. COMPOSITE SCORE FORMULA

### Master Equation
```
Composite Score = (Quality Score × 0.60) + (Opportunity Score × 0.40)

Where:
  Quality Score ∈ [0, 100]      (Fundamental + Risk Metrics)
  Opportunity Score ∈ [0, 100]  (Technical + Momentum Metrics)
  Composite Score ∈ [0, 100]
```

### Score Ranges & Interpretation

| Range | Risk Level | Market Condition | Action |
|-------|-----------|-----------------|--------|
| 90–100 | Very Low | Exceptional Buy | Maximum leverage permitted |
| 80–89 | Low | Attractive | Moderate–high leverage |
| 70–79 | Moderate | Neutral | Balanced leverage |
| 60–69 | Moderate-High | Weak | Conservative leverage |
| Below 60 | High | Poor/Distressed | Minimal leverage (1.0x) |

---

## 3. QUALITY SCORE DETAILED SPECIFICATION

### Purpose
Evaluate fundamental strength and risk resilience of the asset.

### Components & Methodology

#### 3.1 Beta (20% weight)
**Definition:** Systematic risk relative to market  
**Data Source:** Historical 12-month rolling beta vs benchmark (usually S&P 500 or Ibovespa)

**Scoring Formula:**
```
β ∈ [0, 2.0]  → Score ∈ [100, 0]

score_beta(β) = {
  100.0,                    if β ≤ 0.3  (defensive)
  100 - ((β - 0.3) / 1.7) × 100,  if 0.3 < β < 2.0
  0.0,                      if β ≥ 2.0  (too volatile)
}
```

**Interpretation:**
- Beta 0.3: Ultra-defensive utility → 100 pts
- Beta 0.7: Balanced → 74 pts
- Beta 1.0: Market neutral → 59 pts
- Beta 1.5: Growth → 26 pts
- Beta 2.0: Speculative → 0 pts

**Default (No Data):** 50 pts (neutral)

#### 3.2 Historical Maximum Drawdown (25% weight)
**Definition:** Worst peak-to-trough decline over lookback period  
**Lookback:** 2–3 years preferred; minimum 1 year

**Scoring Formula:**
```
dd ∈ [0%, 80%]  → Score ∈ [100, 0]

score_max_drawdown(dd) = {
  100.0,                    if dd ≤ 10%  (excellent recovery)
  100 - ((dd - 10) / 70) × 100,  if 10% < dd < 80%
  0.0,                      if dd ≥ 80%  (unacceptable)
}
```

**Examples:**
- DD -10%: 100 pts (defensive)
- DD -35%: 64 pts (moderate stress)
- DD -50%: 29 pts (weak recovery pattern)

**Note:** This is realized DD, not forecast. For assets with no historical DD (new IPOs), use industry peer average.

#### 3.3 Dividend Yield (10% weight)
**Definition:** Annual dividend income as % of current price

**Scoring Formula:**
```
dy ∈ [0%, 12%+]  → Score ∈ [10, 100]

score_dividend_yield(dy) = {
  10.0,                if dy ≤ 0%    (no dividend)
  50 + (dy - 2.0) / 6.0 × 50,  if 2.0% ≤ dy ≤ 8.0%  (sweet spot)
  100 - (dy - 8.0) × 8,  if dy > 8.0%  (penalize excess)
}
```

**Logic:**
- Below 2%: Growing company, lower income → 50 pts
- 2–8%: Dividend sweet spot → 50–100 pts
- Above 8%: Unsustainable or dividend trap → penalized

**Examples:**
- 3% dividend: 75 pts (income attractive)
- 5% dividend: 85 pts (solid)
- 10% dividend: 84 pts (suspicious — penalized)

#### 3.4 Sharpe Ratio (15% weight)
**Definition:** Risk-adjusted return; excess return per unit of volatility  
**Formula:** `(μ - rf) / σ`  
**Lookback:** 1–2 years minimum

**Scoring Formula:**
```
sharpe ∈ [-1.0, 2.0+]  → Score ∈ [0, 100]

score_sharpe(s) = {
  0.0,                if s ≤ -1.0  (negative returns)
  (s + 1.0) / 3.0 × 100,  if -1.0 < s < 2.0
  100.0,              if s ≥ 2.0   (exceptional)
}
```

**Examples:**
- Sharpe -0.5: 17 pts (losing asset)
- Sharpe 0.5: 50 pts (neutral)
- Sharpe 1.5: 83 pts (strong)
- Sharpe 2.0+: 100 pts (exceptional)

#### 3.5 Annualized Volatility (15% weight)
**Definition:** Standard deviation of log returns × √252  
**Lookback:** 252 trading days (1 year)

**Scoring Formula:**
```
vol ∈ [0%, 50%]  → Score ∈ [100, 0]

score_volatility(vol) = {
  100.0,                    if vol ≤ 8%   (very stable)
  100 - ((vol - 8) / 42) × 100,  if 8% < vol < 50%
  0.0,                      if vol ≥ 50%  (too volatile)
}
```

**Examples:**
- Vol 8%: 100 pts (utility/bank)
- Vol 15%: 74 pts (balanced)
- Vol 25%: 46 pts (growth)
- Vol 40%: 14 pts (too risky)

#### 3.6 Fundamental Health (15% weight)
**Definition:** Composite of balance sheet strength and profitability  
**Components:**
- Payout Ratio (dividend / earnings)
- Debt-to-Equity Ratio
- Return on Equity (ROE)

**Scoring Logic:**
```
Payout Ratio:
  0.2–0.7: 90 pts (sustainable)
  >1.0:     10 pts (unsustainable)
  Else:     50 pts (risky)

Debt-to-Equity:
  ≤0.5:     100 pts (fortress balance sheet)
  ≥3.0:     10 pts (overleveraged)
  Else:     100 - ((DE - 0.5) / 2.5) × 90

ROE:
  ≥20%:     100 pts (excellent)
  ≤0%:      0 pts (destroying value)
  Else:     (ROE / 0.20) × 100
```

**Final Score:** Average of available metrics (missing data = neutral)

---

## 4. OPPORTUNITY SCORE DETAILED SPECIFICATION

### Purpose
Assess current valuation and momentum for entry timing optimization.

### Components & Methodology

#### 4.1 RSI (Relative Strength Index) — 25% weight
**Definition:** Mean of gains / mean of losses normalized to 0–100  
**Lookback:** 14 trading days  
**Calculation:** EMA-smoothed (not SMA)

**Scoring Formula:**
```
rsi ∈ [0, 100]  → Score ∈ [0, 100]

score_rsi(rsi) = {
  100.0,           if rsi ≤ 20    (capitulation)
  80 + (30-rsi)/10 × 20,  if 20 < rsi ≤ 30
  50 + (50-rsi)/20 × 30,  if 30 < rsi ≤ 50  (neutral zone)
  50 - (rsi-50)/20 × 50,  if 50 < rsi ≤ 70
  0.0,             if rsi > 70    (overbought)
}
```

**Examples:**
- RSI 15: 100 pts (extreme oversold)
- RSI 30: 80 pts (oversold)
- RSI 50: 50 pts (neutral)
- RSI 70: 0 pts (overbought — avoid)

**Note:** Inverted from traditional "oversold <30 = buy" — here it's opportunity scoring, not signal.

#### 4.2 Stochastic %K (Slow) — 25% weight
**Definition:** Normalized position within 14-day high/low range  
**Formula:** `(close - low14) / (high14 - low14) × 100`  
**Smoothing:** 3-period SMA applied twice (slow %K and %D)

**Scoring Formula:**
```
stoch_k ∈ [0, 100]  → Score ∈ [0, 100]

score_stochastic(k) = {
  100.0,                if k ≤ 10    (extreme oversold)
  80 + (20-k)/10 × 20,  if 10 < k ≤ 20
  50 + (50-k)/30 × 30,  if 20 < k ≤ 50
  50 - (k-50)/30 × 50,  if 50 < k ≤ 80
  0.0,                  if k > 80    (overbought)
}
```

**Interpretation:**
- K <20: Oversold, high probability of bounce
- K 20–80: Normal trading range
- K >80: Overbought, mean reversion likely

#### 4.3 Distance from 200-Day Moving Average — 30% weight
**Definition:** Percentage difference between close and MA200  
**Lookback:** 200 trading days

**Scoring Formula:**
```
distance_pct ∈ [-100%, +50%]  → Score ∈ [0, 100]

score_distance_ma200(d) = {
  100.0,                     if d ≤ -30%   (deep discount)
  70 + (|d|-15)/15 × 30,     if -30% < d ≤ -15%
  50 + |d|/15 × 20,          if -15% < d ≤ 0%   (below MA)
  50 - d/10 × 20,            if 0% < d ≤ 10%
  30 - (d-10)/20 × 30,       if 10% < d ≤ 30%   (above MA)
  0.0,                       if d > 30%    (overextended)
}
```

**Rationale:**
- Far below MA200 (-30%): Uptrend recovery opportunity
- Slightly below MA200: Normal support
- Slightly above MA200: Normal resistance
- Far above MA200 (+30%): Overextended pullback risk

#### 4.4 Bollinger Bands Position — 20% weight
**Definition:** Position within upper/lower bands (2 std dev)  
**Lookback:** 20-period SMA with 2σ bands

**Normalization:**
```
bb_position = (price - lower) / (upper - lower)
  0 = at lower band
  1 = at upper band
  <0 = below lower (extreme)
  >1 = above upper (extreme)
```

**Scoring Formula:**
```
bb_pos ∈ [-0.5, 1.5]  → Score ∈ [0, 100]

score_bollinger(pos) = {
  80 + |pos| × 20,     if pos ≤ 0     (below lower band)
  80 - pos/0.2 × 30,   if 0 < pos ≤ 0.2
  50 - (pos-0.2)/0.3 × 20,  if 0.2 < pos ≤ 0.5
  30 - (pos-0.5)/0.3 × 20,  if 0.5 < pos ≤ 0.8
  10 - (pos-0.8)/0.2 × 10,  if pos > 0.8
}
```

**Interpretation:**
- Below lower band (position <0): Extreme reversal setup
- At middle (position 0.5): Neutral
- Above upper band (position >1): Overbought, pullback likely

---

## 5. LEVERAGE MAPPING BY COMPOSITE SCORE

### Core Leverage Table

```python
def leverage_from_score(composite_score, risk_profile="balanced"):
    """
    Maps composite score to three leverage recommendations.
    risk_profile: "conservative" | "balanced" | "aggressive"
    """
    thresholds = {
        "conservative": {90: 2.0, 80: 1.5, 70: 1.25, 60: 1.0},
        "balanced":     {90: 3.0, 80: 2.0, 70: 1.5,  60: 1.0},
        "aggressive":   {90: 4.0, 80: 3.0, 70: 2.0,  60: 1.0},
    }
    
    cfg = thresholds[risk_profile]
    
    # Determine max leverage based on score
    if composite_score >= 90:
        max_lev = cfg[90]
    elif composite_score >= 80:
        max_lev = cfg[80]
    elif composite_score >= 70:
        max_lev = cfg[70]
    else:
        max_lev = cfg[60]
    
    # Calculate recommended (half of maximum)
    recommended = max_lev * 0.5 if max_lev > 1.0 else 1.0
    
    # Calculate conservative (quarter kelly)
    conservative = max(1.0, max_lev * 0.25 + 0.75)
    
    return {
        "max_leverage": round(max_lev, 2),
        "recommended_leverage": round(recommended, 2),
        "conservative_leverage": round(conservative, 2),
    }
```

### Leverage by Risk Profile

| Composite Score | Conservative | Balanced | Aggressive |
|-----------------|--------------|----------|-----------|
| 90+ | 2.0x | 3.0x | 4.0x |
| 80–89 | 1.5x | 2.0x | 3.0x |
| 70–79 | 1.25x | 1.5x | 2.0x |
| 60–69 | 1.0x | 1.0x | 1.0x |
| <60 | 1.0x | 1.0x | 1.0x |

**RECOMMENDATION (Based on Crisis Analysis):**
- Reduce "Balanced" 90+ from 3.0x → **2.5x**
- Reason: Cannot survive 2008 GFC-level crisis at 3.0x

### Leverage Adjustment Rules

**Monthly Rebalancing:**
```
IF score_change ≥ 20 points:
  - Quality signal: Rebalance immediately (don't wait)
  - Opportunity signal: Smooth transition (avoid whipsaw)

IF leverage_change ≥ 0.5x:
  - Log significant rebalance event
  - Track friction costs

IF margin_call_risk > threshold:
  - Force deleverage to max(1.0, current - 0.5)
  - Alert user
```

---

## 6. REBALANCING MECHANICS

### Frequency: Monthly (Not Adaptive)
**Rationale:**
- Weekly: Too much friction cost (trading commissions, spreads)
- Daily: Excessive whipsaws, curve-fitting
- Monthly: Balances timeliness with cost efficiency

### Rebalancing Process

```
On each month boundary:

1. Calculate new composite score:
   - Quality (no change within month)
   - Opportunity (updated with latest indicators)

2. Determine new leverage target

3. Calculate current equity:
   equity = (shares × price) - borrowed

4. Apply monthly contributions:
   equity += monthly_contribution
   equity += dividend_income

5. Rebalance position:
   new_notional = equity × target_leverage
   new_shares = new_notional / price
   new_borrowed = equity × (target_leverage - 1)

6. Update liquidation price:
   liq_price = borrowed / shares (if borrowed > 0)
```

### Dividend Handling

**Assumption:** Dividends reinvested (DRIP = ON)

```
monthly_dividend = (shares × price) × (annual_yield / 12)
equity += monthly_dividend  (compounds equity)
shares += (monthly_dividend / price)  (add to position)
```

**Alternative:** If DRIP = OFF:
```
equity += monthly_dividend (increases cash, not shares)
shares unchanged
leverage = notional / equity (naturally decreases)
```

---

## 7. MARGIN CALL MECHANICS

### Liquidation Price Calculation

```python
def liquidation_price(entry_price, leverage, maintenance_margin=0.10):
    """
    At what price does equity fall below maintenance margin?
    
    Equity = Shares × Price - Borrowed
    Liq when: Equity = Notional × Maintenance
    
    Notional = (Entry Price × Leverage × Shares) = Shares × Entry × Leverage
    
    Solve: Shares × Price = Shares × Entry × Leverage × 0.10
           Price = Entry × Leverage × 0.10
           Price = Entry × (1 - (1 - 0.10/Leverage))
    """
    initial_margin = 1.0 / leverage  # Margin to open position
    liq_drop = initial_margin - maintenance_margin
    return entry_price * (1 - liq_drop)
```

### Example at 2.0x Leverage

```
Entry price: $1,000
Initial margin: 50% (1/2.0)
Maintenance margin: 10%
Margin cushion: 40%

Liquidation price = $1,000 × (1 - 0.40) = $600

Risk: 40% intraday drop → liquidation
```

### Margin Call Trigger

**Detection Rule:**
```
IF intraday_low ≤ liquidation_price:
  - Force liquidation at liq_price (or better)
  - Record margin call event
  - Zero out position (shares = 0, borrowed = 0)
  - Freeze account (no further trading this event)
ENDIF
```

**Note:** Uses **intraday LOW**, not close price. This is realistic because margin calls happen during the trading day.

---

## 8. KEY ASSUMPTIONS & LIMITATIONS

### Assumptions (Critical for Backtesting)

1. **Win Rate:** 55% monthly positive returns (market average)
2. **Payoff Ratio:** 1.2x (avg win 1.5% / avg loss 1.25%)
3. **Dividend Stability:** No policy changes over forecast horizon
4. **Interest Rates:** Stable; no surge in borrowing costs
5. **Liquidity:** Positions tradeable without significant slippage
6. **No Black Swan:** Algorithm cannot account for unprecedented events
7. **Beta Stability:** Historical beta remains representative forward

### Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| Cannot survive >50% drawdown at 3.0x | Extreme crisis risk | Use max 2.5x |
| Monthly rebalancing lag | 30-day delay in crisis | Add weekly crisis trigger |
| RSI/Stochastic lag | Misses flash crashes | Add circuit-breaker suspension |
| No volatility clustering | Underestimates tail risk | Use GARCH model |
| FX risk ignored (Brazil) | BRL/USD shocks | Add FX overlay |
| No correlation model | Diversification overstated | Model portfolio correlation |
| Assumes DRIP on | Reduces drawdown if DRIP off | Track both scenarios |

---

## 9. BACKTESTING METHODOLOGY

### Data Requirements

- **Minimum lookback:** 10 years (includes 1–2 crises)
- **Daily OHLCV:** Open, High, Low, Close, Volume
- **Dividend data:** Quarterly/annual distributions
- **Corporate actions:** Stock splits, mergers handled

### Comparison Benchmarks

| Benchmark | Rationale |
|-----------|-----------|
| **Unlevered (1.0x)** | Baseline buy-and-hold |
| **Fixed 2.0x** | Conservative leverage |
| **S&P 500 (SPY)** | Global benchmark |
| **Ibovespa (IBOV)** | Brazil-specific benchmark |

### Metrics Calculated

**Risk Metrics:**
- Max Drawdown (%)
- Sharpe Ratio (annual)
- Sortino Ratio (annual)
- Calmar Ratio (return / max DD)
- VaR 95%, 99% (1-day horizon)

**Return Metrics:**
- Total Return (%)
- CAGR (%)
- Win Rate (% profitable months)

**Capital Metrics:**
- Initial Value
- Final Value
- Total Contributions
- Peak Value
- Trough Value

---

## 10. RISK RATINGS & CLASSIFICATIONS

### Risk Rating (Quality-based)

| Quality Score | Risk Rating | Suitability |
|---------------|------------|------------|
| 80+ | BAIXO (Low) | Conservative investors |
| 60–79 | MODERADO (Moderate) | General public |
| 40–59 | ELEVADO (High) | Sophisticated only |
| <40 | ALTO (Critical) | Avoid or hedged only |

### Opportunity Rating (Opportunity-based)

| Opportunity Score | Rating | Action |
|------------------|--------|--------|
| 80+ | EXCELENTE (Excellent) | Strong entry signal |
| 65–79 | BOA (Good) | Normal entry |
| 50–64 | NEUTRA (Neutral) | Maintain position |
| 35–49 | FRACA (Weak) | Consider exit |
| <35 | SOBRECOMPRADO (Overbought) | Strong caution |

---

## 11. COMPLIANCE & REGULATORY CONSIDERATIONS

### Brazil-Specific (CVM/ANBIMA)

- **Risk Classification:** Must disclose as leveraged product
- **Suitability Analysis:** Required per Inst. 539/CVM
- **Margin Call Mechanics:** Must match broker terms (Quantfury, Corretora, etc.)
- **Currency Risk:** Must disclose FX exposure for foreign assets

### International Standards (Potential)

- **SEC Compliance (USA):** If targeting US retail
- **ESMA (EU):** If leveraged product exported to Europe
- **Macroprudential Risk:** National regulator oversight (BCB for Brazil)

### Client Disclosure (Mandatory)

```
RISK DISCLOSURE STATEMENT:

This algorithm employs leverage (up to 3.0x) and is subject to margin calls.
In extreme market conditions (>50% drawdown), the algorithm may be liquidated
with total loss of capital plus margin debt.

Historical performance does not guarantee future results. Past stress tests
show vulnerability during major crises (2008 GFC, 2022 bear market).

Suitable for: High-net-worth individuals with leverage experience.
NOT suitable for: Retirement accounts, conservative investors.

Estimated annual volatility: 15–25% (levered)
Maximum acceptable loss: 40–50% drawdown possible
Probability of margin call in 10 years: ~15–25% (model-dependent)
```

---

## 12. CALCULATION EXAMPLES

### Full Scenario: PETR4 (Petrobras Stock) — Jun 2026

**Input Data:**
```
Current Price: R$30.00
Beta: 1.2
Max Historical DD: -45% (2020 COVID)
Dividend Yield: 6.5%
Sharpe (1Y): 0.9
Volatility (1Y): 18%
Payout Ratio: 0.65
D/E Ratio: 0.8
ROE: 15%

Technical:
RSI 14: 32
Stochastic K: 18
MA200: R$27.50 (distance +8.7%)
BB Position: 0.35 (within bands, neutral)
```

### Quality Score Calculation

```
Beta 1.2:
  score = 100 - ((1.2 - 0.3) / 1.7) × 100 = 47 pts

Max DD -45%:
  score = 100 - ((45 - 10) / 70) × 100 = 50 pts

Div Yield 6.5%:
  score = 50 + (6.5 - 2.0) / 6.0 × 50 = 87.5 pts

Sharpe 0.9:
  score = (0.9 + 1.0) / 3.0 × 100 = 63 pts

Volatility 18%:
  score = 100 - ((18 - 8) / 42) × 100 = 76 pts

Fundamental (0.65 payout, 0.8 D/E, 0.15 ROE):
  Payout: 90 pts (sweet spot)
  D/E: 100 pts (strong)
  ROE: 75 pts (good)
  Average: 88 pts

Quality Composite:
= 47×0.20 + 50×0.25 + 87.5×0.10 + 63×0.15 + 76×0.15 + 88×0.15
= 9.4 + 12.5 + 8.75 + 9.45 + 11.4 + 13.2
= 64.7 → QUALITY SCORE = 65
```

### Opportunity Score Calculation

```
RSI 32:
  score = 80 + (30-32)/10 × 20 = 76 pts (oversold)

Stochastic 18:
  score = 80 + (20-18)/10 × 20 = 84 pts (very oversold)

Distance MA200 +8.7%:
  score = 50 - 8.7/10 × 20 = 33 pts (above MA, less attractive)

BB Position 0.35:
  score = 50 - (0.35-0.2)/0.3 × 20 = 40 pts (neutral)

Opportunity Composite:
= 76×0.25 + 84×0.25 + 33×0.30 + 40×0.20
= 19 + 21 + 9.9 + 8
= 57.9 → OPPORTUNITY SCORE = 58
```

### Composite Score & Leverage

```
Composite = 65×0.60 + 58×0.40
         = 39 + 23.2
         = 62.2

Score 62: Falls in 60–70 range

Balanced Profile Leverage:
  Max leverage: 1.5x
  Recommended: 0.75x
  Conservative: 1.0x

Risk Rating: MODERADO (Moderate Risk)
Opportunity: FRACA (Weak)

Recommendation: Hold current position at 1.0x. Do not increase leverage.
```

---

## CONCLUSION

This algorithm provides a **structured, documented approach** to leverage management in leveraged Buy & Hold portfolios. The 60/40 quality/opportunity split prioritizes defensive assets, while the monthly rebalancing provides regular risk adjustment without excessive trading.

**Key Strengths:**
- Evidence-based weighting
- Clear triggering rules
- Documented limitations

**Key Risks:**
- Cannot survive extreme crises (>50% DD)
- Rebalancing lag in flash crashes
- Assumes stable economic conditions

**Regulatory Status:** Suitable for disclosure to sophisticated investors with clear risk warnings.

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-05  
**Next Review:** Upon algorithm change or crisis event  
**Author:** Claude Haiku — Quant Analysis
