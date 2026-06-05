# ✅ FRONTEND SPRINT 1 — ACTION CHECKLIST

**Timeline:** 2 weeks  
**Team:** Frontend Developer(s) + QA  
**Kick-off:** Week of [DATE]

---

## WEEK 1: UX & PERFORMANCE FIXES (20h)

### ☐ DAY 1-2: BREAKPOINTS RESPONSIVE (2h)

**Objective:** Standardize responsive grid breakpoints across all pages

**Pages to Fix (in order):**
- [ ] Dashboard: `grid-cols-2 lg:grid-cols-4` → `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- [ ] Portfolio: `grid-cols-2 md:grid-cols-4` → same pattern
- [ ] Backtest: `grid-cols-2 md:grid-cols-4` → same pattern
- [ ] Alerts: `grid-cols-2 md:grid-cols-4` → same pattern
- [ ] Sharpe: `grid-cols-2 md:grid-cols-5` → standardize
- [ ] Simulator: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7` → fix gap issues
- [ ] Assets: `grid-cols-1 md:grid-cols-3` → add sm: fallback
- [ ] History: Check for md: responsive

**Verification:**
- [ ] Run `npm run build` — zero errors
- [ ] Test on 375px (iPhone) — looks good
- [ ] Test on 640px (sm:) — transition visible
- [ ] Test on 768px (md:) — 3 cols visible
- [ ] Test on 1024px (lg:) — 4 cols visible

**Time Log:** 2h actual / 2h estimated ✓

---

### ☐ DAY 3: ENABLE TYPESCRIPT STRICT (1h)

**Objective:** Unblock code quality improvements

**File:** `frontend/next.config.mjs`

```javascript
// Current (WRONG):
typescript: {
  ignoreBuildErrors: true,
},
eslint: {
  ignoreDuringBuilds: true,
}

// Change to:
typescript: {
  ignoreBuildErrors: false,  // ← Enable strict checking
},
eslint: {
  ignoreDuringBuilds: false, // ← Enable linting
}
```

**Then run:**
```bash
cd frontend
npm run build 2>&1 | tee build-errors.txt
# Fix all TypeScript errors reported
npm run build  # Should pass
```

**Common Errors to Fix:**
- [ ] Type 'never' errors in async handlers
- [ ] Missing prop types on components
- [ ] Unused imports
- [ ] Type assertions needed

**Verification:**
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` shows no new errors

**Time Log:** 1h actual / 1h estimated ✓

---

### ☐ DAY 3: TOUCH TARGETS >44px (1h)

**Objective:** Fix mobile accessibility (WCAG compliance)

**File 1:** `src/components/layout/AppShell.tsx`

Find line ~45:
```typescript
// BEFORE:
<button
  onClick={() => setSidebarOpen(true)}
  className="p-1.5 rounded-lg hover:bg-surface-2 text-text-secondary transition-colors"
  aria-label="Abrir menu"
>
  <Menu size={20} />
</button>

// AFTER:
<button
  onClick={() => setSidebarOpen(true)}
  className="min-w-10 min-h-10 p-2.5 rounded-lg hover:bg-surface-2 text-text-secondary transition-colors"
  aria-label="Abrir menu"
>
  <Menu size={20} />
</button>
```

**File 2:** `src/components/layout/Sidebar.tsx`

Find line ~56:
```typescript
// BEFORE:
<button
  onClick={onClose}
  className="lg:hidden p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
  aria-label="Fechar menu"
>
  <X size={16} />
</button>

// AFTER:
<button
  onClick={onClose}
  className="lg:hidden min-w-10 min-h-10 p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
  aria-label="Fechar menu"
>
  <X size={16} />
</button>
```

**Verification:**
- [ ] Open DevTools → inspect button width (should be ≥40px)
- [ ] Test on iPhone emulation (easy to tap)
- [ ] Run axe accessibility check (no touch target violations)

**Time Log:** 1h actual / 1h estimated ✓

---

### ☐ DAY 4: TABELAS COM HORIZONTAL SCROLL (2h)

**Objective:** Fix table overflow on mobile (<640px)

**File 1:** `src/app/history/page.tsx`

Find the `<table>` element and wrap it:
```typescript
// BEFORE:
<table className="w-full text-sm">
  {/* content */}
</table>

// AFTER:
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <table className="w-full text-sm">
    {/* content */}
  </table>
</div>

// Also update scrollbar styling in src/app/globals.css:
::-webkit-scrollbar-track { 
  background: rgba(0, 0, 0, 0.2);  // Make visible
  border-radius: 2px;
}
::-webkit-scrollbar-thumb { 
  background: #2D3748;
  border-radius: 2px;
}
```

**File 2:** `src/app/watchlist/page.tsx`

Apply same pattern as history

**Verification:**
- [ ] Open on 375px screen width
- [ ] Table scrollable horizontally
- [ ] Scrollbar visible and styled
- [ ] Content not truncated

**Time Log:** 2h actual / 2h estimated ✓

---

### ☐ DAY 4-5: RECHARTS LAZY LOAD (5h)

**Objective:** Reduce bundle size + improve performance (splits 250KB)

**Step 1:** Identify all Recharts components
```bash
cd frontend
grep -r "from 'recharts'" src/components --include="*.tsx"
```

Expected output:
- src/components/charts/EquityCurve.tsx
- src/components/charts/DrawdownChart.tsx
- src/components/charts/LeverageChart.tsx
- src/components/charts/MonteCarloChart.tsx
- src/components/charts/PortfolioEquityCurve.tsx
- src/components/charts/PriceTradeChart.tsx
- src/components/ui/ScoreGauge.tsx

**Step 2:** Create skeleton loader (shared)

Create `src/components/charts/ChartSkeleton.tsx`:
```typescript
export default function ChartSkeleton({ height = 340 }: { height?: number }) {
  return (
    <div 
      className="w-full bg-surface-2 rounded-lg animate-pulse" 
      style={{ height: `${height}px` }}
    />
  )
}
```

**Step 3:** Wrap each chart with dynamic()

Example for `src/components/charts/EquityCurve.tsx`:
```typescript
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import ChartSkeleton from './ChartSkeleton'

const EquityCurveChart = dynamic(
  () => import('./EquityCurveChart'),
  { 
    loading: () => <ChartSkeleton height={340} />,
    ssr: false 
  }
)

export default function EquityCurve(props) {
  return (
    <Suspense fallback={<ChartSkeleton height={340} />}>
      <EquityCurveChart {...props} />
    </Suspense>
  )
}
```

Repeat for all 7 chart components.

**Verification:**
- [ ] `npm run build` shows bundle reduction
- [ ] Charts load with skeleton loader
- [ ] Lighthouse score increases 5-10 points
- [ ] No console errors

**Time Log:** 5h actual / 5h estimated ✓

---

### ☐ DAY 5: LIGHTWEIGHT VALIDATIONS (1h)

**Objective:** Ensure all Week 1 fixes are complete

**Checklist:**
- [ ] All 8 pages have responsive breakpoints
- [ ] Menu button has min-w-10 min-h-10
- [ ] Sidebar close button has min-w-10 min-h-10
- [ ] History table has overflow-x-auto
- [ ] Watchlist table has overflow-x-auto
- [ ] TypeScript strict: build passes
- [ ] Recharts lazy loaded in 7 components
- [ ] `npm run build` → success
- [ ] `npm run lint` → no new errors
- [ ] Mobile emulation 375px → no horizontal scroll, all readable

**Summary:**
- [ ] Screenshot responsive layout: 375px, 640px, 768px, 1024px
- [ ] Log build size before/after Recharts lazy load

---

## WEEK 2: TESTING & COMPLIANCE (20h)

### ☐ DAY 6-7: TESTING SETUP (8h)

**Objective:** Foundation for automated testing pipeline

**Step 1: Install dependencies** (30 min)
```bash
cd frontend

# Playwright for E2E
npm install -D @playwright/test

# Vitest + Testing Library for components
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom jsdom

# Storybook for component docs
npm install -D storybook @storybook/nextjs @storybook/addon-coverage
```

**Step 2: Create config files** (1h)

Create `frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 70,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `frontend/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/__tests__/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

**Step 3: Create test directories** (20 min)
```bash
mkdir -p src/__tests__/{e2e,components,fixtures}
touch src/__tests__/setup.ts
```

**Step 4: Update package.json scripts** (20 min)
```json
{
  "scripts": {
    "test:unit": "vitest",
    "test:unit:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:unit && npm run test:e2e",
    "coverage": "vitest --coverage"
  }
}
```

**Step 5: Create CI/CD workflow** (1.5h)

Create `.github/workflows/frontend-test.yml`:
```yaml
name: Frontend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Run Vitest
        working-directory: ./frontend
        run: npm run test:unit -- --coverage
      
      - name: Run Playwright
        working-directory: ./frontend
        run: npx playwright install && npm run test:e2e
```

**Verification:**
- [ ] `npm run test:unit` runs (fails OK if no tests yet)
- [ ] `npm run test:e2e` runs (fails OK if no tests yet)
- [ ] Playwright is installed
- [ ] Coverage reports generated in `coverage/`

**Time Log:** 4h actual / 4h estimated ✓

---

### ☐ DAY 7-8: E2E TESTS (4h)

**Objective:** 10 critical user flow tests

**Test 1-3: Login Flow** (1h)

Create `src/__tests__/e2e/login.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('deve redirecionar para /login se não autenticado', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Entrar")')
    await expect(page).toHaveURL('/dashboard')
  })

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrong')
    await page.click('button:has-text("Entrar")')
    await expect(page.locator('text=/[Ee]rrror|[Ii]nválid/')).toBeVisible()
  })
})
```

**Test 4-5: Dashboard Loading** (1h)

Create `src/__tests__/e2e/dashboard.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock login by setting token
    await context.addCookies([{
      name: 'token',
      value: 'mock-token',
      url: 'http://localhost:3000'
    }])
  })

  test('deve carregar dashboard com métricas', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=Patrimônio Total')).toBeVisible()
  })

  test('mobile: deve exibir menu hamburger em 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    await expect(page.locator('button[aria-label="Abrir menu"]')).toBeVisible()
  })
})
```

**Test 6-10: Portfolio CRUD** (2h)

Create `src/__tests__/e2e/portfolio.crud.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Portfolio CRUD', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([...])
  })

  test('deve adicionar posição', async ({ page }) => {
    await page.goto('/portfolio')
    await page.click('button:has-text("Adicionar")')
    await page.fill('input[placeholder="Ticker"]', 'AAPL')
    await page.fill('input[placeholder="Quantidade"]', '10')
    await page.fill('input[placeholder="Preço Médio"]', '150')
    await page.click('button:has-text("Confirmar")')
    await expect(page.locator('text=AAPL')).toBeVisible()
  })

  test('deve deletar posição', async ({ page }) => {
    // Setup: criar posição primeiro
    // ...
    await page.click('button[aria-label="Deletar"]')
    await expect(page.locator('text=AAPL')).not.toBeVisible()
  })

  test('deve editar posição', async ({ page }) => {
    // Setup
    await page.click('button[aria-label="Editar"]')
    await page.fill('input[placeholder="Quantidade"]', '20')
    await page.click('button:has-text("Salvar")')
    // Assert
  })

  test('deve validar que Ticker é obrigatório', async ({ page }) => {
    await page.goto('/portfolio')
    await page.click('button:has-text("Adicionar")')
    await page.click('button:has-text("Confirmar")')
    await expect(page.locator('text=/[Rr]equired|obrigat/')).toBeVisible()
  })

  test('deve carregar equity curve para portfólio', async ({ page }) => {
    await page.goto('/portfolio')
    await expect(page.locator('canvas')).toBeVisible()
  })
})
```

**Verification:**
- [ ] All 10 tests created
- [ ] `npm run test:e2e` passes
- [ ] HTML report generated

**Time Log:** 4h actual / 4h estimated ✓

---

### ☐ DAY 8-9: COMPONENT TESTS (4h)

**Objective:** 9 unit tests for core components

**Test 1-3: MetricCard** (1h)

Create `src/__tests__/components/MetricCard.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MetricCard from '@/components/ui/MetricCard'

describe('MetricCard', () => {
  it('deve renderizar label e valor', () => {
    render(
      <MetricCard
        label="Total"
        value="R$ 1.000"
      />
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('R$ 1.000')).toBeInTheDocument()
  })

  it('deve aplicar cor de acento', () => {
    const { container } = render(
      <MetricCard
        label="Total"
        value="R$ 1.000"
        accent="success"
      />
    )
    expect(container.querySelector('.border-success')).toBeInTheDocument()
  })

  it('deve renderizar trend quando fornecido', () => {
    render(
      <MetricCard
        label="Total"
        value="R$ 1.000"
        subValue="+5.2%"
        trend="up"
      />
    )
    expect(screen.getByText('+5.2%')).toHaveClass('text-success')
  })
})
```

**Test 4-7: AppShell + Sidebar** (2h)

Create `src/__tests__/components/AppShell.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
}))

describe('AppShell', () => {
  it('mobile: deve exibir menu hamburger', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument()
  })

  it('mobile: deve abrir sidebar ao clicar menu', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const menuBtn = screen.getByLabelText('Abrir menu')
    await user.click(menuBtn)
    expect(screen.getByRole('navigation')).toHaveClass('translate-x-0')
  })

  it('mobile: deve fechar sidebar ao clicar backdrop', async () => {
    const user = userEvent.setup()
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    await user.click(screen.getByLabelText('Abrir menu'))
    const backdrop = document.querySelector('[role="presentation"]')
    if (backdrop) await user.click(backdrop)
    // sidebar closed
  })

  it('desktop: sidebar sempre visível', () => {
    const { container } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    // Verificar classe lg:translate-x-0
  })
})
```

**Test 8-9: AssetCard + EquityCurve** (1h)

Create `src/__tests__/components/AssetCard.test.tsx`:
```typescript
// Similar pattern...
```

**Verification:**
- [ ] 9 component tests created
- [ ] `npm run test:unit` shows 9 passing
- [ ] Coverage report >60%

**Time Log:** 4h actual / 4h estimated ✓

---

### ☐ DAY 9-10: DISCLAIMER MODAL (3h)

**Objective:** Add risk disclaimer UI blocking app entry

**File:** Create `src/components/ui/RiskDisclaimerModal.tsx`

```typescript
'use client'
import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'

const DISCLAIMER_TEXT = `O LBH System é um simulador educacional...
[See full text in FRONTEND_RECOMMENDATIONS_IMPLEMENTATION.md]`

export default function RiskDisclaimerModal() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('risk_disclaimer_accepted')
    if (!hasAccepted) setOpen(true)
  }, [])

  const handleAccept = () => {
    localStorage.setItem('risk_disclaimer_accepted', 'true')
    localStorage.setItem('risk_disclaimer_accepted_at', new Date().toISOString())
    setOpen(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    setScrolled(scrollHeight - scrollTop <= clientHeight + 10)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] flex flex-col bg-surface border border-border rounded-xl shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <AlertTriangle size={24} className="text-danger flex-shrink-0" />
            <Dialog.Title className="text-lg font-bold text-danger">
              ⚠️ Aviso de Risco Importante
            </Dialog.Title>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4 text-sm text-text-secondary space-y-4"
            onScroll={handleScroll}
          >
            {DISCLAIMER_TEXT}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={scrolled}
                onChange={(e) => setScrolled(e.target.checked)}
                className="w-4 h-4"
              />
              Declaro que entendi os riscos
            </label>
            <button
              onClick={handleAccept}
              disabled={!scrolled}
              className="w-full bg-primary text-background font-semibold py-2.5 rounded-lg disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Integration:** Modify `src/components/layout/AppShell.tsx`:
```typescript
import RiskDisclaimerModal from '@/components/ui/RiskDisclaimerModal'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <RiskDisclaimerModal />  // ← Add this
      {/* existing content */}
    </div>
  )
}
```

**Verification:**
- [ ] Disclaimer appears on first visit
- [ ] Cannot dismiss without checking box
- [ ] localStorage persists acceptance
- [ ] "Ver Aviso" link in Sidebar
- [ ] Mobile responsive (375px+)
- [ ] Accessible (WCAG A)

**Time Log:** 3h actual / 3h estimated ✓

---

### ☐ DAY 10: FINAL VALIDATION (1h)

**Objective:** Verify all Sprint 1 work is complete

**Checklist:**
- [ ] All breakpoints responsive (grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4)
- [ ] Touch targets ≥44×44px (Menu, Sidebar close)
- [ ] TypeScript strict mode enabled
- [ ] Recharts lazy loaded (7 components)
- [ ] Tables have overflow-x-auto
- [ ] 10 E2E tests passing
- [ ] 9 component tests passing
- [ ] Risk disclaimer blocking entry
- [ ] CI/CD pipeline working
- [ ] `npm run build` passes
- [ ] `npm run coverage` shows >60% line coverage

**Build & Test:**
```bash
cd frontend
npm run build
npm run test:all
npm run coverage
```

**Metrics:**
- [ ] Bundle size: reduced ≥10% (Recharts lazy load)
- [ ] Lighthouse score: 60 → 72+ (screenshot)
- [ ] Mobile UX score: 35 → 60+ (testing checklist)
- [ ] Test coverage: 0% → 25%+

**Deliverables:**
- [ ] Screenshots at 4 breakpoints (375, 640, 768, 1024)
- [ ] Lighthouse audit report
- [ ] Test coverage report (HTML)
- [ ] Build size comparison (before/after Recharts)

---

## 📊 METRICS TO TRACK

### Weekly Progress
| Métrica | Target | Week 1 | Week 2 | Final |
|---------|--------|--------|--------|-------|
| Responsive pages | 8/8 | 8/8 ✓ | 8/8 | 8/8 |
| Touch target fixes | 2/2 | 2/2 ✓ | 2/2 | 2/2 |
| Recharts lazy load | 7/7 | 0/7 | 7/7 ✓ | 7/7 |
| E2E tests | 10 | 0 | 10 ✓ | 10 |
| Component tests | 9 | 0 | 9 ✓ | 9 |
| Disclaimer modal | 1 | 0 | 1 ✓ | 1 |
| Lighthouse score | 72+ | 60 | 65 | 72+ ✓ |
| Mobile score | 60+ | 35 | 55 | 60+ ✓ |
| Build errors | 0 | 50+ | 0 | 0 ✓ |

---

## ⚠️ BLOCKERS & RISKS

### High Risk (Address ASAP):
- [ ] TypeScript strict reveals 50+ errors → allocate buffer time
- [ ] Recharts lazy load requires refactoring → pair programming?
- [ ] E2E tests need API mocking → coordinate with backend team

### Medium Risk:
- [ ] GitHub Actions setup → may need DevOps support
- [ ] Test environment setup → Playwright browser installation
- [ ] Coverage tools → coverage badge integration

### Mitigation:
- Daily standup to surface blockers
- Pair programming for tricky refactors
- Pre-allocate 2h buffer at end of each week

---

## 🚀 SUCCESS CRITERIA

✅ **All items below must be CHECKED by end of Sprint 1:**

### Code Quality
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` shows zero TypeScript/ESLint violations
- [ ] 9 component tests with >60% coverage
- [ ] 10 E2E tests (critical flows)

### Performance
- [ ] Lighthouse score ≥72 (from 60)
- [ ] Bundle size reduced ≥10%
- [ ] Core Web Vitals: LCP <2.8s (from 3.2s)

### Mobile & Accessibility
- [ ] Mobile UX score ≥60 (from 35)
- [ ] All touch targets ≥44×44px
- [ ] Responsive at 375px, 640px, 768px, 1024px
- [ ] Risk disclaimer modal blocking entry

### Compliance
- [ ] All WCAG A accessibility issues fixed
- [ ] Disclaimer displayed + accepted on first use
- [ ] localStorage persistence working

---

## 📞 ESCALATION & SUPPORT

**Questions? Blockers? Questions:**
- PM: [NAME] — scope/timeline adjustments
- Tech Lead: [NAME] — architecture decisions
- QA: [NAME] — test strategy refinement

**Daily Standup:** 10:00 AM [TZ]
**Sprint Review:** [DATE] [TIME]
**Sprint Retro:** [DATE] [TIME]

---

## ✨ QUICK WINS TO CELEBRATE

After each completed day:
- [ ] Day 2: Grid breakpoints responsive ✓
- [ ] Day 3: TypeScript strict + Touch targets ✓
- [ ] Day 4-5: Tables scrollable + Recharts lazy ✓
- [ ] Day 7: Testing framework ready ✓
- [ ] Day 8-9: 19 tests passing ✓
- [ ] Day 10: Disclaimer modal + Sprint complete ✓

**Grand Total: 40h of focused, high-impact work = Major improvement to LBH frontend quality baseline.**

---

**Good luck! 🎯**
