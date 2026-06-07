"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

export type ConsentDocumentType = "terms" | "privacy" | "risk" | "cookies";

interface ConsentCheckboxProps {
  id: string;
  documentType: ConsentDocumentType;
  version: string;
  label: React.ReactNode;
  required?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Checkbox de consentimento granular auditavel (LGPD Art. 8 §4).
 *
 * Cada documento deve ter seu proprio checkbox. NUNCA agrupar mais de um
 * documento em uma unica caixa — consentimento generico e nulo.
 *
 * O componente NAO persiste estado por si so. A persistencia (com IP,
 * user-agent, hash do documento e timestamp UTC) e responsabilidade do
 * formulario hospedeiro, que deve aguardar o 200 OK do backend ANTES de
 * permitir o avanco (LGPD Art. 8 §2 — onus da prova).
 */
export default function ConsentCheckbox({
  id,
  documentType,
  version,
  label,
  required = true,
  checked,
  onChange,
}: ConsentCheckboxProps) {
  return (
    <label
      htmlFor={id}
      data-document-type={documentType}
      data-document-version={version}
      className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-surface-2 transition-colors"
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          required={required}
          onChange={(e) => onChange(e.target.checked)}
          aria-required={required}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            checked
              ? "bg-primary border-primary"
              : "border-border group-hover:border-primary/50"
          }`}
        >
          {checked && <CheckCircle2 className="w-4 h-4 text-background" />}
        </div>
      </div>
      <span className="text-xs text-text-secondary leading-relaxed">
        {label}
      </span>
    </label>
  );
}

/**
 * Snapshot do consentimento para envio ao backend. O backend completa
 * IP, hash do documento e gravacao append-only em consent_log.
 */
export interface ConsentSnapshot {
  documentType: ConsentDocumentType;
  version: string;
  acceptedAt: string; // ISO8601 UTC
}

export function buildConsentPayload(
  consents: ConsentSnapshot[]
): {
  consents: ConsentSnapshot[];
  acceptedAt: string;
  userAgent: string;
} {
  return {
    consents,
    acceptedAt: new Date().toISOString(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  };
}
