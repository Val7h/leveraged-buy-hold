import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ~116 tickers a frio é pesado; o FastAPI cacheia ~20min, então fica rápido depois.
  return proxyToBackend(req, "/api/ranking", { timeoutMs: 120_000 });
}
