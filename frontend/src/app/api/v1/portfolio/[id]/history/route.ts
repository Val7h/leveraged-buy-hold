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
    realized_pnl: number | null;
    is_cash: boolean;
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
      realized_pnl: e.realizedPnl ?? null,
      // isCash pode ser null em linhas pré-migração: deriva por ação (COMPRA/VENDA = caixa).
      is_cash:
        typeof e.isCash === "boolean"
          ? e.isCash
          : e.action === "COMPRA" || e.action === "VENDA",
      executed_at: e.executedAt.toISOString(),
      notes: e.notes ?? null,
    }));
  } catch {
    // tabela ainda não migrada em ambientes muito antigos -> cai no fallback
    realEvents = [];
  }

  if (realEvents.length > 0) {
    // SÓ eventos de CAIXA contam como volume/operações reais.
    // Classificação (SEMENTE/CICLO/AJUSTE-flag) não infla volume.
    const cashEvents = realEvents.filter((e) => e.is_cash);

    // total_invested = soma das COMPRAS (entradas de capital).
    const totalInvested = cashEvents
      .filter((e) => e.action === "COMPRA")
      .reduce((s, e) => s + (e.total_value ?? 0), 0);
    const totalSold = cashEvents
      .filter((e) => e.action === "VENDA")
      .reduce((s, e) => s + (e.total_value ?? 0), 0);

    // P&L realizado: soma dos eventos de VENDA com exitPrice apurado.
    const realizedPnl = cashEvents.reduce(
      (s, e) => s + (e.realized_pnl ?? 0),
      0
    );
    // honestidade: quantas vendas ficaram sem preço de saída.
    const sellsMissingExit = cashEvents.filter(
      (e) => e.action === "VENDA" && e.realized_pnl == null
    ).length;

    return NextResponse.json(
      {
        portfolio_id: id,
        portfolio_name: portfolio.name,
        events: realEvents,
        total_invested: totalInvested,
        total_sold: totalSold,
        realized_pnl: realizedPnl,
        sells_missing_exit: sellsMissingExit,
        cash_event_count: cashEvents.length,
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
      realized_pnl: null,
      is_cash: true,
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
      total_sold: 0,
      realized_pnl: 0,
      sells_missing_exit: 0,
      cash_event_count: events.length,
      event_count: events.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
