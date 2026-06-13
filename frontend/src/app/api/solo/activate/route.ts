import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SOLO-MODE: visite /api/solo/activate?key=<LBH_SOLO_SECRET> uma vez no navegador
// do dono -> seta cookie httpOnly de 1 ano -> middleware + getCurrentUser passam
// direto sem login. Amigos sem o cookie veem o fluxo normal.
export async function GET(req: NextRequest) {
  const secret = process.env.LBH_SOLO_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { error: "solo_mode_disabled" },
      { status: 404 }
    );
  }

  const key = req.nextUrl.searchParams.get("key");
  if (key !== secret) {
    return NextResponse.json({ error: "invalid_key" }, { status: 401 });
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set("lbh_solo", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
