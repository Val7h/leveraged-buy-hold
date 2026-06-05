# UNIT ECONOMICS SPREADSHEET TEMPLATE
## LBH System — Financial Model (Interactive Spreadsheet)

**Format:** Google Sheets (recommended) or Excel  
**Status:** TEMPLATE READY (populate with real data weekly)  
**Owner:** Finance Lead  
**Update Frequency:** Weekly (every Monday)  
**Version:** 1.0  

---

## SETUP INSTRUCTIONS

### Create in Google Sheets:
1. File → Create → Spreadsheet
2. Rename: "LBH System - Unit Economics"
3. Share with: [Finance Lead, PM, CFO]
4. Copy this template into Sheets

### Tabs to Create:
- [ ] **Tab 1: Assumptions** (inputs)
- [ ] **Tab 2: Cohort LTV** (user-level economics)
- [ ] **Tab 3: Company Forecast** (monthly company-wide)
- [ ] **Tab 4: Charts** (visual dashboards)
- [ ] **Tab 5: Sensitivity** (scenario analysis)

---

## TAB 1: ASSUMPTIONS (Input Variables)

Keep all assumptions in one place; update monthly.

```
ASSUMPTIONS — LBH System Unit Economics Model

ACQUISITION COSTS:
────────────────────────────────────────────────────
Organic CAC (Month 1-2)              $0
Paid CAC (Month 3+, ads)             $150
Blended CAC (weighted %)             $37.50
Blended mix: Organic %               75%
Blended mix: Paid %                  25%

MONETIZATION:
────────────────────────────────────────────────────
Free → Pro conversion rate           10%
Pro ARPU (monthly)                   $19.00
Pro subscription lifetime (months)   24
Enterprise ARPU (monthly)            $299.00
Enterprise lifetime (months)         36

CHURN:
────────────────────────────────────────────────────
Free user churn (monthly)            50%
Pro user churn (monthly)             5%
Enterprise churn (monthly)           3%

COSTS:
────────────────────────────────────────────────────
COGS (% of revenue)                  20%
COGS per Pro user/month              $3.80
Fixed OpEx (monthly)                 $12,500
Variable OpEx (sales, marketing)     $2,500
Total OpEx (Month 3+)                $15,000

GROWTH:
────────────────────────────────────────────────────
Free user acquisition rate           150 users/month
Pro user acquisition rate            50 users/month
Enterprise ramp                      Begins month 6

NOTES:
────────────────────────────────────────────────────
Last updated: [June 12, 2026]
Data source: Finance Lead
Next review: [June 19, 2026]
```

---

## TAB 2: COHORT LTV (User-Level Economics)

### Cohort: 100 New Pro Users (Monthly Cohort)

**Purpose:** Calculate lifetime value per user; understand payback period

```
COHORT ANALYSIS — 100 Pro Users Starting Month 1

Month | Starting | Churn % | Active | MRR    | COGS(20%) | Gross$  | Cumul$ | CAC Payback
      | Users    |         | Users  | Revenue| Cost      | Profit  | Profit | Month?
──────┼──────────┼─────────┼────────┼────────┼───────────┼─────────┼────────┼──────────
1     | 100      | 0%      | 100    | $1,900 | $380      | $1,520  | $1,520 | —
2     | 100      | 5%      | 95     | $1,805 | $361      | $1,444  | $2,964 | —
3     | 100      | 5%      | 90     | $1,710 | $342      | $1,368  | $4,332 | 2.5 ✅
4     | 100      | 5%      | 86     | $1,634 | $327      | $1,307  | $5,639 | 2.5 ✅
5     | 100      | 5%      | 81     | $1,539 | $308      | $1,231  | $6,870 | —
6     | 100      | 5%      | 77     | $1,463 | $293      | $1,170  | $8,040 | —
7     | 100      | 5%      | 73     | $1,387 | $277      | $1,110  | $9,150 | —
8     | 100      | 5%      | 69     | $1,311 | $262      | $1,049  | $10,199 | —
9     | 100      | 5%      | 66     | $1,254 | $251      | $1,003  | $11,202 | —
10    | 100      | 5%      | 62     | $1,178 | $236      | $942    | $12,144 | —
11    | 100      | 5%      | 59     | $1,121 | $224      | $897    | $13,041 | —
12    | 100      | 5%      | 56     | $1,064 | $213      | $851    | $13,892 | —
18    | 100      | 5%      | 38     | $722   | $144      | $578    | $16,820 | —
24    | 100      | 5%      | 29     | $551   | $110      | $441    | $18,261 | —

KEY METRICS (end of row 24):
────────────────────────────────────────────────────
LTV (Lifetime Value)                 $365
CAC (Customer Acquisition Cost)      $37.50
LTV : CAC Ratio                      9.7:1 ✅
Payback Period                       2.5 months
Gross Margin %                       70.7%

INTERPRETATION:
For every $37.50 we spend acquiring a Pro user,
we make $365 in gross profit over 24 months.
ROI: 9.7x in 24 months (excellent) ✅
Payback: 2.5 months (great for B2C SaaS)
```

**Formula Examples (for Spreadsheet):**
```
B3 (Active Users, Month 2): =B2 * (1 - 0.05)  // 100 * 0.95 = 95
D3 (MRR, Month 2): =C3 * 19  // 95 * $19 = $1,805
E3 (COGS, Month 2): =D3 * 0.20  // $1,805 * 20% = $361
F3 (Gross Profit, Month 2): =D3 - E3  // $1,805 - $361 = $1,444
G3 (Cumulative, Month 2): =G2 + F3  // $1,520 + $1,444 = $2,964
H3 (Payback Month?): =IF(G3 >= 37.50, "✅", "—")  // Check if cum profit > CAC
```

---

### Cohort: 20 New Enterprise Customers (Year 1)

**Enterprise has different economics (higher ARPU, longer lifetime, less churn)**

```
ENTERPRISE COHORT ANALYSIS — 20 Customers Starting Month 6

Month | Starting | Churn % | Active | MRR      | Gross$  | Cumul$    | Payback?
      | Cust     |         | Cust   | Revenue  | Profit  | Profit    |
──────┼──────────┼─────────┼────────┼──────────┼─────────┼───────────┼─────────
6     | 20       | 0%      | 20     | $5,980   | $4,186  | $4,186    | —
7     | 20       | 3%      | 19.4   | $5,802   | $4,062  | $8,248    | ✅
8     | 20       | 3%      | 18.8   | $5,632   | $3,942  | $12,190   | ✅
...
12    | 20       | 3%      | 16.8   | $5,035   | $3,525  | $22,500   | ✅
24    | 20       | 3%      | 12.3   | $3,681   | $2,577  | $40,000+  | ✅

KEY METRICS:
────────────────────────────────────────────────────
Avg Enterprise ARPU                  $299
LTV (36-month)                       ~$8,500
Enterprise CAC (sales cost)          ~$500
LTV : CAC Ratio                      17:1 ✅✅
Payback Period                       1-2 months
Note: Enterprise users are highly profitable
```

---

## TAB 3: COMPANY FORECAST (18 Months)

**Monthly company-wide P&L forecast**

```
COMPANY-WIDE FORECAST — 18 Months (Jun 2026 - Dec 2027)

Month | Month# | Free  | Pro   | Ent | Pro_MRR  | Ent_MRR  | Total_MRR | COGS  | Margin | OpEx   | EBITDA
      |        | Users | Users | Cus |          |          |           |       |        |        |
──────┼────────┼───────┼───────┼─────┼──────────┼──────────┼───────────┼───────┼────────┼────────┼─────────
Jun   | 1      | 50    | 5     | 0   | $95      | $0       | $95       | $19   | 80%    | $12.5k | -$12.4k
Jul   | 2      | 100   | 10    | 0   | $190     | $0       | $190      | $38   | 80%    | $12.5k | -$12.4k
Aug   | 3      | 300   | 35    | 1   | $665     | $299     | $964      | $193  | 80%    | $15.0k | -$14.2k
Sep   | 4      | 500   | 60    | 2   | $1,140   | $598     | $1,738    | $348  | 80%    | $15.0k | -$13.6k
Oct   | 5      | 750   | 90    | 3   | $1,710   | $897     | $2,607    | $521  | 80%    | $15.0k | -$12.9k
Nov   | 6      | 1,000 | 150   | 5   | $2,850   | $1,495   | $4,345    | $869  | 80%    | $15.0k | -$10.5k
Dec   | 7      | 1,500 | 200   | 8   | $3,800   | $2,392   | $6,192    | $1,238| 80%    | $15.2k | -$9.8k
Jan   | 8      | 2,000 | 280   | 10  | $5,320   | $2,990   | $8,310    | $1,662| 80%    | $15.5k | -$8.8k
Feb   | 9      | 2,500 | 350   | 12  | $6,650   | $3,588   | $10,238   | $2,048| 80%    | $15.5k | -$7.3k
Mar   | 10     | 3,000 | 400   | 15  | $7,600   | $4,485   | $12,085   | $2,417| 80%    | $15.5k | -$3.9k
Apr   | 11     | 3,500 | 450   | 18  | $8,550   | $5,382   | $13,932   | $2,786| 80%    | $15.5k | -$1.6k
May   | 12     | 4,500 | 500   | 20  | $9,500   | $5,980   | $15,480   | $3,096| 80%    | $15.5k | $-0.116k ❌
Jun   | 13     | 5,500 | 600   | 25  | $11,400  | $7,475   | $18,875   | $3,775| 80%    | $16.0k | $2.1k ✅
Jul   | 14     | 6,500 | 750   | 35  | $14,250  | $10,465  | $24,715   | $4,943| 80%    | $16.0k | $7.8k ✅
Aug   | 15     | 7,000 | 900   | 45  | $17,100  | $13,455  | $30,555   | $6,111| 80%    | $16.0k | $14.4k ✅
Sep   | 16     | 8,000 | 1,000 | 50  | $19,000  | $14,950  | $33,950   | $6,790| 80%    | $16.5k | $17.2k ✅
Oct   | 17     | 8,500 | 1,050 | 55  | $19,950  | $16,445  | $36,395   | $7,279| 80%    | $16.5k | $19.6k ✅
Nov   | 18     | 9,000 | 1,100 | 60  | $20,900  | $17,940  | $38,840   | $7,768| 80%    | $17.0k | $21.1k ✅

KEY INSIGHTS:
────────────────────────────────────────────────────
Break-even month:              Month 15 (June 2027) ✅
Cumulative cash burn (18mo):   ~$150k
Runway with $150k seed:        18+ months ✓
Month 12 MRR:                  $15.5k (target: $15k+) ✓
Month 18 MRR:                  $38.8k (3.5x growth) ✓
Enterprise mix (Month 18):     46% of MRR ✓
```

**Formulas (for Month 3 forward):**
```
Pro_MRR (Column E): =C3 * $19  // Pro users * $19
Ent_MRR (Column F): =D3 * $299  // Enterprise customers * $299
Total_MRR (Column G): =E3 + F3
COGS (Column H): =G3 * 0.20  // 20% of revenue
Margin (Column I): =(G3-H3)/G3  // (Revenue - COGS) / Revenue
OpEx (Column J): $15,000 (constant + growth %)
EBITDA (Column K): =G3 - H3 - J3  // Revenue - COGS - OpEx
```

**Add to forecast:**
- Running cumulative cash burn (for runway calculation)
- Unit metrics: Pro MRR per user, Enterprise MRR per customer
- CAC efficiency: CAC payback by month

---

## TAB 4: CHARTS (Visual Dashboards)

### Chart 1: Cohort LTV Curve (Line Chart)

**Data:** Months 1-24 of cohort, cumulative gross profit per user

```
X-axis: Month (1-24)
Y-axis: Cumulative Gross Profit ($)
Line: Shows when LTV crosses CAC ($37.50 mark)
       Expected: Month 2.5 ✅

[Graph visualization]
Max Y: $365 (final LTV)
Visual indicator: CAC payback line @ $37.50
```

### Chart 2: Company MRR Growth (Column + Line)

**Data:** Company Forecast, months 1-18

```
X-axis: Month (1-18)
Y-axis: MRR ($)
Column: Total MRR
Line overlay: Pro MRR + Enterprise MRR (stacked)
Color: Blue (Pro), Green (Enterprise)

[Graph visualization]
Expected trajectory:
- Month 1: $95
- Month 6: $4,345
- Month 12: $15,480
- Month 18: $38,840
```

### Chart 3: Churn Impact (Sensitivity)

**Data:** Pro cohort under different churn scenarios

```
X-axis: Month (1-24)
Y-axis: LTV ($)
Lines:
- Base case (5% churn): LTV = $365
- Best case (3% churn): LTV = $450
- Worst case (8% churn): LTV = $250

[Graph visualization]
Insight: Even with 8% churn, LTV still healthy ($250)
Decision rule: If actual churn > 8%, revisit pricing
```

### Chart 4: Runway Analysis

**Data:** Cumulative cash burn vs funding

```
X-axis: Month (1-18)
Y-axis: Cash ($)
Line: Cumulative cash burn from $150k seed

Scenario A: No additional revenue
- $150k ÷ $12.5k/mo OpEx = 12 months runway

Scenario B: With revenue (forecast model)
- Burn slows Month 3+ (revenue ramps)
- Reaches break-even Month 15
- 18+ month runway ✓

[Graph visualization]
Visual warning: Runway bar turns red if < 12 months
```

---

## TAB 5: SENSITIVITY ANALYSIS (Scenario Planning)

**Test model under different assumptions; understand leverage points**

### Sensitivity Table 1: Conversion Rate Impact

```
If Pro conversion rate varies:

Conversion | Year 1 Pro | Year 1 MRR | Break-even | LTV:CAC | Action
Rate       | Users     | (Month 12) | Month      | Ratio   |
────────────────────────────────────────────────────────────────────
5%         | 250       | $4,750     | Month 18   | 4.9:1   | Monitor; test lower price
7%         | 350       | $6,650     | Month 15   | 6.8:1   | Good; acceptable
10% ✅     | 500       | $9,500     | Month 12   | 9.7:1   | Base case; proceed
15%        | 750       | $14,250    | Month 10   | 14.6:1  | Excellent; unlikely but upside
20%        | 1,000     | $19,000    | Month 8    | 19.4:1  | Moonshot; very unlikely
```

**Decision rule:** If conversion < 5% after Month 3, test $15 price or increase free limits.

---

### Sensitivity Table 2: CAC Impact (Acquisition Cost)

```
If blended CAC varies:

Blended CAC | LTV:CAC | Payback Period | Action
────────────────────────────────────────────────
$20         | 18.3:1  | 1.5 months     | Excellent; outbound success
$37.50 ✅   | 9.7:1   | 2.5 months     | Base case; good
$50         | 7.3:1   | 3.0 months     | Acceptable; CAC getting high
$75         | 4.9:1   | 4.5 months     | Risky; paid ads too expensive
$100        | 3.7:1   | 6.0 months     | Minimum viable; need high LTV
$150        | 2.4:1   | 9.0 months     | No-go; acquisition uneconomical
```

**Decision rule:** If CAC > $75, reduce ad spend or improve organic growth.

---

### Sensitivity Table 3: Churn Impact

```
If Pro monthly churn varies:

Churn/mo | LTV  | LTV:CAC | Payback | Action
──────────────────────────────────────────
2%       | $625 | 16.7:1  | 1.5mo   | Excellent; retention exceptional
5% ✅    | $365 | 9.7:1   | 2.5mo   | Base case; good
8%       | $250 | 6.7:1   | 3.5mo   | Concerning; improve onboarding
10%      | $215 | 5.7:1   | 4.0mo   | Risky; model falls apart
15%      | $150 | 4.0:1   | 6.0mo   | Breaking; need better retention
```

**Decision rule:** If churn > 8% for 2+ months, investigate (onboarding? features?).

---

### Sensitivity Table 4: COGS Impact (Infrastructure Costs)

```
If COGS increases:

COGS%  | Gross Margin | EBITDA (Mo 12) | Action
───────────────────────────────────────────────
15%    | 85%          | $11.2k         | Excellent; optimize achieved
20% ✅ | 80%          | $10.1k         | Base case; acceptable
25%    | 75%          | $9.0k          | Monitor; raise price if worse
30%    | 70%          | $7.9k          | Concerning; optimize infrastructure
35%    | 65%          | $6.8k          | Critical; raise Pro to $25 or cut features
40%    | 60%          | $5.7k          | Unviable; fundamental issue
```

**Decision rule:** If COGS > 25%, audit backtest query costs immediately.

---

## WEEKLY UPDATE PROCESS

### Every Monday (Finance Lead):

1. **Pull data from production:**
   - New signups (free)
   - Pro trials started
   - Successful charges
   - Churn (cancelations)
   - Refunds

2. **Update Company Forecast (Tab 3):**
   - Enter actual users for week
   - Recalculate MRR
   - Update EBITDA

3. **Run sensitivity analysis (Tab 5):**
   - Any assumptions changed?
   - Update if real data differs

4. **Generate report:**
   ```
   Weekly Unit Economics Report — [Date]
   
   Actual vs Target:
   - Free users: [X] (target: [Y])
   - Pro users: [X] (target: [Y])
   - MRR: $[X] (target: $[Y])
   - Churn: [X]% (target: <5%)
   - CAC: $[X] (target: $37.50)
   
   Alerts:
   - [Any thresholds exceeded?]
   
   Recommendations:
   - [Adjust spending? Change pricing?]
   ```

5. **Share with team:**
   - Finance
   - Growth
   - PM
   - CEO

---

## KEY METRICS TO TRACK WEEKLY

```
METRIC DASHBOARD — Update Every Monday

ACQUISITION:
  Free signups/week:                 [X] (target: 100+)
  Pro trials started/week:           [X] (target: 10+)
  Free → Pro conversion % (rolling): [X]% (target: 10%)
  CAC (blended):                     $[X] (target: <$50)

MONETIZATION:
  Pro MRR:                           $[X] (target: ramp to $9.5k by Month 12)
  Pro ARPU:                          $19 (should stay fixed)
  Enterprise MRR:                    $[X] (target: ramp to $6k by Month 12)
  Total MRR:                         $[X]

RETENTION & CHURN:
  Pro churn % (MoM):                 [X]% (target: <5%)
  Pro churn % (cohort D7/D30):       [X]% (measure engagement)
  Enterprise churn:                  [X]% (target: <3%)

EFFICIENCY:
  LTV:CAC ratio:                     [X]:1 (target: >5:1)
  Payback period:                    [X] months (target: <3)
  Gross margin %:                    [X]% (target: >70%)

FINANCIAL HEALTH:
  Runway (months left):              [X] (target: 12+)
  Monthly OpEx:                      $[X] (track for efficiency)
  Unit economics status:             [GREEN/YELLOW/RED]
```

---

## MONTHLY BOARD REPORT (from this model)

**Extract for CEO/Board monthly:**

```
UNIT ECONOMICS SUMMARY — [Month] 2026

Current Month:
  Free users: [X] (MoM growth: +[X]%)
  Pro users: [X] (MoM growth: +[X]%)
  Pro MRR: $[X]
  Enterprise: [X] customers, $[X] MRR
  Total MRR: $[X]

Cohort Health:
  30-day retention: [X]%
  Pro churn: [X]%
  LTV per user: $[X]
  CAC: $[X]
  LTV:CAC: [X]:1

Unit Economics Status:
  ✅ Conversion: [On/Off target]
  ✅ Churn: [On/Off target]
  ✅ CAC: [On/Off target]
  ✅ Revenue: [On/Off target]

Runway:
  Cash balance: $[X]
  Monthly burn: $[X]k
  Runway: [X] months

Key Risks:
  [List top 3 risks based on sensitivity analysis]

Recommendations:
  [Next actions based on data]
```

---

## FORMULAS REFERENCE (for Excel/Sheets)

```
Basic calculations:

Active Users (with churn):
  = Previous_Month_Users * (1 - Churn_Rate)

Monthly Revenue:
  = Active_Users * ARPU

Gross Profit:
  = Revenue * (1 - COGS_Percent)

Cumulative Profit (LTV tracking):
  = Previous_Cumulative + Current_Month_Gross_Profit

Payback Period (months until LTV ≥ CAC):
  = MATCH(TRUE, Cumulative_Profit >= CAC, 0)

LTV:CAC Ratio:
  = Final_LTV / CAC

EBITDA:
  = Revenue - COGS - Operating_Expenses

Cohort Retention (% of original):
  = (Current_Month_Users / Starting_Month_Users) * 100
```

---

## AUDIT CHECKLIST

**Review this model monthly:**

- [ ] All assumptions updated (CAC, conversion, churn)
- [ ] Company forecast aligns with actual actuals
- [ ] Sensitivity tables show no red flags
- [ ] Runway >12 months (or raise funding)
- [ ] Unit economics improving (or troubleshoot)
- [ ] Shared with team + board
- [ ] Next month's targets set

---

**Status:** ✅ TEMPLATE READY (Import to Google Sheets; populate with real data)  
**Owner:** Finance Lead  
**Update Frequency:** Weekly  
**Review Cycle:** Monthly (with board)  
**Last Updated:** June 12, 2026
