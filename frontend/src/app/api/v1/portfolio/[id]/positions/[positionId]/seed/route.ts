import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Toggle real da SEMENTE (isSeed). Semente e ciclo são mutuamente exclusivos.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string; positionId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, positionId } = params;

  const position = await prisma.position.findFirst({
    where: { id: positionId, portfolio: { id, userId: user.id } },
  });

  if (!position) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nextSeed = !position.isSeed;
  const updated = await prisma.position.update({
    where: { id: positionId },
    data: { isSeed: nextSeed, isCycle: nextSeed ? false : position.isCycle },
  });

  // Histórico: toggle da semente.
  try {
    await prisma.positionEvent.create({
      data: {
        portfolioId: id,
        ticker: updated.ticker,
        action: "SEMENTE",
        shares: Number(updated.quantity),
        price: Number(updated.avgPrice),
        totalValue: Number(updated.quantity) * Number(updated.avgPrice),
        leverage: Number(updated.leverage),
        isCash: false, // classificação (rótulo), não movimento de caixa — não conta como volume
        notes: nextSeed ? "Marcada como semente (on)" : "Semente desmarcada (off)",
      },
    });
  } catch { /* não derruba a mutação se o log falhar */ }

  return NextResponse.json({
    id: updated.id,
    portfolioId: updated.portfolioId,
    ticker: updated.ticker,
    shares: updated.quantity.toString(),
    avg_price: updated.avgPrice.toString(),
    leverage: updated.leverage.toString(),
    is_seed: updated.isSeed,
    is_cycle: updated.isCycle,
  });
}
