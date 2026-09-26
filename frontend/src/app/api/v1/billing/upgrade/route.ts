// POST /api/v1/billing/upgrade
//
// CAMINHO MÍNIMO DE MONETIZAÇÃO (Opção A do plano 24/09): o checkout é um LINK
// DE ASSINATURA criado no painel do Asaas e colado nas envs do Render:
//   ASAAS_LINK_PRO      (obrigatório p/ vender o Pro)
//   ASAAS_LINK_PREMIUM  (opcional; sem ela, Premium fica "em breve")
// Com a env setada, devolve { checkoutUrl } e o front redireciona (o handler da
// /pricing já trata). Sem env, mantém o 501 estável de antes ("em breve").
// A liberação do plano após o pagamento é manual (painel Asaas → SQL/admin) até
// a integração completa com webhook (Opção B).

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let tier = "pro";
  try {
    const body = await request.json();
    if (body?.tier === "premium") tier = "premium";
  } catch {
    /* body vazio → pro */
  }

  const link =
    tier === "premium"
      ? process.env.ASAAS_LINK_PREMIUM
      : process.env.ASAAS_LINK_PRO;

  if (link && link.startsWith("https://")) {
    return NextResponse.json({ checkoutUrl: link });
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
