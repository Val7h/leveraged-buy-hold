/**
 * /api/v1/account/email-preferences
 *
 * GET   — retorna prefs do usuario logado; cria registro com defaults se nao existir.
 * PATCH — atualiza prefs (parcial). transactional NUNCA pode ser desabilitado (LGPD art. 7-V).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Prisma → Node runtime.
export const runtime = "nodejs";

type PrefShape = {
  transactional: boolean;
  alerts: boolean;
  product_updates: boolean;
  marketing: boolean;
  updatedAt: Date;
};

function serialize(p: PrefShape) {
  return {
    transactional: p.transactional,
    alerts: p.alerts,
    product_updates: p.product_updates,
    marketing: p.marketing,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // upsert defensivo: garante registro existente para o usuario.
  const pref = await prisma.emailPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    select: {
      transactional: true,
      alerts: true,
      product_updates: true,
      marketing: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(serialize(pref));
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  // LGPD art. 7-V: transactional emails sao base legal "execucao de contrato".
  // Recusamos tentativa de desabilitar mesmo que venha no body.
  if ("transactional" in input && input.transactional === false) {
    return NextResponse.json(
      {
        error: "transactional_cannot_be_disabled",
        message:
          "Emails transacionais (pagamento, seguranca, recuperacao de senha) nao podem ser desabilitados conforme LGPD art. 7-V (execucao de contrato).",
      },
      { status: 422 }
    );
  }

  // Whitelist explicita — ignora qualquer campo extra (transactional, id, userId, etc.).
  const data: { alerts?: boolean; product_updates?: boolean; marketing?: boolean } = {};

  if ("alerts" in input) {
    if (typeof input.alerts !== "boolean") {
      return NextResponse.json({ error: "alerts_must_be_boolean" }, { status: 400 });
    }
    data.alerts = input.alerts;
  }
  if ("product_updates" in input) {
    if (typeof input.product_updates !== "boolean") {
      return NextResponse.json({ error: "product_updates_must_be_boolean" }, { status: 400 });
    }
    data.product_updates = input.product_updates;
  }
  if ("marketing" in input) {
    if (typeof input.marketing !== "boolean") {
      return NextResponse.json({ error: "marketing_must_be_boolean" }, { status: 400 });
    }
    data.marketing = input.marketing;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_fields_to_update" }, { status: 400 });
  }

  // upsert: usuario pode nao ter registro ainda na primeira interacao.
  const pref = await prisma.emailPreference.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
    select: {
      transactional: true,
      alerts: true,
      product_updates: true,
      marketing: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(serialize(pref));
}
