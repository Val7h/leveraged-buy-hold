import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// ─── Session check (auth real, httpOnly cookie + JWT HS256) ───
// IMPORTANTE: rodar em Edge runtime, NÃO importar Prisma aqui.
// Só validação de assinatura do JWT. Ownership checks acontecem nos Route Handlers.
const SESSION_COOKIE = "lbh_session";

const PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/portfolio",
  "/watchlist",
  "/alerts",
  "/simulator",
  "/backtest",
];

const PROTECTED_API_PREFIXES = [
  "/api/v1/portfolio",
  "/api/v1/watchlist",
  "/api/v1/alerts",
];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

/**
 * Edge middleware:
 *  - Rate limit em /api/v1/auth/login e /api/v1/auth/register (5/min/IP)
 *  - CSP per-request com nonce (strict-dynamic)
 *  - Headers de segurança (HSTS, Permissions-Policy, COOP, etc)
 *
 * TODO(gerente): após 1 semana com CSP em Report-Only sem violations,
 * flipar header de "Content-Security-Policy-Report-Only" para
 * "Content-Security-Policy". Hoje deixamos em enforcement direto
 * porque o app é greenfield e Tailwind compila tudo build-time — se
 * houver regressão visual, reverter para Report-Only.
 */

const AUTH_RATE_LIMITED_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
];

function isAuthRateLimited(pathname: string): boolean {
  return AUTH_RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p));
}

function generateNonce(): string {
  // Edge runtime: Web Crypto API (crypto.getRandomValues).
  // NÃO use require('crypto') — não existe em Edge.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64 sem padding adicional necessário para CSP
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa existe em Edge runtime
  return btoa(bin);
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' faz browsers modernos ignorarem whitelists de host
    // quando há nonce válido. 'unsafe-inline' fica como fallback para browsers
    // antigos (eles ignoram quando há nonce); navegadores que entendem nonce
    // ignoram unsafe-inline. https: permite Stripe/Google libs carregadas via nonce.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    // Tailwind compila tudo build-time. Se aparecer "Refused to apply inline style"
    // em algum componente Radix, adicionar 'unsafe-hashes' + hash específico.
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // Backend FastAPI + Yahoo Finance
    "connect-src 'self' https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://lbh-system.onrender.com https://*.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  // --- 1) Rate limit nos endpoints de auth ---
  if (isAuthRateLimited(req.nextUrl.pathname)) {
    const ip = getClientIp(req);
    const key = `auth:${req.nextUrl.pathname}:${ip}`;
    const result = await rateLimit(key, 5, 60);

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message:
            "Muitas tentativas de autenticação. Tente novamente em alguns instantes.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(result.reset),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      );
    }
  }

  // --- 1.5) Auth check para rotas protegidas (Edge: só verifica assinatura) ---
  const pathname = req.nextUrl.pathname;
  if (isProtectedPage(pathname) || isProtectedApi(pathname)) {
    const ok = await hasValidSession(req);
    if (!ok) {
      if (isProtectedApi(pathname)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // --- 2) CSP nonce + headers de segurança ---
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Propaga nonce para Server Components via header de request.
  // layout.tsx lê via headers().get('x-nonce').
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({
    request: { headers: reqHeaders },
  });

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=(self)",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "interest-cohort=()",
      "browsing-topics=()",
    ].join(", ")
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  // NOTA: COEP require-corp quebra imagens cross-origin (Yahoo). Não setamos.
  // TODO(gerente): habilitar COEP `credentialless` após CDN próprio.
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return res;
}

/**
 * Matcher:
 *  - exclui assets estáticos (_next/static, _next/image, favicon, imagens)
 *  - exclui prefetches do App Router (não precisam de nonce novo)
 *  - INCLUI /api/* — necessário para o rate limit dos endpoints de auth
 */
export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
