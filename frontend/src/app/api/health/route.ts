import { NextResponse } from "next/server";

// Endpoint de health-check público (sem auth).
// Usado pelo workflow keep-alive.yml para prevenir cold start no Render Free Tier.
// Também útil para monitoramento externo (UptimeRobot, BetterStack, etc).

export const dynamic = "force-dynamic";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

export async function GET() {
  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
      },
      version: APP_VERSION,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
