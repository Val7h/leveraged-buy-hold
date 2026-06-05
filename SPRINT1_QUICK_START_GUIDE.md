# 🚀 SPRINT 1 — Quick Start Guide
## LBH Frontend Optimization — 2 Week Sprint

**Duration:** 2 weeks (10 working days)  
**Effort:** 40 hours  
**Goal:** Lighthouse 75+ desktop, Mobile UX 80+, Disclaimer ✅

---

## 📋 PRE-SPRINT SETUP (2 hours)

### ✅ Day 0 (Friday 14:00)

#### 1. Create working branch
```bash
cd frontend
git checkout -b sprint-1-frontend-audit
git push -u origin sprint-1-frontend-audit
```

#### 2. Install testing tools (for Week 2)
```bash
npm install --save-dev @playwright/test vitest @vitest/ui \
  react-testing-library @testing-library/jest-dom jsdom
```

#### 3. Setup Lighthouse CI locally (optional)
```bash
npm install -g @lhci/cli@latest
lhci autorun --config=lighthouserc.json
```

#### 4. Create performance baseline
```bash
# Run Lighthouse on current state
# Desktop (Chrome incognito):
open "http://localhost:3000/dashboard"
# DevTools → Lighthouse → Generate report
# Save to: LIGHTHOUSE_W0_BASELINE.md

# Mobile (DevTools device emulation)
# Same process, note scores
```

#### 5. Assign tasks to team
```
Frontend Developer 1: Days 1-2 (breakpoints), Days 3-4 (lazy-loading)
Frontend Developer 2: Days 3-4 (TypeScript), Days 5+ (tests)
QA: Run manual tests after each PR
```

---

## 🔴 WEEK 1: CRITICAL FIXES (20 hours)

### 📌 DAY 1-2: RESPONSIVE BREAKPOINTS (2 hours)

**Objective:** Fix grid breakpoints across 9 pages

**Checklist:**

```bash
# 1. Find all occurrences of "grid-cols-2 lg:grid-cols-4"
cd frontend/src
grep -r "grid-cols-2" --include="*.tsx" > /tmp/grid-issues.txt
grep -r "grid-cols-2 md:grid-cols" --include="*.tsx" >> /tmp/grid-issues.txt
```

**Files to fix (by priority):**

1. **Dashboard** (`src/app/dashboard/page.tsx`)
   - Line 206: `grid grid-cols-2 lg:grid-cols-4` → `grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`
   - Line 226: Same fix
   - Test: npm run dev → check at 640px, 768px, 1024px

2. **Portfolio** (`src/app/portfolio/page.tsx`)
   - Lines ~50+: `grid-cols-2 md:grid-cols-4` → standard pattern

3. **Backtest** (`src/app/backtest/page.tsx`)
   - Lines ~80+: Same

4. **Alerts** (`src/app/alerts/page.tsx`)
   - Lines ~40+: Same

5. **Sharpe** (`src/app/sharpe-compare/page.tsx`)
   - Lines ~30+: `grid-cols-2 md:grid-cols-5` → standardize

6. **Assets** (`src/app/assets/page.tsx`)
   - Lines ~20+: `grid-cols-1 md:grid-cols-3` → add sm:cols-2

7. **Simulator** (`src/app/simulator/page.tsx`)
   - Lines ~100+: Most complex, may need 2-col redesign for mobile

8. **History/Watchlist** (table overflow)
   - Wrap tables with `overflow-x-auto` class

**Standard Pattern to Apply:**
```tailwindcss
/* 4-column layout */
grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4

/* 3-column layout */
grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4

/* 2-column layout */
grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4
```

**Verification Steps:**
```bash
npm run build  # Should pass
npm run dev

# Test breakpoints using Chrome DevTools
# Ctrl+Shift+M → Toggle device toolbar

# Screenshot at:
# 375px (mobile)
# 640px (tablet)
# 768px (tablet)
# 1024px (desktop)
# 1280px (desktop)
```

**PR Checklist:**
- [ ] All TypeScript errors fixed
- [ ] Build passes: `npm run build`
- [ ] Mobile tested (375px, 640px, 768px)
- [ ] Desktop tested (1024px, 1280px)
- [ ] No console errors
- [ ] Screenshot comparison before/after
- [ ] PR title: "chore: standardize responsive grid breakpoints"

**Time Log:**
```
Actual: ___ / 2h estimated ✓
Issues encountered: ___
```

---

### 📌 DAY 3: TYPESCRIPT STRICT + LINTING (1 hour)

**File:** `frontend/next.config.mjs`

**Change:**
```javascript
// BEFORE
typescript: {
  ignoreBuildErrors: true,
},
eslint: {
  ignoreDuringBuilds: true,
}

// AFTER
typescript: {
  ignoreBuildErrors: false,  // ← Enable checking
},
eslint: {
  ignoreDuringBuilds: false, // ← Enable linting
}
```

**Run build and document errors:**
```bash
cd frontend
npm run build 2>&1 | tee /tmp/build-errors.log
wc -l /tmp/build-errors.log

# Common fixes:
# - "Type 'never'" → Add explicit types to async handlers
# - "Property doesn't exist" → Add missing types
# - "Unused variable" → Remove or use
```

**Fix errors (prioritize by frequency):**
1. Async handler types (add `: void` or `: Promise<void>`)
2. Missing prop types (use `interface` from component)
3. Any type assertions (use proper types)

**PR:**
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run lint` shows only warnings (if any)
- [ ] PR title: "chore: enable TypeScript strict mode"

---

### 📌 DAY 4-5: LAZY LOADING + MEMOIZATION (5 hours)

**Target:** Reduce bundle size by ~75KB (Recharts)

#### Step 1: Create memoized chart wrappers (2h)

**File:** `src/components/charts/_base.tsx` (new)
```typescript
import React from "react";
import { ResponsiveContainer, LineChart, BarChart } from "recharts";

// HOC for memoized responsive container
export const MemoResponsiveContainer = React.memo(
  ({ children, ...props }: any) => (
    <ResponsiveContainer {...props}>
      {children}
    </ResponsiveContainer>
  ),
  (prev, next) => {
    // Shallow compare to prevent unnecessary re-renders
    return JSON.stringify(prev.children) === JSON.stringify(next.children);
  }
);
```

**Update each chart component:**

```typescript
// BEFORE: src/components/charts/EquityCurve.tsx
export default function EquityCurve({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        ...
      </LineChart>
    </ResponsiveContainer>
  );
}

// AFTER
export default function EquityCurve({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        ...
      </LineChart>
    </ResponsiveContainer>
  );
}

// EXPORT memoized version
export const MemoEquityCurve = React.memo(EquityCurve, (prev, next) => {
  // Only re-render if data array changed
  return JSON.stringify(prev.data) === JSON.stringify(next.data);
});
```

**Files to update:**
```
src/components/charts/
├── EquityCurve.tsx          → MemoEquityCurve
├── DrawdownChart.tsx         → MemoDrawdownChart
├── LeverageChart.tsx         → MemoLeverageChart
├── MonteCarloChart.tsx       → MemoMonteCarloChart
├── PortfolioEquityCurve.tsx  → MemoPortfolioEquityCurve
└── PriceTradeChart.tsx       → MemoPriceTradeChart
```

#### Step 2: Lazy load charts with dynamic() (2h)

**Dashboard** (`src/app/dashboard/page.tsx`):
```typescript
// Import at top
import dynamic from "next/dynamic";

// Replace with lazy version
const EquityCurve = dynamic(() => import("@/components/charts/EquityCurve").then(m => ({ default: m.MemoEquityCurve })), {
  loading: () => <div className="h-64 bg-surface-2 animate-pulse rounded-lg" />,
  ssr: false,
});
```

**Portfolio** (`src/app/portfolio/page.tsx`):
```typescript
const MonteCarloChart = dynamic(() => import("@/components/charts/MonteCarloChart").then(m => ({ default: m.MemoMonteCarloChart })), {
  loading: () => <div className="h-64 bg-surface-2 animate-pulse rounded-lg" />,
  ssr: false,
});

const PortfolioEquityCurve = dynamic(() => import("@/components/charts/PortfolioEquityCurve").then(m => ({ default: m.MemoPortfolioEquityCurve })), {
  loading: () => <div className="h-64 bg-surface-2 animate-pulse rounded-lg" />,
  ssr: false,
});
```

**Backtest** (`src/app/backtest/page.tsx`):
```typescript
const DrawdownChart = dynamic(() => import("@/components/charts/DrawdownChart").then(m => ({ default: m.MemoDrawdownChart })), {...});
const LeverageChart = dynamic(() => import("@/components/charts/LeverageChart").then(m => ({ default: m.MemoLeverageChart })), {...});
```

#### Step 3: Verify bundle size reduction

```bash
npm run build

# Compare build output:
# Before: .next/static/chunks/app/dashboard/page.js → XXX KB
# After: .next/static/chunks/app/dashboard/page.js → YYY KB

# Calculate savings:
# (XXX - YYY) / XXX = % improvement
```

**PR:**
- [ ] Build succeeds
- [ ] Bundle size < before (document change)
- [ ] Charts still render correctly
- [ ] Loading skeletons visible on slow network (DevTools throttle)
- [ ] PR title: "perf: lazy-load charts and add memoization"

---

### 📌 DAY 5: DISCLAIMER MODAL (5 hours)

**Complete:** See `DISCLAIMER_MODAL_SPEC.md` for full details

**Quick Steps:**
1. Create `src/components/modals/RiskDisclaimerModal.tsx` (2h)
2. Create `src/hooks/useDisclaimerModal.ts` (1h)
3. Update `src/app/layout.tsx` (0.5h)
4. Test on mobile (1.5h)

**PR:**
- [ ] Modal appears on login
- [ ] Mobile responsive
- [ ] Button disabled until checkbox
- [ ] Backend integration ready
- [ ] PR title: "feat: add risk disclaimer modal"

---

## 🟡 WEEK 2: ACCESSIBILITY + TESTING (20 hours)

### 📌 DAY 6-7: ACCESSIBILITY (4 hours)

**Focus:** WCAG AA compliance + touch targets

**Checklist:**
```
Touch Targets (1h):
  ☐ AppShell menu: 20×20 → 44×44 (line 50)
  ☐ Sidebar close: 16×16 → 40×40 (line 60)
  ☐ Test on mobile: all buttons clickable

ARIA Labels (1h):
  ☐ AppShell menu: add aria-label (already has)
  ☐ Sidebar: add aria-current on active link
  ☐ Icon buttons: add aria-label
  ☐ Modals: add role="dialog"

Contrast (1h):
  ☐ text-muted: #475569 → #5D6B80 (better readability)
  ☐ Verify 4.5:1 ratio in DevTools
  ☐ Check dark theme colors

Focus Visible (1h):
  ☐ Add focus-visible:outline in Tailwind
  ☐ Test with Tab key
  ☐ Make sure focus visible on all interactive elements
```

**Files to update:**
```
src/components/layout/AppShell.tsx       → touch targets + aria
src/components/layout/Sidebar.tsx        → aria-current + touch
src/lib/utils.ts                         → update color values
tailwind.config.ts                       → add focus-visible
src/app/layout.tsx                       → add skip link
```

**Testing:**
```bash
# Keyboard navigation
Open DevTools → go to each page → Tab through all elements
Expected: Focus visible on all interactive elements

# Screen reader (Mac): Cmd+F5
# Windows: NVDA (free)
# Listen for: page structure, labels announced correctly

# Contrast checker
Chrome DevTools → Accessibility → check contrast ratios
```

**PR:**
- [ ] Touch targets 44×44 minimum
- [ ] All interactive elements have aria-label
- [ ] Contrast ≥4.5:1
- [ ] Keyboard navigation tested
- [ ] PR title: "a11y: improve accessibility for WCAG AA"

---

### 📌 DAY 8: TABLE OVERFLOW + OPTIMIZATION (3 hours)

**Files:** History page, Watchlist page

**Fix table overflow:**
```tsx
// BEFORE
<table className="w-full">...</table>

// AFTER
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="w-full">...</table>
</div>
```

**Font optimization:**
```typescript
// tailwind.config.ts
fontFamily: {
  sans: [
    "-apple-system",     // macOS/iOS
    "BlinkMacSystemFont", // Chrome on macOS
    "Segoe UI",          // Windows
    "Roboto",            // Android
    "sans-serif"         // Fallback
  ],
}
```

**PR:**
- [ ] Tables scroll horizontally on mobile
- [ ] Font stack optimized
- [ ] PR title: "perf: optimize tables and fonts"

---

### 📌 DAY 9-10: TESTING + VERIFICATION (10 hours)

#### Setup Playwright (2h)

```bash
# Create playwright config
npx playwright install

# Create test files
mkdir -p __tests__/e2e __tests__/components
```

**File:** `__tests__/e2e/login.spec.ts`
```typescript
import { test, expect } from "@playwright/test";

test("login and accept disclaimer", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  
  await page.fill("input[type=email]", "test@example.com");
  await page.fill("input[type=password]", "password123");
  await page.click("button:has-text('Entrar')");
  
  // Wait for disclaimer
  await page.waitForSelector("text=Aviso de Risco");
  
  // Accept
  await page.click("input[type=checkbox]");
  await page.click("button:has-text('Continuar')");
  
  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);
});
```

#### Component Tests (2h)

```bash
# File: __tests__/components/MetricCard.test.tsx
npm run test -- MetricCard

# File: __tests__/components/AppShell.test.tsx
npm run test -- AppShell
```

#### Lighthouse Audit (3h)

```bash
# Run on each page
npm run build && npm run start

# Desktop:
open "http://localhost:3000/dashboard"
# DevTools → Lighthouse → Generate report
# Repeat for: Portfolio, Backtest, Assets, Watchlist, Alerts

# Mobile:
# Same but toggle device toolbar to mobile

# Document in LIGHTHOUSE_W2_FINAL.md
```

#### Create final report (3h)

**File:** `LIGHTHOUSE_RESULTS_SPRINT1.md`
```markdown
# Lighthouse Results — Sprint 1 Final

## Desktop
Dashboard:    88/100 ↑ (+17)
Portfolio:    85/100 ↑ (+18)
Backtest:     82/100 ↑ (+12)
...

## Mobile
Dashboard:    81/100 ↑ (+18)
Portfolio:    78/100 ↑ (+16)
...

## Core Web Vitals
LCP: 2.1s ↓ (-0.7s)
FID: 75ms ↓ (-10ms)
CLS: 0.08 ↓ (-0.07)

## Summary
✅ Desktop target: 85+ achieved (88)
⚠️ Mobile target: 85+ NOT achieved (81) — Plan for Q3
✅ Disclaimer: Implemented
✅ Mobile UX: 84/100 achieved
✅ WCAG AA: 88/100 achieved
```

**PR:**
- [ ] All tests passing
- [ ] Lighthouse scores documented
- [ ] No regressions
- [ ] PR title: "test: add E2E and component tests + final audit"

---

## 📊 DAILY STANDUP TEMPLATE

```
DAY X - [Date]

What I did yesterday:
- Task: ____
  Status: [✅ Done | 🟡 In Progress | ❌ Blocked]
  Time: X.Xh / Xh estimated

Blockers:
- [None | ...list blockers...]

Today's plan:
- Task: ____
- Task: ____

Risks:
- [None | ...identify risks...]
```

---

## 📈 PROGRESS TRACKING

### Week 1 Checklist
```
☐ Day 1-2: Breakpoints   (2h)
☐ Day 3:   TypeScript    (1h)
☐ Day 4-5: Lazy-loading  (5h)
☐ Day 5:   Disclaimer    (5h)
───────────────────────────
✓ EOF Week 1: 13h / 20h planned
  Buffer: 7h for issues
```

### Week 2 Checklist
```
☐ Day 6-7: Accessibility (4h)
☐ Day 8:   Optimize      (3h)
☐ Day 9-10: Testing      (10h)
───────────────────────────
✓ EOF Week 2: 17h / 20h planned
  Buffer: 3h for issues
```

---

## 🎯 SUCCESS CRITERIA

### Lighthouse
- [ ] Desktop: 75+ (was 71, target 90 Q3)
- [ ] Mobile: 80+ (was 63, target 85 Q3)
- [ ] No regressions

### Mobile UX
- [ ] All breakpoints responsive
- [ ] Touch targets 44×44+
- [ ] Tables scroll properly
- [ ] Load time <4s

### Disclaimer
- [ ] Modal shows on first login
- [ ] Mobile responsive
- [ ] Backend integration working
- [ ] Legal review passed

### Accessibility
- [ ] Touch targets fixed
- [ ] aria-labels added
- [ ] Contrast improved
- [ ] Keyboard nav working

### Testing
- [ ] 10+ E2E tests
- [ ] 15+ component tests
- [ ] CI/CD setup

---

## 🔗 RELATED DOCUMENTS

1. **FRONTEND_AUDIT_CONSOLIDATED_REPORT.md** ← Main report
2. **DISCLAIMER_MODAL_SPEC.md** ← Full implementation guide
3. **FRONTEND_SPRINT1_CHECKLIST.md** ← Original detailed checklist
4. **FRONTEND_RECOMMENDATIONS_IMPLEMENTATION.md** ← Code examples

---

## 📞 SUPPORT

**Stuck?** Check:
1. Original audit docs in project root
2. Component examples in `src/components/`
3. Similar components for patterns
4. GitHub issues for blockers

**Questions?** Ask during standup or create GitHub issue with label `sprint-1`

---

**Timeline:** Monday–Friday × 2 weeks  
**Team:** Frontend + QA  
**Target Launch:** Friday EOD Week 2

Let's ship this! 🚀
