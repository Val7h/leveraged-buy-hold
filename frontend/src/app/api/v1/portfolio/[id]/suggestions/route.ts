/**
 * GET /api/v1/portfolio/[id]/suggestions?available_capital=1000
 *
 * Lê posições do Prisma, busca preços atuais e market-state no FastAPI,
 * e sugere onde aportar o capital disponível com base em:
 *   1. Posições abaixo do peso alvo (igual-ponderado)
 *   2. Market-state multiplier para calibrar alavancagem sugerida
 *   3. Prioridade para posições com maior drawdown do PM (desconto)
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
  return INTERNAL_TOKEN ? { "X-Internal-Token": INTERNAL_TOKEN } : {};
}

async function fetchPrice(ticker: string): Promise<number | null> {
  if (!BACKEND_URL) return null;
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/assets/${encodeURIComponent(ticker)}/price`,
      { headers: bHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d?.price === "number" ? d.price
      : typeof d?.current_price === "number" ? d.current_price
      : null;
  } catch { return null; }
}

async function fetchMarketMultiplier(): Promise<number> {
  if (!BACKEND_URL) return 1.5;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/assets/market-state`, {
      headers: bHeaders(), cache: "no-store",
    });
    if (!res.ok) return 1.5;
    const d = await res.json();
    return typeof d?.multiplier === "number" ? d.multiplier : 1.5;
  } catch { return 1.5; }
}

export async function GET(req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const availableCapital = parseFloat(
    req.nextUrl.searchParams.get("available_capital") ?? "1000"
  );
  if (isNaN(availableCapital) || availableCapital <= 0) {
    return NextResponse.json({ error: "invalid available_capital" }, { status: 400 });
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    include: { positions: true },
  });
  if (!portfolio) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Agrega por ticker: lotes duplicados (ex: 2× NEE) viram 1 posição (qty somada,
  // PM ponderado) — senão a sugestão listava o MESMO ticker várias vezes.
  const byTicker = new Map<string, { ticker: string; quantity: number; avgPrice: number }>();
  for (const p of portfolio.positions) {
    const q = Number(p.quantity);
    const pm = Number(p.avgPrice);
    const ex = byTicker.get(p.ticker);
    if (ex) {
      const totQ = ex.quantity + q;
      ex.avgPrice = totQ > 0 ? (ex.quantity * ex.avgPrice + q * pm) / totQ : pm;
      ex.quantity = totQ;
    } else {
      byTicker.set(p.ticker, { ticker: p.ticker, quantity: q, avgPrice: pm });
    }
  }
  const positions = [...byTicker.values()];
  if (!positions.length) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }

  // Fetch prices + market multiplier in parallel
  const [marketMult, ...prices] = await Promise.all([
    fetchMarketMultiplier(),
    ...positions.map((p) => fetchPrice(p.ticker)),
  ]);

  // Compute current values
  type Enriched = {
    ticker: string;
    shares: number;
    avgPrice: number;
    currentPrice: number | null;
    currentValue: number;
    pnlPct: number;
  };

  const enriched: Enriched[] = positions.map((p, i) => {
    const shares = Number(p.quantity);
    const avgPrice = Number(p.avgPrice);
    const currentPrice = prices[i];
    const currentValue = currentPrice != null ? shares * currentPrice : shares * avgPrice;
    const pnlPct = currentPrice != null && avgPrice > 0
      ? (currentPrice / avgPrice - 1) * 100
      : 0;
    return { ticker: p.ticker, shares, avgPrice, currentPrice, currentValue, pnlPct };
  });

  const totalEquity = enriched.reduce((s, e) => s + e.currentValue, 0);
  const targetWeight = 1 / positions.length; // equal-weight target

  // Suggest leverage based on market-state multiplier
  const suggestedLeverage = Math.min(Math.max(marketMult * 0.8, 1.0), 3.0);

  // Score each position: underweight + discount from PM = higher priority
  const scored = enriched.map((e) => {
    const currentWeight = totalEquity > 0 ? e.currentValue / totalEquity : 0;
    const underweightGap = targetWeight - currentWeight; // positive = underweight
    const discountScore = e.pnlPct < 0 ? Math.abs(e.pnlPct) / 100 : 0; // reward buying at discount
    const score = underweightGap * 2 + discountScore;
    return { ...e, currentWeight, underweightGap, score };
  });

  // Take top candidates (underweight or at discount)
  const candidates = scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!candidates.length) {
    // Portfolio is balanced — suggest proportional to weights
    return NextResponse.json(
      enriched.slice(0, 3).map((e) => ({
        ticker: e.ticker,
        company_name: null,
        suggested_amount: Math.round((availableCapital / Math.min(enriched.length, 3)) * 100) / 100,
        suggested_leverage: Math.round(suggestedLeverage * 100) / 100,
        rationale: "Carteira balanceada — aporte proporcional",
        current_weight_pct: totalEquity > 0 ? Math.round((e.currentValue / totalEquity) * 10000) / 100 : 0,
        target_weight_pct: Math.round(targetWeight * 10000) / 100,
        current_price: e.currentPrice,
        pnl_pct: Math.round(e.pnlPct * 100) / 100,
      })),
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Distribute capital proportional to score
  const totalScore = candidates.reduce((s, c) => s + Math.max(c.score, 0.01), 0);

  const suggestions = candidates.map((c) => {
    const proportion = Math.max(c.score, 0.01) / totalScore;
    const amount = Math.round(availableCapital * proportion * 100) / 100;
    const gap = Math.round(c.underweightGap * 10000) / 100;

    let rationale = "";
    if (c.underweightGap > 0.05) {
      rationale = `Subponderado em ${gap.toFixed(1)}%`;
    } else if (c.pnlPct < -5) {
      rationale = `Em desconto (${c.pnlPct.toFixed(1)}% abaixo do PM) — oportunidade de preço médio`;
    } else {
      rationale = `Leve subponderação (${gap.toFixed(1)}%) — rebalanceamento suave`;
    }

    if (marketMult >= 2) {
      rationale += " · Mercado favorável, aumentar alavancagem";
    } else if (marketMult <= 1) {
      rationale += " · Mercado fraco, cautela na alavancagem";
    }

    return {
      ticker: c.ticker,
      company_name: null,
      suggested_amount: amount,
      suggested_leverage: Math.round(suggestedLeverage * 100) / 100,
      rationale,
      current_weight_pct: Math.round(c.currentWeight * 10000) / 100,
      target_weight_pct: Math.round(targetWeight * 10000) / 100,
      current_price: c.currentPrice,
      pnl_pct: Math.round(c.pnlPct * 100) / 100,
    };
  });

  return NextResponse.json(suggestions, { headers: { "Cache-Control": "no-store" } });
}
