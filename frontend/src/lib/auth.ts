// Centralized auth helpers: JWT (jose, HS256), httpOnly cookie, current user, in-memory rate limit.
// Routes that use bcrypt/Prisma MUST opt into Node runtime — Edge runtime cannot run them.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const COOKIE_NAME = "lbh_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    // Fail loud — we'd rather crash than sign with a predictable secret.
    throw new Error(
      "AUTH_SECRET missing or too short (need >=32 chars). Generate with: openssl rand -base64 32"
    );
  }
  return new TextEncoder().encode(raw);
}

export async function signSession(userId: string): Promise<string> {
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// Next 14 -> cookies() is sync. On Next 15 this becomes async; flip to `await cookies()`.
export function setSessionCookie(token: string): void {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const userSelect = {
    id: true,
    email: true,
    fullName: true,
    riskProfile: true,
    createdAt: true,
  } as const;

  // SOLO-MODE: cookie lbh_solo no navegador do dono bate com LBH_SOLO_SECRET ->
  // devolve o user de LBH_SOLO_EMAIL direto. Amigos sem cookie caem no fluxo normal.
  const soloSecret = process.env.LBH_SOLO_SECRET;
  const soloEmail = process.env.LBH_SOLO_EMAIL;
  const soloCookie = cookies().get("lbh_solo")?.value;
  if (
    soloSecret &&
    soloSecret.length >= 16 &&
    soloEmail &&
    soloCookie === soloSecret
  ) {
    return prisma.user.findUnique({
      where: { email: soloEmail.toLowerCase() },
      select: userSelect,
    });
  }

  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = await verifySession(token);
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });
}

// ───────────────────────── Rate limit (in-memory, MVP) ─────────────────────────
// TODO(gerente): migrar para Upstash Redis assim que houver multi-instância no Render.
// Map em memória só funciona em single-instance.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  ip: string,
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSeconds: number } {
  const composite = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(composite);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(composite, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Dummy bcrypt-shaped hash used to keep timing roughly constant when the user
// does not exist. (Real cost-12 hash of an arbitrary value.)
export const DUMMY_BCRYPT_HASH =
  "$2a$12$CwTycUXWue0Thq9StjUM0uJ8e3W6t1OQyZ4QHbN3qFqU4iWQOg7qS";
