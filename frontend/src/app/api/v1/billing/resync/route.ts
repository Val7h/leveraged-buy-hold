import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// RESYNC DE ASSINATURAS (26/09/2026) — liberação AUTOMÁTICA de pagante, no
// padrão provado pelo Dados B3: "o Stripe é a fonte da verdade e o serviço é
// cache; a liberação nunca depende só de webhook". Um cron interno (start.sh)
// chama esta rota; ela lista as assinaturas ATIVAS do produto LBH Pro no
// Stripe e espelha na tabela Subscription casando pelo E-MAIL do pagador.
//
// Auth: X-Internal-Token (cron interno), nunca cookie.
// DORMENTE até STRIPE_SECRET_KEY existir no env (crie uma RESTRICTED KEY de
// LEITURA de Subscriptions/Customers no dashboard e cole no Render).
// STRIPE_PRODUCT_PRO tem default = o produto LBH Pro real criado em 26/09.
//
// Armadilha conhecida (aviso do Dados B3): e-mail do pagador ≠ e-mail da conta
// no app → não casa; fica em `unmatched` no relatório p/ liberação manual.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCT_PRO = process.env.STRIPE_PRODUCT_PRO || "prod_VKgJK47p51BZhj";

type StripeSub = {
  id: string;
  status: string;
  current_period_end: number;
  customer: { id: string; email: string | null } | string;
  items: { data: Array<{ price: { product: string } }> };
};

export async function POST(request: NextRequest) {
  const internal = process.env.BACKEND_INTERNAL_TOKEN;
  if (!internal || request.headers.get("x-internal-token") !== internal) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ skipped: "no_stripe_key" });

  try {
    // Lista assinaturas ativas com o customer expandido (e-mail vem junto).
    const subs: StripeSub[] = [];
    let startingAfter: string | null = null;
    for (let page = 0; page < 5; page++) {
      const qs = new URLSearchParams({ status: "active", limit: "100" });
      qs.append("expand[]", "data.customer");
      if (startingAfter) qs.set("starting_after", startingAfter);
      const res = await fetch(`https://api.stripe.com/v1/subscriptions?${qs}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      if (!res.ok) {
        logger.error("billing/resync stripe list failed", { status: res.status });
        return NextResponse.json({ error: "stripe_error" }, { status: 502 });
      }
      const body = (await res.json()) as { data: StripeSub[]; has_more: boolean };
      subs.push(...body.data);
      if (!body.has_more || body.data.length === 0) break;
      startingAfter = body.data[body.data.length - 1].id;
    }

    // Só as do produto LBH Pro (a conta Stripe é compartilhada com o Dados B3).
    const proSubs = subs.filter((s) =>
      s.items?.data?.some((it) => it.price?.product === PRODUCT_PRO)
    );

    let synced = 0;
    const unmatched: string[] = [];
    const activeIds = new Set<string>();

    for (const s of proSubs) {
      activeIds.add(s.id);
      const cust = typeof s.customer === "string" ? null : s.customer;
      const email = cust?.email?.toLowerCase().trim();
      if (!email) {
        unmatched.push(s.id);
        continue;
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        unmatched.push(email);
        continue;
      }
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          tier: "pro",
          status: "active",
          currentPeriodEnd: new Date(s.current_period_end * 1000),
          asaasSubscriptionId: s.id, // campo legado guarda o id do STRIPE
          asaasCustomerId: cust?.id ?? null,
        },
        create: {
          userId: user.id,
          tier: "pro",
          status: "active",
          currentPeriodEnd: new Date(s.current_period_end * 1000),
          asaasSubscriptionId: s.id,
          asaasCustomerId: cust?.id ?? null,
        },
      });
      synced++;
    }

    // Downgrade: linhas que vieram do Stripe (id sub_...) e não estão mais ativas.
    // Nunca toca linhas manuais (ex.: premium vitalício do dono, sem sub_ id).
    const stale = await prisma.subscription.findMany({
      where: { asaasSubscriptionId: { startsWith: "sub_" }, status: "active" },
      select: { id: true, asaasSubscriptionId: true },
    });
    let downgraded = 0;
    for (const row of stale) {
      if (row.asaasSubscriptionId && !activeIds.has(row.asaasSubscriptionId)) {
        await prisma.subscription.update({
          where: { id: row.id },
          data: { status: "canceled" },
        });
        downgraded++;
      }
    }

    logger.info("billing/resync ok", { synced, downgraded, unmatched: unmatched.length });
    return NextResponse.json({ synced, downgraded, unmatched, active_pro: proSubs.length });
  } catch (err) {
    logger.error("billing/resync error", { msg: (err as Error).message });
    return NextResponse.json({ error: "resync_failed" }, { status: 500 });
  }
}
