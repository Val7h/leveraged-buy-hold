import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: 1,
    email: "demo@lbhsystem.com",
    full_name: "Demo User",
    risk_profile: "moderado",
  });
}
