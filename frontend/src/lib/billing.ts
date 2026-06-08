// Billing core — tier resolution, quota limits, feature gating.
//
// Single source of truth para PRICING (alinhado com /pricing page):
//   FREE     R$ 0          → 1 estrategia, 1 ativo, backtest 5a, sem alertas
//   PRO      R$ 59/mes     → 10 estrategias, ilimitado, alertas email
//   PREMIUM  R$ 159/mes    → ilimitado + WhatsApp + paper trading
//
// Trial PRO de 14 dias sem cartao: se trialEndsAt > now e tier="pro", vale como pro.
// Quando Asaas for integrado, o webhook atualiza Subscription; aqui so consumimos.
//
// IMPORTANTE: `getQuotaUsage` faz queries adicionais — chame so quando precisar
// expor para UI. Para gate em rota (canUse), use apenas getUserTier.

import { prisma } from "./db";

export type Tier = "free" | "pro" | "premium";

export type Feature =
  | "alerts_email"
  | "alerts_whatsapp"
  | "paper_trading"
  | "unlimited_strategies"
  | "unlimited_assets"
  | "extended_backtest";

export interface TierLimits {
  strategies: number;       // -1 = ilimitado
  assets: number;           // -1 = ilimitado
  backtest_years: number;   // janela maxima
  alerts: number;           // -1 = ilimitado, 0 = nenhum
}

// Numeros negativos = ilimitado. UI deve renderizar "∞".
export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free:    { strategies: 1,  assets: 1,  backtest_years: 5,  alerts: 0  },
  pro:     { strategies: 10, assets: -1, backtest_years: 20, alerts: -1 },
  premium: { strategies: -1, assets: -1, backtest_years: 30, alerts: -1 },
};

const TIER_FEATURES: Record<Tier, ReadonlySet<Feature>> = {
  free: new Set<Feature>(),
  pro: new Set<Feature>([
    "alerts_email",
    "unlimited_assets",
    "extended_backtest",
  ]),
  premium: new Set<Feature>([
    "alerts_email",
    "alerts_whatsapp",
    "paper_trading",
    "unlimited_strategies",
    "unlimited_assets",
    "extended_backtest",
  ]),
};

function isValidTier(t: string): t is Tier {
  return t === "free" || t === "pro" || t === "premium";
}

/**
 * Resolve o tier efetivo do usuario.
 * - Sem subscription -> "free"
 * - status != "active" e nao em trial -> "free" (cobranca falhou / cancelado)
 * - trialEndsAt > now -> tier do registro (geralmente "pro")
 * - currentPeriodEnd <= now -> "free" (expirou)
 */
export async function getUserTier(userId: string): Promise<Tier> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return "free";

  const now = new Date();
  const tier: Tier = isValidTier(sub.tier) ? sub.tier : "free";

  // Trial ativo sobrescreve qualquer status.
  if (sub.trialEndsAt && sub.trialEndsAt > now) {
    return tier;
  }

  if (sub.status !== "active") return "free";

  if (sub.currentPeriodEnd && sub.currentPeriodEnd <= now) {
    return "free";
  }

  return tier;
}

/** Verifica se o tier libera a feature. Pura — nao toca DB. */
export function canUse(tier: Tier, feature: Feature): boolean {
  return TIER_FEATURES[tier].has(feature);
}

/** True se o limite eh ilimitado (-1) ou se used < limit. */
export function withinLimit(used: number, limit: number): boolean {
  if (limit < 0) return true;
  return used < limit;
}

export interface QuotaSlot {
  used: number;
  limit: number; // -1 = ilimitado
}

export interface QuotaUsage {
  strategies: QuotaSlot;
  assets: QuotaSlot;
  alerts: QuotaSlot;
  backtest_years: QuotaSlot; // used=0 (nao ha "consumo" — eh teto)
}

/**
 * Snapshot de uso vs. limite. Usado pelo /billing/me e badges na UI.
 * "strategies" mapeia para Portfolio enquanto nao houver model Strategy.
 * "assets" agrega Position distinct ticker do usuario.
 */
export async function getQuotaUsage(userId: string): Promise<QuotaUsage> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];

  const [portfolioCount, distinctTickers, alertCount] = await Promise.all([
    prisma.portfolio.count({ where: { userId } }),
    prisma.position.findMany({
      where: { portfolio: { userId } },
      distinct: ["ticker"],
      select: { ticker: true },
    }),
    prisma.alert.count({ where: { userId } }),
  ]);

  return {
    strategies:     { used: portfolioCount,         limit: limits.strategies     },
    assets:         { used: distinctTickers.length, limit: limits.assets         },
    alerts:         { used: alertCount,             limit: limits.alerts         },
    backtest_years: { used: 0,                       limit: limits.backtest_years },
  };
}
