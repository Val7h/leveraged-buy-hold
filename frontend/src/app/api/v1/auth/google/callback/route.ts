import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { signSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { publicOrigin } from "@/lib/public-origin";

// Callback do login com Google: valida state, troca code→token, busca o perfil,
// acha-ou-cria o usuário pelo E-MAIL e seta o cookie lbh_session (mesmo formato
// do login por senha). Conta Google e conta por senha com o mesmo e-mail são a
// MESMA conta (login unificado por e-mail).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "lbh_session";
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // espelha setSessionCookie (7d, igual ao JWT)

function fail(request: NextRequest, code: string) {
  return NextResponse.redirect(`${publicOrigin(request)}/login?error=${code}`);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(request, "google_nao_configurado");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("lbh_oauth_state")?.value;
  if (!code) return fail(request, "google_sem_codigo");
  if (!state || !cookieState || state !== cookieState) return fail(request, "google_state_invalido");

  try {
    // ── code → access_token ──────────────────────────────────────────────────
    const redirectUri = `${publicOrigin(request)}/api/v1/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      logger.error("/auth/google/callback token exchange failed", { status: tokenRes.status });
      return fail(request, "google_token");
    }
    const accessToken = (await tokenRes.json())?.access_token;
    if (!accessToken) return fail(request, "google_token");

    // ── perfil (e-mail verificado) ───────────────────────────────────────────
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) return fail(request, "google_perfil");
    const profile = await profileRes.json();
    const email = (profile?.email ?? "").toLowerCase().trim();
    if (!email || profile?.verified_email === false) return fail(request, "google_email_nao_verificado");

    // ── acha-ou-cria pelo e-mail ─────────────────────────────────────────────
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      // Conta nova via Google: senha local aleatória (nunca usada — o schema exige
      // passwordHash; quem entrar por senha depois usa o "esqueci minha senha").
      const randomPassword = crypto.randomBytes(32).toString("base64url");
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: typeof profile?.name === "string" ? profile.name.slice(0, 120) : null,
          riskProfile: "moderado",
        },
        select: { id: true },
      });
      logger.info("/auth/google/callback user created via Google");
    }

    // ── sessão idêntica ao login por senha ───────────────────────────────────
    const token = await signSession(user.id);
    const res = NextResponse.redirect(`${publicOrigin(request)}/dashboard`);
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    res.cookies.delete("lbh_oauth_state");
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    logger.error("/auth/google/callback error", { msg });
    // Banco fora (ex.: Supabase pausado) cai aqui — mensagem honesta no login.
    return fail(request, "servico_indisponivel");
  }
}
