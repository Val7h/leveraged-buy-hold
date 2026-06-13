// Solicitação LGPD art. 18 (acesso, portabilidade, exclusão).
// Stub — registra recebimento e instrui contato por email.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    ok: true,
    message: "Solicitação recebida. Responderemos em até 15 dias úteis conforme LGPD art. 18.",
    contact: "privacidade@lbhsystem.com",
  });
}
