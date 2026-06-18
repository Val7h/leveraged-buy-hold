import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/ranking/universe");
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/ranking/universe");
}

export async function DELETE(req: NextRequest) {
  // category e ticker vão como query (?category=&ticker=) — forwardSearch repassa.
  return proxyToBackend(req, "/api/ranking/universe");
}
