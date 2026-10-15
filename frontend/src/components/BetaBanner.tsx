"use client";
import { AlertTriangle } from "lucide-react";

/**
 * Banner BETA persistente.
 * Auth real (bcrypt + JWT + cookie httpOnly), pagamento (Stripe) e dados no
 * Postgres ja estao no ar. Mantemos o banner enquanto o dominio proprio nao chega.
 */
export default function BetaBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning/15 border-b-2 border-warning/40 px-4 py-2"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm">
        <AlertTriangle size={14} className="text-warning flex-shrink-0" />
        <span className="text-text-primary text-center">
          <strong className="text-warning font-bold">BETA</strong>
          <span className="hidden sm:inline"> — Versão de lançamento: sua conta e seus dados são reais e persistem. Domínio próprio em breve.</span>
          <span className="sm:hidden"> — Versão de lançamento.</span>
        </span>
      </div>
    </div>
  );
}
