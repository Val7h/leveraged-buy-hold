/**
 * GET /api/v1/portfolio/[id]/analytics
 *
 * Lê as posições do Prisma e delega o cálculo pesado ao FastAPI
 * (POST /api/v1/portfolio/analytics): métricas por ativo, totais ponderados,
 * estrutura ALVO×REAL por bucket, contribuição de risco (Dalio) e correlação.
 */
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

function bHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["X-Internal-Token"] = INTERNAL_TOKEN;
  return h;
}

export async function GET(_req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    include: { positions: true },
  });
  if (!portfolio) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const positions = portfolio.positions.map((p) => ({
    ticker: p.ticker,
    shares: Number(p.quantity),
    avg_price: Number(p.avgPrice),
    is_seed: p.isSeed,
    is_cycle: p.isCycle,
  }));
  const equity = portfolio.currentEquity != null ? Number(portfolio.currentEquity) : null;

  if (!positions.length || !BACKEND_URL) {
    return NextResponse.json(
      { assets: [], totals: {}, buckets: [], correlation: {} },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/portfolio/analytics`, {
      method: "POST",
      headers: bHeaders(),
      body: JSON.stringify({ positions, equity }),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "backend_error", status: res.status }, { status: 502 });
    }
    const data = await res.json();
    // Reanexa seed/cycle (o Python não recebe esse flag no analytics).
    const seedMap = new Map(positions.map((p) => [p.ticker.toUpperCase(), p]));
    if (Array.isArray(data?.assets)) {
      for (const a of data.assets) {
        const p = seedMap.get(String(a.ticker).toUpperCase());
        if (p) { a.is_seed = p.is_seed; a.is_cycle = p.is_cycle; }
      }
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  }
}
