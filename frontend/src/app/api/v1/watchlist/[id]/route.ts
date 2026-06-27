import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

// Nota/tese livre + preço-alvo de ENTRADA por item (o "quique" que a watchlist espera).
// targetPrice null = limpar o alvo. note "" = limpar a nota.
const ItemPatchSchema = z.object({
  note: z.string().max(500).nullable().optional(),
  targetPrice: z.number().positive().nullable().optional(),
});

/**
 * PATCH /api/v1/watchlist/[id] — edita nota/tese e preço-alvo de entrada do item.
 * Ownership via join (item → watchlist → userId). Não cria, não fabrica sinal.
 */
export async function PATCH(req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const item = await prisma.watchlistItem.findFirst({
    where: { id },
    include: { watchlist: { select: { userId: true } } },
  });
  if (!item || item.watchlist.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let parsed;
  try {
    parsed = ItemPatchSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", details: (err as z.ZodError).issues ?? null },
      { status: 400 }
    );
  }

  const updated = await prisma.watchlistItem.update({
    where: { id },
    data: {
      ...(parsed.note !== undefined && { note: parsed.note === "" ? null : parsed.note }),
      ...(parsed.targetPrice !== undefined && { targetPrice: parsed.targetPrice }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // item pertence a uma watchlist do usuário — verificar ownership via join
  const item = await prisma.watchlistItem.findFirst({
    where: { id },
    include: { watchlist: { select: { userId: true } } },
  });

  if (!item || item.watchlist.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.watchlistItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
