import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 90s: 20 ativos no yfinance a frio passam de 45s. 90s fica sob o limite ~100s
  // do Cloudflare. Com o cache Upstash ligado, cai pra poucos segundos.
  return proxyToBackend(req, "/api/v1/backtest/sharpe-compare", { timeoutMs: 90_000 });
}
