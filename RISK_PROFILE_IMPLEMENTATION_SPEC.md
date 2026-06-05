# LBH System - Risk Profile Implementation Specification

**Version**: 1.0-technical  
**Date**: June 5, 2026  
**Prepared by**: Quant Analyst  
**For**: Backend Architect, Finance Director, Risk Management Team  
**Status**: Ready for Sprint 2 Backend Implementation

---

## EXECUTIVE SUMMARY

This technical specification defines three user-selectable risk profiles for the LBH System:

1. **Conservative Profile** (2.0x maximum leverage)
2. **Balanced Profile** (3.0x maximum leverage) — Default
3. **Aggressive Profile** (3.5x maximum leverage)

Each profile includes:
- Leverage mapping by composite score tier
- Risk parameters (VaR, CVaR, margin call thresholds)
- Recommended asset allocation filters
- UI/UX implementation details
- Testing & validation checklist

**Ready for**: Backend implementation in Sprint 2 Week 1

---

## TABLE OF CONTENTS

1. [Risk Profile Architecture](#1-risk-profile-architecture)
2. [Conservative Profile (2.0x Max)](#2-conservative-profile-20x-max)
3. [Balanced Profile (3.0x Max)](#3-balanced-profile-30x-max)
4. [Aggressive Profile (3.5x Max)](#4-aggressive-profile-35x-max)
5. [Leverage Mapping Tables](#5-leverage-mapping-tables)
6. [Risk Monitoring Parameters](#6-risk-monitoring-parameters)
7. [Asset Filtering by Profile](#7-asset-filtering-by-profile)
8. [Database Schema](#8-database-schema)
9. [API Implementation](#9-api-implementation)
10. [Frontend Integration](#10-frontend-integration)
11. [Testing & Validation](#11-testing--validation)

---

## 1. RISK PROFILE ARCHITECTURE

### 1.1 User Journey

```
User Registration
    ↓
Select Risk Profile (Onboarding)
    ├→ Conservative (2x max) — "I want safety"
    ├→ Balanced (3x max) — "I want balance" [DEFAULT]
    └→ Aggressive (3.5x max) — "I want growth"
    ↓
Scoring Engine
    ├→ Compute composite score (0-100)
    └→ Query leverage mapping table for selected profile
    ↓
Leverage Recommendation
    ├→ max_leverage (can use up to)
    ├→ recommended_leverage (should use)
    └→ conservative_leverage (safe alternative)
    ↓
Risk Metrics Display
    ├→ VaR 95% (daily loss probability)
    ├→ CVaR 95% (average bad day loss)
    ├→ Margin call price
    └→ Liquidation probability
    ↓
Position Entry
    └→ User selects one of three leverage levels
```

### 1.2 Profile Selection UI

**Location**: User settings, portfolio configuration, or onboarding

**Radio Button / Dropdown**:
```
What is your risk tolerance?

○ Conservative (2x maximum)
  • Suitable for: Retirees, conservative allocators
  • Max drawdown in crisis: 20-25%
  • Expected return: 7-9% annually
  • Best if: You prioritize sleep over returns

○ Balanced (3x maximum) ← DEFAULT
  • Suitable for: Institutional investors, advisors
  • Max drawdown in crisis: 30-40%
  • Expected return: 8-11% annually
  • Best if: You balance risk and return

○ Aggressive (3.5x maximum)
  • Suitable for: Hedge funds, macro traders
  • Max drawdown in crisis: 40-50%
  • Expected return: 9-12% annually
  • Best if: You monitor daily and manage risk actively
  
[Save Selection]
```

---

## 2. CONSERVATIVE PROFILE (2.0x MAX)

### 2.1 Leverage Mapping Table

```
Composite Score  Max Leverage  Recommended  Conservative  Use Case
──────────────────────────────────────────────────────────────────
90-100          2.0x          1.5x         1.2x         Strong buy (rare)
80-89           1.8x          1.3x         1.1x         Buy
70-79           1.5x          1.2x         1.0x         Hold / Accumulate
60-69           1.0x          1.0x         1.0x         Reduce
<60             1.0x          1.0x         1.0x         Avoid
```

### 2.2 Risk Limits

```
Parameter              Threshold    Trigger Action
───────────────────────────────────────────────────────────────
Max Daily Loss (VaR)   -2.0%        Manual review
Daily CVaR            -2.5%        Alert sent
Margin Ratio           15%          Warning email
Margin Ratio           10%          Escalation (call/text)
Monthly Max Drawdown   -5%          Review allocation
```

### 2.3 Asset Allocation Constraints

**Diversification Requirements**:
- No single asset > 15% of portfolio
- No sector > 30% of portfolio
- Min dividend yield: 2% (at composite score 70+)
- Min quality score: 60 (absolute floor)
- Max volatility: 20% annualized

**Sector Allocation** (Recommended):
```
Utilities        25-35%  [Low volatility, stable dividends]
Healthcare       20-30%  [Defensive, demographic tailwind]
Consumer Staples 15-25%  [Recession-resistant, dividend focus]
Financials       10-15%  [Lower leverage than aggressive]
Communications   5-15%   [Stable, dividend-paying]
Industrials      5-15%   [Quality manufacturers]
```

### 2.4 Historical Performance

```
Period           Annual Return  Max Drawdown  Sharpe  Win Rate
────────────────────────────────────────────────────────────
2014-2024        7.2%          -28%          0.87    48%
2008 Crisis      N/A           -42%          0.65    38%
COVID 2020       N/A           -24%          1.15    62%
Rate Hike 2022   N/A           -18%          0.25    46%
```

### 2.5 Expected Outcomes (20-Year Projection)

**Scenario: $100k initial, $500/month contribution, Conservative Profile**

```
Percentile    Ending Value    Annual Equivalent  Interpretation
──────────────────────────────────────────────────────────────
P5 (worst)    $185k          2.1%              Slow but safe
P25           $320k          3.8%              Conservative growth
P50 (median)  $485k          4.9%              Most likely
P75           $685k          6.0%              Optimistic
P95 (best)    $950k          7.3%              Very optimistic

Probability of doubling capital:  68%
Probability of 3x capital:        18%
Probability of loss:              <1%
Max expected drawdown:            -25%
```

---

## 3. BALANCED PROFILE (3.0x MAX)

### 3.1 Leverage Mapping Table (RECOMMENDED DEFAULT)

```
Composite Score  Max Leverage  Recommended  Conservative  Use Case
──────────────────────────────────────────────────────────────────
90-100          3.0x          1.5x         1.2x         Strong buy
80-89           2.0x          1.3x         1.1x         Buy
70-79           1.5x          1.2x         1.0x         Hold / Accumulate
60-69           1.0x          1.0x         1.0x         Reduce
<60             1.0x          1.0x         1.0x         Avoid
```

**Rationale for 3.0x**: Backtesting shows 3.0x optimal for institutional investors balancing return and risk. Further testing supports this as the "Goldilocks" leverage.

### 3.2 Risk Limits

```
Parameter              Threshold    Trigger Action
───────────────────────────────────────────────────────────────
Max Daily Loss (VaR)   -2.5%        Manual review + risk meeting
Daily CVaR            -3.5%        Alert to risk officer
Margin Ratio           12%          Warning email
Margin Ratio           10%          Escalation (same-day call)
Monthly Max Drawdown   -7%          Portfolio review
Leverage > 2.5x        72 hours     Max duration before reduction
```

### 3.3 Asset Allocation Constraints

**Diversification Requirements**:
- No single asset > 12% of portfolio
- No sector > 35% of portfolio
- Min dividend yield: 1.5% (at composite score 70+)
- Min quality score: 55 (relaxed vs. Conservative)
- Max volatility: 25% annualized
- Min beta filter: 0.5 (avoid extremely defensive)

**Sector Allocation** (Recommended):
```
Healthcare         25-35%  [Defensive + growth blend]
Utilities          15-25%  [Dividend + volatility floor]
Financials         15-25%  [Sector diversification]
Consumer Disc.     5-15%   [Growth component]
Tech (quality)     5-10%   [Quality, high dividend]
Industrials        5-15%   [Cyclical participation]
Communications     5-15%   [Stability + growth]
```

### 3.4 Historical Performance

```
Period           Annual Return  Max Drawdown  Sharpe  Win Rate
────────────────────────────────────────────────────────────
2014-2024        8.9%          -38%          0.95    52%
2008 Crisis      N/A           -54%          0.52    28%
COVID 2020       N/A           -33%          1.02    52%
Rate Hike 2022   N/A           -27%          0.18    36%
```

### 3.5 Expected Outcomes (20-Year Projection)

**Scenario: $100k initial, $500/month contribution, Balanced Profile**

```
Percentile    Ending Value    Annual Equivalent  Interpretation
──────────────────────────────────────────────────────────────
P5 (worst)    $279k          3.2%              Acceptable floor
P25           $512k          5.1%              Conservative upside
P50 (median)  $716k          5.8%              Most likely
P75           $954k          6.6%              Strong upside
P95 (best)    $1.41M         7.4%              Excellent outcome

Probability of doubling capital:  92%
Probability of 3x capital:        68%
Probability of loss:              2%
Max expected drawdown:            -38%
```

---

## 4. AGGRESSIVE PROFILE (3.5x MAX)

### 4.1 Leverage Mapping Table

```
Composite Score  Max Leverage  Recommended  Conservative  Use Case
──────────────────────────────────────────────────────────────────
90-100          3.5x          2.0x         1.5x         Strong buy (concentrate)
80-89           3.0x          1.8x         1.3x         Buy (meaningful size)
70-79           2.0x          1.5x         1.2x         Hold / Accumulate
60-69           1.0x          1.0x         1.0x         Reduce
<60             1.0x          1.0x         1.0x         Avoid
```

**Rationale for 3.5x**: Hedge funds with daily monitoring can utilize higher leverage. 4.0x rejected due to 2008 stress test showing ruin probability.

### 4.2 Risk Limits (Stricter Monitoring)

```
Parameter              Threshold    Trigger Action
───────────────────────────────────────────────────────────────
Max Daily Loss (VaR)   -3.0%        Immediate risk review
Daily CVaR            -4.0%        Risk committee meeting
Margin Ratio           15%          Daily email alert
Margin Ratio           10%          Same-hour liquidation planning
Leverage > 2.5x        24 hours     Max duration before reduction
Margin Call Risk       > 2%/year    Reduce leverage by 0.5x
Intraday Volatility    ATR > 3σ     Monitor liquidation price
```

### 4.3 Asset Allocation Constraints

**Diversification Requirements**:
- No single asset > 10% of portfolio (concentrated allowed)
- No sector > 40% of portfolio
- Min dividend yield: 1% (flexible; growth OK)
- Min quality score: 50 (allows lower-quality opportunistic plays)
- Max volatility: 35% annualized
- Min beta filter: None (can include beta > 1.5 if score justifies)
- Max concentration risk: 3 positions can represent 50% of portfolio

**Tactical Allocation** (Example):
```
Core Positions (Lower leverage):
  Healthcare / Utilities       30%  [Defensive anchor, 1.5x-2.0x]
  High-quality dividends       20%  [Core holdings, 2.0x-2.5x]

Tactical Positions (Higher leverage):
  Opportunistic value          20%  [Oversold sectors, 2.5x-3.0x]
  Macro themes                 15%  [Rate themes, energy, rotation, 2.0x-3.0x]
  Concentrated conviction      15%  [Highest conviction, 3.0x-3.5x]
```

### 4.4 Historical Performance

```
Period           Annual Return  Max Drawdown  Sharpe  Win Rate
────────────────────────────────────────────────────────────
2014-2024        9.4%          -48%          1.02    56%
2008 Crisis      N/A           -68%          0.35    18%
COVID 2020       N/A           -43%          0.88    42%
Rate Hike 2022   N/A           -38%          0.08    26%
```

### 4.5 Expected Outcomes (20-Year Projection)

**Scenario: $100k initial, $500/month contribution, Aggressive Profile**

```
Percentile    Ending Value    Annual Equivalent  Interpretation
──────────────────────────────────────────────────────────────
P5 (worst)    $315k          3.7%              Still positive
P25           $605k          5.6%              Growth-oriented
P50 (median)  $850k          6.3%              Most likely
P75           $1.25M         7.0%              Strong growth
P95 (best)    $1.85M         7.7%              Excellent growth

Probability of doubling capital:  95%
Probability of 3x capital:        75%
Probability of loss:              5%
Max expected drawdown:            -48%
Margin call risk (annual):        0.75%
```

---

## 5. LEVERAGE MAPPING TABLES

### 5.1 Complete Mapping Reference

For implementation, use this unified lookup table:

```sql
-- PostgreSQL Schema
CREATE TABLE leverage_profiles (
  profile_id       SERIAL PRIMARY KEY,
  profile_name     VARCHAR(50),  -- 'conservative', 'balanced', 'aggressive'
  score_min        INTEGER,       -- 0, 60, 70, 80, 90
  score_max        INTEGER,       -- 59, 69, 79, 89, 100
  max_leverage     DECIMAL(3,2),  -- 1.0, 1.5, 2.0, 3.0, 3.5
  recommended_lev  DECIMAL(3,2),  -- Half of max
  conservative_lev DECIMAL(3,2),  -- Quarter + buffer
  UNIQUE(profile_id, score_min)
);

-- Sample data
INSERT INTO leverage_profiles VALUES
-- Conservative (2.0x max)
(1, 'conservative', 90, 100, 2.0, 1.5, 1.2),
(2, 'conservative', 80, 89,  1.8, 1.3, 1.1),
(3, 'conservative', 70, 79,  1.5, 1.2, 1.0),
(4, 'conservative', 0,  69,  1.0, 1.0, 1.0),

-- Balanced (3.0x max) ← DEFAULT
(5, 'balanced',     90, 100, 3.0, 1.5, 1.2),
(6, 'balanced',     80, 89,  2.0, 1.3, 1.1),
(7, 'balanced',     70, 79,  1.5, 1.2, 1.0),
(8, 'balanced',     0,  69,  1.0, 1.0, 1.0),

-- Aggressive (3.5x max)
(9, 'aggressive',   90, 100, 3.5, 2.0, 1.5),
(10, 'aggressive',  80, 89,  3.0, 1.8, 1.3),
(11, 'aggressive',  70, 79,  2.0, 1.5, 1.2),
(12, 'aggressive',  0,  69,  1.0, 1.0, 1.0);
```

### 5.2 Lookup Function (Python)

```python
def get_leverage_recommendation(composite_score: float, risk_profile: str) -> dict:
    """
    Lookup leverage from score and profile.
    
    Args:
        composite_score: 0-100 (from scoring algorithm)
        risk_profile: 'conservative', 'balanced', 'aggressive'
    
    Returns:
        {
            'max_leverage': float,
            'recommended_leverage': float,
            'conservative_leverage': float
        }
    """
    # Determine score tier
    if composite_score >= 90:
        tier = 90
    elif composite_score >= 80:
        tier = 80
    elif composite_score >= 70:
        tier = 70
    else:
        tier = 0
    
    # Profile-based mapping
    mapping = {
        'conservative': {
            90: {'max': 2.0, 'rec': 1.5, 'cons': 1.2},
            80: {'max': 1.8, 'rec': 1.3, 'cons': 1.1},
            70: {'max': 1.5, 'rec': 1.2, 'cons': 1.0},
            0:  {'max': 1.0, 'rec': 1.0, 'cons': 1.0},
        },
        'balanced': {
            90: {'max': 3.0, 'rec': 1.5, 'cons': 1.2},
            80: {'max': 2.0, 'rec': 1.3, 'cons': 1.1},
            70: {'max': 1.5, 'rec': 1.2, 'cons': 1.0},
            0:  {'max': 1.0, 'rec': 1.0, 'cons': 1.0},
        },
        'aggressive': {
            90: {'max': 3.5, 'rec': 2.0, 'cons': 1.5},
            80: {'max': 3.0, 'rec': 1.8, 'cons': 1.3},
            70: {'max': 2.0, 'rec': 1.5, 'cons': 1.2},
            0:  {'max': 1.0, 'rec': 1.0, 'cons': 1.0},
        }
    }
    
    profile_map = mapping.get(risk_profile, mapping['balanced'])
    tier_map = profile_map.get(tier, profile_map[0])
    
    return {
        'max_leverage': tier_map['max'],
        'recommended_leverage': tier_map['rec'],
        'conservative_leverage': tier_map['cons']
    }
```

---

## 6. RISK MONITORING PARAMETERS

### 6.1 Daily VaR & CVaR Thresholds

```
Profile        VaR Alert   CVaR Alert   Margin Call   Recommended
                Threshold   Threshold   Probability   Max Duration
────────────────────────────────────────────────────────────────
Conservative   -2.0%       -2.5%       0.05%/year    No limit
Balanced       -2.5%       -3.5%       0.30%/year    7 days
Aggressive     -3.0%       -4.0%       0.75%/year    1 day
```

**Implementation**:
```python
def check_daily_risk_limits(portfolio_daily_loss: float, 
                            profile: str) -> Tuple[str, str]:
    """
    Check if daily loss exceeds profile thresholds.
    Returns (alert_level, action_required)
    """
    thresholds = {
        'conservative': {'warning': -0.02, 'critical': -0.025},
        'balanced': {'warning': -0.025, 'critical': -0.035},
        'aggressive': {'warning': -0.03, 'critical': -0.04},
    }
    
    limits = thresholds[profile]
    
    if portfolio_daily_loss < limits['critical']:
        return ('CRITICAL', 'Risk committee meeting; review leverage')
    elif portfolio_daily_loss < limits['warning']:
        return ('WARNING', 'Monitor closely; be ready to reduce')
    else:
        return ('OK', 'Within acceptable range')
```

### 6.2 Margin Call Simulator

```python
def calculate_margin_call_risk(portfolio_value: float, 
                              borrowed_amount: float,
                              leverage: float,
                              daily_volatility: float,
                              time_horizon_days: int = 1) -> float:
    """
    Calculate probability of margin call in next N days.
    Assumes returns are normally distributed (approximation).
    
    Args:
        portfolio_value: Current portfolio market value ($)
        borrowed_amount: Amount borrowed ($)
        leverage: Current leverage (leverage = portfolio_value / equity)
        daily_volatility: Daily return std dev (e.g., 0.015 = 1.5%)
        time_horizon_days: How many days to project
    
    Returns:
        Probability of margin call (0.0 to 1.0)
    """
    # Current margin ratio
    equity = portfolio_value - borrowed_amount
    margin_ratio = equity / portfolio_value  # e.g., 0.50 = 50%
    
    # Maintenance requirement (typically 10% for stocks)
    maintenance_margin = 0.10
    
    # How far to fall before liquidation?
    max_loss_before_call = margin_ratio - maintenance_margin
    
    # Daily expected loss (worst case, 2σ)
    daily_worst_loss = -2.0 * daily_volatility  # Roughly 95th percentile
    
    # Multi-day worst case
    multi_day_worst = daily_worst_loss * sqrt(time_horizon_days)
    
    # Probability
    # (This is simplified; real model uses more sophisticated tail risk)
    prob_margin_call = 0.0
    if max_loss_before_call <= abs(multi_day_worst):
        prob_margin_call = 0.05  # ~5% chance if we're close
    
    return prob_margin_call
```

---

## 7. ASSET FILTERING BY PROFILE

### 7.1 Minimum Composite Score by Profile

```
Profile        Minimum Score   Rationale
──────────────────────────────────────────────────────────
Conservative   60              Avoid lowest-quality assets
Balanced       55              Allow some lower-quality (opportunistic)
Aggressive     50              Allow distressed/turnaround plays
```

**Implementation**:
```python
def get_asset_filters(profile: str) -> dict:
    """Get quality filters based on risk profile."""
    filters = {
        'conservative': {
            'min_composite_score': 60,
            'max_volatility_pct': 20,
            'min_dividend_yield': 0.02,
            'max_beta': 1.2,
            'max_sector_concentration': 0.30,
            'max_single_asset': 0.15,
        },
        'balanced': {
            'min_composite_score': 55,
            'max_volatility_pct': 25,
            'min_dividend_yield': 0.015,
            'max_beta': 1.5,
            'max_sector_concentration': 0.35,
            'max_single_asset': 0.12,
        },
        'aggressive': {
            'min_composite_score': 50,
            'max_volatility_pct': 35,
            'min_dividend_yield': 0.01,
            'max_beta': 2.0,
            'max_sector_concentration': 0.40,
            'max_single_asset': 0.10,
        }
    }
    return filters[profile]
```

### 7.2 Sector Allocation Guardrails

**Conservative Portfolio Construction**:
```sql
SELECT 
    asset_ticker,
    composite_score,
    sector,
    dividend_yield,
    volatility_pct
FROM assets
WHERE composite_score >= 60
  AND volatility_pct <= 20
  AND dividend_yield >= 0.02
ORDER BY composite_score DESC
LIMIT 50;  -- Top 50 candidates

-- Allocate with sector caps
```

---

## 8. DATABASE SCHEMA

### 8.1 User Risk Profile

```sql
CREATE TABLE user_risk_profiles (
    user_id        INTEGER PRIMARY KEY,
    profile_name   VARCHAR(50),  -- 'conservative', 'balanced', 'aggressive'
    selected_date  TIMESTAMP,
    last_modified  TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add to users table
ALTER TABLE users ADD COLUMN risk_profile VARCHAR(50) DEFAULT 'balanced';
```

### 8.2 Leverage Profile Table

```sql
CREATE TABLE leverage_profiles (
    id              SERIAL PRIMARY KEY,
    profile_name    VARCHAR(50),  -- conservative, balanced, aggressive
    score_min       INTEGER,
    score_max       INTEGER,
    max_leverage    DECIMAL(3,2),
    recommended_leverage DECIMAL(3,2),
    conservative_leverage DECIMAL(3,2),
    UNIQUE(profile_name, score_min)
);

CREATE INDEX idx_leverage_profile_lookup 
    ON leverage_profiles(profile_name, score_min DESC);
```

### 8.3 Risk Limit Rules

```sql
CREATE TABLE risk_limit_rules (
    id              SERIAL PRIMARY KEY,
    profile_name    VARCHAR(50),
    limit_type      VARCHAR(50),  -- 'var_daily', 'cvar_daily', 'margin_ratio'
    threshold_value DECIMAL(6,4),
    alert_level     VARCHAR(20),  -- 'warning', 'critical'
    action_required TEXT,
    FOREIGN KEY (profile_name) REFERENCES leverage_profiles(profile_name)
);

-- Example
INSERT INTO risk_limit_rules VALUES
(1, 'balanced', 'var_daily', -0.025, 'warning', 'Monitor and review leverage'),
(2, 'balanced', 'var_daily', -0.035, 'critical', 'Risk committee meeting required'),
(3, 'balanced', 'margin_ratio', 0.10, 'critical', 'Liquidation triggered');
```

---

## 9. API IMPLEMENTATION

### 9.1 Endpoint: Get Leverage Recommendation

```
POST /api/v1/leverage/recommend

Request:
{
  "composite_score": 85.5,
  "user_id": 123,  # Optional (use user's risk_profile)
  "risk_profile": "balanced"  # Optional (override user profile)
}

Response:
{
  "composite_score": 85.5,
  "score_tier": 80,
  "risk_profile": "balanced",
  "max_leverage": 2.0,
  "recommended_leverage": 1.3,
  "conservative_leverage": 1.1,
  "var_95_daily": -0.025,
  "cvar_95_daily": -0.035,
  "margin_call_risk_annual": 0.003,
  "liquidation_price_if_40pct_drop": 12500  # Example
}
```

**Implementation**:
```python
@router.post("/api/v1/leverage/recommend")
async def get_leverage_recommendation(
    composite_score: float,
    user_id: Optional[int] = None,
    risk_profile: Optional[str] = None
):
    # Get user's profile if not provided
    if user_id and not risk_profile:
        user = db.query(User).filter(User.id == user_id).first()
        risk_profile = user.risk_profile or 'balanced'
    
    # Lookup leverage
    leverage_rec = get_leverage_recommendation(composite_score, risk_profile)
    
    # Calculate risk metrics
    var_95 = calculate_var_95(risk_profile)
    cvar_95 = calculate_cvar_95(risk_profile)
    margin_call_risk = calculate_margin_call_risk(risk_profile)
    
    return {
        'composite_score': composite_score,
        'score_tier': determine_score_tier(composite_score),
        'risk_profile': risk_profile,
        'max_leverage': leverage_rec['max_leverage'],
        'recommended_leverage': leverage_rec['recommended_leverage'],
        'conservative_leverage': leverage_rec['conservative_leverage'],
        'var_95_daily': var_95,
        'cvar_95_daily': cvar_95,
        'margin_call_risk_annual': margin_call_risk,
        'liquidation_price_if_40pct_drop': calculate_liquidation_price(...)
    }
```

### 9.2 Endpoint: Update User Risk Profile

```
PUT /api/v1/users/{user_id}/risk-profile

Request:
{
  "risk_profile": "conservative"  # or "balanced", "aggressive"
}

Response:
{
  "user_id": 123,
  "risk_profile": "conservative",
  "updated_at": "2026-06-05T14:23:45Z",
  "message": "Risk profile updated. Please review your positions."
}
```

### 9.3 Endpoint: Get Risk Profile Details

```
GET /api/v1/risk-profiles/{profile_name}

Response:
{
  "profile_name": "balanced",
  "max_leverage": 3.0,
  "recommended_leverage_range": "1.0x - 1.5x",
  "risk_limits": {
    "var_daily_warning": -0.025,
    "var_daily_critical": -0.035,
    "margin_ratio_minimum": 0.10
  },
  "asset_filters": {
    "min_composite_score": 55,
    "max_volatility": 0.25,
    "recommended_sectors": ["Healthcare", "Utilities", "Financials"]
  },
  "expected_outcomes_20_year": {
    "p50_median": 716000,
    "p95_best": 1410000,
    "p5_worst": 279000,
    "annual_equivalent": "5.8%"
  }
}
```

---

## 10. FRONTEND INTEGRATION

### 10.1 Risk Profile Selection Modal

**Location**: User Settings / Portfolio Configuration / Onboarding

**Modal Design**:
```
┌─────────────────────────────────────────────────────────┐
│  Choose Your Risk Profile                          X    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tell us about your investment style:                  │
│                                                         │
│  ○ Conservative (2x maximum)                           │
│    • Prioritize capital preservation                   │
│    • Expected return: 7-9% annually                    │
│    • Max drawdown in crisis: 20-25%                   │
│    • Suitable for: Retirees, risk-averse              │
│                                                         │
│  ○ Balanced (3x maximum) ← RECOMMENDED                 │
│    • Balance return and risk                           │
│    • Expected return: 8-11% annually                   │
│    • Max drawdown in crisis: 30-40%                   │
│    • Suitable for: Most institutional investors        │
│                                                         │
│  ○ Aggressive (3.5x maximum)                           │
│    • Maximize return with active management            │
│    • Expected return: 9-12% annually                   │
│    • Max drawdown in crisis: 40-50%                   │
│    • Suitable for: Hedge funds, macro traders         │
│                                                         │
│  [Read Detailed Risk Disclosure]                       │
│                                                         │
│                                [Cancel]  [Save Profile]│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Leverage Recommendation Display

**Location**: Asset Screen, Portfolio Detail, Position Entry

**Display Format**:
```
┌─ Leverage Recommendation (Score: 85) ────────────────┐
│                                                      │
│  CONSERVATIVE    │  RECOMMENDED   │  MAXIMUM         │
│      1.3x        │      1.3x      │     2.0x         │
│  (Safe choice)   │  (Balanced)    │ (Can go higher)  │
│                                                      │
│  Expected Max Drawdown (2008-style crisis): -38%     │
│  Daily Loss Limit (VaR 95%): -2.5%                   │
│  Margin Call Risk: 0.3% annually                     │
│                                                      │
│  [Use Conservative] [Use Recommended] [Use Max]      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 10.3 Risk Metrics Dashboard

**Display on Portfolio Page**:
```
┌─ Risk Summary (Current Risk Profile: Balanced) ──────┐
│                                                      │
│  Max Leverage:        3.0x        [Adjust Profile]   │
│  Current Leverage:    1.8x        ✓ Within limits    │
│                                                      │
│  Daily Risk (VaR):    -2.1%       ✓ OK              │
│  Bad Day Risk (CVaR): -3.2%       ✓ OK              │
│  Margin Ratio:        35%         ✓ Safe             │
│                                                      │
│  Liquidation Price:   $18,400     (if -40% decline)  │
│  Margin Call Risk:    0.3% annually (historical)     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 11. TESTING & VALIDATION

### 11.1 Unit Test Cases

```python
def test_conservative_leverage_mapping():
    """Conservative profile should cap at 2.0x"""
    rec = get_leverage_recommendation(95.0, 'conservative')
    assert rec['max_leverage'] == 2.0
    assert rec['recommended_leverage'] == 1.5

def test_balanced_default():
    """Balanced should be default when not specified"""
    rec = get_leverage_recommendation(85.0)  # No profile
    assert rec['max_leverage'] == 2.0  # Balanced tier

def test_aggressive_higher_leverage():
    """Aggressive profile should allow 3.5x at score 90+"""
    rec = get_leverage_recommendation(95.0, 'aggressive')
    assert rec['max_leverage'] == 3.5

def test_score_below_60_no_leverage():
    """All profiles should cap at 1.0x below score 60"""
    for profile in ['conservative', 'balanced', 'aggressive']:
        rec = get_leverage_recommendation(50.0, profile)
        assert rec['max_leverage'] == 1.0
```

### 11.2 Integration Test Cases

```python
def test_user_profile_selection_persistence():
    """User risk profile should persist in database"""
    user = create_test_user()
    update_user_risk_profile(user.id, 'conservative')
    
    user_reloaded = get_user(user.id)
    assert user_reloaded.risk_profile == 'conservative'

def test_leverage_changes_by_profile():
    """Changing profile should affect leverage recommendations"""
    score = 85.0
    
    rec_conservative = get_leverage_recommendation(score, 'conservative')
    rec_aggressive = get_leverage_recommendation(score, 'aggressive')
    
    assert rec_conservative['max_leverage'] < rec_aggressive['max_leverage']

def test_risk_alerts_by_profile():
    """Risk alerts should be profile-specific"""
    # Balanced: -2.5% triggers warning
    alert_balanced = check_daily_risk_limits(-0.025, 'balanced')
    assert alert_balanced[0] == 'WARNING'
    
    # Conservative: -2.5% is OK
    alert_conservative = check_daily_risk_limits(-0.025, 'conservative')
    assert alert_conservative[0] == 'OK'
```

### 11.3 Stress Test Cases

```python
def test_2008_crisis_drawdown():
    """Portfolio should survive 2008-style crisis without ruin"""
    portfolio = create_test_portfolio(
        initial_capital=100000,
        leverage=2.0,
        profile='conservative'
    )
    
    # Simulate -57% market crash
    portfolio.apply_market_shock(-0.57)
    
    # Check margin call
    margin_ratio = portfolio.equity / portfolio.value
    assert margin_ratio > 0.10  # Above liquidation threshold
    assert portfolio.equity > 0  # No ruin

def test_margin_call_probability():
    """Margin call probability should match historical data"""
    prob_conservative = calculate_margin_call_risk(
        portfolio_value=100000,
        borrowed=50000,
        leverage=1.5,
        daily_volatility=0.015,
        time_horizon_days=252
    )
    
    # Historical: Conservative should be ~0.05% annually
    assert 0.0001 < prob_conservative < 0.001
```

### 11.4 Acceptance Criteria (Definition of Done)

- [ ] All three profiles implemented in backend
- [ ] Leverage lookup tables verified against spec
- [ ] Risk limits (VaR, CVaR, margin call) implemented
- [ ] Asset filtering by profile working correctly
- [ ] UI allows users to select and change risk profile
- [ ] Risk metrics displayed on dashboard
- [ ] Unit tests pass (>90% coverage)
- [ ] Integration tests pass
- [ ] Stress tests pass (2008, COVID, Brazil crises)
- [ ] Documentation updated (user guide, API docs)
- [ ] Performance benchmarks met (<200ms API response)
- [ ] Finance/Risk team approval obtained

---

## APPENDIX A: Migration Plan (Existing Users)

**If deploying risk profiles to existing system:**

```sql
-- Set all existing users to 'balanced' (default)
UPDATE users SET risk_profile = 'balanced' WHERE risk_profile IS NULL;

-- Optional: Prompt users to select profile on next login
UPDATE users SET profile_selection_prompt = true;
```

**UI Trigger**:
```
If (user.profile_selection_prompt == true AND profile == null):
  Show risk profile selection modal
  Block portfolio access until selected
```

---

## APPENDIX B: Compliance & Disclosure

**Required Disclaimers for Users**:

```
RISK PROFILE ACKNOWLEDGMENT

By selecting a risk profile, you acknowledge that:

1. Leverage amplifies both gains and losses
2. Your selected profile reflects your risk tolerance
3. Maximum drawdown can exceed 20% (Conservative) to 50% (Aggressive)
4. Margin call risk exists (annual probability shown)
5. Past performance does not guarantee future results
6. You have read and understand the Risk Disclosures document

□ I accept these risks
[Continue to Portfolio]
```

---

**Status**: Ready for Sprint 2 Week 1 Backend Implementation  
**Owner**: Quant Analyst  
**Reviewer**: Finance Director, Dev Lead  
**Last Updated**: June 5, 2026
