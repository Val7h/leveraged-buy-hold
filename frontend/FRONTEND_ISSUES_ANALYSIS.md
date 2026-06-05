# LBH System Frontend - Sprint 1 Week 1 Analysis

## Current Performance Baseline (Jun 5, 2026)

### Homepage (Desktop)
- Performance: 77 ✅ (Target 75-78)
- Accessibility: 93 ✅ 
- Best Practices: 96 ✅
- SEO: 100 ✅

## Key Issues Identified (From Code Analysis)

### 1. Recharts Import Optimization
**Current Status**: All charts import recharts at component level (not lazy-loaded)
**Files Affected**:
- src/components/charts/DrawdownChart.tsx
- src/components/charts/EquityCurve.tsx
- src/components/charts/LeverageChart.tsx
- src/components/charts/MonteCarloChart.tsx
- src/components/charts/PortfolioEquityCurve.tsx
- src/components/charts/PriceTradeChart.tsx
- src/app/simulator/page.tsx
- src/components/assets/AssetChartModal.tsx

**Issue**: Recharts (~200KB minified) is loaded upfront on all pages even when charts aren't immediately visible
**Solution**: Implement dynamic imports for charts with React.lazy() or next/dynamic
**Estimated Impact**: +8-12 points mobile performance

### 2. Mobile Responsive Breakpoints
**Current Status**: Tailwind default breakpoints used
**Files Affected**: All components with responsive design
**Issue**: 
- Mobile navigation using hamburger menu (good)
- Missing `touch-target` size optimization (min 48px)
- No specific mobile breakpoint optimizations

**Solution**:
- Ensure all interactive elements >= 48px x 48px on mobile
- Add mobile-first media queries for charts height
- Optimize sidebar collapse trigger area

### 3. Missing Image Optimization
**Issue**: No dynamic image loading patterns identified
**Impact**: Icons via Lucide React (good - SVG)
**Action**: Add image width/height optimization for any raster assets

### 4. Memoization Opportunities
**Current**: Components not using React.memo()
**Files to Optimize**:
- MetricCard.tsx - renders in grid
- ScoreGauge.tsx - renders multiple times
- Chart components - expensive calculations

**Impact**: +5-8 points on mobile re-renders

### 5. Font Loading Strategy
**Current**: No visible Web Font optimization
**Issue**: TailwindCSS uses system fonts (good)
**Action**: Verify font-display: swap if custom fonts used

## Performance Budget

Current Desktop: 77
Target: 75-78 ✅

Current Mobile (estimated): ~65-68
Target: 70-72
Target by D14: 85

### Mobile Performance Gap Analysis
- Recharts lazy-loading: +10pts
- Responsive image optimization: +3pts  
- Memoization: +5pts
- Touch target fixes: +2pts
- Code splitting: +5pts

## Compliance Checklist

### Accessibility (Target: 93+)
- Current: 93 ✅
- Lighthouse: A11y score maintained
- TODO: Verify WCAG 2.1 AA compliance on all pages

### Best Practices (Target: 96+)
- Current: 96 ✅
- Check: Console errors/warnings
- Check: Third-party cookies/tracking

### SEO (Target: 100)
- Current: 100 ✅
- Maintain: Meta tags, structured data

## Implementation Priority

**Day 1 (Done)**: Lighthouse audit all pages
**Day 2 (Fri)**: Prioritize fixes + identify 3 major UX issues
**Day 5-6 (Mon-Tue)**: 
1. Breakpoint refactoring
2. Lazy-load Recharts + memoization
3. Touch target fixes

**Expected Outcomes**:
- Desktop: 77 → 78 (cosmetic)
- Mobile: ~65 → 72 (+7pts)
- By June 14: 85 mobile ✅

