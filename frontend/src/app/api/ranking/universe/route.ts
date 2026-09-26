import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// MUTAÇÃO DO UNIVERSO = SÓ ADMIN (achado crítico da auditoria 24/09: qualquer
// cliente logado podia adicionar/remover ativo do ranking de TODOS os usuários,
// e cada mutação força recálculo completo no servidor de 1 worker — vetor de
// abuso e de derrubada). Admin = e-mails em ADMIN_EMAILS (vírgula-separado) no
// env do Render. Sem a env setada, NINGUÉM muta (fail-closed).
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, status: 401, error: "unauthorized" };
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = (user.email ?? "").toLowerCase();
  if (!admins.includes(email)) return { ok: false as const, status: 403, error: "forbidden" };
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/ranking/universe");
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  return proxyToBackend(req, "/api/ranking/universe");
}

export async function DELETE(req: NextRequest) {
  // category e ticker vão como query (?category=&ticker=) — forwardSearch repassa.
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  return proxyToBackend(req, "/api/ranking/universe");
}
