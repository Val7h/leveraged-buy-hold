// POST /api/v1/billing/upgrade
// Stub: Asaas ainda nao integrado. Retornamos 501 (Not Implemented) com payload
// estavel para o frontend ja conseguir tratar o caso "checkout indisponivel".
//
// Quando integrarmos:
//   1. Receber { tier: "pro"|"premium", cycle: "monthly"|"yearly" }
//   2. Criar/recuperar Customer Asaas (asaasCustomerId)
//   3. Criar Subscription Asaas, persistir asaasSubscriptionId + trialEndsAt
//   4. Retornar { checkoutUrl } para redirect

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "asaas_not_integrated",
      message:
        "Checkout indisponivel no momento. Entre em contato pelo suporte para upgrade manual.",
    },
    { status: 501 }
  );
}
