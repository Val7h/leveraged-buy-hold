"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface DangerZoneProps {
  title?: string;
  children: ReactNode;
}

/**
 * Container vermelho para acoes destrutivas (delete account, revoke sessions, etc).
 * Usado em /conta/dados e potencialmente em /conta/senha (revoke all sessions).
 */
export default function DangerZone({
  title = "Zona de Risco",
  children,
}: DangerZoneProps) {
  return (
    <section
      aria-labelledby="danger-zone-title"
      className="bg-danger/5 border border-danger/30 rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-danger flex-shrink-0" />
        <h3
          id="danger-zone-title"
          className="text-base font-bold text-danger"
        >
          {title}
        </h3>
      </div>
      <div className="text-sm text-text-secondary">{children}</div>
    </section>
  );
}
