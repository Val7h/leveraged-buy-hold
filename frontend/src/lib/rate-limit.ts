/**
 * Rate limiter — sliding window (per-key buckets).
 *
 * Usa Upstash Redis se UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * estiverem setados (multi-instance, produção).
 * Caso contrário usa Map em memória (single-instance / dev).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Segundos até o reset da janela */
  reset: number;
};

// ─── Upstash (multi-instance) ────────────────────────────────────────────────

const _rlCache = new Map<string, Ratelimit>();

function getUpstashRl(limit: number, windowSec: number): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const cacheKey = `${limit}:${windowSec}`;
  if (!_rlCache.has(cacheKey)) {
    _rlCache.set(
      cacheKey,
      new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
        prefix: "lbh:rl",
      })
    );
  }
  return _rlCache.get(cacheKey)!;
}

async function rateLimitUpstash(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const rl = getUpstashRl(limit, windowSec)!;
  const result = await rl.limit(key);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}

// ─── In-memory fallback (single-instance) ────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [k, b] of store) {
    if (b.resetAt < now) store.delete(k);
  }
}

async function rateLimitInMemory(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const now = Date.now();
  sweep(now);
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { success: true, limit, remaining: limit - 1, reset: windowSec };
  }
  if (bucket.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    reset: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  if (getUpstashRl(limit, windowSec)) {
    try {
      return await rateLimitUpstash(key, limit, windowSec);
    } catch {
      // Upstash falhou — cai no in-memory como fallback
    }
  }
  return rateLimitInMemory(key, limit, windowSec);
}

export function getClientIp(req: { headers: Headers }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
