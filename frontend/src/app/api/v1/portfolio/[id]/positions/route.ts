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
  leverage: z.number().positive().default(1),
});

type RouteCtx = { params: { id: string } };

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? "";

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
    const currentValue =
      currentPrice != null ? shares * currentPrice : null;
    const notionalValue =
      currentValue != null ? currentValue * leverage : null;
    const pnl =
      currentPrice != null
        ? (currentPrice - avgPrice) * shares * leverage
        : null;
    const pnlPct =
      currentPrice != null && avgPrice > 0
        ? (currentPrice / avgPrice - 1) * 100 * leverage
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
      // Schema gaps — stubbed null/false until enrichment/migration lands.
      company_name: null,
      sector: null,
      dy: null,
      is_seed: false,
      is_cycle: false,
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

  const created = await prisma.position.create({
    data: {
      portfolioId: id,
      ticker: parsed.ticker.toUpperCase(),
      quantity: parsed.shares,
      avgPrice: parsed.avg_price,
      leverage: parsed.leverage,
    },
  });

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
      is_seed: false,
      is_cycle: false,
      created_at: created.createdAt,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
