// Registro de consentimento do usuário (LGPD art. 7-I).
// Stub — persiste consentimento em cookie de sessão por ora.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Futuro: salvar em tabela UserConsent com version + ip + timestamp
  return NextResponse.json({ ok: true, userId: user.id });
}
