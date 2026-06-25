/**
 * GET /api/v1/watchlist/signals
 *
 * As "Oportunidades de Entrada" do Dashboard agora usam o MOTOR REAL de 3 camadas
 * (ranking_service: Qualidade/Momento/Aptidão), NÃO mais a heurística por-ticker antiga
 * (/assets/{ticker}/price + /assets/market-state → entry_leverage sempre null, sinal cinza).
 *
 * Fluxo: lê os tickers da watchlist (Prisma) e faz UM POST p/ o backend interno
 * POST /api/ranking/screen (corpo {tickers:[...]}, mesmo contrato/segredo X-Internal-Token
 * do proxyToBackend e do /api/v1/assets/screen). O backend reaproveita o cache do Ranking
 * (rápido p/ universo) e devolve os assets do motor real (verdict, leverage, quality, momentum,
 * rank, entry_signal_color/leverage/rationale) + market_state real. Mapeamos pro shape de
 * sinais que o Dashboard espera — MESMOS números do Screening/Watchlist/Ranking.
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

// Veredito do motor → label descritivo da UI (CVM 04/2023), cor e bucket de sinal.
//   COMPRAR FORTE / COMPRAR → oportunidade (buy)
//   JUSTO / ESTICADO        → aguardando   (hold)
//   ESPECULATIVO            → desfavorável (sell)
//   RESERVA / sem veredito  → neutro       (unknown)
const VERDICT_MAP: Record<
  string,
  { label: string; color: string; signal: "buy" | "sell" | "hold" | "unknown" }
> = {
  "COMPRAR FORTE": { label: "OPORTUNIDADE FORTE", color: "green", signal: "buy" },
  COMPRAR:         { label: "OPORTUNIDADE",       color: "green", signal: "buy" },
  JUSTO:           { label: "NEUTRO",             color: "yellow", signal: "hold" },
  ESTICADO:        { label: "NEUTRO",             color: "yellow", signal: "hold" },
  ESPECULATIVO:    { label: "DESFAVORÁVEL",       color: "red", signal: "sell" },
  RESERVA:         { label: "RESERVA",            color: "gray", signal: "unknown" },
};

// Mapeia 1 ativo do motor real (dict do ranking_service) → sinal que o Dashboard consome.
function mapAsset(a: any, id?: string) {
  const verdict: string = a.verdict || "";
  const vm =
    VERDICT_MAP[verdict] ?? { label: "SEM DADOS", color: "gray", signal: "unknown" as const };
  const leverage: number = typeof a.leverage === "number" ? a.leverage : 1;
  const quality = a.quality ?? 0;
  const momentum = a.momentum ?? 0;
  const composite = a.rank ?? Math.round(quality * 0.45 + momentum * 0.55);

  const binding = a.leverage_teto_binding ? ` · trava: ${a.leverage_teto_binding}` : "";
  const rationale = verdict ? `${verdict}${binding}` : "";

  const isTokenized = String(a.ticker).includes("ONUSDT");

  return {
    id: id ?? String(a.ticker),
    ticker: a.ticker,
    name: a.name ?? null,
    company_name: a.name ?? null,
    sector: a.is_crypto ? "Cripto" : a.is_tatico ? "Tático/Cíclico" : undefined,
    current_price: a.current_price ?? null,
    change_pct: a.change_pct ?? null,

    quality_score: quality,
    momentum_score: momentum,
    composite_score: composite,

    // Bucket de sinal derivado do VEREDITO real (não mais da variação de preço).
    signal: vm.signal,
    // Campos que a UI lê e que ANTES nunca eram gerados (sinal cinza / leverage vazia):
    entry_signal: vm.label,
    entry_signal_color: vm.color,
    entry_leverage: leverage,
    entry_rationale: rationale,

    rsi_weekly: a.rsi ?? null,
    rsi: a.rsi ?? null,

    is_tokenized: isTokenized,
    underlying_ticker: isTokenized ? String(a.ticker).replace("ONUSDT", "") : null,
  };
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

  if (!BACKEND_URL || !INTERNAL_TOKEN) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  // Mapa ticker → id do item da watchlist (preserva o id estável nos sinais).
  const tickers = items.map((i) => i.ticker.trim().toUpperCase()).filter(Boolean);
  const idByTicker = new Map<string, string>();
  for (const item of items) idByTicker.set(item.ticker.trim().toUpperCase(), item.id);

  // UM POST p/ o MOTOR REAL — reaproveita cache do Ranking (rápido p/ universo grande).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/ranking/screen`, {
      method: "POST",
      headers: {
        "X-Internal-Token": INTERNAL_TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tickers }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timeout);
    const err = e as Error & { name?: string };
    const status = err.name === "AbortError" ? 504 : 502;
    return NextResponse.json(
      { error: status === 504 ? "backend_timeout" : "backend_unreachable" },
      { status }
    );
  }
  clearTimeout(timeout);

  let payload: any;
  try {
    payload = await upstream.json();
  } catch {
    payload = {};
  }
  if (!upstream.ok) {
    return NextResponse.json(payload || { error: "backend_error" }, { status: upstream.status });
  }

  const rawAssets: any[] = Array.isArray(payload.assets) ? payload.assets : [];
  const signals = rawAssets.map((a) =>
    mapAsset(a, idByTicker.get(String(a.ticker).trim().toUpperCase()))
  );

  // market_state REAL vindo do backend (regime do S&P).
  const ms = payload.market_state || null;
  const market_state = ms
    ? {
        state: ms.state ?? "NEUTRO",
        multiplier: ms.multiplier ?? 3,
        color: ms.color ?? null,
      }
    : null;

  return NextResponse.json(
    { signals, market_state },
    { headers: { "Cache-Control": "no-store" } }
  );
}
