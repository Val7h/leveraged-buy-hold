"use client";

// PaywallGate — envolve children e bloqueia se o tier do usuario nao tem a feature.
//
// Uso:
//   <PaywallGate tier="pro" feature="alerts_email">
//     <AlertsForm />
//   </PaywallGate>
//
// `tier` aqui eh o tier MINIMO requerido (apenas usado no copy do overlay).
// A gate real eh por `feature` (verificada via canUse no client com o /billing/me).
//
// Render: se o usuario tem acesso, mostra children. Senao, mostra children com
// blur + overlay com CTA para /pricing. Nao desmonta children para evitar
// re-fetch ao concluir upgrade (manter estado).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { canUse, type Feature, type Tier } from "@/lib/billing";

interface BillingMeResponse {
  tier: Tier;
}

interface PaywallGateProps {
  tier: Tier;
  feature: Feature;
  children: React.ReactNode;
  // CTA customizavel para casos especiais (ex: trial expirou).
  ctaLabel?: string;
  ctaHref?: string;
}

const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  pro: "PRO",
  premium: "PREMIUM",
};

export default function PaywallGate({
  tier,
  feature,
  children,
  ctaLabel = "Fazer upgrade",
  ctaHref = "/pricing",
}: PaywallGateProps) {
  const [userTier, setUserTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/billing/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: BillingMeResponse) => {
        if (!cancelled) setUserTier(data.tier);
      })
      .catch(() => {
        // Falha = assume free (fail-closed para paywall).
        if (!cancelled) setUserTier("free");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Enquanto carrega, renderiza children sem bloquear — evita flash de paywall
  // para usuarios pagos. Se preferir conservador, troque por skeleton.
  if (loading || !userTier) {
    return <>{children}</>;
  }

  if (canUse(userTier, feature)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        className="pointer-events-none select-none blur-sm opacity-40"
        aria-hidden="true"
      >
        {children}
      </div>
      <div
        role="alert"
        className="absolute inset-0 flex items-center justify-center p-6"
      >
        <div className="bg-bg-secondary border border-border rounded-xl shadow-lg max-w-sm w-full p-6 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Lock size={22} className="text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Recurso {TIER_LABEL[tier]}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Faca upgrade para o plano {TIER_LABEL[tier]} para desbloquear este recurso.
          </p>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition"
          >
            <Sparkles size={14} />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
