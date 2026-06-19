/**
 * PATCH /api/v1/portfolio/[id]  — atualiza campos da carteira (hoje: currentEquity).
 * O equity atual é o denominador da alavancagem (modelo Quantfury).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const PatchSchema = z.object({
  current_equity: z.number().nonnegative().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const owned = await prisma.portfolio.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.current_equity !== undefined) data.currentEquity = parsed.data.current_equity;

  const updated = await prisma.portfolio.update({ where: { id }, data });
  return NextResponse.json(
    { id: updated.id, current_equity: updated.currentEquity != null ? Number(updated.currentEquity) : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
