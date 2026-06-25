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

  // Registra a venda p/ o cooldown de recompra da rotação (30 dias).
  try {
    await prisma.sellEvent.create({ data: { portfolioId: id, ticker: existing.ticker } });
  } catch { /* não bloqueia a remoção se o log falhar */ }

  // Histórico: remoção da posição -> VENDA (shares/preço atuais).
  try {
    const soldShares = Number(existing.quantity);
    const soldPrice = Number(existing.avgPrice);
    await prisma.positionEvent.create({
      data: {
        portfolioId: id,
        ticker: existing.ticker,
        action: "VENDA",
        shares: soldShares,
        price: soldPrice,
        totalValue: soldShares * soldPrice,
        leverage: Number(existing.leverage),
        notes: "Posição encerrada",
      },
    });
  } catch { /* não bloqueia a remoção se o log falhar */ }

  await prisma.position.delete({ where: { id: positionId } });

  return new NextResponse(null, { status: 204 });
}
