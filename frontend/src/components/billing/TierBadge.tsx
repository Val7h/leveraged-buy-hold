"use client";

// TierBadge — pilula que indica o tier atual do usuario (Free/PRO/PREMIUM).
// Clicavel: leva para /pricing. Usuarios em trial veem "PRO • Trial".
//
// Pensada para o sidebar. Quando nao houver sessao ou fetch falhar, nao renderiza
// nada (silenciosa, evita poluir UI de paginas publicas).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Sparkles } from "lucide-react";
import type { Tier } from "@/lib/billing";

interface BillingMeResponse {
  tier: Tier;
  trialEndsAt: string | null;
}

interface TierBadgeProps {
  className?: string;
}

const TIER_CONFIG: Record<
  Tier,
  { label: string; classes: string; icon: typeof Crown | null }
> = {
  free: {
    label: "FREE",
    classes: "bg-bg-tertiary text-text-secondary border-border",
    icon: null,
  },
  pro: {
    label: "PRO",
    classes: "bg-accent/10 text-accent border-accent/30",
    icon: Sparkles,
  },
  premium: {
    label: "PREMIUM",
    classes: "bg-warning/10 text-warning border-warning/40",
    icon: Crown,
  },
};

export default function TierBadge({ className = "" }: TierBadgeProps) {
  const [data, setData] = useState<BillingMeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/billing/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: BillingMeResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const cfg = TIER_CONFIG[data.tier];
  const Icon = cfg.icon;
  const inTrial =
    data.trialEndsAt !== null && new Date(data.trialEndsAt) > new Date();

  return (
    <Link
      href="/pricing"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition hover:opacity-80 ${cfg.classes} ${className}`}
      title={
        inTrial
          ? `Plano ${cfg.label} em trial ate ${new Date(data.trialEndsAt!).toLocaleDateString("pt-BR")}`
          : `Plano atual: ${cfg.label}`
      }
    >
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      <span>{cfg.label}</span>
      {inTrial && (
        <span className="opacity-70 font-normal">• Trial</span>
      )}
    </Link>
  );
}
