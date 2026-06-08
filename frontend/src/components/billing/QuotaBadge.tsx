"use client";

// QuotaBadge — pilula compacta tipo "3/10" para mostrar consumo de quota.
// Cores:
//   <70%  text-secondary  (ok)
//   <100% warning         (perto do limite)
//   ==100% danger         (estourou — bloqueia novas criacoes)
// Ilimitado (limit < 0) renderiza "∞" em accent.

import { useEffect, useState } from "react";
import type { QuotaUsage } from "@/lib/billing";

type QuotaFeature = keyof QuotaUsage;

interface BillingMeResponse {
  quotaUsage: QuotaUsage;
}

interface QuotaBadgeProps {
  feature: QuotaFeature;
  className?: string;
}

const FEATURE_LABEL: Record<QuotaFeature, string> = {
  strategies: "estrategias",
  assets: "ativos",
  alerts: "alertas",
  backtest_years: "anos backtest",
};

function colorFor(used: number, limit: number): string {
  if (limit < 0) return "text-accent";
  if (used >= limit) return "text-danger";
  if (used / limit >= 0.7) return "text-warning";
  return "text-text-secondary";
}

export default function QuotaBadge({ feature, className = "" }: QuotaBadgeProps) {
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/billing/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: BillingMeResponse) => {
        if (!cancelled) setQuota(data.quotaUsage[feature]);
      })
      .catch(() => {
        if (!cancelled) setQuota(null);
      });
    return () => {
      cancelled = true;
    };
  }, [feature]);

  if (!quota) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md bg-bg-tertiary text-xs text-text-secondary/50 ${className}`}
        aria-label="Carregando quota"
      >
        —
      </span>
    );
  }

  const display = quota.limit < 0 ? `${quota.used}/∞` : `${quota.used}/${quota.limit}`;
  const color = colorFor(quota.used, quota.limit);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md bg-bg-tertiary text-xs font-mono font-medium ${color} ${className}`}
      title={`${quota.used} de ${quota.limit < 0 ? "ilimitados" : quota.limit} ${FEATURE_LABEL[feature]}`}
    >
      {display}
    </span>
  );
}
