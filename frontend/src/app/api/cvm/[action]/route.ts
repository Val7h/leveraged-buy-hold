import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnóstico do ETL da CVM (status/probe/refresh/refresh-status) — proxia pro FastAPI.
// Autenticado (dono logado). Probe/refresh podem demorar (download de ZIP).
async function handle(req: NextRequest, action: string) {
  const user = await getCurrentUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  // probe baixa 1 ZIP (~40MB) → timeout maior
  return proxyToBackend(req, `/api/cvm/${action}`, { timeoutMs: 110_000, forwardSearch: true });
}

export async function GET(req: NextRequest, { params }: { params: { action: string } }) {
  return handle(req, params.action);
}

export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
  return handle(req, params.action);
}
