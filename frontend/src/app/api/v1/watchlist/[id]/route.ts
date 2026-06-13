import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

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
