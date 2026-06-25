import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PositionCreateSchema = z.object({
  ticker: z.string().min(1).max(20),
  shares: z.number().positive(),
  avg_price: z.number().positive(),
  // Quantfury: leverage NÃO é escolhida por posição (é medida pela carteira). Default 1.
  leverage: z.number().positive().default(1),
  opened_at: z.string().optional(),  // data de abertura (ISO); default = agora
});

type RouteCtx = { params: { id: string } };

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";

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

export async function GET(_req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    include: { positions: true },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const prices = await Promise.all(
    portfolio.positions.map((p) => fetchPrice(p.ticker))
  );

  // Pass 1: enrich + compute values
  const enriched = portfolio.positions.map((p, i) => {
    const shares = Number(p.quantity);
    const avgPrice = Number(p.avgPrice);
    const leverage = Number(p.leverage);
    const currentPrice = prices[i];
    // Quantfury: notional = shares × preço (já reflete o que se segura, com emprestado dentro).
    // NÃO multiplicar por leverage por-posição — isso DOBRAVA o P&L exibido (a alavancagem é
    // MEDIDA pela carteira, não escolhida por posição).
    const currentValue =
      currentPrice != null ? shares * currentPrice : null;
    const notionalValue = currentValue;
    const pnl =
      currentPrice != null ? (currentPrice - avgPrice) * shares : null;
    const pnlPct =
      currentPrice != null && avgPrice > 0
        ? (currentPrice / avgPrice - 1) * 100
        : null;
    return {
      raw: p,
      shares,
      avgPrice,
      leverage,
      currentPrice,
      currentValue,
      notionalValue,
      pnl,
      pnlPct,
    };
  });

  const totalEquity = enriched.reduce(
    (s, e) => s + (e.currentValue ?? 0),
    0
  );

  // Pass 2: emit payload (snake_case + camelCase aliases for FE compat)
  const payload = enriched.map((e) => {
    const weight =
      e.currentValue != null && totalEquity > 0
        ? e.currentValue / totalEquity
        : null;
    return {
      id: e.raw.id,
      portfolio_id: e.raw.portfolioId,
      portfolioId: e.raw.portfolioId,
      ticker: e.raw.ticker,
      shares: e.shares,
      quantity: e.shares,
      avg_price: e.avgPrice,
      avgPrice: e.avgPrice,
      leverage: e.leverage,
      current_price: e.currentPrice,
      currentPrice: e.currentPrice,
      current_value: e.currentValue,
      currentValue: e.currentValue,
      notional_value: e.notionalValue,
      notionalValue: e.notionalValue,
      pnl: e.pnl,
      pnl_pct: e.pnlPct,
      pnlPct: e.pnlPct,
      weight,
      company_name: null,
      sector: null,
      dy: null,
      is_seed: e.raw.isSeed,
      is_cycle: e.raw.isCycle,
      opened_at: e.raw.openedAt,
      created_at: e.raw.createdAt,
    };
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = PositionCreateSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", details: (err as z.ZodError).issues ?? null },
      { status: 400 }
    );
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ticker = parsed.ticker.toUpperCase();

  // Consolidação: se o ticker já existe na carteira, mescla em vez de duplicar.
  // - quantidade: soma
  // - preço médio: média ponderada pela quantidade
  // - alavancagem: média ponderada pelo nocional (qty*preço)
  const existing = await prisma.position.findFirst({
    where: { portfolioId: id, ticker },
  });

  if (existing) {
    const q1 = Number(existing.quantity);
    const p1 = Number(existing.avgPrice);
    const l1 = Number(existing.leverage);
    const q2 = parsed.shares;
    const p2 = parsed.avg_price;
    const l2 = parsed.leverage;

    const totalQty = q1 + q2;
    const newAvgPrice = totalQty > 0 ? (q1 * p1 + q2 * p2) / totalQty : p2;
    const notional1 = q1 * p1;
    const notional2 = q2 * p2;
    const totalNotional = notional1 + notional2;
    const newLeverage =
      totalNotional > 0 ? (notional1 * l1 + notional2 * l2) / totalNotional : l2;

    const updated = await prisma.position.update({
      where: { id: existing.id },
      data: {
        quantity: Math.round(totalQty * 1e6) / 1e6,
        avgPrice: Math.round(newAvgPrice * 1e4) / 1e4,
        leverage: Math.round(newLeverage * 1e2) / 1e2,
      },
    });

    // Histórico: consolidação em posição existente -> aporte adicional (COMPRA das shares novas).
    try {
      await prisma.positionEvent.create({
        data: {
          portfolioId: id,
          ticker,
          action: "COMPRA",
          shares: q2,
          price: p2,
          totalValue: q2 * p2,
          leverage: l2,
          notes: `Aporte consolidado (preço médio ${updated.avgPrice.toString()})`,
        },
      });
    } catch { /* não derruba a mutação se o log falhar */ }

    return NextResponse.json(
      {
        id: updated.id,
        portfolio_id: updated.portfolioId,
        portfolioId: updated.portfolioId,
        ticker: updated.ticker,
        shares: Number(updated.quantity),
        quantity: Number(updated.quantity),
        avg_price: Number(updated.avgPrice),
        avgPrice: Number(updated.avgPrice),
        leverage: Number(updated.leverage),
        merged: true, // sinaliza que foi consolidado numa posição existente
        is_seed: false,
        is_cycle: false,
        created_at: updated.createdAt,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const openedAt = parsed.opened_at ? new Date(parsed.opened_at) : undefined;
  const created = await prisma.position.create({
    data: {
      portfolioId: id,
      ticker,
      quantity: parsed.shares,
      avgPrice: parsed.avg_price,
      leverage: parsed.leverage,
      ...(openedAt && !isNaN(openedAt.getTime()) ? { openedAt } : {}),
    },
  });

  // Histórico: nova posição -> COMPRA.
  try {
    await prisma.positionEvent.create({
      data: {
        portfolioId: id,
        ticker,
        action: "COMPRA",
        shares: parsed.shares,
        price: parsed.avg_price,
        totalValue: parsed.shares * parsed.avg_price,
        leverage: parsed.leverage,
        notes: "Abertura de posição",
        ...(openedAt && !isNaN(openedAt.getTime()) ? { executedAt: openedAt } : {}),
      },
    });
  } catch { /* não derruba a mutação se o log falhar */ }

  return NextResponse.json(
    {
      id: created.id,
      portfolio_id: created.portfolioId,
      portfolioId: created.portfolioId,
      ticker: created.ticker,
      shares: Number(created.quantity),
      quantity: Number(created.quantity),
      avg_price: Number(created.avgPrice),
      avgPrice: Number(created.avgPrice),
      leverage: Number(created.leverage),
      merged: false,
      is_seed: false,
      is_cycle: false,
      created_at: created.createdAt,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
