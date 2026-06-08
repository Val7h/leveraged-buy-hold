# Mobile-First Responsive Design Guide
## LBH System Frontend — Day 4 Morning Push

**Target:** 90% → 95% responsive completion  
**Timeline:** 8:00 AM - 12:00 PM PT-BR (4 hours)  
**Status:** IN PROGRESS

---

## ✅ Core Infrastructure (COMPLETED)

### Custom Hooks
- ✅ **useSwipe** (`src/hooks/useSwipe.ts`) - Touch swipe gestures
  - Detects left/right/up/down swipes
  - Velocity-based (min 200px/s)
  - Useful for carousel, drawer navigation

- ✅ **usePullToRefresh** (`src/hooks/usePullToRefresh.ts`) - Pull-to-refresh gesture
  - Native iOS/Android style
  - Configurable threshold (default 100px)
  - Triggers async refresh callback

### Responsive Utilities
- ✅ **mobile.ts** (`src/lib/mobile.ts`) - Device detection helpers
  - `isMobile()` - Check if < 768px
  - `isTablet()` - Check if 768px-1024px
  - `isTouchDevice()` - Check touch capability
  - `getDeviceType()` - Get device category
  - `getOrientation()` - Portrait/landscape detection
  - `getSafeAreaInsets()` - Notch/safe area support

- ✅ **globals.css** - Mobile-optimized CSS
  - Safe area inset variables
  - Dynamic viewport height (100dvh)
  - Touch-friendly button sizes (44px minimum)
  - Input font-size 16px (prevents iOS zoom)
  - Prevent rubber-band scroll

### Components
- ✅ **PullToRefreshIndicator** - Visual feedback for pull-to-refresh
- ✅ **ResponsiveGrid** - Auto-responsive grid layout

---

## 📱 Device Testing Checklist

### 6 Test Devices

#### Desktop
- [ ] Chrome 1920x1080
- [ ] Firefox 1920x1080
- [ ] Safari 1920x1080

#### Tablet
- [ ] iPad Air (768x1024)
- [ ] iPad Pro 11" (834x1194)

#### Mobile
- [ ] iPhone 14 Pro (390x844)
- [ ] iPhone 14 Pro Max (430x932)
- [ ] iPhone 12 mini (375x812)
- [ ] Samsung Galaxy S24 (412x915)
- [ ] Google Pixel 8 (412x915)
- [ ] OnePlus 12 (412x915)

**Lighthouse Mobile Target:** 85+

---

## 🎨 Responsive Breakpoints

```css
/* Tailwind breakpoints */
sm:  640px    /* Small phones, landscape */
md:  768px    /* Tablets */
lg:  1024px   /* Desktops */
xl:  1280px   /* Large screens */
2xl: 1536px   /* Cinema */
```

---

## 📋 Page Checklist (19 pages)

### Home & Auth
- [ ] `/` (home) - 100% responsive
- [ ] `/login` - 100% responsive
- [ ] `/disclaimer` - 100% responsive

### Dashboard & Portfolio
- [x] `/dashboard` - Core page, mostly responsive
- [ ] `/portfolio` - 383 lines, needs refinement
- [ ] `/watchlist` - Needs touch swipe support
- [ ] `/history` - Check mobile tables

### Screening & Analysis
- [ ] `/assets` - 273 lines, chart responsive?
- [ ] `/backtest` - 199 lines, complex forms
- [ ] `/sharpe` - Charts on mobile
- [ ] `/sharpe-compare` - 364 lines, dual comparison

### Advanced
- [ ] `/simulator` - 430 lines, Monte Carlo charts
- [ ] `/alerts` - 249 lines, notifications
- [ ] `/notifications` - 255 lines, list view
- [ ] `/pricing` - 337 lines, pricing table
- [ ] `/news` - Content-heavy

### Legal
- [ ] `/termos` - Scrollable legal text
- [ ] `/privacidade` - Scrollable legal text
- [ ] `/lgpd` - Scrollable legal text

---

## 🔧 Critical Responsive Patterns

### 1. Grid/Flex Layouts
```tsx
// Bad - fixed width
<div className="grid grid-cols-3 gap-4">

// Good - responsive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 2. Text Sizing
```tsx
// Bad - fixed px
<h1 className="text-2xl">Title</h1>

// Good - responsive scales
<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl">Title</h1>
```

### 3. Touch Targets
```tsx
// Bad - < 44px touch target
<button className="px-2 py-1">Click</button>

// Good - 44px minimum (2.75rem)
<button className="touch-target px-4 py-2.5 min-h-11">Click</button>
```

### 4. Safe Area (Notches)
```tsx
// Bad - ignores notch
<header className="p-4">

// Good - accounts for iPhone X+ notches
<header className="safe-area-top p-4">
```

### 5. Input Sizing
```tsx
// Bad - 14px font → iOS zoom on focus
<input className="text-sm" />

// Good - 16px font prevents zoom
<input className="text-base input" />
```

### 6. Modal/Dialog
```tsx
// Bad - fixed size
<dialog className="w-96 h-96">

// Good - responsive
<dialog className="w-full sm:w-96 max-h-screen sm:max-h-96">
```

---

## 📊 Performance Targets

### Lighthouse Mobile
- **Performance:** 85+ (target)
- **Accessibility:** 90+
- **Best Practices:** 95+
- **SEO:** 95+

### Current Status
- Homepage Mobile: 81 performance → **target 85+**

### Optimization Actions
1. Lazy-load charts (Recharts)
2. Image optimization (next/image)
3. Code splitting by route
4. Remove unused CSS
5. Minify JSON responses

---

## 🚀 Touch Hooks Usage Examples

### useSwipe
```tsx
import { useSwipe } from '@/hooks';

export function Carousel() {
  const { ref, isDetecting } = useSwipe({
    minDistance: 50,
    minVelocity: 200,
    onSwipeLeft: () => nextSlide(),
    onSwipeRight: () => prevSlide(),
  });

  return (
    <div ref={ref} className="overflow-hidden">
      {slides[current]}
    </div>
  );
}
```

### usePullToRefresh
```tsx
import { usePullToRefresh } from '@/hooks';
import PullToRefreshIndicator from '@/components/mobile/PullToRefreshIndicator';

export function Dashboard() {
  const { ref, state } = usePullToRefresh({
    onRefresh: async () => {
      await fetchData();
    },
    threshold: 100,
  });

  return (
    <div ref={ref} className="h-screen overflow-y-auto">
      <PullToRefreshIndicator {...state} />
      <Content />
    </div>
  );
}
```

---

## 📱 CSS Classes for Mobile

### Safe Area Padding
```html
<header class="safe-area-top">Content</header>
<footer class="safe-area-bottom">Content</footer>
```

### Touch-Friendly Buttons
```html
<button class="touch-target btn-primary">Click me</button>
```

### Responsive Grid
```tsx
<ResponsiveGrid 
  columns={{ mobile: 1, md: 2, lg: 3 }}
  gap="md"
>
  {items}
</ResponsiveGrid>
```

---

## 🎯 Day 4 Morning Goals

### Hour 1-2 (8:00-10:00 AM)
- [ ] Complete `/portfolio` page mobile optimization
- [ ] Complete `/assets` page mobile optimization
- [ ] Add useSwipe to `/watchlist`
- [ ] Test on 3 devices

### Hour 3-4 (10:00 AM-12:00 PM)
- [ ] Complete remaining pages (5 pages)
- [ ] Final 6-device testing pass
- [ ] Lighthouse mobile 85+ confirmation
- [ ] PR ready for afternoon merge

---

## ✅ Final Checklist

- [ ] All 19 pages 100% responsive (mobile-first)
- [ ] useSwipe hook implemented and tested
- [ ] usePullToRefresh hook implemented and tested
- [ ] Lighthouse mobile: 85+
- [ ] No layout shifts on any device
- [ ] Touch targets all ≥44px
- [ ] No horizontal scroll on mobile
- [ ] Safe area insets working (notched devices)
- [ ] All forms auto-zoom-free (16px input)
- [ ] PR created and ready to merge

---

## 🔗 Related Files

- `src/hooks/useSwipe.ts`
- `src/hooks/usePullToRefresh.ts`
- `src/lib/mobile.ts`
- `src/components/mobile/PullToRefreshIndicator.tsx`
- `src/components/layout/ResponsiveGrid.tsx`
- `src/app/globals.css`

---

**Status:** IN PROGRESS  
**Confidence:** 94% (zero blockers expected)  
**ETA:** 12:00 PM PT-BR (90% → 95% complete)
