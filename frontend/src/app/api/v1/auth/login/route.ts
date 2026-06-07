import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signSession, setSessionCookie, DUMMY_BCRYPT_HASH } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// bcrypt + Prisma exigem Node runtime (não Edge).
export const runtime = "nodejs";

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Resp 200: { id, email, fullName, riskProfile }  +  Set-Cookie lbh_session (httpOnly)
 * Resp 401: invalid_credentials (mesma latência para user inexistente vs senha errada)
 * Resp 429: rate limited
 *
 * NOTA: O token JWT NÃO retorna no body — vive 100% no cookie httpOnly.
 *       Mitigação primária contra XSS-exfil.
 */

const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  // Defense-in-depth: middleware já faz 5/min/IP; aqui reforçamos 5/15min em janela longa.
  const ip = getClientIp(request);
  const rl = await rateLimit(`auth:login:long:${ip}`, 5, 15 * 60);
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
    parsed = LoginSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { email, password } = parsed;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Compare ALWAYS to flatten timing (user enumeration mitigation).
    const hashToCheck = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 }
      );
    }

    const token = await signSession(user.id);
    setSessionCookie(token);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      riskProfile: user.riskProfile,
      full_name: user.fullName,
      risk_profile: user.riskProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    console.error("[/auth/login] DB/auth error:", msg);
    return NextResponse.json(
      {
        error: "service_unavailable",
        message: "Banco de dados temporariamente indisponível. Tente novamente.",
      },
      { status: 503 }
    );
  }
}
