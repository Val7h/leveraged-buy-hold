// Push subscribe/unsubscribe stubs — VAPID não configurado ainda.
// POST → subscribe, DELETE → unsubscribe. Ambos retornam 200 silenciosamente.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ ok: true, note: "push_not_configured" });
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
