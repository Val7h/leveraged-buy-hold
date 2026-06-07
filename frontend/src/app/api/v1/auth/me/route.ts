import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Prisma → Node runtime.
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // passwordHash is already omitted by getCurrentUser's `select`.
  // Mantemos camelCase + snake_case por compat com componentes/hook legados.
  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    riskProfile: user.riskProfile,
    createdAt: user.createdAt,
    // legado:
    full_name: user.fullName,
    risk_profile: user.riskProfile,
  });
}
