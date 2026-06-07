import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Demo mode: accept any credentials and return a valid token
  const demo_token = "demo_" + Date.now();

  return NextResponse.json({
    access_token: demo_token,
    token_type: "bearer",
  });
}
