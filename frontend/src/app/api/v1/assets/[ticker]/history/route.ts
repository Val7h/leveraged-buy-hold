import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  return proxyToBackend(
    req,
    `/api/v1/assets/${params.ticker.toUpperCase()}/history`
  );
}
