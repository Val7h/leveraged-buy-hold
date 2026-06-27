import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 100s: folga máxima sob o teto ~100s do Cloudflare p/ o cold start do Render free.
  // O lever principal contra timeout é o DEFAULT de poucos tickers no frontend (4); presets
  // grandes avisam. Com o cache Upstash ligado, cai pra poucos segundos.
  return proxyToBackend(req, "/api/v1/backtest/sharpe-compare", { timeoutMs: 100_000 });
}
