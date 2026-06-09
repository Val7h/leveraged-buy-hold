"use client";
import { AlertTriangle } from "lucide-react";

/**
 * Banner BETA persistente.
 * Auth real (bcrypt + JWT + cookie httpOnly) ja esta no ar e dados sao
 * persistidos no Postgres. Mantemos o banner enquanto a integracao de
 * pagamento (Asaas) e o dominio proprio (alavanca.com.br) nao chegam.
 */
export default function BetaBanner() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-warning/15 border-b-2 border-warning/40 px-4 py-2"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm">
        <AlertTriangle size={14} className="text-warning flex-shrink-0" />
        <span className="text-text-primary text-center">
          <strong className="text-warning font-bold">BETA</strong>
          <span className="hidden sm:inline"> — Pagamentos e dominio proprio em integração. Sua conta e dados são reais e persistem.</span>
          <span className="sm:hidden"> — Em integração de pagamento.</span>
        </span>
      </div>
    </div>
  );
}
