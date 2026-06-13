/**
 * GET /api/v1/portfolio/[id]/history
 *
 * Retorna o histórico de operações da carteira.
 * Hoje: posições com data de criação (snapshot inicial).
 * Futuro: quando existir tabela PositionHistory no Prisma, consultar diretamente.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

export async function GET(_req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    include: {
      positions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!portfolio) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Build a synthetic history from position creation events.
  // Field names match TradeHistoryItem type used by history/page.tsx.
  const events = portfolio.positions.map((p) => {
    const total_value = Number(p.quantity) * Number(p.avgPrice);
    return {
      id: p.id,
      action: "COMPRA",
      ticker: p.ticker,
      shares: Number(p.quantity),
      price: Number(p.avgPrice),
      total_value,
      leverage: Number(p.leverage),
      executed_at: p.createdAt.toISOString(),
      notes: "Posição registrada",
    };
  });

  return NextResponse.json(
    {
      portfolio_id: id,
      portfolio_name: portfolio.name,
      events,
      total_invested: events.reduce((s, e) => s + e.total_value, 0),
      event_count: events.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
