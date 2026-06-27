import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PositionUpdateSchema = z.object({
  ticker: z.string().min(1).max(20).optional(),
  shares: z.number().positive(),
  avg_price: z.number().nonnegative(),
  leverage: z.number().positive(),
});

type RouteCtx = { params: { id: string; positionId: string } };

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";

// Busca o preço de mercado atual do ticker (mesmo endpoint usado em positions/route.ts).
// Retorna null se a fonte falhar — NUNCA fabrica preço.
async function fetchPrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/assets/${encodeURIComponent(ticker)}/price`,
      {
        headers: INTERNAL_TOKEN ? { "X-Internal-Token": INTERNAL_TOKEN } : {},
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price =
      typeof data?.price === "number"
        ? data.price
        : typeof data?.current_price === "number"
          ? data.current_price
          : typeof data?.last === "number"
            ? data.last
            : null;
    return price;
  } catch {
    return null;
  }
}

export async function PUT(request: NextRequest, { params }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, positionId } = params;

  let parsed;
  try {
    parsed = PositionUpdateSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", details: (err as z.ZodError).issues ?? null },
      { status: 400 }
    );
  }

  const existing = await prisma.position.findFirst({
    where: { id: positionId, portfolio: { id, userId: user.id } },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updated = await prisma.position.update({
    where: { id: positionId },
    data: {
      ...(parsed.ticker ? { ticker: parsed.ticker.toUpperCase() } : {}),
      quantity: parsed.shares,
      avgPrice: parsed.avg_price,
      leverage: parsed.leverage,
    },
  });

  // Histórico: edição manual da posição -> AJUSTE.
  try {
    await prisma.positionEvent.create({
      data: {
        portfolioId: id,
        ticker: updated.ticker,
        action: "AJUSTE",
        shares: parsed.shares,
        price: parsed.avg_price,
        totalValue: parsed.shares * parsed.avg_price,
        leverage: parsed.leverage,
        isCash: false, // ajuste/correção manual — não é compra/venda de mercado, não conta como volume
        notes: "Ajuste manual da posição",
      },
    });
  } catch { /* não derruba a mutação se o log falhar */ }

  return NextResponse.json(
    {
      id: updated.id,
      portfolioId: updated.portfolioId,
      ticker: updated.ticker,
      shares: Number(updated.quantity),
      avg_price: Number(updated.avgPrice),
      leverage: Number(updated.leverage),
      createdAt: updated.createdAt,
    },
    { status: 200 }
  );
}

export async function DELETE(_request: NextRequest, { params }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, positionId } = params;

  const existing = await prisma.position.findFirst({
    where: { id: positionId, portfolio: { id, userId: user.id } },
    select: { id: true, ticker: true, quantity: true, avgPrice: true, leverage: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const soldShares = Number(existing.quantity);
  const avgPrice = Number(existing.avgPrice);

  // VENDA = encerramento. Busca o preço de MERCADO de saída (não o custo!).
  // Se a fonte falhar, NÃO fabricamos: exitPrice/realizedPnl ficam null e
  // marcamos "preço de saída indisponível" — honestidade > número falso.
  const exitPrice = await fetchPrice(existing.ticker);
  const realizedPnl =
    exitPrice != null ? (exitPrice - avgPrice) * soldShares : null;
  const exitNotional = exitPrice != null ? exitPrice * soldShares : null;

  // Registra a venda p/ o cooldown de recompra da rotação (30 dias) + dados de saída.
  try {
    await prisma.sellEvent.create({
      data: {
        portfolioId: id,
        ticker: existing.ticker,
        shares: soldShares,
        avgPrice,
        exitPrice,
        realizedPnl,
      },
    });
  } catch { /* não bloqueia a remoção se o log falhar */ }

  // Histórico: remoção da posição -> VENDA ao preço de MERCADO de saída.
  try {
    await prisma.positionEvent.create({
      data: {
        portfolioId: id,
        ticker: existing.ticker,
        action: "VENDA",
        shares: soldShares,
        // price = preço de SAÍDA real (mercado). Fallback p/ custo só se a fonte cair.
        price: exitPrice ?? avgPrice,
        totalValue: exitNotional ?? soldShares * avgPrice,
        leverage: Number(existing.leverage),
        realizedPnl,
        isCash: true,
        notes:
          exitPrice != null
            ? `Posição encerrada a mercado (custo médio ${avgPrice})`
            : "Posição encerrada — preço de saída indisponível (P&L realizado não apurado)",
      },
    });
  } catch { /* não bloqueia a remoção se o log falhar */ }

  await prisma.position.delete({ where: { id: positionId } });

  return new NextResponse(null, { status: 204 });
}
