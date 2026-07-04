/**
 * GET /api/v1/alerts/check
 * Retorna todos os alertas do usuário enriquecidos com preço atual e status triggered.
 * Também retorna survival_status: resumo em tempo real das sentinelas de sobrevivência
 * (stop_pm e liq_near) por posição, para a UI exibir contexto sem precisar do sweep.
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

// Constantes de sobrevivência (espelham o sweep para derivar o status atual em tempo real)
const STOP_STEPS = [10, 20, 30] as const;
const LIQ_EQUITY_PCT = 97.0;
const LIQ_BANDS = [25, 15, 8] as const;

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Alertas de PREÇO do usuário (criados manualmente).
  const alerts = await prisma.alert.findMany({
    where: { userId: user.id, kind: "price" },
    orderBy: { createdAt: "desc" },
  });

  // Posições do usuário para derivar o status das sentinelas de sobrevivência em tempo real.
  const positions = await prisma.position.findMany({
    where: { portfolio: { userId: user.id } },
    select: {
      ticker: true,
      avgPrice: true,
      leverage: true,
      isSeed: true,
    },
  });

  // Deduplica tickers de ambas as fontes para um único lote de preços.
  const priceTickers = [...new Set([
    ...alerts.map((a) => a.ticker),
    ...positions.map((p) => p.ticker),
  ])];
  const priceResults = await Promise.all(priceTickers.map(fetchPrice));
  const priceMap = Object.fromEntries(
    priceTickers.map((t, i) => [t, priceResults[i]])
  );

  // ─── Alertas de preço enriquecidos ───────────────────────────────────────────
  const enriched = alerts.map((alert) => {
    const currentPrice = priceMap[alert.ticker] ?? null;
    const threshold = Number(alert.threshold);
    const triggered =
      alert.active && currentPrice != null
        ? evalCondition(alert.condition, currentPrice, threshold)
        : false;

    // Distância: positivo = preço acima do threshold, negativo = abaixo.
    const distancePct =
      currentPrice != null && threshold > 0
        ? Math.round(((currentPrice - threshold) / threshold) * 10000) / 100
        : null;

    // Contexto legível de "por que está (ou vai) disparar"
    let context: string | null = null;
    if (currentPrice != null && distancePct != null) {
      const abs = Math.abs(distancePct).toFixed(1);
      if (triggered) {
        context =
          alert.condition === "above" || alert.condition === "price_above" || alert.condition === "gte"
            ? `Preço ${abs}% acima do alvo — condição atingida`
            : `Preço ${abs}% abaixo do alvo — condição atingida`;
      } else {
        context =
          alert.condition === "above" || alert.condition === "price_above" || alert.condition === "gte"
            ? `Falta ${abs}% subir para atingir o alvo`
            : `Falta ${abs}% cair para atingir o alvo`;
      }
    }

    return {
      id: alert.id,
      ticker: alert.ticker,
      condition: alert.condition,
      threshold,
      message: alert.message,
      active: alert.active,
      current_price: currentPrice,
      triggered,
      distance_pct: distancePct,
      context,
      created_at: alert.createdAt,
    };
  });

  const triggeredCount = enriched.filter((a) => a.triggered).length;

  // ─── Status das sentinelas de sobrevivência (tempo real, sem depender do sweep) ──
  // Cada posição gera um resumo: qual nível de stop está mais próximo, qual a folga até liq.
  const survivalStatus = positions.map((pos) => {
    const price = priceMap[pos.ticker] ?? null;
    const pm = Number(pos.avgPrice);
    const lev = Math.max(1, Number(pos.leverage));

    if (price == null || !(pm > 0)) {
      return { ticker: pos.ticker, price: null, pm, isSeed: pos.isSeed, stopStatus: null, liqStatus: null };
    }

    const dropPct = ((pm - price) / pm) * 100; // positivo = abaixo do PM

    // Stop ancorado: qual é o próximo nível a cruzar (ou qual já cruzou)?
    let stopStatus: { level: number; hit: boolean; dropPct: number; nextLevel: number | null } | null = null;
    {
      const hitLevels = STOP_STEPS.filter((s) => dropPct >= s);
      const nextLevel = STOP_STEPS.find((s) => dropPct < s) ?? null;
      const currentLevel = hitLevels.length > 0 ? hitLevels[hitLevels.length - 1] : 0;
      stopStatus = { level: currentLevel, hit: hitLevels.length > 0, dropPct: Math.round(dropPct * 10) / 10, nextLevel };
    }

    // Folga até liquidação (só p/ alavancados).
    let liqStatus: { slackPct: number; nearestBand: number | null; critical: boolean } | null = null;
    if (lev > 1) {
      const distToLiqPct = LIQ_EQUITY_PCT / lev;
      const slackPct = Math.max(0, Math.round((distToLiqPct - dropPct) * 10) / 10);
      const nearestBand = [...LIQ_BANDS].reverse().find((b) => slackPct <= b) ?? null;
      liqStatus = { slackPct, nearestBand, critical: slackPct <= 15 };
    }

    return { ticker: pos.ticker, price, pm, leverage: lev, isSeed: pos.isSeed, stopStatus, liqStatus };
  });

  return NextResponse.json(
    {
      alerts: enriched,
      triggered_count: triggeredCount,
      survival_status: survivalStatus,
      checked_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
