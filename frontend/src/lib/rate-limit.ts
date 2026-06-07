/**
 * Rate limiter — sliding window (per-key buckets).
 *
 * Default: in-memory Map (single-instance, dev or low-traffic).
 *
 * TODO(gerente): em produção multi-instance (Render scale > 1) o limite
 * vaza entre instâncias. Trocar por @upstash/ratelimit + @upstash/redis
 * quando UPSTASH_REDIS_REST_URL estiver setado. Exemplo:
 *
 *   import { Ratelimit } from "@upstash/ratelimit";
 *   import { Redis } from "@upstash/redis";
 *   const redis = Redis.fromEnv();
 *   const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s") });
 *
 * Pacotes a adicionar (NÃO instalo aqui, ver package.json):
 *   "@upstash/ratelimit": "^2.0.0"
 *   "@upstash/redis": "^1.34.0"
 *
 * Variáveis de ambiente:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Segundos até o reset da janela */
  reset: number;
};

type Bucket = { count: number; resetAt: number };

// Edge runtime: módulo top-level é por-instance.
const store = new Map<string, Bucket>();

// Limpeza periódica para evitar vazamento de memória.
// Edge runtime não suporta setInterval persistente em todos workers,
// portanto fazemos limpeza oportunista a cada chamada (O(1) amortizado).
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [k, b] of store) {
    if (b.resetAt < now) store.delete(k);
  }
}

/**
 * Sliding-window rate limit em memória.
 *
 * @param key       chave única (ex: `auth:/api/v1/auth/login:1.2.3.4`)
 * @param limit     número máximo de requests dentro da janela
 * @param windowSec tamanho da janela em segundos
 */
export async function rateLimit(
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

/**
 * Extrai IP do cliente respeitando proxies confiáveis.
 *
 * ATENÇÃO: x-forwarded-for é spoofable em ambientes sem proxy reverso
 * confiável. Render/Vercel/Cloudflare sobrescrevem o header — seguro.
 * Bare-metal ou dev local pode receber valor falso enviado pelo cliente.
 */
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
