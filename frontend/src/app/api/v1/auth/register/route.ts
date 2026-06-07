import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signSession, setSessionCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// bcrypt + Prisma → Node runtime.
export const runtime = "nodejs";

/**
 * POST /api/v1/auth/register
 * Body: { email, password (>=8), fullName?, riskProfile? }
 * Resp 201: { id, email, fullName, riskProfile } + Set-Cookie (auto-login)
 * Resp 409: email already in use
 * Resp 429: rate limited (3/hora/IP)
 */

// Aceita camelCase E snake_case (legado) para fullName/riskProfile.
const RegisterSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(256),
    fullName: z.string().min(1).max(120).optional(),
    full_name: z.string().min(1).max(120).optional(),
    riskProfile: z
      .enum(["conservador", "moderado", "agressivo", "conservative", "balanced", "aggressive"])
      .optional(),
    risk_profile: z
      .enum(["conservador", "moderado", "agressivo", "conservative", "balanced", "aggressive"])
      .optional(),
  })
  .transform((d) => ({
    email: d.email,
    password: d.password,
    fullName: d.fullName ?? d.full_name,
    riskProfile: d.riskProfile ?? d.risk_profile ?? "moderado",
  }));

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`auth:register:${ip}`, 3, 60 * 60);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Limite de cadastros por hora atingido. Tente mais tarde.",
      },
      { status: 429, headers: { "Retry-After": String(rl.reset) } }
    );
  }

  let parsed;
  try {
    parsed = RegisterSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", details: (err as z.ZodError).issues ?? null },
      { status: 400 }
    );
  }

  const email = parsed.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_in_use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: parsed.fullName ?? null,
      riskProfile: parsed.riskProfile,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      riskProfile: true,
    },
  });

  const token = await signSession(user.id);
  setSessionCookie(token);

  return NextResponse.json(
    {
      ...user,
      full_name: user.fullName,
      risk_profile: user.riskProfile,
    },
    { status: 201 }
  );
}
