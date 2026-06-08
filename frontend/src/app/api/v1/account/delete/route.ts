// /api/v1/account/delete — LGPD art. 18-VI (direito a eliminacao).
// Exige confirmacao TEXTUAL exata ("DELETAR") + senha atual.
// Cascata Prisma apaga portfolios, posicoes, watchlists, alerts, subscription.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, COOKIE_NAME } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const DeleteSchema = z.object({
  confirmation: z.literal("DELETAR"),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = DeleteSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      {
        error: "invalid_payload",
        message: 'Confirmacao exige body { confirmation: "DELETAR", password }',
      },
      { status: 400 }
    );
  }

  try {
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!full) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ok = await bcrypt.compare(parsed.password, full.passwordHash);
    if (!ok) {
      logger.warn("[account.delete] invalid_password", { userId: user.id });
      return NextResponse.json(
        { error: "invalid_password" },
        { status: 401 }
      );
    }

    // Audit antes do delete — para correlacao caso o registro suma.
    logger.warn("[account.delete] user_id=" + user.id, {
      email: full.email,
      ts: new Date().toISOString(),
    });

    await prisma.user.delete({ where: { id: user.id } });

    const res = NextResponse.json({ deleted: true }, { status: 200 });
    // Limpa cookie de sessao na resposta (defesa em profundidade — sem usuario
    // o JWT ja eh invalido em getCurrentUser, mas removemos pro browser nao
    // ficar enviando lixo).
    res.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    logger.error("/account/delete POST error", { msg, userId: user.id });
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503 }
    );
  }
}
