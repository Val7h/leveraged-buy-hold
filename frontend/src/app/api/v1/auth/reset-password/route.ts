import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const ResetSchema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(8).max(256),
});

/**
 * POST /api/v1/auth/reset-password
 * Body: { token, newPassword }
 * Valida token (sha256), troca senha, marca usedAt.
 * Invalida todos os tokens nao usados do user (defense-in-depth).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`auth:reset:${ip}`, 10, 60 * 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.reset) } }
    );
  }

  let parsed;
  try {
    parsed = ResetSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(parsed.token)
    .digest("hex");

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "invalid_or_expired_token" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(parsed.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalida demais tokens nao-usados do mesmo user.
      prisma.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info("[reset-password] senha alterada", { userId: record.userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    logger.error("[reset-password] erro", { msg });
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503 }
    );
  }
}
