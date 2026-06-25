/**
 * GET /api/v1/portfolio/[id]/history
 *
 * Retorna o histórico REAL de operações da carteira (tabela PositionEvent).
 * Cada mutação (COMPRA/VENDA/AJUSTE/SEMENTE/CICLO) grava um evento.
 * FALLBACK: carteiras antigas (sem eventos, criadas antes da tabela) caem na
 * síntese a partir das posições — pra não ficar vazio.
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

  // Histórico real: eventos gravados pelos mutadores.
  let realEvents: Array<{
    id: string;
    action: string;
    ticker: string;
    shares: number | null;
    price: number | null;
    total_value: number | null;
    leverage: number | null;
    executed_at: string;
    notes: string | null;
  }> = [];

  try {
    const rows = await prisma.positionEvent.findMany({
      where: { portfolioId: id },
      orderBy: { executedAt: "desc" },
    });
    realEvents = rows.map((e) => ({
      id: e.id,
      action: e.action,
      ticker: e.ticker,
      shares: e.shares ?? null,
      price: e.price ?? null,
      total_value: e.totalValue ?? null,
      leverage: e.leverage ?? null,
      executed_at: e.executedAt.toISOString(),
      notes: e.notes ?? null,
    }));
  } catch {
    // tabela ainda não migrada em ambientes muito antigos -> cai no fallback
    realEvents = [];
  }

  if (realEvents.length > 0) {
    // total_invested = soma das COMPRAS (entradas de capital).
    const totalInvested = realEvents
      .filter((e) => e.action === "COMPRA")
      .reduce((s, e) => s + (e.total_value ?? 0), 0);

    return NextResponse.json(
      {
        portfolio_id: id,
        portfolio_name: portfolio.name,
        events: realEvents,
        total_invested: totalInvested,
        event_count: realEvents.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // FALLBACK sintético (carteiras antigas, sem eventos registrados):
  // cada posição vira 1 evento COMPRA fabricado a partir do createdAt.
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
      notes: "Posição registrada (histórico sintético)",
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
