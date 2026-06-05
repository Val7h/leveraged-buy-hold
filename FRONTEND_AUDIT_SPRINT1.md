# 🔍 FRONTEND AUDIT — LBH System Sprint 1

## 1. MOBILE UX AUDIT

### 1.1 Análise de Responsividade por Página

| Página | Status | Breakpoints | Issues |
|--------|--------|-------------|--------|
| Dashboard | ⚠️ Parcial | grid-cols-2 lg:grid-cols-4 | Sem md:, pula de 2→4 cols |
| Portfolio | ⚠️ Parcial | grid-cols-2 md:grid-cols-4 | OK, mas tabelas overflow |
| Backtest | ⚠️ Parcial | grid-cols-2 md:grid-cols-4 | Charts não responsivos |
| Simulator | 🔴 Ruim | grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 | Collapse > 768px |
| Assets | ⚠️ Parcial | grid-cols-1 md:grid-cols-3 | OK |
| Sharpe | ⚠️ Parcial | grid-cols-2 md:grid-cols-5 | Sem sm: fallback |
| Alerts | ⚠️ Parcial | grid-cols-2 md:grid-cols-4 | Charts truncadas |
| History | ⚠️ Parcial | Tabelas HTML | Sem overflow-x |
| Watchlist | ⚠️ Parcial | Tabelas HTML | Sem overflow-x |

**Problema Central:** Muitos grids "pulam" breakpoints (sm:, xs:)
- grid-cols-2 → md:grid-cols-4 (1280px jump)
- Nenhum sm: (640px) implementado
- lg:hidden vs responsiveness inconsistente

### 1.2 Layout Mobile
✅ AppShell mobile-first (hamburger menu, sticky header)
✅ Sidebar com z-index correto
✅ Viewport meta tag (verificar)
⚠️ Sidebar aberto no mobile = overlay ruim (z-30 backdrop)
⚠️ Touch targets: alguns botões <44px (ex: Menu icon 20×20)

### 1.3 Load Time Mobile
- Recharts não tree-shakeable (bundle pesado)
- Axios + Zustand carregam na main thread
- Sem code-splitting de páginas
- Sem Image optimization
- **Estimado:** 4-5s no 4G lento

### 1.4 Mobile Score Estimado: 35/100
- ✅ Layout adapta
- ❌ Breakpoints incoerentes
- ❌ Touch targets pequenos
- ❌ Performance ruim
- ❌ Sem viewport meta
- ❌ Tabelas overflow

---

## 2. LIGHTHOUSE AUDIT (Estimado)

### 2.1 Configuração Atual
```json
{
  "typescript": { "ignoreBuildErrors": true },
  "eslint": { "ignoreDuringBuilds": true }
}
```
🚩 **RED FLAG:** TypeScript/ESLint desligados = code quality problems hidden

### 2.2 Core Web Vitals (Estimado)
| Métrica | Valor | Target | Status |
|---------|-------|--------|--------|
| LCP | 2.8s | <2.5s | ❌ |
| FID | 80ms | <100ms | ❌ |
| CLS | 0.15 | <0.1 | ❌ |
| FCP | 1.5s | <1.8s | ✅ |
| TTFB | 0.4s | <0.6s | ✅ |

### 2.3 Audits
**Performance:** 45-55/100
- Recharts unmemoized renders
- Zustand estado não otimizado
- Sem lazy loading de charts
- Sem image optimization (logos)

**Accessibility:** 70-80/100
- ✅ Semantic HTML (AppShell, nav)
- ⚠️ Contrast ratios OK (dark theme)
- ❌ aria-labels faltando em botões dinâmicos
- ❌ Modais sem role="dialog"
- ❌ Tooltip sem aria-describedby

**Best Practices:** 60-70/100
- ⚠️ Console warnings (ignoreBuildErrors)
- ❌ Sem CSP headers
- ❌ Sem HTTPS enforcing
- ❌ localStorage não validado

**SEO:** 85-95/100
- ✅ Metadata correto
- ✅ Viewport meta
- ⚠️ Sem robots.txt (marketing app, OK)

**Lighthouse Score Estimado: 55-65/100** vs 90+ target

---

## 3. COMPONENT LIBRARY AUDIT

### 3.1 Inventário UI
**Base Components (3):**
- `MetricCard.tsx` — Genérico, bem estruturado, 65 linhas
- `ScoreGauge.tsx` — Especializado (Recharts)
- `TickerLogo.tsx` — Específico domínio

**Layout Components (2):**
- `AppShell.tsx` — Container, mobile-aware, 66 linhas
- `Sidebar.tsx` — Navegação, responsive, 117 linhas

**Domain Components (12+):**
- Charts: EquityCurve, DrawdownChart, LeverageChart, MonteCarloChart, PortfolioEquityCurve, PriceTradeChart
- Assets: AssetCard, AssetChartModal, MarketStateWidget
- Dashboard: (inline, não modularizado)
- Portfolio: (inline, não modularizado)

**Total Componentes:** ~18 (estimado)

### 3.2 Documentação
📋 **NÃO EXISTE:**
- Nenhum Storybook
- Nenhum arquivo README de componentes
- Nenhuma prop documentation
- Nenhuma interface TypeScript exportada

### 3.3 Reutilização
- ✅ MetricCard usado em 8+ páginas
- ✅ TickerLogo usado em dashboard, watchlist, portfolio
- ⚠️ Charts (Recharts) repetidos, não abstraídos
- ❌ Muita lógica inline em páginas (handleAddPosition, fetchSignals, etc)
- ❌ Copy-paste de grids (grid-cols-2 md:grid-cols-4 repetido 15+ vezes)

### 3.4 Component Library Maturity: 2/5
- Apenas 3 componentes reutilizáveis
- Sem documentação
- Sem Storybook
- Muita duplicação de código
- Sem padrão de exports

---

## 4. TESTING STRATEGY AUDIT

### 4.1 Testes Atuais
- ❌ **E2E Tests:** 0 arquivos (Playwright não instalado)
- ❌ **Unit Tests:** 0 arquivos (Jest/Vitest não instalado)
- ❌ **Component Tests:** 0 arquivos
- ❌ **Coverage:** 0%

### 4.2 CI/CD
Sem GitHub Actions visíveis para frontend

### 4.3 Testing Stack Recomendado
- Playwright para E2E (já é padrão Next.js)
- Vitest + React Testing Library para componentes
- Cypress alternative: Playwright
- Coverage target: 70%+ componentes, 80%+ pages

**Testing Maturity: 0/5**

---

## 5. DISCLAIMER UI AUDIT

### 5.1 Análise Atual
✅ **Texto de aviso em:** START_HERE.md (não integrado na app)
❌ **Nenhum disclaimer visual:**
- Sem banner na login
- Sem modal na primeira entrada
- Sem footer disclaimer
- Sem ícone de aviso

### 5.2 Requisitos Legais
- 🚩 App = simulador de investimentos (alto risco)
- 🚩 Alunos, não profissionais
- 🚩 Sem garantia de resultados
- 🚩 Educational purposes

### 5.3 Disclaimer Content Needed
```
"⚠️ AVISO DE RISCO — LBH System"
Este é um simulador educacional. Não é aconselhamento financeiro.
Resultados passados ≠ resultados futuros.
Risco de perda total do capital.
[Continuar] [Ler Completo]
```

**Disclaimer UI Maturity: 0/5** (não implementado)

---

## 6. TOP 5 UX ISSUES

### 🔴 CRÍTICO
1. **Breakpoints Incoerentes** — Grids pulam de 2 cols → 4 cols sem md:. Mobile vê apenas 2 cols até 1024px.
   - Impacto: Confuso em tablets (640-1024px)
   - Fix: Adicionar md:grid-cols-3, sm:gap-2
   - Esforço: 2h

2. **Touch Targets <44px** — Menu icon 20×20 em AppShell, alguns botões 14×14 em ícones
   - Impacto: Difícil clicar em mobile
   - Fix: min-w-10 min-h-10 + padding
   - Esforço: 1h

### 🟡 ALTO
3. **Recharts Unmemoized** — Componentes charts remontam a cada mudança de estado
   - Impacto: Slow re-renders, jank em simulador
   - Fix: useMemo + Recharts ResponsiveContainer lazy
   - Esforço: 3h

4. **Tabelas Overflow** — History, Watchlist sem horizontal scroll em mobile
   - Impacto: Conteúdo cortado em <640px
   - Fix: overflow-x-auto com scrollbar styling
   - Esforço: 1.5h

5. **Sem Lazy Loading** — Todas as páginas carregam Recharts bundle
   - Impacto: ~250KB extra por página
   - Fix: dynamic() import com Next.js
   - Esforço: 2h

---

## 7. COMPONENT LIBRARY RECOMMENDATIONS

### 7.1 Criar Estrutura
```
src/components/
  ├── ui/                    # Primitivos reutilizáveis
  │   ├── Button.tsx         # Custom, com sizes, variants
  │   ├── Input.tsx
  │   ├── Card.tsx
  │   ├── Badge.tsx
  │   ├── MetricCard.tsx     # (mover)
  │   └── Table.tsx          # (novo)
  ├── charts/               # Recharts wrappers (memoized)
  │   ├── BaseChart.tsx     # HOC para styling
  │   └── ...
  ├── layout/               # (já existe)
  └── storybook/            # Documentação
```

### 7.2 Storybook Setup
- `npm install -D storybook @storybook/nextjs`
- Stories para: Button, MetricCard, TickerLogo, AssetCard
- Chromatic para visual regression

### 7.3 Export Pattern
```typescript
// src/components/ui/index.ts
export { default as Button } from './Button'
export { default as MetricCard } from './MetricCard'
export type { MetricCardProps } from './MetricCard'
```

---

## 8. TESTING STRATEGY (2-WEEK PLAN)

### Week 1: Setup + E2E
**Days 1-2: Setup**
```bash
npm install -D @playwright/test
npx playwright install
npm install -D vitest @vitest/ui react-testing-library jsdom
```

**Days 3-5: E2E Tests**
- Login flow (3 casos)
- Dashboard loading (2 casos)
- Portfolio CRUD (5 casos)
- 10 testes = 80% coverage de user flows

### Week 2: Components + Integration
**Days 6-8: Component Tests**
- MetricCard (3 cases)
- AppShell + Sidebar (4 cases)
- AssetCard (2 cases)
- 9 testes

**Days 9-10: Coverage + CI**
- Coverage badge na main
- GitHub Actions workflow
- Target: 70%+ lines

### Files to Create
```
frontend/__tests__/
├── e2e/
│   ├── login.spec.ts
│   ├── dashboard.spec.ts
│   ├── portfolio.crud.spec.ts
│   └── fixtures/
├── components/
│   ├── MetricCard.test.tsx
│   └── AppShell.test.tsx
├── fixtures/
│   └── mock-data.ts
└── playwright.config.ts (exists in .e2e? or create)
```

---

## 9. DISCLAIMER UI PROPOSAL

### 9.1 Implementation Approach
**Location:** Modal + Footer banner

**Component:** `RiskDisclaimerModal.tsx`
```typescript
export default function RiskDisclaimerModal() {
  const [accepted, setAccepted] = useState(false)
  
  return (
    <Dialog open={!hasAccepted()}>
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-danger">
          ⚠️ AVISO DE RISCO IMPORTANTE
        </h2>
        <p className="text-sm text-text-secondary">
          {fullDisclaimerText}
        </p>
        <button onClick={() => acceptDisclaimer()}>
          Eu Entendi — Continuar
        </button>
      </div>
    </Dialog>
  )
}
```

**Integration:**
- Show on first app load
- Store acceptance in localStorage
- Footer with "Ver Aviso" link

### 9.2 Mobile Considerations
- ✅ Modal responsive (w-full max-w-lg)
- ✅ Touch target >44px para button
- ✅ Scroll if content >80vh
- ✅ No close button (forced read)

### 9.3 Content Structure
```
Aviso de Risco
├── O que é LBH System (1 parágrafo)
├── Não é aconselhamento (1 parágrafo)
├── Riscos (5 bullets)
├── Isenção de responsabilidade (2 parágrafos)
├── [Checkbox] Declaro que entendi
└── [Botão] Continuar
```

---

## RESUMO EXECUTIVO

| Métrica | Score | Target | Status |
|---------|-------|--------|--------|
| **Mobile UX** | 35/100 | 75+ | 🔴 |
| **Lighthouse** | 60/100 | 90+ | 🔴 |
| **Component Library** | 2/5 | 4+ | 🟡 |
| **Testing** | 0/5 | 3+ | 🔴 |
| **Disclaimer** | 0/5 | 5 | 🔴 |

**Top 3 Prioridades:**
1. Breakpoints responsive (grid-cols-2 → sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4)
2. Touch targets >44px
3. Lazy load Recharts + memoization

**Esforço Total Sprint 1:** ~40h
- Responsiveness fixes: 15h
- Testing setup: 20h
- Disclaimer: 5h
