# Disclaimer Modal - Sprint 1 Component Specification
**Created**: June 5, 2026  
**Status**: READY FOR LEGAL REVIEW  
**Component Location**: `src/components/modals/DisclaimerModal.tsx`

---

## Overview

Interactive disclaimer modal that displays regulatory compliance information to first-time users and on login. Modal includes:
- Risk disclosure
- Investment disclaimer  
- Terms acknowledgment
- Mandatory checkboxes
- Accept/Decline buttons

---

## Component Mockup

```
┌─────────────────────────────────────────────────────┐
│  ✕  IMPORTANTE: Leia antes de usar a plataforma    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🚨 AVISO DE RISCO DE INVESTIMENTO                 │
│                                                     │
│  O LBH System é uma plataforma de análise          │
│  quantitativa para investimentos defensivos.       │
│  NÃO é uma recomendação de compra/venda.           │
│                                                     │
│  ⚠️  Riscos Importantes:                            │
│  • Alavancagem amplifica ganhos E perdas           │
│  • Mercado pode cair > 50% em crises               │
│  • Dividend yield não é garantido                   │
│  • Liquidez pode ser reduzida em crises            │
│                                                     │
│  ✓ Entendo os riscos de alavancagem                │
│  ✓ Não esperarei recomendações personalizadas     │
│                                                     │
│                  [DECLINAR]  [ACEITAR]             │
└─────────────────────────────────────────────────────┘
```

---

## Layout Specifications

### Modal Container
- **Max Width**: 600px (sm: 90vw)
- **Position**: Fixed center, z-index 50
- **Backdrop**: Black/60, clickable to dismiss (if Decline)
- **Border Radius**: 12px (rounded-xl)
- **Shadow**: card-level (elevation-8)
- **Background**: surface color with border

### Header
- **Title**: "IMPORTANTE: Leia antes de usar a plataforma"
- **Icon**: 🚨 (warning emoji or lucide AlertTriangle)
- **Close Button**: ✕ (top-right corner, if allowDismiss = false, hide it)
- **Font Size**: 16px (sm-font) bold
- **Spacing**: 20px padding

### Body Content

#### Section 1: Warning Alert
```
🚨 AVISO DE RISCO DE INVESTIMENTO

O LBH System é uma plataforma de análise quantitativa 
para investimentos defensivos de longo prazo. 
NÃO constitui recomendação de compra/venda de valores.
```

**Styling**:
- Background: warning/8
- Border: 1px warning/20  
- Padding: 16px
- Border Radius: 8px
- Icon Color: warning
- Font: 13px, text-text-secondary

#### Section 2: Risk Disclosure
```
⚠️  Riscos Importantes:

• Alavancagem amplifica ganhos E perdas
• Mercado pode cair > 50% em crises
• Dividend yield não é garantido  
• Liquidez reduzida durante volatilidade
• Veja DISCLAIMER_MODAL_SPEC.md para mais
```

**Styling**:
- Bullet points with left border
- Left border: 2px primary/30
- Padding left: 12px
- Font: 12px monospace, text-text-muted
- Line-height: 1.6

#### Section 3: Acknowledgment Checkboxes
```
✓ Entendo os riscos de alavancagem e aceitá-los
✓ Não esperarei recomendações personalizadas
✓ Concordo com os Termos de Uso
```

**Checkbox Styling**:
- Type: Radix UI Checkbox
- Size: 18px
- Color: primary
- Label: 13px, text-text-secondary
- Required: ALL must be checked to enable Accept button

#### Section 4: Action Buttons
```
[DECLINAR]  [ACEITAR]
```

**Button Styling**:
- Layout: Flex, gap-3, justify-end
- Decline: btn-secondary (outlined)
- Accept: btn-primary (filled, disabled until all checkboxes)
- Width: 100% on mobile (stack vertically), side-by-side on tablet+
- Height: 44px (touch target minimum)

---

## Component Props

```typescript
interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  allowDismiss?: boolean;  // Allow ✕ close without accepting
  title?: string;
  riskContent?: string;
  checkboxes?: Array<{ id: string; label: string; required: boolean }>;
}
```

### Default Checkboxes

```typescript
const defaultCheckboxes = [
  {
    id: "leverage-risk",
    label: "Entendo os riscos de alavancagem e aceitá-los",
    required: true,
  },
  {
    id: "no-personalization",
    label: "Não esperarei recomendações personalizadas da plataforma",
    required: true,
  },
  {
    id: "terms",
    label: "Concordo com os Termos de Uso",
    required: true,
  },
];
```

---

## Component Implementation

### TypeScript Definition

```typescript
// src/types/disclaimer.ts
export interface DisclaimerCheckbox {
  id: string;
  label: string;
  required: boolean;
}

export interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  allowDismiss?: boolean;
  title?: string;
  checkboxes?: DisclaimerCheckbox[];
}
```

### Component File Structure

```
src/
├── components/
│   └── modals/
│       ├── DisclaimerModal.tsx      (main component)
│       └── DisclaimerModal.css       (if custom styles needed)
├── hooks/
│   └── useDisclaimer.ts              (custom hook for modal state)
└── types/
    └── disclaimer.ts                 (TypeScript types)
```

### Component Code Template

```typescript
// src/components/modals/DisclaimerModal.tsx
"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Checkbox from "@radix-ui/react-checkbox";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerCheckbox {
  id: string;
  label: string;
  required: boolean;
}

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  allowDismiss?: boolean;
  title?: string;
  checkboxes?: DisclaimerCheckbox[];
}

const DEFAULT_CHECKBOXES: DisclaimerCheckbox[] = [
  {
    id: "leverage-risk",
    label: "Entendo os riscos de alavancagem e aceitá-los",
    required: true,
  },
  {
    id: "no-personalization",
    label: "Não esperarei recomendações personalizadas",
    required: true,
  },
  {
    id: "terms",
    label: "Concordo com os Termos de Uso",
    required: true,
  },
];

const RISK_CONTENT = `O LBH System é uma plataforma de análise quantitativa para investimentos defensivos de longo prazo.

NÃO constitui recomendação de compra/venda, gestão de investimentos, ou consultoria financeira.

Você é responsável por todas as decisões de investimento.`;

export default function DisclaimerModal({
  isOpen,
  onAccept,
  onDecline,
  allowDismiss = false,
  title = "IMPORTANTE: Leia antes de usar a plataforma",
  checkboxes = DEFAULT_CHECKBOXES,
}: DisclaimerModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allRequiredChecked = checkboxes
    .filter((c) => c.required)
    .every((c) => checked[c.id]);

  const handleAccept = () => {
    if (allRequiredChecked) {
      onAccept();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && allowDismiss && onDecline()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />

        {/* Modal */}
        <Dialog.Content className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto",
          "bg-surface border border-border rounded-xl shadow-card"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-surface">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-warning" />
              <Dialog.Title className="text-sm font-semibold text-text-primary">
                {title}
              </Dialog.Title>
            </div>
            {allowDismiss && (
              <Dialog.Close className="p-1 hover:bg-surface-2 rounded transition-colors">
                <X size={18} className="text-text-secondary" />
              </Dialog.Close>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Warning Section */}
            <div className="bg-warning/8 border border-warning/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                <h3 className="text-xs font-bold text-warning uppercase tracking-wider">
                  Aviso de Risco de Investimento
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
                {RISK_CONTENT}
              </p>
            </div>

            {/* Risk Disclosure */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={14} className="text-warning" />
                Riscos Importantes
              </h4>
              <div className="space-y-2">
                {[
                  "Alavancagem amplifica ganhos E perdas",
                  "Mercado pode cair > 50% em crises",
                  "Dividend yield não é garantido",
                  "Liquidez reduzida durante volatilidade",
                  "Veja documentação legal para informações completas",
                ].map((risk, i) => (
                  <div key={i} className="flex gap-3 text-xs text-text-muted border-l-2 border-primary/30 pl-3">
                    <span>•</span>
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 border-t border-border pt-6">
              {checkboxes.map((checkbox) => (
                <div key={checkbox.id} className="flex items-start gap-3">
                  <Checkbox.Root
                    id={checkbox.id}
                    checked={checked[checkbox.id] || false}
                    onCheckedChange={(value) =>
                      setChecked((prev) => ({ ...prev, [checkbox.id]: value }))
                    }
                    className="mt-1"
                  />
                  <label
                    htmlFor={checkbox.id}
                    className="text-xs text-text-secondary leading-relaxed cursor-pointer flex-1"
                  >
                    {checkbox.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3 justify-end bg-surface sticky bottom-0">
            <button
              onClick={onDecline}
              className="btn-secondary text-sm flex-1 sm:flex-none"
            >
              Declinar
            </button>
            <button
              onClick={handleAccept}
              disabled={!allRequiredChecked}
              className={cn(
                "btn-primary text-sm flex-1 sm:flex-none",
                !allRequiredChecked && "opacity-50 cursor-not-allowed"
              )}
            >
              Aceitar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Usage in Layout

### Login Flow
```typescript
// src/app/login/page.tsx
export default function LoginPage() {
  const [showDisclaimer, setShowDisclaimer] = useState(!localStorage.getItem("disclaimerAccepted"));
  
  const handleAccept = () => {
    localStorage.setItem("disclaimerAccepted", "true");
    setShowDisclaimer(false);
  };

  return (
    <>
      <DisclaimerModal 
        isOpen={showDisclaimer}
        onAccept={handleAccept}
        onDecline={() => router.push("/")}
        allowDismiss={false}
      />
      {/* login form */}
    </>
  );
}
```

### App Shell (On Every Login)
```typescript
// src/components/layout/AppShell.tsx
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  
  useEffect(() => {
    // Show on first visit or every login
    if (!sessionStorage.getItem("disclaimerShownThisSession")) {
      setShowDisclaimer(true);
      sessionStorage.setItem("disclaimerShownThisSession", "true");
    }
  }, []);

  return (
    <>
      <DisclaimerModal 
        isOpen={showDisclaimer}
        onAccept={() => setShowDisclaimer(false)}
        onDecline={() => router.push("/")}
        allowDismiss={true}
      />
      {/* app content */}
    </>
  );
}
```

---

## Styling Details

### Tailwind Classes Reference

| Element | Classes |
|---------|---------|
| Modal Container | `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-2xl max-h-[90vh] bg-surface border border-border rounded-xl shadow-card` |
| Backdrop | `fixed inset-0 z-40 bg-black/60` |
| Header | `flex items-center justify-between p-6 border-b border-border sticky top-0 bg-surface` |
| Section Box | `bg-warning/8 border border-warning/20 rounded-lg p-4` |
| Checkbox | Radix UI with primary color |
| Button | `min-h-[48px]` (touch target) |
| Text Labels | `text-xs text-text-secondary` |

---

## Accessibility

### ARIA Labels
- `aria-label="Fechar"` on close button
- `aria-required="true"` on required checkboxes
- `role="alertdialog"` on modal (emphasize importance)

### Keyboard Navigation
- Tab through checkboxes → buttons
- Enter to toggle checkbox
- Enter/Space to click buttons
- Esc to decline (if allowDismiss=true)

### Screen Readers
- Title announced by Dialog.Title
- Checkboxes announced with labels
- Warning icons provide context

---

## Mobile Optimization

### Responsive Behavior
- **Mobile (< 640px)**: 
  - Full width with 20px padding
  - Checkboxes stack
  - Buttons stack vertically (full width each)

- **Tablet (640px+)**:
  - Max-width 600px
  - Buttons side-by-side
  - Optimal reading

### Touch Targets
- Checkboxes: 24x24px (min 48x48 with label)
- Buttons: 48x48px minimum
- Tap area around text labels

---

## Content Requirements (FOR LEGAL REVIEW)

### Required Sections
1. ✅ Investment Risk Disclaimer
2. ✅ Leverage Risk Explanation
3. ✅ Market Volatility Warning
4. ✅ No Financial Advice Statement
5. ✅ User Responsibility Statement

### To Be Provided by Legal
- [ ] Exact disclaimer text (Portuguese + English)
- [ ] Risk disclosures (complete list)
- [ ] Terms of Use link/content
- [ ] Regulatory notices (if applicable by jurisdiction)
- [ ] Data privacy notice link

### Integration Points
- Link to full T&C: `href="/legal/terms"`
- Link to Privacy: `href="/legal/privacy"`
- Version number: `v1.0.0` (update on legal changes)

---

## Testing Checklist

- [ ] Modal renders correctly on desktop/mobile
- [ ] All checkboxes functional
- [ ] Accept button disabled until all required checked
- [ ] Accept triggers callback
- [ ] Decline triggers callback
- [ ] Close button (if allowed) triggers decline
- [ ] Backdrop click (if allowed) triggers decline
- [ ] Keyboard navigation works
- [ ] Screen reader announces all content
- [ ] Touch targets >= 48px on mobile
- [ ] Modal doesn't scroll with page underneath
- [ ] Z-index correct (50 for modal, 40 for backdrop)

---

## Future Enhancements

- [ ] Multi-language support (PT-BR, EN, ES)
- [ ] Version tracking (update checkbox on new legal terms)
- [ ] Analytics tracking (when users accept/decline)
- [ ] Integration with CMS for dynamic content
- [ ] PDF download of disclaimer
- [ ] Timestamp recording of acceptance

---

## Files to Create

1. `src/components/modals/DisclaimerModal.tsx` - Main component
2. `src/types/disclaimer.ts` - TypeScript types
3. `src/hooks/useDisclaimer.ts` - Custom hook (optional)
4. `src/components/modals/DisclaimerModal.test.tsx` - Tests (optional)

---

## Deployment Checklist

- [ ] Legal team reviews and approves content
- [ ] A/B test with sample users
- [ ] Verify localStorage/sessionStorage behavior
- [ ] Test on real mobile devices
- [ ] Performance check (modal shouldn't impact load time)
- [ ] Deploy to staging first
- [ ] Monitor user acceptance rate
- [ ] Collect feedback on clarity/wording

---

**Status**: READY FOR LEGAL REVIEW  
**Next Step**: Legal team provides exact disclaimer text  
**Timeline**: Complete by June 11, 2026  
**Review Date**: June 6-7, 2026  
