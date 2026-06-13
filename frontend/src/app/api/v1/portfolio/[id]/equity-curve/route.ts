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

function backendHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["X-Internal-Token"] = INTERNAL_TOKEN;
  return h;
}

export async function GET(req: NextRequest, { params: { id } }: RouteCtx) {
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
  if (!positions.length) {
    return NextResponse.json(
      { portfolio_id: id, equity_curve: [], message: "no_positions" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503 }
    );
  }

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("start_date") ?? "2020-01-01";
  const period = searchParams.get("period") ?? "5y"; // unused but documented
  const tickers = [...new Set(positions.map((p) => p.ticker))];

  // Weighted average leverage across positions (by cost basis)
  const totalCost = positions.reduce(
    (s, p) => s + Number(p.quantity) * Number(p.avgPrice),
    0
  );
  const weightedLeverage =
    totalCost > 0
      ? positions.reduce(
          (s, p) =>
            s +
            ((Number(p.quantity) * Number(p.avgPrice)) / totalCost) *
              Number(p.leverage),
          0
        )
      : 1;

  // Call FastAPI POST /backtest
  const body = {
    tickers,
    start_date: startDate,
    initial_capital: Number(portfolio.initialEquity) || 10000,
    monthly_contribution: Number(portfolio.monthlyContribution) || 0,
    leverage: Math.round(weightedLeverage * 100) / 100,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let backtestData: {
    results?: {
      equity_curve?: { date: string; equity: number }[];
      total_return_pct?: number;
      cagr_pct?: number;
      sharpe_ratio?: number;
      max_drawdown_pct?: number;
      annualized_volatility_pct?: number;
      final_equity?: number;
    };
  } | null = null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/backtest`, {
      method: "POST",
      headers: backendHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (res.ok) {
      backtestData = await res.json();
    }
  } catch (err) {
    clearTimeout(timeout);
    const e = err as Error;
    if (e.name === "AbortError") {
      return NextResponse.json({ error: "backend_timeout" }, { status: 504 });
    }
    return NextResponse.json(
      { error: "backend_unreachable", detail: e.message },
      { status: 502 }
    );
  }

  const results = backtestData?.results;

  return NextResponse.json(
    {
      portfolio_id: id,
      tickers,
      start_date: startDate,
      initial_capital: body.initial_capital,
      leverage: body.leverage,
      equity_curve: results?.equity_curve ?? [],
      summary: results
        ? {
            final_equity: results.final_equity ?? null,
            total_return_pct: results.total_return_pct ?? null,
            cagr_pct: results.cagr_pct ?? null,
            sharpe_ratio: results.sharpe_ratio ?? null,
            max_drawdown_pct: results.max_drawdown_pct ?? null,
            annualized_volatility_pct:
              results.annualized_volatility_pct ?? null,
          }
        : null,
      computed_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
