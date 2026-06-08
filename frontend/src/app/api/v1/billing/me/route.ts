// GET /api/v1/billing/me
// Retorna o estado de billing do usuario autenticado: tier efetivo, status raw,
// fim do periodo e snapshot de quotas. UI usa para PaywallGate / QuotaBadge / TierBadge.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserTier, getQuotaUsage } from "@/lib/billing";

// Prisma + bcrypt indireto via auth -> Node runtime.
export const runtime = "nodejs";
// Sempre dinamico — depende do cookie de sessao.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [tier, sub, quotaUsage] = await Promise.all([
    getUserTier(user.id),
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        currentPeriodEnd: true,
        trialEndsAt: true,
      },
    }),
    getQuotaUsage(user.id),
  ]);

  return NextResponse.json({
    tier,
    status: sub?.status ?? "active",
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    trialEndsAt: sub?.trialEndsAt ?? null,
    quotaUsage,
  });
}
