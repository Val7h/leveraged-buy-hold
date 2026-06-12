import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { sendEmail, passwordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

const ForgotSchema = z.object({
  email: z.string().email().max(254),
});

/**
 * POST /api/v1/auth/forgot-password
 *
 * Body: { email }
 * Sempre retorna 200 com mensagem generica (mitigacao user enumeration).
 * Se o user existir: gera token, armazena hash + expiracao 1h, dispara email.
 * Envio via Resend (lib/email). Sem RESEND_API_KEY o client opera em modo stub
 * (loga payload) — fluxo continua funcional em dev/local.
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

    // NEXT_PUBLIC_APP_URL garante o dominio publico correto mesmo atras de proxy.
    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
    const link = `${origin}/reset-password?token=${plain}`;

    const { subject, html, text } = passwordResetEmail({
      name: user.fullName ?? user.email,
      resetUrl: link,
      expiresIn: "1 hora",
    });

    const sent = await sendEmail({ to: user.email, subject, html, text });
    if (!sent.ok) {
      // Nao vazamos a falha pro cliente (resposta generica), mas registramos pro admin.
      logger.error("[forgot-password] falha ao enviar email", {
        email: user.email,
        error: sent.error,
      });
    } else {
      logger.info("[forgot-password] email enviado", {
        email: user.email,
        id: sent.id,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return genericReply;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    logger.error("[forgot-password] erro", { msg });
    return genericReply; // ainda assim resposta generica
  }
}
