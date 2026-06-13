import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOTE: schema (positions) does not have isCycle/is_cycle column.
// Sprint 4 stub: ownership-check + return position with is_cycle=false.
// TODO: add `isCycle Boolean @default(false)` to Position model + migration to make this a real toggle.
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

  return NextResponse.json({
    id: position.id,
    portfolioId: position.portfolioId,
    ticker: position.ticker,
    shares: position.quantity.toString(),
    avg_price: position.avgPrice.toString(),
    leverage: position.leverage.toString(),
    is_seed: false,
    is_cycle: false,
  });
}
