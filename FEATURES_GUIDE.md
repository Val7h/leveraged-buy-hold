# LBH System — New Features Guide

## 📋 Table of Contents
1. [Asset Comparison Table](#asset-comparison-table)
2. [Backtest Comparison Panel](#backtest-comparison-panel)
3. [Portfolio Sector Breakdown](#portfolio-sector-breakdown)

---

## Asset Comparison Table

### What Is It?
The Asset Comparison Table lets you compare multiple assets side-by-side to make better selection decisions. Instead of checking one asset at a time, see all your candidates in one place with quality scores, entry signals, and metrics.

### Where to Find It
1. Go to **Screening** tab
2. Analyze your assets (e.g., select "Defensivos" preset)
3. Once results load, **select 2-5 assets** by clicking the checkbox on each card
4. Click **"Compare (N)"** button that appears in the header
5. Modal opens with side-by-side comparison

### How to Use

**Step 1: Select Assets**
```
Dashboard → Screening → Analyze Ativos

You see:
┌─────────────────────────────────────────────┐
│ NEE [✓]  │  Card 1 with checkbox          │
│ JNJ [ ]  │  Card 2 with checkbox          │
│ SO  [✓]  │  Card 3 with checkbox          │
└─────────────────────────────────────────────┘
```

**Step 2: Compare**
```
Once 2+ selected, button appears:
┌──────────────────────────────────────────┐
│ "🔍 Comparar (3)" ← Click here           │
└──────────────────────────────────────────┘
```

**Step 3: Read Comparison Table**
```
Columns shown:
┌─────────────────────────────────────────┐
│ Ticker │ Quality │ Opp │ Composite │ Signal │
├─────────────────────────────────────────┤
│ NEE    │  8.8   │ 7.5 │   8.2    │ ENTRAR │
│ SO     │  8.1   │ 8.2 │   8.2    │ ENTRAR │  ← Top scorer
│ JNJ    │  7.9   │ 6.2 │   7.1    │ AGUARD │
└─────────────────────────────────────────┘
```

### Key Metrics Explained

| Column | Meaning | Good Range | Action |
|--------|---------|-----------|--------|
| **Quality Score** | Asset quality: beta, dividends, Sharpe | 8+ | Higher = safer long-term |
| **Opportunity Score** | Entry opportunity: RSI, price position | 7+ | Higher = better entry now |
| **Composite** | Weighted combo (Quality 60% + Opp 40%) | 8+ | Balanced view of both |
| **Entry Signal** | Should you buy? | ENTRAR | 🟢 = Buy now, 🟡 = Wait, ⏸ = No |
| **RSI Weekly** | Momentum indicator | <38 | Lower = oversold (good entry) |
| **Dividend Yield** | Annual dividend % | 2%+ | Higher = passive income |
| **Recommended Leverage** | Suggested multiplier | 1.5-2.2x | See Kelly Criterion recommendation |

### Features

✓ **CSV Export** — Download comparison as CSV for analysis  
✓ **Auto-sorting** — Highest composite score at top  
✓ **Best recommendations** — "Best Now" (highest opportunity) vs "Best Quality" (highest quality)  
✓ **Mobile responsive** — Works on phone/tablet  

### Tips & Tricks

💡 **Tip 1: Find "Best Now" asset**
- The top row is always the highest quality
- Look for 🟢 ENTRAR signal
- Composite score 8+ = good entry

💡 **Tip 2: Compare similar sectors**
- Select all Utilities → see which is best value
- Select all Healthcare → benchmark against each other

💡 **Tip 3: Use with Backtest**
- Compare winners from backtest
- Verify recommended leverage matches Kelly

💡 **Tip 4: Check RSI < 38**
- Means oversold on weekly
- Combined with ENTRAR signal = strong entry

---

## Backtest Comparison Panel

### What Is It?
The Backtest Comparison Panel automatically analyzes your backtest results and tells you:
- Whether your strategy is better than alternatives (B&H 1x, 2x, S&P 500)
- Which strategy wins in each category (CAGR, Sharpe, Drawdown, Return)
- Whether you should actually use this strategy in production

### Where to Find It
1. Go to **Backtest** tab
2. Configure your strategy (e.g., "NEE, 2.5x leverage, 20 years")
3. Click **"Executar Backtest"**
4. Wait for results
5. Scroll down past the metrics table → **Comparison Panel**

### What You See

**Verdict Card (Top)**
```
┌─────────────────────────────────────────────────┐
│ ✓ Excelente — Adaptativo vence em TODOS       │
│   4 de 4 métricas principais                  │
└─────────────────────────────────────────────────┘
```

Verdicts:
- 🟢 **Excelente** — Wins all 4 metrics
- 🔵 **Muito Bom** — Wins 75%+ of metrics  
- 🟡 **Competitivo** — Trade-offs between strategies
- 🔴 **Considerar Alterar** — Another strategy is better

**Comparison Grids (4 sections)**
```
Each grid shows ranking:

MELHOR CAGR          MELHOR SHARPE
┌───────────────┐   ┌───────────────┐
│1. Seu Adap... │   │1. Seu Adap... │
│   12.8%       │   │   1.89        │
├───────────────┤   ├───────────────┤
│2. B&H 2x      │   │2. B&H 2x      │
│   14.1%       │   │   1.65        │
└───────────────┘   └───────────────┘

MENOR DRAWDOWN       MAIOR RETORNO
┌───────────────┐   ┌───────────────┐
│1. B&H 1x      │   │1. B&H 2x      │
│   -18.5%      │   │   +218%       │
├───────────────┤   ├───────────────┤
│2. Seu Adap... │   │2. Seu Adap... │
│   -21.3%      │   │   +187%       │
└───────────────┘   └───────────────┘
```

**Key Insights**
```
CAGR: Your Adaptive achieved 12.8% vs 8.2% in B&H 1x
      (57% better) ✓

Risco/Retorno (Sharpe): Your Adaptive supera B&H 2x 
      in quality of risk-adjusted return ✓

Proteção (Drawdown): Worst case was -21.3% 
      (expected with more leverage) ⚠
```

**Recommendation**
```
✅ The strategy is statistically superior. 
   You can advance with confidence.
```

### How to Interpret

| Verdict | Meaning | Action |
|---------|---------|--------|
| **Excelente** | Wins all 4 metrics | Deploy to production |
| **Muito Bom** | Wins 3/4 metrics | Deploy with confidence |
| **Competitivo** | Wins 2/4 metrics | Consider tweaks, test more |
| **Alterar** | Wins <2/4 metrics | Revise strategy parameters |

### Tips & Tricks

💡 **Tip 1: Understand Sharpe vs CAGR**
- High CAGR but low Sharpe = risky returns
- Your strategy should win BOTH

💡 **Tip 2: Drawdown matters**
- -40% drawdown = very scary (psychological break)
- Even if CAGR is high, high drawdown = risky

💡 **Tip 3: Compare with B&H 2x**
- B&H 2x is "simple baseline"
- If you can't beat B&H 2x with leverage, simplify

💡 **Tip 4: Check 2008/COVID/2022 performance**
- Scroll down to "Análise de Crises Históricas"
- Verify strategy survives crises
- If it doesn't, increase diversification

---

## Portfolio Sector Breakdown

### What Is It?
The Portfolio Sector Breakdown shows how your money is spread across sectors (Utilities, Healthcare, Tech, etc.). It helps you:
- Identify concentration risk (too much in one sector)
- Rebalance toward diversification
- Understand macro exposure

### Where to Find It
1. Go to **Portfolio** (Carteira) tab
2. Add at least one position
3. Scroll down → **Composição por Setor** (top of page, after equity curve)

### What You See

**Pie Chart**
```
           Utilities (40%)
          ╱              ╲
       40%                Healthcare
      ┌─┴─┐                 35%
      │   │            (35%)
      │   ├─────────────┤
   25°│   │25°          │35°
      │   │             │
      └─┬─┘             │
        └────────────────┘
       
Legend shows colors for each sector
```

**Sector Breakdown List**
```
🟩 Utilities       40%  ████████████████ $20,000
🟦 Healthcare      35%  ██████████████   $17,500  
🟨 REITs/Income    18%  ████████         $9,000
🟪 Technology      7%   ███              $3,500

Total Exposure: $50,000
Diversification: 4 sectors
```

**Insights**
```
💡 Maior exposição: Utilities (40%)
   Diversificação: 4 setores
   ⚠️ Consider rebalancing — one sector has >60%
```

### Sectors Detected

The app automatically detects:

**US Sectors**
- Utilities: NEE, SO, D, DUK, AEP, WEC, etc.
- Healthcare: JNJ, ABT, MDT, BMY, PFE, etc.
- Consumer Staples: PG, KO, PEP, MO, etc.
- Technology: AAPL, MSFT, NVDA, GOOGL, etc.
- REITs/Income: O, MAIN, STAG, WPC, etc.

**Brazilian Sectors**
- Utilities (BR): TAEE11.SA, EGIE3.SA, CPFE3.SA, etc.
- Banks (BR): ITUB4.SA, BBDC4.SA, BBAS3.SA, etc.
- Energy (BR): PETR4.SA, PETR3.SA, PRIO3.SA
- Other (BR): All other .SA tickers

**Crypto**
- Tokenized: Any ticker with "ONUSDT"

### Tips & Tricks

💡 **Tip 1: The 60% Rule**
- If one sector > 60%, rebalance
- That's too much concentration risk
- App will show ⚠️ warning

💡 **Tip 2: Diversify across sectors**
- Ideal: 4-6 sectors minimum
- Each 15-25% allocation
- Reduces specific sector risk

💡 **Tip 3: Use with Portfolio Management**
- Utilities are defensive (stable, dividends)
- Tech is volatile (growth, capital gains)
- Mix both for balance

💡 **Tip 4: Understand leverage impact**
- Sector breakdown shows leveraged value
- So 10 shares @ 2.0x = counts as 20 shares
- Real capital is lower, but exposure is higher

### Common Patterns

**Conservative Portfolio**
```
Utilities: 40%
Healthcare: 30%
REITs: 20%
Consumer Staples: 10%
→ Low volatility, high dividend yield
```

**Balanced Portfolio**
```
Utilities: 25%
Healthcare: 25%
Technology: 25%
Consumer: 25%
→ Diversified, moderate volatility
```

**Growth Portfolio**
```
Technology: 40%
Healthcare: 30%
Consumer: 20%
Utilities: 10%
→ Higher growth, higher volatility
```

---

## Summary

| Feature | When to Use | Goal |
|---------|------------|------|
| **Asset Comparison** | Before buying | Choose best asset to enter |
| **Backtest Comparison** | Before deploying strategy | Verify strategy is viable |
| **Sector Breakdown** | After opening positions | Monitor diversification risk |

---

## Need Help?

**Common Questions**

❓ **Q: Why does my asset have lower composite score but better entry signal?**
A: Entry signal = opportunity NOW (RSI low). Composite score = long-term quality. Both matter — combine them.

❓ **Q: What leverage should I use?**
A: Check "Recommended Leverage" in comparison table. Based on Kelly Criterion. Start with ½ Kelly (half recommendation).

❓ **Q: How often should I rebalance sectors?**
A: Monthly/quarterly. If sector > 60%, rebalance to 25-40% range.

❓ **Q: Is my drawdown too high?**
A: <-15% = acceptable. -15% to -30% = watch it. >-30% = reduce leverage.

---

**Questions? Ideas?** Contact support or check the tooltips (hover over any metric for explanation).

Good luck! 🚀
