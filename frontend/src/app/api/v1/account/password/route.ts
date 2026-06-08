// /api/v1/account/password — PATCH (troca de senha do usuario autenticado)
// Rate limit: 3 tentativas / 15 min por usuario (mitigacao contra brute force
// de currentPassword caso a sessao esteja sequestrada).

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const PasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(256),
});

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit por user (mais restritivo que por IP — protege mesmo
  // se o atacante rotacionar de IP via sessao roubada).
  const ip = getClientIp(request);
  const rl = await rateLimit(`account:password:${user.id}`, 3, 15 * 60);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Muitas tentativas. Tente novamente em alguns minutos.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.reset),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.reset),
        },
      }
    );
  }

  let parsed;
  try {
    parsed = PasswordSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed;

  try {
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!full) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ok = await bcrypt.compare(currentPassword, full.passwordHash);
    if (!ok) {
      logger.warn("[account.password] invalid_current_password", {
        userId: user.id,
        ip,
      });
      return NextResponse.json(
        { error: "invalid_current_password" },
        { status: 401 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "new_password_must_differ" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    logger.info("[account.password] changed", { userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    logger.error("/account/password PATCH error", { msg, userId: user.id });
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503 }
    );
  }
}
