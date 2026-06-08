// /api/v1/account/export — LGPD art. 18-V (direito a portabilidade).
// Retorna TODOS os dados pessoais do usuario em JSON, como attachment.
// NUNCA inclui passwordHash.
//
// emailPreferences eh carregado de forma defensiva: o model pertence a Track B
// e pode nao existir ainda no client gerado. Em caso de erro/ausencia,
// devolvemos null sem quebrar o export.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [userRow, portfolios, watchlists, alerts, subscription] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          riskProfile: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.portfolio.findMany({
        where: { userId: user.id },
        include: { positions: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.watchlist.findMany({
        where: { userId: user.id },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.alert.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.subscription.findUnique({ where: { userId: user.id } }),
    ]);

    // emailPreferences vive na Track B — pode nao existir no client ainda.
    let emailPreferences: unknown = null;
    try {
      // @ts-expect-error — model gerado pela Track B, pode nao existir aqui.
      if (prisma.emailPreferences?.findUnique) {
        // @ts-expect-error — idem.
        emailPreferences = await prisma.emailPreferences.findUnique({
          where: { userId: user.id },
        });
      }
    } catch {
      emailPreferences = null;
    }

    // Achata positions para um array top-level tambem (mais facil de consumir).
    const positions = portfolios.flatMap((p) =>
      p.positions.map((pos) => ({ ...pos, portfolioId: p.id }))
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      legalBasis: "LGPD art. 18, V (direito a portabilidade)",
      user: userRow,
      portfolios,
      positions,
      watchlists,
      alerts,
      subscription,
      emailPreferences,
    };

    // Sanitize filename: somente local-part do email + sufixo seguro.
    const safeEmail = (userRow?.email ?? user.id)
      .replace(/[^a-zA-Z0-9._@-]/g, "_")
      .slice(0, 80);

    const body = JSON.stringify(payload, null, 2);

    logger.info("[account.export] generated", {
      userId: user.id,
      sizeBytes: body.length,
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="lbh-dados-${safeEmail}.json"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    logger.error("/account/export GET error", { msg, userId: user.id });
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503 }
    );
  }
}
