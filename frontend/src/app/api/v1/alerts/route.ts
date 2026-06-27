import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const AlertCreateSchema = z.object({
  ticker: z.string().min(1).max(20),
  // legacy callers can send "alert_type" or "condition"
  condition: z.string().min(1).max(40).optional(),
  alert_type: z.string().min(1).max(40).optional(),
  threshold: z.number(),
  message: z.string().max(500).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Só alertas de PREÇO do usuário. Os de SOBREVIVÊNCIA (kind stop_pm / liq_near) são
  // auto-gerenciados pelo sweep e surgem como Notification in-app, fora desta lista.
  const alerts = await prisma.alert.findMany({
    where: { userId: user.id, kind: "price" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alerts);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = AlertCreateSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", details: (err as z.ZodError).issues ?? null },
      { status: 400 }
    );
  }

  const condition = parsed.condition ?? parsed.alert_type;
  if (!condition) {
    return NextResponse.json(
      { error: "invalid_payload", details: "condition or alert_type required" },
      { status: 400 }
    );
  }

  const created = await prisma.alert.create({
    data: {
      userId: user.id, // NEVER from body
      ticker: parsed.ticker.toUpperCase(),
      condition,
      threshold: parsed.threshold,
      message: parsed.message ?? null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
