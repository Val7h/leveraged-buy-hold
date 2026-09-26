// POST /api/v1/billing/upgrade
//
// CAMINHO MÍNIMO DE MONETIZAÇÃO (Opção A do plano 24/09): o checkout é um
// PAYMENT LINK criado no dashboard do Stripe da Lemon Tech e colado nas envs:
//   PAYMENT_LINK_PRO         → LBH Pro mensal  (R$ 59/mês)   [ATIVO 26/09]
//   PAYMENT_LINK_PRO_YEARLY  → LBH Pro anual   (R$ 566/ano)  [ATIVO 26/09]
//   PAYMENT_LINK_PREMIUM(_YEARLY) → Premium (sem env = "em breve")
// Aceita tier/cycle por QUERY (?tier=pro&cycle=yearly — como a /pricing chama)
// ou por BODY JSON; antes o front mandava query e a rota só lia body, então o
// Premium caía no link do Pro. A liberação pós-pagamento é AUTOMÁTICA via
// /api/v1/billing/resync (cron 10min, Stripe = fonte da verdade).

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let tier = request.nextUrl.searchParams.get("tier") ?? "";
  let cycle = request.nextUrl.searchParams.get("cycle") ?? "";
  try {
    const body = await request.json();
    if (!tier && typeof body?.tier === "string") tier = body.tier;
    if (!cycle && typeof body?.cycle === "string") cycle = body.cycle;
  } catch {
    /* sem body → fica o que veio na query */
  }
  const isPremium = tier === "premium";
  const isYearly = cycle === "yearly" || cycle === "annual" || cycle === "anual";

  const link = isPremium
    ? (isYearly ? process.env.PAYMENT_LINK_PREMIUM_YEARLY : process.env.PAYMENT_LINK_PREMIUM)
    : (isYearly
        ? process.env.PAYMENT_LINK_PRO_YEARLY
        : process.env.PAYMENT_LINK_PRO ?? process.env.ASAAS_LINK_PRO);

  if (link && link.startsWith("https://")) {
    return NextResponse.json({ checkoutUrl: link });
  }

  return NextResponse.json(
    {
      error: "checkout_unavailable",
      message:
        "Checkout indisponivel para este plano no momento. Fale com o suporte para upgrade manual.",
    },
    { status: 501 }
  );
}
