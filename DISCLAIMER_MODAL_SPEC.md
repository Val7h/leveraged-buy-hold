# 📋 DISCLAIMER MODAL — Design Spec & Implementation Guide

**Status:** Ready to implement  
**Effort:** 5 hours  
**Timeline:** 1 day (Day 5 of Sprint 1)

---

## 1. LEGAL CONTENT

### 1.1 Portuguese (PT-BR) Full Text

```
⚠️ AVISO DE RISCO IMPORTANTE

Este é um SIMULADOR EDUCACIONAL, não é aconselhamento financeiro profissional.

O LBH System é uma ferramenta educacional para aprender sobre estratégias de 
Buy & Hold com alavancagem. Nenhum conteúdo deve ser interpretado como 
recomendação, solicitação ou oferta de compra ou venda de títulos.

RISCOS IMPORTANTES:
• Resultados passados não garantem resultados futuros
• Simulações podem não refletir condições reais de mercado
• Alavancagem amplifica GANHOS e PERDAS
• Possível perda TOTAL do capital investido
• Volatilidade da taxa de câmbio e spreads não totalmente modelados
• Crises de crédito/liquidez podem ocorrer

ISENÇÃO DE RESPONSABILIDADE:
O LBH System e seus criadores NÃO ASSUMEM RESPONSABILIDADE por:
• Perdas financeiras resultantes do uso da plataforma
• Decisões de investimento baseadas em simulações
• Impacto emocional de resultados de simulação
• Qualidade de dados de mercado (sempre verificar em tempo real)

ACEITAÇÃO:
Ao usar o LBH System, você:
1. Reconhece os riscos desta estratégia
2. Aceita total responsabilidade por suas decisões
3. Concorda em usar apenas com capital que pode perder
4. Compromete-se a buscar aconselhamento profissional antes de operar com dinheiro real

Data de aceitação: [TODAY]
Versão do aviso: 1.0
```

### 1.2 Portuguese (PT-BR) Short Version (for modal)

```
⚠️ AVISO DE RISCO

Este é um simulador educacional, não aconselhamento financeiro.

• Resultados passados ≠ resultados futuros
• Alavancagem amplifica GANHOS e PERDAS
• Risco de perda TOTAL do capital
• Use apenas com capital que possa perder

Ao continuar, você assume total responsabilidade por suas decisões.
```

---

## 2. UI/UX DESIGN

### 2.1 Visual Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ⚠️  AVISO DE RISCO IMPORTANTE                       │
│                                                     │
│  Desktop: h1 text-xl font-bold text-danger          │
│  Mobile: h2 text-lg font-bold text-danger           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Scrollable content area — max 80vh]               │
│                                                     │
│  Este é um simulador educacional...                 │
│  [Full disclaimer text]                             │
│  ...                                                │
│  ...                                                │
│                                                     │
│  [Scrollbar visible if overflow]                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ☑ Declaro que entendi os riscos                    │
│                                                     │
│  [Continuar] (disabled if unchecked)                │
│  Ler versão completa →                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Responsive Design

```
DESKTOP (1024px+)
┌─────────────────────────────────────────────┐
│                                             │
│         [Modal centered on screen]          │
│         Width: 600px                        │
│                                             │
│  ⚠️ AVISO DE RISCO IMPORTANTE               │
│                                             │
│  [Scrollable content — h-[80vh]]           │
│                                             │
│  ☑ Declaro que entendi                      │
│                                             │
│  [Continuar] [Ler versão completa →]      │
│                                             │
└─────────────────────────────────────────────┘

TABLET (640px-1024px)
┌─────────────────────────────────────────────┐
│                                             │
│    [Modal fitted to viewport]               │
│    Width: 90vw (max 500px)                  │
│                                             │
│  ⚠️ AVISO DE RISCO IMPORTANTE               │
│                                             │
│  [Scrollable content]                       │
│                                             │
│  ☑ Declaro que entendi                      │
│                                             │
│  [Continuar]                                │
│                                             │
└─────────────────────────────────────────────┘

MOBILE (320px-640px)
┌──────────────────┐
│                  │
│ ⚠️ AVISO DE       │
│ RISCO            │
│                  │
│ [Scrollable]     │
│ Este é um        │
│ simulador...     │
│                  │
│ ☑ Declaro que   │
│ entendi          │
│                  │
│ [Continuar]      │
│                  │
└──────────────────┘
```

### 2.3 Color & Styling

```
Background:
- Overlay: bg-black/70 (backdrop-blur-sm)
- Modal: bg-surface border border-border

Header:
- Icon: ⚠️ (Unicode, size 24)
- Text: text-xl font-bold text-danger
- Padding: px-6 py-4

Content:
- Text: text-sm text-text-secondary
- Spacing: space-y-3
- Scrollable: max-h-[80vh] overflow-y-auto pr-4

Footer:
- Checkbox: accent-primary
- Label: text-sm text-text-primary
- Button: btn-primary (primary color, 44px min-height)
- Link: text-primary hover:underline text-xs

Variants:
- Danger: text-danger bg-danger/10 (for risk warning)
- Success: text-success (for checkbox)
- Muted: text-text-muted (for secondary text)
```

---

## 3. COMPONENT IMPLEMENTATION

### 3.1 File Structure

```
frontend/src/
├── components/
│   └── modals/
│       ├── index.ts                    (new — export all modals)
│       └── RiskDisclaimerModal.tsx     (new)
├── hooks/
│   ├── index.ts                        (update — add useDisclaimerModal)
│   └── useDisclaimerModal.ts           (new)
└── app/
    └── layout.tsx                       (update — add modal to root)
```

### 3.2 RiskDisclaimerModal.tsx

```typescript
"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskDisclaimerModalProps {
  open?: boolean;
  onAccept?: () => Promise<void>;
  onCancel?: () => void;
}

export default function RiskDisclaimerModal({
  open = true,
  onAccept,
  onCancel,
}: RiskDisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!accepted) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (onAccept) {
        await onAccept();
      }
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : "Erro ao aceitar. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] bg-surface border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start gap-3">
          <AlertTriangle size={24} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-danger">
              Aviso de Risco Importante
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Leia atentamente antes de continuar
            </p>
          </div>
        </div>

        {/* Content — Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm text-text-secondary">
          
          <div>
            <p className="font-semibold text-text-primary mb-2">
              O que é o LBH System?
            </p>
            <p>
              Um simulador educacional para aprender sobre estratégias de 
              Buy & Hold com alavancagem. Nenhum conteúdo é aconselhamento 
              financeiro profissional.
            </p>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-2">
              Este NÃO é aconselhamento financeiro
            </p>
            <p>
              Nenhuma parte deste simulador deve ser interpretada como 
              recomendação, solicitação ou oferta de compra/venda de títulos.
            </p>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-2">
              Riscos Importantes
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Resultados passados não garantem resultados futuros</li>
              <li>Alavancagem amplifica GANHOS e PERDAS</li>
              <li>Possível perda TOTAL do capital investido</li>
              <li>Volatilidade de câmbio não totalmente modelada</li>
              <li>Crises de crédito/liquidez podem ocorrer</li>
            </ul>
          </div>

          <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
            <p className="font-semibold text-danger text-xs mb-2">
              ⚠️ ISENÇÃO DE RESPONSABILIDADE
            </p>
            <p className="text-xs text-text-secondary">
              O LBH System e seus criadores NÃO ASSUMEM RESPONSABILIDADE por 
              perdas financeiras, decisões baseadas em simulações ou qualidade 
              dos dados de mercado.
            </p>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-2">
              Ao continuar, você:
            </p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Reconhece os riscos dessa estratégia</li>
              <li>Assume total responsabilidade por suas decisões</li>
              <li>Usa apenas capital que pode perder</li>
              <li>Se compromete a buscar aconselhamento profissional</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-2 space-y-4">
          
          {/* Error message */}
          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-xs text-danger">
              {error}
            </div>
          )}

          {/* Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
              accepted 
                ? "bg-primary border-primary" 
                : "border-border hover:border-primary/50"
            )}>
              {accepted && <Check size={14} className="text-background" />}
            </div>
            <span className="text-sm text-text-primary">
              Declaro que entendi os riscos e responsabilidades acima
            </span>
          </label>

          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="sr-only"  {/* Hidden, using custom checkbox */}
            aria-label="Confirmar que entendi os riscos"
          />

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAccept}
              disabled={!accepted || loading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2",
                "px-4 py-2.5 rounded-lg font-semibold text-sm",
                "transition-all min-h-11",
                accepted && !loading
                  ? "bg-primary text-background hover:bg-primary-dark"
                  : "bg-primary/30 text-primary/50 cursor-not-allowed"
              )}
              aria-label={accepted ? "Continuar para o app" : "Marque o checkbox para continuar"}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                  Salvando...
                </>
              ) : (
                "Continuar"
              )}
            </button>

            <a
              href="#full-disclaimer"
              className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors"
              aria-label="Ver versão completa do aviso"
            >
              Ver completo
              <ExternalLink size={12} />
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
```

### 3.3 useDisclaimerModal Hook

```typescript
// hooks/useDisclaimerModal.ts

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/lib/api";

interface UseDisclaimerModalReturn {
  showModal: boolean;
  handleAccept: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useDisclaimerModal(): UseDisclaimerModalReturn {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Check if user has accepted disclaimer
  useEffect(() => {
    if (user && !user.has_accepted_disclaimer) {
      setShowModal(true);
    }
  }, [user]);

  const handleAccept = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call backend endpoint
      await usersApi.acceptDisclaimer();
      
      // Update local state
      setAccepted(true);
      setShowModal(false);

      // Optionally: refresh user data
      // await fetchMe()
    } catch (err) {
      const message = 
        err instanceof Error 
          ? err.message 
          : "Erro ao salvar aceitação";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCancel = useCallback(() => {
    // User can always re-open by refreshing
    setShowModal(false);
  }, []);

  return {
    showModal,
    handleAccept,
    handleCancel,
    isLoading,
    error,
  };
}
```

### 3.4 Integration in Root Layout

```typescript
// app/layout.tsx

import RiskDisclaimerModal from "@/components/modals/RiskDisclaimerModal";
import { useDisclaimerModal } from "@/hooks/useDisclaimerModal";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Existing layout */}
        {children}
        
        {/* Disclaimer Modal */}
        <DisclaimerModalWrapper />
      </body>
    </html>
  );
}

// Separate component for hook usage
"use client";
function DisclaimerModalWrapper() {
  const { showModal, handleAccept, handleCancel, isLoading, error } = 
    useDisclaimerModal();

  return (
    <RiskDisclaimerModal
      open={showModal}
      onAccept={handleAccept}
      onCancel={handleCancel}
    />
  );
}
```

---

## 4. BACKEND INTEGRATION

### 4.1 API Endpoint Required

```http
POST /api/users/accept-disclaimer
Authorization: Bearer {token}

Request:
{
  "accepted_at": "2026-06-05T10:30:00Z"
}

Response 200:
{
  "id": "user-id",
  "has_accepted_disclaimer": true,
  "disclaimer_accepted_at": "2026-06-05T10:30:00Z"
}

Response 401:
{ "detail": "Not authenticated" }

Response 400:
{ "detail": "Invalid request" }
```

### 4.2 Database Schema (Backend)

```sql
ALTER TABLE users ADD COLUMN (
  has_accepted_disclaimer BOOLEAN DEFAULT FALSE,
  disclaimer_accepted_at TIMESTAMP NULL,
  disclaimer_version VARCHAR(10) DEFAULT '1.0'
);

-- Create index for quick lookup
CREATE INDEX idx_users_disclaimer 
ON users(has_accepted_disclaimer);
```

### 4.3 Backend Implementation (FastAPI)

```python
# routes/users.py

@router.post("/users/accept-disclaimer")
async def accept_disclaimer(
    current_user: User = Depends(get_current_user)
):
    """Accept risk disclaimer and save timestamp."""
    current_user.has_accepted_disclaimer = True
    current_user.disclaimer_accepted_at = datetime.utcnow()
    current_user.disclaimer_version = "1.0"
    
    db.commit()
    
    return {
        "id": current_user.id,
        "has_accepted_disclaimer": True,
        "disclaimer_accepted_at": current_user.disclaimer_accepted_at,
    }
```

---

## 5. TESTING STRATEGY

### 5.1 Unit Tests

```typescript
// __tests__/components/RiskDisclaimerModal.test.tsx

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RiskDisclaimerModal from "@/components/modals/RiskDisclaimerModal";

describe("RiskDisclaimerModal", () => {
  
  it("renders disclaimer content", () => {
    render(<RiskDisclaimerModal open={true} />);
    expect(screen.getByText(/Aviso de Risco Importante/)).toBeInTheDocument();
  });

  it("disables button when checkbox unchecked", () => {
    render(<RiskDisclaimerModal open={true} />);
    const button = screen.getByText("Continuar");
    expect(button).toBeDisabled();
  });

  it("enables button when checkbox checked", async () => {
    render(<RiskDisclaimerModal open={true} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      const button = screen.getByText("Continuar");
      expect(button).not.toBeDisabled();
    });
  });

  it("calls onAccept when button clicked", async () => {
    const onAccept = jest.fn();
    render(
      <RiskDisclaimerModal open={true} onAccept={onAccept} />
    );
    
    // Check checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    
    // Click button
    const button = screen.getByText("Continuar");
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onAccept).toHaveBeenCalled();
    });
  });

  it("displays error message on failure", async () => {
    const onAccept = jest.fn().mockRejectedValue(
      new Error("Erro ao salvar")
    );
    
    render(
      <RiskDisclaimerModal open={true} onAccept={onAccept} />
    );
    
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    
    const button = screen.getByText("Continuar");
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/Erro ao salvar/)).toBeInTheDocument();
    });
  });

});
```

### 5.2 E2E Tests

```typescript
// __tests__/e2e/disclaimer.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Risk Disclaimer Modal", () => {
  
  test("shows disclaimer on first login", async ({ page }) => {
    await page.goto("/login");
    
    // Login with test account
    await page.fill("input[type=email]", "test@example.com");
    await page.fill("input[type=password]", "password123");
    await page.click("button:has-text('Entrar')");
    
    // Wait for modal
    await page.waitForSelector("text=Aviso de Risco");
    
    // Verify modal is visible
    const modal = page.locator("role=dialog");
    await expect(modal).toBeVisible();
  });

  test("button disabled until checkbox checked", async ({ page }) => {
    // ... login ...
    
    const continueButton = page.locator("button:has-text('Continuar')");
    await expect(continueButton).toBeDisabled();
    
    // Check checkbox
    await page.click("input[aria-label='Confirmar']");
    
    // Button enabled
    await expect(continueButton).toBeEnabled();
  });

  test("accepts disclaimer and navigates to dashboard", async ({ page }) => {
    // ... login ...
    
    // Check checkbox
    await page.click("input[aria-label='Confirmar']");
    
    // Click button
    await page.click("button:has-text('Continuar')");
    
    // Wait for navigation
    await page.waitForURL("/dashboard");
    
    // Modal gone
    const modal = page.locator("role=dialog");
    await expect(modal).not.toBeVisible();
  });

  test("doesn't show modal on second login", async ({ page }) => {
    // ... login second time ...
    
    // Modal should not appear
    const modal = page.locator("role=dialog");
    await expect(modal).not.toBeVisible();
    
    // Navigate to dashboard directly
    await expect(page).toHaveURL("/dashboard");
  });

});
```

---

## 6. MOBILE-SPECIFIC TESTING

### 6.1 Device Sizes to Test

```
iPhone SE (375×667)
iPhone 12 (390×844)
iPhone 14 Pro (430×932)
iPad (768×1024)
Pixel 6 (412×915)
Samsung Galaxy S21 (360×800)
```

### 6.2 Manual Testing Checklist

- [ ] Modal renders full-screen on mobile (width: 100vw, max: 90vw)
- [ ] Content scrolls without breaking layout
- [ ] Buttons have 44×44px touch targets
- [ ] Checkbox clickable without precision
- [ ] Text readable (no need to pinch-zoom)
- [ ] Works in portrait and landscape
- [ ] Overlay darkens entire screen
- [ ] "Ver completo" link works (navigate away or open modal)
- [ ] Back button doesn't dismiss (force accept)
- [ ] Landscape mode (iPad): content still readable

---

## 7. ACCESSIBILITY REQUIREMENTS

### 7.1 ARIA Attributes

```tsx
<div
  role="dialog"
  aria-labelledby="disclaimer-title"
  aria-describedby="disclaimer-description"
  aria-modal="true"
>
  <h2 id="disclaimer-title">Aviso de Risco Importante</h2>
  <p id="disclaimer-description">Leia atentamente antes de continuar</p>
  
  <input
    type="checkbox"
    aria-label="Confirmar que entendi os riscos e responsabilidades"
    checked={accepted}
    onChange={(e) => setAccepted(e.target.checked)}
  />
  
  <button
    aria-label={accepted ? "Continuar para o app" : "Marque o checkbox para continuar"}
    disabled={!accepted}
  >
    Continuar
  </button>
</div>
```

### 7.2 Keyboard Navigation

```
Tab Order:
1. [Scrollable content area] — for scroll
2. [Checkbox] — toggle acceptance
3. [Continuar] — submit
4. [Ver completo] — additional info

Esc Key:
- Should NOT dismiss (intentional — force read)
- Or show confirm dialog (optional UX)

Screen Reader:
- Title announced: "Aviso de Risco Importante, dialog"
- Content scrollable with announcements
- Checkbox state announced on toggle
- Button disabled state announced
```

### 7.3 WCAG Compliance

- ✅ Perceivable: High contrast (5:1+), semantic structure
- ✅ Operable: Keyboard accessible, 44px+ touch targets
- ✅ Understandable: Clear language, logical structure
- ✅ Robust: Role="dialog", aria-labels, HTML validation

---

## 8. DEPLOYMENT CHECKLIST

### Pre-Launch
- [ ] Backend endpoint deployed
- [ ] Database migration applied
- [ ] User model includes `has_accepted_disclaimer` field
- [ ] API keys/secrets configured
- [ ] Staging environment tested

### Launch
- [ ] Merge component PR
- [ ] Merge hook PR
- [ ] Deploy to production
- [ ] Verify modal appears for new users
- [ ] Verify modal doesn't appear for existing users (or ask once)
- [ ] Monitor error logs for API failures
- [ ] Check analytics (disclaimer acceptance rate)

### Post-Launch
- [ ] Gather user feedback (did it cause confusion?)
- [ ] Monitor support tickets (questions about disclaimer)
- [ ] Verify acceptance timestamps in database
- [ ] Plan disclaimer versioning (if legal updates)

---

## 9. FUTURE ENHANCEMENTS

### 9.1 Disclaimer Versioning
If legal changes require updated text:

```typescript
// Add version tracking
interface DisclaimerVersion {
  version: "1.0" | "1.1" | "2.0"; // Updated by legal
  lastUpdated: Date;
  forceReacceptance: boolean; // If true, show modal again
}

// User model tracks which version they accepted
user.disclaimer_version_accepted = "1.0"
```

### 9.2 Full Disclaimer Page
Create `/pages/disclaimer` for:
- Full legal text
- Glossary of terms
- FAQ
- Printable version
- Version history

### 9.3 Analytics
Track:
- Disclaimer open rate
- Acceptance rate
- Time spent reading
- Scroll depth
- Link clicks (to full version)

---

## 10. TIMELINE

```
Day 5 of Sprint 1 (Friday)

15:00 - 16:00  | Component design + implementation (RiskDisclaimerModal.tsx)
16:00 - 16:45  | Hook + integration (useDisclaimerModal.ts)
16:45 - 17:15  | Layout.tsx update + styling fixes
17:15 - 17:45  | Component tests
17:45 - 18:00  | Buffer for issues

Code Review: 30 min
Deploy to staging: 30 min
QA on mobile: 30 min

Total: 4.5h actual + 1h buffer = 5h
```

---

**Status:** Ready to implement  
**Assigned to:** Frontend Developer  
**Review by:** Design + Legal + QA
