/**
 * GET /api/v1/alerts/check
 * Retorna todos os alertas do usuário enriquecidos com preço atual e status triggered.
 *
 * Condition logic:
 *   above / price_above / gte → triggered se current_price >= threshold
 *   below / price_below / lte → triggered se current_price <= threshold
 *   Outros → triggered = false (condicional ainda não suportada)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ??
  (process.env.NODE_ENV !== "production" ? "http://localhost:8001" : "");
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";

async function fetchPrice(ticker: string): Promise<number | null> {
  if (!BACKEND_URL) return null;
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/assets/${encodeURIComponent(ticker)}/price`,
      {
        headers: INTERNAL_TOKEN ? { "X-Internal-Token": INTERNAL_TOKEN } : {},
        cache: "no-store",
      }
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

function evalCondition(
  condition: string,
  currentPrice: number,
  threshold: number
): boolean {
  const cond = condition.toLowerCase();
  if (cond === "above" || cond === "price_above" || cond === "gte") {
    return currentPrice >= threshold;
  }
  if (cond === "below" || cond === "price_below" || cond === "lte") {
    return currentPrice <= threshold;
  }
  return false;
}

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!alerts.length) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }

  // Deduplicate tickers before fetching prices
  const uniqueTickers = [...new Set(alerts.map((a) => a.ticker))];
  const priceResults = await Promise.all(uniqueTickers.map(fetchPrice));
  const priceMap = Object.fromEntries(
    uniqueTickers.map((t, i) => [t, priceResults[i]])
  );

  const enriched = alerts.map((alert) => {
    const currentPrice = priceMap[alert.ticker] ?? null;
    const threshold = Number(alert.threshold);
    const triggered =
      alert.active && currentPrice != null
        ? evalCondition(alert.condition, currentPrice, threshold)
        : false;

    return {
      id: alert.id,
      ticker: alert.ticker,
      condition: alert.condition,
      threshold,
      message: alert.message,
      active: alert.active,
      current_price: currentPrice,
      triggered,
      distance_pct:
        currentPrice != null && threshold > 0
          ? Math.round(((currentPrice - threshold) / threshold) * 10000) / 100
          : null,
      created_at: alert.createdAt,
    };
  });

  const triggeredCount = enriched.filter((a) => a.triggered).length;

  return NextResponse.json(
    { alerts: enriched, triggered_count: triggeredCount },
    { headers: { "Cache-Control": "no-store" } }
  );
}
