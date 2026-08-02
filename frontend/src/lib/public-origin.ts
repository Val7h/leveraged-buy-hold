import { NextRequest } from "next/server";

// Atrás do proxy da Render, request.nextUrl.origin resolve pro bind INTERNO
// (0.0.0.0:10000) — vazava em redirects (ERR_ADDRESS_INVALID no navegador).
// O origin público vem dos headers x-forwarded-* que o proxy injeta.
export function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return `${proto}://${host}`;
}
