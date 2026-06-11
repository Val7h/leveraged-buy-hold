import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const ForgotSchema = z.object({
  email: z.string().email().max(254),
});

/**
 * POST /api/v1/auth/forgot-password
 *
 * Body: { email }
 * Sempre retorna 200 com mensagem generica (mitigacao user enumeration).
 * Se o user existir: gera token, armazena hash + expiracao 1h.
 * Quando Resend estiver integrado: dispara email com link reset?token=<plain>.
 * Por enquanto: loga o link no servidor (visivel no Render logs).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`auth:forgot:${ip}`, 5, 60 * 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Limite atingido. Tente em 1 hora." },
      { status: 429, headers: { "Retry-After": String(rl.reset) } }
    );
  }

  let parsed;
  try {
    parsed = ForgotSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const email = parsed.email.toLowerCase().trim();
  const genericReply = NextResponse.json({
    ok: true,
    message:
      "Se este email estiver cadastrado, voce recebera um link para redefinir sua senha em alguns minutos.",
  });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Resposta generica (nao revela se email existe).
      return genericReply;
    }

    // Token plain de 32 bytes em base64url (=> 43 chars).
    const plain = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(plain).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const origin = request.nextUrl.origin;
    const link = `${origin}/reset-password?token=${plain}`;

    // TODO: enviar via Resend quando RESEND_API_KEY estiver configurada.
    // Por enquanto, logamos para o admin (Render logs visiveis a quem tem acesso).
    logger.info("[forgot-password] link gerado", {
      email: user.email,
      link,
      expiresAt: expiresAt.toISOString(),
    });

    return genericReply;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    logger.error("[forgot-password] erro", { msg });
    return genericReply; // ainda assim resposta generica
  }
}
