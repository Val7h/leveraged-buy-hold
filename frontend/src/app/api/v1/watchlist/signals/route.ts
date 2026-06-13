/**
 * GET /api/v1/watchlist/signals
 * Retorna itens da watchlist enriquecidos com preço atual, variação % e
 * sinal de mercado (market-state) do FastAPI.
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

function bHeaders(): Record<string, string> {
  return INTERNAL_TOKEN ? { "X-Internal-Token": INTERNAL_TOKEN } : {};
}

async function fetchAsset(ticker: string): Promise<{
  price: number | null;
  prev_close: number | null;
  change_pct: number | null;
  volume: number | null;
  name: string | null;
} | null> {
  if (!BACKEND_URL) return null;
  try {
    // Try /price first (fast), then /asset (richer but slower)
    const res = await fetch(
      `${BACKEND_URL}/api/v1/assets/${encodeURIComponent(ticker)}/price`,
      { headers: bHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const price =
      typeof d?.price === "number"
        ? d.price
        : typeof d?.current_price === "number"
          ? d.current_price
          : null;
    const prevClose =
      typeof d?.previous_close === "number" ? d.previous_close : null;
    const changePct =
      typeof d?.change_pct === "number"
        ? d.change_pct
        : price != null && prevClose != null && prevClose > 0
          ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
          : null;
    return {
      price,
      prev_close: prevClose,
      change_pct: changePct,
      volume: typeof d?.volume === "number" ? d.volume : null,
      name: typeof d?.name === "string" ? d.name : null,
    };
  } catch {
    return null;
  }
}

async function fetchMarketState(): Promise<{
  state: string;
  multiplier: number;
  color: string;
} | null> {
  if (!BACKEND_URL) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/assets/market-state`, {
      headers: bHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const watchlist = await prisma.watchlist.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });

  const items = watchlist?.items ?? [];

  if (!items.length) {
    return NextResponse.json(
      { signals: [], market_state: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Fetch market state + all asset prices in parallel
  const [marketState, ...assetResults] = await Promise.all([
    fetchMarketState(),
    ...items.map((item) => fetchAsset(item.ticker)),
  ]);

  const signals = items.map((item, i) => {
    const asset = assetResults[i];
    return {
      id: item.id,
      ticker: item.ticker,
      name: asset?.name ?? null,
      price: asset?.price ?? null,
      prev_close: asset?.prev_close ?? null,
      change_pct: asset?.change_pct ?? null,
      volume: asset?.volume ?? null,
      // signal: buy/sell/hold based on market multiplier + price movement
      signal: deriveSignal(asset?.change_pct ?? null, marketState?.multiplier ?? 1),
      market_color: marketState?.color ?? null,
      added_at: item.createdAt,
    };
  });

  return NextResponse.json(
    { signals, market_state: marketState },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function deriveSignal(
  changePct: number | null,
  multiplier: number
): "buy" | "sell" | "hold" | "unknown" {
  if (changePct === null) return "unknown";
  // Mercado favorável (multiplier alto) + ativo subindo → reforça compra
  if (multiplier >= 3 && changePct > 0.5) return "buy";
  if (multiplier >= 2 && changePct > 1.5) return "buy";
  // Mercado desfavorável + ativo caindo → sinal de cautela
  if (multiplier <= 1 && changePct < -1) return "sell";
  return "hold";
}
