# Sprint 1 Week 1 - Issues Prioritization & Fix Estimates
**Generated**: June 5, 2026  
**Status**: Ready for Implementation

---

## Overview

Based on Lighthouse baseline audit and code analysis, 3 major UX issues identified. Estimated implementation time: 4-5 hours total. Performance gain: +15-20 Lighthouse points mobile.

---

## Issue #1: Recharts Lazy-Loading (HIGH PRIORITY)

**Severity**: 🔴 HIGH  
**Complexity**: 🟡 MEDIUM  
**Implementation Time**: 1-2 hours  
**Performance Gain**: +10 points mobile

### Problem

Recharts library (200KB minified) is imported at component level on 8 pages:
- Dashboard (EquityCurve, DrawdownChart, etc.)
- Backtest (multiple chart types)
- Simulator
- Assets (AssetChartModal)
- Sharpe Compare
- Portfolio

This forces ~200KB of JavaScript to be loaded upfront even if charts aren't visible in viewport or on first paint.

### Current Code Pattern

```typescript
// CURRENT: Imported at top, always loaded
import { AreaChart, Area, XAxis, YAxis, ... } from "recharts";

export default function EquityCurve({ data }: EquityCurveProps) {
  return (
    <ResponsiveContainer>
      <AreaChart data={data}>
        {/* chart content */}
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Solution: Dynamic Imports + React.lazy

**Step 1**: Wrap chart components in lazy()

```typescript
// src/components/charts/EquityCurve.tsx - NO CHANGES NEEDED
// (leave component as-is, just exported normally)

// src/lib/lazyCharts.ts - NEW FILE
import { lazy } from "react";

export const LazyEquityCurve = lazy(() => import("@/components/charts/EquityCurve"));
export const LazyDrawdownChart = lazy(() => import("@/components/charts/DrawdownChart"));
export const LazyLeverageChart = lazy(() => import("@/components/charts/LeverageChart"));
export const LazyMonteCarloChart = lazy(() => import("@/components/charts/MonteCarloChart"));
export const LazyPortfolioEquityCurve = lazy(() => import("@/components/charts/PortfolioEquityCurve"));
export const LazyPriceTradeChart = lazy(() => import("@/components/charts/PriceTradeChart"));
```

**Step 2**: Create Suspense fallback skeleton

```typescript
// src/components/charts/ChartSkeleton.tsx - NEW FILE
export function ChartSkeleton({ height = 340 }: { height?: number }) {
  return (
    <div className="card" style={{ height }}>
      <div className="animate-pulse">
        <div className="h-4 bg-surface-2 rounded w-24 mb-4" />
        <div className="h-full bg-surface-2 rounded" />
      </div>
    </div>
  );
}
```

**Step 3**: Update consumer pages

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from "react";
import { LazyEquityCurve } from "@/lib/lazyCharts";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";

// Inside render:
<Suspense fallback={<ChartSkeleton />}>
  <LazyEquityCurve data={data} title="Curva de Patrimônio" />
</Suspense>
```

### Files to Modify

- [ ] src/lib/lazyCharts.ts (NEW)
- [ ] src/components/charts/ChartSkeleton.tsx (NEW)
- [ ] src/app/dashboard/page.tsx
- [ ] src/app/backtest/page.tsx
- [ ] src/app/simulator/page.tsx
- [ ] src/app/sharpe-compare/page.tsx
- [ ] src/components/assets/AssetChartModal.tsx

### Testing Checklist

- [ ] Devtools: Network tab shows recharts.js loaded AFTER user scrolls to chart
- [ ] Devtools: First Contentful Paint (FCP) faster
- [ ] Mobile: Charts still render correctly
- [ ] Accessibility: Skeleton announcement to screen readers
- [ ] Performance: Lighthouse +10 points

---

## Issue #2: Mobile Breakpoint Optimization (MEDIUM PRIORITY)

**Severity**: 🟡 MEDIUM  
**Complexity**: 🟡 MEDIUM  
**Implementation Time**: 2-3 hours  
**Performance Gain**: +3 points mobile + improved UX
**Accessibility Gain**: +1-2 points

### Problem

Current design uses `grid grid-cols-2 lg:grid-cols-4` which shows 2 columns on mobile. This causes:

1. **Touch Target Issue**: Buttons/interactive elements too close on small screens (< 48px)
2. **Chart Heights**: Charts not optimized for mobile viewport height
3. **Missing md: breakpoint**: Jump from mobile (2-col) to desktop (4-col) with no middle ground

### Current Responsive Pattern

```html
<!-- Dashboard metrics grid -->
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- 2 columns on mobile, jumps to 4 on lg (1024px+) -->
</div>

<!-- Positions grid -->
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Good: 1 on mobile, 2 on tablet -->
</div>
```

### Solution: Mobile-First Breakpoint Refactoring

**Principle**: Every interactive element >= 48px x 48px on mobile

**Step 1**: Update MetricCard sizing

```typescript
// src/components/ui/MetricCard.tsx
export default function MetricCard({
  // ... props
  className,
  large = false,
}: MetricCardProps) {
  return (
    <div className={cn(
      "card relative overflow-hidden min-h-[100px] sm:min-h-[90px]",
      // ... rest of classes
      className
    )}>
      <div className="flex flex-col sm:flex-row items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-[11px] font-medium text-text-muted uppercase">
            {label}
          </p>
          <p className={cn(
            "font-semibold text-text-primary font-mono leading-none",
            large ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          )}>
            {value}
          </p>
        </div>
        {icon && (
          <div className="w-12 h-12 sm:w-9 sm:h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 ml-0 sm:ml-3 mt-2 sm:mt-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2**: Update dashboard grid layouts

```typescript
// src/app/dashboard/page.tsx
// Replace:
// <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
// With:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
  {/* Now: 1 col (mobile) → 2 col (tablet) → 4 col (desktop) */}
</div>
```

**Step 3**: Optimize chart heights

```typescript
// src/components/charts/EquityCurve.tsx
export default function EquityCurve({
  data,
  title = "Curva de Patrimônio",
  height = 340,
}: EquityCurveProps) {
  // Responsive height based on device
  const responsiveHeight = typeof window !== "undefined" && window.innerWidth < 640
    ? 220  // Mobile
    : height;
  
  return (
    <div className="card">
      <h3 className="text-xs sm:text-sm font-semibold text-text-primary mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={responsiveHeight}>
        {/* chart */}
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 4**: Verify touch targets

All buttons must have minimum 48x48px on mobile:

```typescript
// Interactive buttons
<button className="p-3 sm:p-2 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center">
  {icon}
</button>

// Or use explicit padding
<button className="px-3 py-2.5 sm:px-2 sm:py-1.5 min-h-[48px]">
  Click me
</button>
```

### Files to Modify

- [ ] src/components/ui/MetricCard.tsx
- [ ] src/components/charts/*.tsx (all chart components)
- [ ] src/app/dashboard/page.tsx
- [ ] src/app/portfolio/page.tsx
- [ ] src/app/backtest/page.tsx
- [ ] src/app/simulator/page.tsx
- [ ] src/components/layout/Sidebar.tsx

### Testing Checklist

- [ ] Mobile (320px): All elements readable, touch targets >= 48px
- [ ] Tablet (768px): Optimal 2-column layout
- [ ] Desktop (1024px+): Full 4-column layout
- [ ] Responsive metrics: Fonts scale appropriately
- [ ] Charts: Height optimized for mobile (no wasted space)
- [ ] Lighthouse: +3 points mobile

---

## Issue #3: Component Memoization (MEDIUM PRIORITY)

**Severity**: 🟡 MEDIUM  
**Complexity**: 🟢 LOW  
**Implementation Time**: 1 hour  
**Performance Gain**: +5 points mobile

### Problem

React components re-render unnecessarily when parent state changes:

1. **MetricCard**: Renders 8x per dashboard refresh even if values unchanged
2. **ScoreGauge**: Renders multiple times during portfolio updates
3. **Chart components**: Heavy calculations (merging data, filtering dates) run on every parent re-render
4. **SignalCard**: Renders in list, no memo = full list re-renders on one signal change

### Current Code

```typescript
// CURRENT: No memoization
export default function MetricCard({ label, value, subValue, ... }: MetricCardProps) {
  return (
    <div className="card">
      {/* renders every parent update */}
    </div>
  );
}
```

### Solution: React.memo + useMemo

**Step 1**: Memoize simple presentational components

```typescript
// src/components/ui/MetricCard.tsx
import { memo } from "react";

const MetricCard = memo(
  function MetricCard({
    label,
    value,
    subValue,
    trend,
    accent = "default",
    icon,
    className,
    large = false,
  }: MetricCardProps) {
    const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-text-secondary";

    return (
      <div className={cn("card relative overflow-hidden", accentClasses[accent], className)}>
        {/* component content */}
      </div>
    );
  },
  (prev, next) => {
    // Custom comparison: only re-render if these props change
    return (
      prev.value === next.value &&
      prev.label === next.label &&
      prev.subValue === next.subValue &&
      prev.accent === next.accent &&
      prev.trend === next.trend &&
      prev.large === next.large
    );
  }
);

export default MetricCard;
```

**Step 2**: Memoize chart components

```typescript
// src/components/charts/EquityCurve.tsx
import { memo, useMemo } from "react";

const EquityCurve = memo(function EquityCurve({
  data,
  title = "Curva de Patrimônio",
  height = 340,
}: EquityCurveProps) {
  // Memoize expensive calculation
  const mergedData = useMemo(() => {
    if (!data || Object.keys(data).length === 0) return [];
    
    const strategies = Object.keys(data);
    const allDates = [...new Set(strategies.flatMap((s) => data[s].map((d) => d.date)))].sort();

    return allDates.map((date) => {
      const point: DataPoint = { date: date.slice(0, 7) };
      strategies.forEach((s) => {
        const d = data[s].find((x) => x.date === date);
        if (d) point[s] = d.value;
      });
      return point;
    });
  }, [data]); // Only recalculate when data changes

  if (!mergedData.length) return null;

  const sample = mergedData.filter((_, i) => i % 15 === 0 || i === mergedData.length - 1);

  return (
    // component
  );
});

export default EquityCurve;
```

**Step 3**: Memoize SignalCard

```typescript
// src/app/dashboard/page.tsx
const SignalCard = memo(function SignalCard({
  s,
  onBuy,
}: {
  s: any;
  onBuy: (ticker: string, leverage: number) => void;
}) {
  const display = s.is_tokenized ? (s.underlying_ticker ?? s.ticker.replace("ONUSDT", "")) : s.ticker;
  const rsi = s.rsi_weekly ?? s.rsi;
  const sigCls = SIGNAL_COLORS[s.entry_signal] ?? "text-text-muted bg-surface-2 border-border";

  return (
    // component
  );
});
```

### Files to Modify

- [ ] src/components/ui/MetricCard.tsx
- [ ] src/components/ui/ScoreGauge.tsx
- [ ] src/components/charts/EquityCurve.tsx
- [ ] src/components/charts/DrawdownChart.tsx
- [ ] src/components/charts/LeverageChart.tsx
- [ ] src/components/charts/MonteCarloChart.tsx
- [ ] src/components/charts/PortfolioEquityCurve.tsx
- [ ] src/app/dashboard/page.tsx (SignalCard)
- [ ] src/app/portfolio/page.tsx (if has similar patterns)

### Testing Checklist

- [ ] React DevTools Profiler: Reduced re-renders on state update
- [ ] Dashboard: Refresh signals doesn't re-render metric cards
- [ ] Charts: Update data only recalculates when data prop changes
- [ ] Mobile: Smoother scrolling/interactions
- [ ] Lighthouse: +5 points mobile

---

## Implementation Timeline

### Friday, June 6
- [ ] 09:00-10:00: Create lazy chart infrastructure (lazyCharts.ts, ChartSkeleton)
- [ ] 10:00-11:30: Update dashboard + backtest with lazy imports
- [ ] 11:30-12:00: Test and commit Issue #1

### Saturday, June 7  
- [ ] 09:00-11:00: Breakpoint refactoring (MetricCard, grid updates)
- [ ] 11:00-12:30: Chart height optimization
- [ ] 12:30-14:00: Test mobile layouts + Lighthouse audit
- [ ] 14:00-15:00: Commit Issue #2

### Sunday, June 8
- [ ] 09:00-10:00: Add memoization to components
- [ ] 10:00-11:00: Test performance improvements
- [ ] 11:00-12:00: Final Lighthouse audit + commit Issue #3

### Monday, June 9
- [ ] Full mobile Lighthouse audit all 11 pages
- [ ] Verify mobile performance gains: target 70-72 points

---

## Success Criteria

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Desktop Performance | 77 | Maintain 77+ | ⏳ |
| Mobile Performance | ~65-68 (est.) | 70-72 | ⏳ |
| Page Load Time | TBD | < 3s mobile 3G | ⏳ |
| Interactive Elements | < 48px some | All >= 48px | ⏳ |
| Component Re-renders | High | Optimized | ⏳ |

---

## Notes

- All changes must maintain backward compatibility
- No breaking changes to component props
- Test on real mobile device (not just browser emulation)
- Collect before/after Lighthouse metrics
- Screenshot responsive layouts for documentation

---

**Next Review**: June 6, 2026 (Friday)  
**Implementation Status**: READY ✅  
**Estimated Total Time**: 4-5 hours  
**Expected Outcome**: +15-20 Lighthouse points mobile  
