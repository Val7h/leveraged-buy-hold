import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const AlertUpdateSchema = z.object({
  active: z.boolean().optional(),
  threshold: z.number().optional(),
  message: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const alert = await prisma.alert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let parsed;
  try {
    parsed = AlertUpdateSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_payload", details: (err as z.ZodError).issues }, { status: 400 });
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: {
      ...(parsed.active !== undefined && { active: parsed.active }),
      ...(parsed.threshold !== undefined && { threshold: parsed.threshold }),
      ...(parsed.message !== undefined && { message: parsed.message }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const alert = await prisma.alert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.alert.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
