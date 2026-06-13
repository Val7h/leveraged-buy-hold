import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ??
  (process.env.NODE_ENV !== "production" ? "http://localhost:8001" : "");
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";

function backendHeaders(): Record<string, string> {
  return INTERNAL_TOKEN ? { "X-Internal-Token": INTERNAL_TOKEN } : {};
}

async function fetchPrice(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/assets/${encodeURIComponent(ticker)}/price`,
      { headers: backendHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d?.price === "number"
      ? d.price
      : typeof d?.current_price === "number"
        ? d.current_price
        : null;
  } catch {
    return null;
  }
}

async function fetchVolatility(
  tickers: string[]
): Promise<{ portfolio_volatility_pct: number; metrics: Record<string, unknown> } | null> {
  if (!tickers.length || !BACKEND_URL) return null;
  try {
    const qs = new URLSearchParams({ tickers: tickers.join(",") });
    const res = await fetch(
      `${BACKEND_URL}/api/v1/analytics/metrics/volatility?${qs}`,
      { headers: backendHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchSharpe(
  tickers: string[],
  period = "1y"
): Promise<{ portfolio_sharpe: number; metrics: unknown[] } | null> {
  if (!tickers.length || !BACKEND_URL) return null;
  try {
    const qs = new URLSearchParams({ tickers: tickers.join(","), period });
    const res = await fetch(
      `${BACKEND_URL}/api/v1/analytics/metrics/sharpe-ratio?${qs}`,
      { headers: backendHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.json();
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

  const positions = portfolio.positions;
  const tickers = [...new Set(positions.map((p) => p.ticker))];

  // Fetch prices + quant metrics in parallel
  const [prices, volData, sharpeData] = await Promise.all([
    Promise.all(positions.map((p) => fetchPrice(p.ticker))),
    fetchVolatility(tickers),
    fetchSharpe(tickers),
  ]);

  // Compute position-level values
  let totalEquity = 0;
  let totalPnl = 0;
  let weightedLeverageNum = 0;

  const enriched = positions.map((p, i) => {
    const shares = Number(p.quantity);
    const avgPrice = Number(p.avgPrice);
    const leverage = Number(p.leverage);
    const currentPrice = prices[i];
    const value = currentPrice != null ? shares * currentPrice : shares * avgPrice;
    const pnl =
      currentPrice != null ? (currentPrice - avgPrice) * shares * leverage : 0;

    totalEquity += value;
    totalPnl += pnl;
    weightedLeverageNum += value * leverage;

    return { ticker: p.ticker, shares, avgPrice, leverage, currentPrice, value, pnl };
  });

  const totalPnlPct =
    totalEquity > 0 ? (totalPnl / totalEquity) * 100 : null;
  const weightedAvgLeverage =
    totalEquity > 0 ? weightedLeverageNum / totalEquity : 1;

  // Allocation breakdown
  const allocation = enriched.map((e) => ({
    ticker: e.ticker,
    value: Math.round(e.value * 100) / 100,
    weight_pct: totalEquity > 0 ? Math.round((e.value / totalEquity) * 10000) / 100 : 0,
    pnl: Math.round(e.pnl * 100) / 100,
    leverage: e.leverage,
  }));

  return NextResponse.json(
    {
      portfolio_id: id,
      position_count: positions.length,
      total_equity: Math.round(totalEquity * 100) / 100,
      total_pnl: Math.round(totalPnl * 100) / 100,
      total_pnl_pct: totalPnlPct != null ? Math.round(totalPnlPct * 100) / 100 : null,
      weighted_avg_leverage: Math.round(weightedAvgLeverage * 100) / 100,
      initial_equity: Number(portfolio.initialEquity),
      monthly_contribution: Number(portfolio.monthlyContribution),
      currency: portfolio.currency,
      portfolio_volatility_pct: volData?.portfolio_volatility_pct ?? null,
      portfolio_sharpe: sharpeData?.portfolio_sharpe ?? null,
      volatility_metrics: volData?.metrics ?? null,
      sharpe_metrics: sharpeData?.metrics ?? null,
      allocation,
      computed_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
