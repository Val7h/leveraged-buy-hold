import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Prisma → Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Resposta varia por cookie (lbh_session) e NUNCA pode ser cacheada por
// CDN/edge — senao um intermediario pode entregar 401 antigo a usuario
// recem-logado, travando o fluxo de boot da landing.
const NO_CACHE: Record<string, string> = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_CACHE }
    );
  }
  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      riskProfile: user.riskProfile,
      createdAt: user.createdAt,
      full_name: user.fullName,
      risk_profile: user.riskProfile,
    },
    { headers: NO_CACHE }
  );
}
