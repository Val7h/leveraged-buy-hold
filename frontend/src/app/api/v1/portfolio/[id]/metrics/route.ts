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

  // ── Modelo Quantfury (doutrina de FLUXOS): a alavancagem é MEDIDA pela carteira, NÃO um
  // multiplicador por posição. notional = shares × preço (já reflete o que você segura, com o
  // emprestado dentro) → NÃO multiplicar por leverage (isso DOBRAVA o P&L exibido). SOMENTE SHY
  // fica fora da alavancagem (reserva). "Patrimônio (Equity)" = equity REAL (currentEquity da
  // Quantfury = ativos − dívida), NÃO o notional bruto (senão subestima o risco).
  let totalNotional = 0;   // Σ shares×preço (TUDO) = exposição BRUTA
  let riskNotional = 0;    // exposição de RISCO (exclui SÓ o SHY) = numerador da alavancagem medida
  let totalCost = 0;       // Σ preço_médio×shares = base de custo (denominador do P&L%)
  let totalPnl = 0;        // P&L real em $ (SEM ×leverage)

  const enriched = positions.map((p, i) => {
    const shares = Number(p.quantity);
    const avgPrice = Number(p.avgPrice);
    const currentPrice = prices[i];
    const value = currentPrice != null ? shares * currentPrice : shares * avgPrice; // notional da posição
    const pnl = currentPrice != null ? (currentPrice - avgPrice) * shares : 0;        // SEM ×leverage
    const isShy = p.ticker.toUpperCase() === "SHY";

    totalNotional += value;
    if (!isShy) riskNotional += value;     // SOMENTE SHY fora da alavancagem (regra firme do usuário)
    totalCost += shares * avgPrice;
    totalPnl += pnl;

    return { ticker: p.ticker, shares, avgPrice, currentPrice, value, pnl, is_shy: isShy };
  });

  // Equity REAL = denominador da alavancagem (currentEquity Quantfury). Sem ele declarado, cai
  // no notional (assume não-alavancado = você possui tudo) e marcamos equity_is_declared=false.
  const equityDeclared = portfolio.currentEquity != null;
  const equityReal = equityDeclared ? Number(portfolio.currentEquity) : totalNotional;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;       // retorno sobre base de CUSTO
  const effectiveLeverage = equityReal > 0 ? riskNotional / equityReal : null;   // alavancagem MEDIDA (SHY fora)

  // Allocation breakdown
  const allocation = enriched.map((e) => ({
    ticker: e.ticker,
    value: Math.round(e.value * 100) / 100,
    weight_pct: totalNotional > 0 ? Math.round((e.value / totalNotional) * 10000) / 100 : 0,
    pnl: Math.round(e.pnl * 100) / 100,
    is_shy: e.is_shy,
  }));

  return NextResponse.json(
    {
      portfolio_id: id,
      position_count: positions.length,
      total_equity: Math.round(equityReal * 100) / 100,          // EQUITY REAL (ativos−dívida), NÃO notional
      total_notional: Math.round(totalNotional * 100) / 100,     // exposição BRUTA (com emprestado dentro)
      risk_notional: Math.round(riskNotional * 100) / 100,       // exposição de risco (SHY fora)
      equity_is_declared: equityDeclared,                        // false → total_equity é estimativa (=notional)
      total_pnl: Math.round(totalPnl * 100) / 100,               // P&L real em $ (sem ×leverage)
      total_pnl_pct: totalPnlPct != null ? Math.round(totalPnlPct * 100) / 100 : null,  // sobre base de custo
      weighted_avg_leverage: effectiveLeverage != null ? Math.round(effectiveLeverage * 100) / 100 : 1,  // MEDIDA (SHY fora)
      effective_leverage: effectiveLeverage != null ? Math.round(effectiveLeverage * 100) / 100 : null,
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
