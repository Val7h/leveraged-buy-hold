# Mobile Responsive Audit Checklist
## Day 4 Morning Push - Device Testing Phase

**Testing Protocol:** Manual testing on 6 device types  
**Target Viewport Sizes:**
- Mobile: 375px (iPhone 12 mini) - 412px (Samsung)
- Tablet: 768px (iPad) - 834px (iPad Pro)
- Desktop: 1920px (baseline)

---

## ✅ DEVICES TO TEST

### Phase 1: Priority (Hour 2)
- [ ] **iPhone 14 Pro** (390x844) - Primary iOS device
- [ ] **iPad Air** (768x1024) - Tablet test
- [ ] **Samsung Galaxy S24** (412x915) - Android primary

### Phase 2: Extended (Hour 3)
- [ ] **iPhone 12 mini** (375x812) - Small iOS
- [ ] **Google Pixel 8** (412x915) - Android alternative
- [ ] **Desktop 1920x1080** - Sanity check

### Testing Method
1. Open Chrome DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Select each device
4. Check each page in Device Toolbar
5. Document issues in spreadsheet

---

## 📋 PAGES TO AUDIT (19 Total)

### HOME & AUTH
- [ ] `/` (home page)
  - [ ] No horizontal scroll at 375px
  - [ ] Hero text readable
  - [ ] CTAs touch-friendly (44px)
  - [ ] Navigation responsive
  - Mobile notes: _______________

- [ ] `/login` (login form)
  - [ ] Form fields full width
  - [ ] Input font-size 16px
  - [ ] No iOS zoom on focus
  - [ ] Error messages clear
  - Mobile notes: _______________

- [ ] `/disclaimer` (legal page)
  - [ ] Text readable without zoom
  - [ ] Buttons centered/stacked
  - [ ] No horizontal scroll
  - Mobile notes: _______________

### CORE DASHBOARD
- [ ] `/dashboard` (main dashboard)
  - [ ] Metrics grid 1→2→4 cols
  - [ ] Cards don't overflow
  - [ ] Signal cards responsive
  - [ ] Market widget visible
  - [ ] Buttons stacked on mobile
  - Mobile notes: _______________

- [ ] `/portfolio` (portfolio management)
  - [ ] Form fields responsive
  - [ ] Metrics grid 1→2→3→4
  - [ ] Position table/cards
  - [ ] Edit forms overlay well
  - [ ] Equity curve responsive
  - Mobile notes: _______________

- [ ] `/watchlist` (watchlist)
  - [ ] Ticker input full width
  - [ ] Add form responsive
  - [ ] Card list stacks
  - [ ] Ticker badges wrap
  - [ ] Score chips visible
  - Mobile notes: _______________

- [ ] `/history` (transaction history)
  - [ ] Data table responsive
  - [ ] Columns condense on mobile
  - [ ] Dates/amounts clear
  - [ ] Status badges visible
  - Mobile notes: _______________

### ANALYSIS & TOOLS
- [ ] `/assets` (asset screening)
  - [ ] Filter form responsive
  - [ ] Grid 1→2→3→4 cols
  - [ ] Charts responsive
  - [ ] Ticker logos load
  - [ ] No horizontal scroll
  - Mobile notes: _______________

- [ ] `/backtest` (backtest tool)
  - [ ] Form inputs stack
  - [ ] Charts visible
  - [ ] Results table responsive
  - [ ] Download button accessible
  - Mobile notes: _______________

- [ ] `/sharpe` (Sharpe analysis)
  - [ ] Filter form responsive
  - [ ] Charts readable
  - [ ] Results table scrolls horizontally (if needed)
  - [ ] Preset buttons accessible
  - Mobile notes: _______________

- [ ] `/sharpe-compare` (dual comparison)
  - [ ] Form inputs responsive
  - [ ] Charts side-by-side or stacked
  - [ ] Comparison table responsive
  - [ ] Export button accessible
  - Mobile notes: _______________

- [ ] `/simulator` (Monte Carlo simulator)
  - [ ] Form fields responsive (7 cols → 1)
  - [ ] Charts visible
  - [ ] Results readable
  - [ ] Input font-size 16px
  - Mobile notes: _______________

### ALERTS & NOTIFICATIONS
- [ ] `/alerts` (alert management)
  - [ ] Alert list responsive
  - [ ] Buttons touch-friendly
  - [ ] Delete/edit options clear
  - [ ] No horizontal scroll
  - Mobile notes: _______________

- [ ] `/notifications` (notification center)
  - [ ] List items full width
  - [ ] Timestamps readable
  - [ ] Buttons accessible
  - [ ] Pagination visible
  - Mobile notes: _______________

### PRICING & CONTENT
- [ ] `/pricing` (pricing table)
  - [ ] Table responsive
  - [ ] Cards stack 1→2→3
  - [ ] CTA buttons visible
  - [ ] Features list clear
  - Mobile notes: _______________

- [ ] `/news` (news/content)
  - [ ] Articles readable
  - [ ] Images responsive
  - [ ] No text overflow
  - [ ] Links clickable
  - Mobile notes: _______________

### LEGAL PAGES
- [ ] `/termos` (terms of service)
  - [ ] Text readable (no zoom)
  - [ ] Line length reasonable
  - [ ] Headings clear
  - [ ] Links accessible
  - Mobile notes: _______________

- [ ] `/privacidade` (privacy policy)
  - [ ] Text readable (no zoom)
  - [ ] Line length reasonable
  - [ ] Headings clear
  - [ ] Links accessible
  - Mobile notes: _______________

- [ ] `/lgpd` (LGPD compliance)
  - [ ] Content readable
  - [ ] Sections organized
  - [ ] Links functional
  - Mobile notes: _______________

---

## 🎨 RESPONSIVE DESIGN STANDARDS

### Touch Targets
- [x] Minimum 44x44px (2.75rem)
- [x] Padding between targets ≥10px
- [x] Interactive elements have active state
- [x] No hover-only interactions

### Text & Readability
- [x] Minimum font size 16px (prevents iOS zoom)
- [x] Line height ≥1.5
- [x] Line length <80 characters (mobile)
- [x] Sufficient contrast (WCAG AA)

### Spacing & Layout
- [x] Horizontal padding on mobile (16px min)
- [x] Vertical spacing consistent
- [x] No horizontal scroll at any viewport
- [x] Safe area insets used (notches)

### Forms
- [x] Input font-size 16px (iOS zoom prevention)
- [x] Labels visible and associated
- [x] Error messages clear
- [x] Submit buttons prominent
- [x] Keyboard type hints (email, tel, etc.)

### Images & Media
- [x] Images responsive (max-width: 100%)
- [x] Charts responsive containers
- [x] SVG/icons scale well
- [x] No oversized images

### Navigation
- [x] Mobile hamburger menu or tabs
- [x] No hover-dependent navigation
- [x] Breadcrumbs/back button clear
- [x] Current page indicator visible

---

## 🔍 LIGHTHOUSE MOBILE TARGETS

### Performance: 85+
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Contentful Paint (FCP) < 1.8s

### Accessibility: 90+
- [ ] Color contrast ≥ 4.5:1
- [ ] Form labels present
- [ ] Alt text on images
- [ ] Keyboard navigation works

### Best Practices: 95+
- [ ] HTTPS enabled
- [ ] No console errors
- [ ] No deprecated APIs
- [ ] Images optimized

### SEO: 95+
- [ ] Meta descriptions present
- [ ] Viewport meta tag
- [ ] Open Graph tags
- [ ] Canonical URLs

---

## 📊 TESTING SPREADSHEET TEMPLATE

| Page | Device | Horizontal Scroll | Text Size | Touch Target | Charts | Notes |
|------|--------|---|---|---|---|---|
| `/` | iPhone | ✓ | ✓ | ✓ | N/A | |
| `/` | iPad | ✓ | ✓ | ✓ | N/A | |
| `/` | Android | ✓ | ✓ | ✓ | N/A | |
| `/dashboard` | iPhone | ✓ | ✓ | ✓ | ✓ | |
| ... | ... | ... | ... | ... | ... | |

---

## ⚠️ COMMON ISSUES TO CHECK

- [ ] **Horizontal scroll on mobile** - Most common issue
  - Fix: Use `max-w-full`, `overflow-x-hidden`, responsive grids
  
- [ ] **Input zoom on iOS** - 16px rule
  - Fix: Ensure all inputs have `text-base` (16px)
  
- [ ] **Small touch targets** - <44px buttons/links
  - Fix: Use `touch-target` class (min 2.75rem)
  
- [ ] **Charts unresponsive** - Fixed height/width
  - Fix: Use ResponsiveContainer from Recharts
  
- [ ] **Text too small** - <14px on mobile
  - Fix: Use `text-base` or `text-sm` (14px min)
  
- [ ] **Safe area ignored** - Notched devices
  - Fix: Use `safe-area-*` classes or env()
  
- [ ] **Forms too narrow** - Squished inputs
  - Fix: Full width on mobile, responsive grid on desktop

---

## ✅ SIGN-OFF

Testing completed by: _______________  
Date: _______________  
Lighthouse score (mobile): _______________  
Issues found and fixed: _______________  
Ready for production: [ ] YES [ ] NO

---

**Next Steps:**
1. Test each page on each device
2. Document issues found
3. Fix responsive issues
4. Run Lighthouse audit
5. Commit fixes
6. Deploy to staging
