# 📋 FRONTEND SPRINT 1 — PLANO DE AÇÃO DETALHADO

## I. MOBILE UX — PLANO DE FIX (15h)

### 1.1 Breakpoints Responsive (Priority: CRÍTICO)

**Problema:** Grid breakpoints inconsistentes saltam de mobile (2 cols) direto para desktop (4 cols)

**Solução:** Criar sistema de breakpoints com padrão `sm: → md: → lg:`

**Arquivos a Modificar:**
- `src/app/dashboard/page.tsx`
- `src/app/alerts/page.tsx`
- `src/app/portfolio/page.tsx`
- `src/app/backtest/page.tsx`
- `src/app/sharpe-compare/page.tsx`
- `src/app/simulator/page.tsx`
- `src/app/history/page.tsx`
- `src/app/watchlist/page.tsx`

**Template de Mudança:**
```typescript
// ❌ ANTES
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

// ✅ DEPOIS
<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
```

**Esforço:** 8 pages × 1.5h = 12h
- 2 horas para mapear todos os grids por página
- 30 min por página para aplicar fixes
- 1h para testes visuais em múltiplos breakpoints

---

### 1.2 Touch Targets Acessíveis (Priority: CRÍTICO)

**Problema:** Botões e ícones menores que 44×44px (Apple HIG)

**Checkpoints a Ajustar:**
1. Menu button em AppShell: `size={20}` → envolver em `p-2.5` (totalizando 36px, depois aumentar)
2. Sidebar close button: `size={16}` → `p-2` (totalizando 32px)
3. Chart ícones dinâmicos: adicionar padding extra

**Arquivo Principal:** `src/components/layout/AppShell.tsx`

```typescript
// ❌ ANTES (linha 50)
<Menu size={20} />

// ✅ DEPOIS
<Menu size={20} className="w-5 h-5" />
// + Adicionar min-w-10 min-h-10 ao botão wrapper
<button
  className="min-w-10 min-h-10 p-2.5 rounded-lg hover:bg-surface-2"
  aria-label="Abrir menu"
>
```

**Arquivo Secundário:** `src/components/layout/Sidebar.tsx` (linhas 56-60)

**Esforço:** 2h
- 30 min análise de todos os ícones/botões
- 1h implementação + ajustes
- 30 min testes com device emulation

---

### 1.3 Tabelas com Overflow-X (Priority: ALTO)

**Problema:** History e Watchlist truncam conteúdo em mobile (<640px)

**Arquivos:**
- `src/app/history/page.tsx`
- `src/app/watchlist/page.tsx`

**Padrão a Aplicar:**
```typescript
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <table className="w-full text-sm">
    {/* conteúdo */}
  </table>
</div>

{/* Scrollbar estilizado em globals.css */}
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2D3748; border-radius: 2px; }
```

**Esforço:** 2h
- Implementação em ambas as páginas
- Estilo customizado do scrollbar
- Testes de overflow

---

### 1.4 Viewport Meta Tag Verificação

**Arquivo:** `src/app/layout.tsx`

Verificar se existe:
```typescript
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Se não existir, adicionar ao Next.js metadata:
```typescript
export const metadata: Metadata = {
  title: "Leveraged Buy & Hold",
  description: "...",
  viewport: "width=device-width, initial-scale=1"
}
```

**Esforço:** 30 min

---

## II. LIGHTHOUSE PERFORMANCE — PLANO DE FIX (20h)

### 2.1 Habilitar TypeScript Strict (Priority: CRÍTICO)

**Problema:** `ignoreBuildErrors: true` esconde code quality issues

**Arquivo:** `frontend/next.config.mjs`

```typescript
// ❌ ANTES
typescript: {
  ignoreBuildErrors: true,
},

// ✅ DEPOIS
typescript: {
  ignoreBuildErrors: false,
},
eslint: {
  ignoreDuringBuilds: false,
}
```

**Ação:** Rodar `npm run build` e corrigir erros conforme aparecem

**Esforço:** 3h
- Build e diagnóstico dos erros
- Fixar type issues
- Validar build

---

### 2.2 Lazy Load Recharts (Priority: ALTO)

**Problema:** Recharts carrega em todas as páginas (~250KB bundle)

**Estratégia:** Usar `next/dynamic` para lazy load componentes de chart

**Exemplos de Implementação:**

```typescript
// src/components/charts/EquityCurve.tsx (topo)
import dynamic from 'next/dynamic'

const EquityCurveChart = dynamic(
  () => import('./EquityCurveRenderer'),
  { 
    loading: () => <div className="h-80 bg-surface-2 rounded-lg animate-pulse" />,
    ssr: false 
  }
)

export default function EquityCurve(props) {
  return <EquityCurveChart {...props} />
}
```

**Arquivos a Modificar:**
- `src/components/charts/EquityCurve.tsx`
- `src/components/charts/DrawdownChart.tsx`
- `src/components/charts/LeverageChart.tsx`
- `src/components/charts/MonteCarloChart.tsx`
- `src/components/charts/PortfolioEquityCurve.tsx`
- `src/components/charts/PriceTradeChart.tsx`
- `src/components/ui/ScoreGauge.tsx`

**Esforço:** 8h
- Refactor cada chart component
- Criar skeleton loaders
- Testar bundle size antes/depois

---

### 2.3 Memoizar Componentes Chart (Priority: ALTO)

**Problema:** Recharts re-render quando state externo muda

**Padrão:**

```typescript
// ❌ ANTES
export default function EquityCurve({ data, title, height }) {
  // ...
}

// ✅ DEPOIS
import { memo, useMemo } from 'react'

const EquityCurveContent = memo(function EquityCurveContent({ data, title, height }) {
  const chartData = useMemo(() => {
    return processData(data) // operação cara
  }, [data])
  
  return (
    <ResponsiveContainer>
      {/* gráfico */}
    </ResponsiveContainer>
  )
})

export default EquityCurveContent
```

**Esforço:** 5h
- Adicionar `useMemo` para processamento de dados
- Envolver componentes em `memo()`
- Profile antes/depois com React DevTools

---

### 2.4 Acessibilidade: Aria Labels & Roles (Priority: MÉDIO)

**Melhorias Necessárias:**

1. **AppShell Modal Backdrop:**
```typescript
<div
  className="fixed inset-0 z-30 bg-black/60 lg:hidden"
  role="presentation"  // ← adicionar
  onClick={() => setSidebarOpen(false)}
/>
```

2. **Modais (Radix UI Dialog):**
```typescript
<Dialog open={isOpen}>
  <DialogContent>
    <DialogTitle>Título</DialogTitle>  // ← Radix already handles
    <DialogDescription>Descrição</DialogDescription>
  </DialogContent>
</Dialog>
```

3. **Botões sem texto:**
```typescript
// ❌ ANTES
<button onClick={() => setSidebarOpen(true)}>
  <Menu size={20} />
</button>

// ✅ DEPOIS
<button
  onClick={() => setSidebarOpen(true)}
  aria-label="Abrir menu de navegação"
  aria-expanded={sidebarOpen}
>
  <Menu size={20} />
</button>
```

**Arquivos:**
- `src/components/layout/AppShell.tsx` (aria-label já existe, melhorar)
- `src/components/layout/Sidebar.tsx` (aria-label já existe, OK)
- Todas as páginas com modais (adicionar aria-labels)

**Esforço:** 3h

---

### 2.5 Image Optimization (Priority: MÉDIO)

**Logos e Imagens:**
- `src/components/ui/TickerLogo.tsx` — usa `<img>` ineficiente

**Converter para Next.js Image:**
```typescript
import Image from 'next/image'

// Se ícones, usar Lucide + manter
// Se fotos, usar next/image com blurDataURL
```

**Esforço:** 1h

---

## III. COMPONENT LIBRARY — SETUP STORYBOOK (15h)

### 3.1 Criar Estrutura Base (3h)

```bash
cd frontend

# Instalar Storybook
npx storybook@next init --builder webpack5

# Instalar addons úteis
npm install -D @storybook/addon-coverage @storybook/addon-interactions
```

**Configurar:** `.storybook/main.ts`
```typescript
import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.{js,jsx,ts,tsx}'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-coverage',
    '@storybook/addon-interactions',
  ],
}
export default config
```

---

### 3.2 Documentar Componentes Base (8h)

**Stories para:**

1. **MetricCard.stories.tsx** (2h)
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import MetricCard from '../MetricCard'

const meta: Meta<typeof MetricCard> = {
  component: MetricCard,
  tags: ['autodocs'],
  argTypes: {
    accent: {
      control: 'select',
      options: ['success', 'danger', 'warning', 'primary', 'default'],
    },
    trend: {
      control: 'select',
      options: ['up', 'down', 'neutral'],
    },
    large: { control: 'boolean' },
  },
}
export default meta

export const Default: StoryObj<typeof meta> = {
  args: {
    label: 'Patrimônio Total',
    value: 'R$ 125.450',
    subValue: '+5.2% vs mês anterior',
    accent: 'success',
    trend: 'up',
  },
}

export const WithIcon: StoryObj<typeof meta> = {
  args: {
    ...Default.args,
    icon: <DollarSign size={20} className="text-primary" />,
  },
}

export const Large: StoryObj<typeof meta> = {
  args: {
    ...Default.args,
    large: true,
  },
}
```

2. **TickerLogo.stories.tsx** (1h)
3. **AssetCard.stories.tsx** (2h)
4. **AppShell.stories.tsx** (2h, com mocking de children)
5. **Sidebar.stories.tsx** (1h)

---

### 3.3 Criar Index Exports (1h)

**Arquivo:** `src/components/ui/index.ts`
```typescript
export { default as MetricCard } from './MetricCard'
export type { MetricCardProps } from './MetricCard'

export { default as ScoreGauge } from './ScoreGauge'
export type { ScoreGaugeProps } from './ScoreGauge'

export { default as TickerLogo } from './TickerLogo'
export type { TickerLogoProps } from './TickerLogo'
```

**Uso no código:**
```typescript
// ❌ ANTES
import MetricCard from '@/components/ui/MetricCard'

// ✅ DEPOIS
import { MetricCard } from '@/components/ui'
```

---

### 3.4 README de Componentes (1h)

**Arquivo:** `src/components/ui/README.md`
```markdown
# UI Components

## MetricCard
Exibe uma métrica de negócio com label, valor, trend e ícone.

### Props
- `label: string` — Descrição da métrica
- `value: string` — Valor a exibir
- `subValue?: string` — Valor secundário (trend)
- `accent?: 'success' | 'danger' | 'warning' | 'primary' | 'default'`
- `trend?: 'up' | 'down' | 'neutral'`
- `large?: boolean` — Tamanho grande
- `icon?: React.ReactNode` — Ícone à direita

### Exemplos
[Ver em Storybook](./MetricCard.stories.tsx)
```

---

## IV. TESTING STRATEGY — 2-WEEK PLAN (25h)

### Week 1: Setup (10h)

#### Day 1-2: Setup (4h)

```bash
cd frontend

# Playwright
npm install -D @playwright/test
npx playwright install

# Vitest + Testing Library
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom jsdom

# Criar arquivos config
touch vitest.config.ts playwright.config.ts
```

**vitest.config.ts:**
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
      exclude: ['node_modules/', 'src/__tests__/'],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### Day 3-5: E2E Tests (6h)

**Criar:** `src/__tests__/e2e/`

1. **login.spec.ts** (1h)
```typescript
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('deve redirecionar para login se não autenticado', async ({ page }) => {
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
    await expect(page.locator('text=Credenciais inválidas')).toBeVisible()
  })
})
```

2. **dashboard.spec.ts** (1.5h)
```typescript
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login
    await page.context().addCookies([...])
  })

  test('deve carregar métricas', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=Patrimônio Total')).toBeVisible()
  })

  test('deve exibir sinais', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="signal-card"]')).toHaveCount(3)
  })

  test('mobile: deve ter menu hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('button[aria-label="Abrir menu"]')).toBeVisible()
  })
})
```

3. **portfolio.crud.spec.ts** (1.5h)
```typescript
test.describe('Portfolio CRUD', () => {
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
    // ... setup com posição
    await page.click('button[aria-label="Deletar posição"]')
    await expect(page.locator('text=AAPL')).not.toBeVisible()
  })

  test('deve editar posição', async ({ page }) => {
    // ... setup
    await page.click('button[aria-label="Editar"]')
    await page.fill('input[placeholder="Quantidade"]', '20')
    await page.click('button:has-text("Salvar")')
    // assert
  })
})
```

---

### Week 2: Components + Coverage (15h)

#### Day 6-8: Component Tests (8h)

**Criar:** `src/__tests__/components/`

1. **MetricCard.test.tsx** (1.5h)
```typescript
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
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

  it('deve renderizar icon quando fornecido', () => {
    render(
      <MetricCard
        label="Total"
        value="R$ 1.000"
        icon={<span data-testid="icon">Icon</span>}
      />
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
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

2. **AppShell.test.tsx** (2h)
```typescript
describe('AppShell', () => {
  it('deve redirecionar se não autenticado', () => {
    // Mock localStorage
    const { useAuthStore } = require('@/store/authStore')
    useAuthStore.mockReturnValue({ user: null, token: null })

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    // assert redirect
  })

  it('mobile: deve ter botão de menu', () => {
    mockAuth()
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const menuBtn = screen.getByLabelText('Abrir menu')
    expect(menuBtn).toBeVisible()
  })

  it('mobile: deve abrir sidebar ao clicar menu', async () => {
    mockAuth()
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )
    const menuBtn = screen.getByLabelText('Abrir menu')
    await userEvent.click(menuBtn)
    expect(screen.getByRole('navigation')).toHaveClass('translate-x-0')
  })
})
```

3. **Sidebar.test.tsx** (2h)
4. **AssetCard.test.tsx** (1.5h)
5. **EquityCurve.test.tsx** (1h)

---

#### Day 9-10: Coverage + CI/CD (7h)

**Setup GitHub Actions:** `.github/workflows/frontend-test.yml`

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
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend
          fail_ci_if_error: false
```

**package.json scripts:**
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

**Esforço:**
- Setup CI: 2h
- Integração com codecov: 1h
- Debugging de testes: 4h

---

## V. DISCLAIMER UI — IMPLEMENTAÇÃO (5h)

### 5.1 Criar Component (2h)

**Arquivo:** `src/components/ui/RiskDisclaimerModal.tsx`

```typescript
'use client'
import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'

const DISCLAIMER_TEXT = `
O LBH System é um simulador educacional para fins de aprendizado.

NÃO é aconselhamento financeiro profissional e não deve ser usado como base para decisões de investimento real.

RISCOS:
• Perda total do capital investido
• Resultados passados não garantem resultados futuros
• Mercados são imprevisíveis e voláteis
• Alavancagem amplifica ganhos E perdas
• Simulações não refletem custos reais (impostos, spreads, slippage)

Este sistema é fornecido "como está" sem garantias de precisão ou lucro.

Você é responsável por entender completamente os riscos antes de usar qualquer simulação aqui.
`

export default function RiskDisclaimerModal() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('risk_disclaimer_accepted')
    const acceptedVersion = localStorage.getItem('risk_disclaimer_version')
    
    if (!hasAccepted || acceptedVersion !== '1.0') {
      setOpen(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('risk_disclaimer_accepted', 'true')
    localStorage.setItem('risk_disclaimer_version', '1.0')
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
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-surface border border-border rounded-xl shadow-lg max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
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
            <p className="text-text-primary font-medium">
              O LBH System é um simulador educacional para fins de aprendizado.
            </p>

            {DISCLAIMER_TEXT.split('\n\n').map((section, idx) => (
              <p key={idx} className="whitespace-pre-wrap">
                {section}
              </p>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex-shrink-0 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scrolled}
                onChange={(e) => setScrolled(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-xs text-text-secondary">
                Declaro que li e entendi os riscos
              </span>
            </label>

            <button
              onClick={handleAccept}
              disabled={!scrolled}
              className="w-full bg-primary text-background font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark"
              aria-label="Aceitar aviso de risco"
            >
              Entendi — Continuar
            </button>

            <Dialog.Close asChild>
              <button
                onClick={() => {
                  /* Logout ou voltar */
                }}
                className="w-full text-text-secondary hover:text-text-primary py-2"
              >
                Sair
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

### 5.2 Integração com AppShell (1h)

**Modificar:** `src/components/layout/AppShell.tsx`

```typescript
import RiskDisclaimerModal from '@/components/ui/RiskDisclaimerModal'

export default function AppShell({ children }: { children: React.ReactNode }) {
  // ... existing code

  return (
    <div className="flex min-h-screen bg-background">
      <RiskDisclaimerModal />
      {/* resto do conteúdo */}
    </div>
  )
}
```

### 5.3 Footer Link (0.5h)

**Adicionar ao Sidebar:** `src/components/layout/Sidebar.tsx`

```typescript
<div className="px-3 pb-4 border-t border-border pt-3 space-y-0.5">
  {/* ... user info ... */}
  
  <button
    onClick={() => {
      localStorage.removeItem('risk_disclaimer_accepted')
      // Re-open modal
    }}
    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary transition-colors w-full"
  >
    <AlertTriangle size={12} />
    Ver Aviso de Risco
  </button>
</div>
```

### 5.4 Mobile Responsiveness (1.5h)

Já está coberto pelo Dialog.Content com `max-w-lg` e responsividade nativa.

Testes adicionais:
- Verificar em iPhone 12 (375px)
- Verificar em iPad (768px)
- Verificar que não há close button (força leitura)

---

## VI. NEXT STEPS APÓS SPRINT 1

### 6.1 Performance Continued
- [ ] Bundle analysis com `next/bundle-analyzer`
- [ ] Image optimization com next/image
- [ ] Route pre-fetching optimization
- [ ] API response caching strategy

### 6.2 Component Library Advanced
- [ ] Custom hooks library (usePortfolio, useSignals)
- [ ] Layout system (Flex, Grid, Stack components)
- [ ] Form components (Input, Select, Checkbox, Radio)
- [ ] Data table component

### 6.3 Accessibility Advanced
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader testing (NVDA, JAWS)
- [ ] Color contrast tools
- [ ] Focus management

### 6.4 Design System
- [ ] Figma → Storybook sync
- [ ] Design tokens (colors, spacing, typography)
- [ ] Component variants documentation
- [ ] Interaction patterns guide

---

## VII. MÉTRICAS DE SUCESSO

### Sprint 1 Goals:
- ✅ Mobile UX: 35 → 65/100
- ✅ Lighthouse: 60 → 75/100
- ✅ Component Library: 2 → 3.5/5
- ✅ Testing: 0 → 2/5 (E2E baseline)
- ✅ Disclaimer: 0 → 5/5

### Medição:
```bash
# Performance
npx next build && npm run test:all

# Lighthouse (local)
npm run build && npx lighthouse http://localhost:3000 --view

# Storybook
npm run storybook

# Coverage
npm run coverage
```

---

## VIII. REFERÊNCIAS RÁPIDAS

### Breakpoints Tailwind
```
sm: 640px   (mobile + tablets pequenos)
md: 768px   (tablets)
lg: 1024px  (laptops)
xl: 1280px  (desktops)
2xl: 1536px (desktops grandes)
```

### Touch Targets
- iOS HIG: minimum 44×44pt
- Android Material: minimum 48×48dp
- WCAG: minimum 44×44px

### Aria Attributes
```typescript
aria-label="descrição do botão"
aria-expanded={isOpen}
aria-pressed={isActive}
aria-describedby="tooltip-id"
role="dialog" // modais
role="navigation" // nav
role="presentation" // decorativos
```

### Next.js Dynamic Import
```typescript
const Component = dynamic(
  () => import('./Component'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
)
```
