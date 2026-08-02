import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { publicOrigin } from "@/lib/public-origin";

// Login com Google (padrão Wealth Lab, decisão Valth): OAuth code flow.
// GET /api/v1/auth/google → redireciona pro consentimento do Google.
// O callback (/api/v1/auth/google/callback) troca o code, acha-ou-cria o usuário
// e seta o MESMO cookie lbh_session do login por senha — o resto do app não muda.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Sem credencial configurada: volta pro login com aviso (não expõe stack).
    return NextResponse.redirect(`${origin}/login?error=google_nao_configurado`);
  }

  const redirectUri = `${origin}/api/v1/auth/google/callback`;

  // state anti-CSRF: cookie httpOnly de 5min conferido no callback.
  const state = crypto.randomBytes(16).toString("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("lbh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return res;
}
