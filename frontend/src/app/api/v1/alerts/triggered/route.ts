/**
 * DELETE /api/v1/alerts/triggered
 * Desativa (não apaga) todos os alertas disparados do usuário.
 * "Dismiss" semântico: marca active=false, preserva histórico.
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

function isTriggered(condition: string, currentPrice: number, threshold: number): boolean {
  const cond = condition.toLowerCase();
  if (cond === "above" || cond === "price_above" || cond === "gte") return currentPrice >= threshold;
  if (cond === "below" || cond === "price_below" || cond === "lte") return currentPrice <= threshold;
  return false;
}

export async function DELETE(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Get all active alerts
  const alerts = await prisma.alert.findMany({
    where: { userId: user.id, active: true },
  });

  if (!alerts.length) {
    return NextResponse.json({ dismissed: 0 });
  }

  // Fetch prices for unique tickers to find triggered ones
  const uniqueTickers = [...new Set(alerts.map((a) => a.ticker))];
  const priceResults = await Promise.all(uniqueTickers.map(fetchPrice));
  const priceMap = Object.fromEntries(uniqueTickers.map((t, i) => [t, priceResults[i]]));

  const triggeredIds = alerts
    .filter((a) => {
      const price = priceMap[a.ticker];
      return price != null && isTriggered(a.condition, price, Number(a.threshold));
    })
    .map((a) => a.id);

  if (!triggeredIds.length) {
    return NextResponse.json({ dismissed: 0 });
  }

  // Deactivate triggered alerts (soft dismiss — keeps history)
  await prisma.alert.updateMany({
    where: { id: { in: triggeredIds } },
    data: { active: false },
  });

  return NextResponse.json({ dismissed: triggeredIds.length });
}
