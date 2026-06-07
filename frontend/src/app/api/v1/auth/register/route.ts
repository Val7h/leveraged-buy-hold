import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    id: 1,
    email: body.email || "user@lbh.local",
    full_name: body.full_name || "Demo User",
    access_token: "demo_" + Date.now(),
    token_type: "bearer",
  });
}
