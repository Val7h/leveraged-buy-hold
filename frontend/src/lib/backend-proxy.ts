/**
 * backend-proxy.ts — Helper para proxy de rotas Next.js (BFF) para o FastAPI interno.
 *
 * Padrão de uso em route handlers:
 *
 *   import { NextRequest } from "next/server";
 *   import { proxyToBackend } from "@/lib/backend-proxy";
 *
 *   export async function GET(req: NextRequest, { params }: { params: { ticker: string } }) {
 *     return proxyToBackend(req, `/api/v1/assets/${params.ticker}/price`);
 *   }
 *
 * Responsabilidades:
 *   - Garante auth (cookie httpOnly lbh_session) antes de tocar no backend.
 *   - Injeta X-Internal-Token (segredo compartilhado Next ↔ FastAPI) — NUNCA exposto ao client.
 *   - Propaga/gera X-Request-Id para tracing distribuído.
 *   - Timeout via AbortController; mapeia erros de rede/timeout para 502/504.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

type ProxyOptions = {
  method?: string;
  requireAuth?: boolean;
  timeoutMs?: number;
  forwardSearch?: boolean;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

export async function proxyToBackend(
  req: NextRequest,
  backendPath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const {
    method: methodOverride,
    requireAuth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    forwardSearch = true,
  } = options;

  const method = (methodOverride ?? req.method ?? "GET").toUpperCase();
  const requestId = req.headers.get("x-request-id") ?? randomUUID();

  // 1) Auth
  if (requireAuth) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers: { "X-Request-Id": requestId } }
      );
    }
  }

  // 2) Config do backend
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:8001" : "");
  const internalToken = process.env.BACKEND_INTERNAL_TOKEN;

  if (!backendUrl) {
    logger.error("backend_proxy: BACKEND_INTERNAL_URL não configurado", {
      requestId,
      backendPath,
    });
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503, headers: { "X-Request-Id": requestId } }
    );
  }
  if (!internalToken) {
    logger.error("backend_proxy: BACKEND_INTERNAL_TOKEN ausente", {
      requestId,
      backendPath,
    });
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503, headers: { "X-Request-Id": requestId } }
    );
  }

  // 3) URL final
  const search = forwardSearch ? req.nextUrl.search : "";
  const url = `${backendUrl}${backendPath}${search}`;

  // 4) Headers
  const headers: Record<string, string> = {
    "X-Internal-Token": internalToken,
    "X-Request-Id": requestId,
    Accept: "application/json",
  };

  // 5) Body
  let body: string | undefined;
  if (METHODS_WITH_BODY.has(method)) {
    try {
      // Lê como texto pra repassar bytes-exatos (preserva floats etc).
      body = await req.text();
    } catch (err) {
      logger.warn("backend_proxy: falha lendo body do request", {
        requestId,
        backendPath,
        err: (err as Error).message,
      });
      body = undefined;
    }
    if (body && body.length > 0) {
      headers["Content-Type"] = "application/json";
    }
  }

  // 6) Fetch com timeout
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timeoutHandle);
    const e = err as Error & { name?: string };
    if (e.name === "AbortError") {
      logger.error("backend_proxy: timeout", {
        requestId,
        backendPath,
        timeoutMs,
      });
      return NextResponse.json(
        { error: "backend_timeout" },
        { status: 504, headers: { "X-Request-Id": requestId } }
      );
    }
    logger.error("backend_proxy: backend inalcançável", {
      requestId,
      backendPath,
      err: e.message,
    });
    return NextResponse.json(
      { error: "backend_unreachable", detail: e.message },
      { status: 502, headers: { "X-Request-Id": requestId } }
    );
  }
  clearTimeout(timeoutHandle);

  // 7) Repassa resposta — propaga Content-Type e X-Request-Id, NUNCA o token.
  const respHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) respHeaders.set("Content-Type", contentType);
  respHeaders.set(
    "X-Request-Id",
    upstream.headers.get("x-request-id") ?? requestId
  );

  const respBody = await upstream.arrayBuffer();
  return new NextResponse(respBody, {
    status: upstream.status,
    headers: respHeaders,
  });
}
