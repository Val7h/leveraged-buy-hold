"use client";
import { AlertTriangle } from "lucide-react";

export default function BetaBanner() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-warning/20 border-b-2 border-warning/60 px-4 py-2.5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm">
        <AlertTriangle size={16} className="text-warning flex-shrink-0 animate-pulse" />
        <span className="text-text-primary font-medium text-center">
          <strong className="text-warning font-bold">🧪 MODO DEMO</strong>
          <span className="hidden sm:inline"> — Dados não são salvos. Auth e persistência em desenvolvimento.</span>
          <span className="sm:hidden"> — Dados não salvos.</span>
        </span>
      </div>
    </div>
  );
}
