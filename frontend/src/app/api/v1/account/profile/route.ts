// /api/v1/account/profile — GET (return profile) / PATCH (update fullName, riskProfile)
// Mudanca de email NAO eh permitida aqui — requer fluxo de verificacao por email
// (fora deste sprint). Se vier no body, retornamos 501 Not Implemented.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const PatchSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    riskProfile: z.enum(["conservador", "moderado", "agressivo"]).optional(),
    email: z.string().optional(), // capturado apenas para devolver 501
  })
  .refine((v) => v.fullName !== undefined || v.riskProfile !== undefined || v.email !== undefined, {
    message: "no_fields_provided",
  });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    riskProfile: user.riskProfile,
    createdAt: user.createdAt,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = PatchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Mudanca de email requer verificacao por email — fora deste sprint.
  if (parsed.email !== undefined) {
    return NextResponse.json(
      {
        error: "not_implemented",
        message:
          "Mudanca de email exige verificacao. Use o fluxo de verificacao por email (em breve).",
      },
      { status: 501 }
    );
  }

  const data: { fullName?: string; riskProfile?: string } = {};
  if (parsed.fullName !== undefined) data.fullName = parsed.fullName;
  if (parsed.riskProfile !== undefined) data.riskProfile = parsed.riskProfile;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_fields_provided" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        riskProfile: true,
        createdAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    logger.error("/account/profile PATCH error", { msg, userId: user.id });
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503 }
    );
  }
}
