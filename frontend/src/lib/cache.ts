/**
 * Cache abstraction with fallback.
 *
 * Strategy:
 *  - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, use Upstash (HTTP-based,
 *    safe for Edge Runtime and serverless cold-starts).
 *  - Otherwise fall back to an in-memory Map<> store (dev / single-instance demo mode).
 *
 * Why HTTP Redis (Upstash) instead of ioredis/node-redis (TCP):
 *  - Works in Edge Runtime (no TCP sockets allowed)
 *  - Works on Render free tier without outbound TCP woes
 *  - Multi-instance safe (Render scales horizontally)
 *
 * Pegadinha: @upstash/redis already JSON-serializes/deserializes. Do NOT JSON.stringify twice.
 */

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

// ────────────────────────────────────────────────────────────────────────────────
// Upstash Redis (HTTP)
// ────────────────────────────────────────────────────────────────────────────────
class UpstashStore implements CacheStore {
  // Lazy-loaded so the import does not crash dev installs without the dep yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clientPromise: Promise<any> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async client(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        // Dynamic import keeps the dep optional at build-time.
        const mod = await import("@upstash/redis");
        // Redis.fromEnv() reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
        return mod.Redis.fromEnv();
      })();
    }
    return this.clientPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const r = await this.client();
      const v = await r.get(key);
      // Upstash already deserializes JSON. If null/undefined, treat as miss.
      return (v ?? null) as T | null;
    } catch (err) {
      console.warn("[cache] Upstash GET failed:", err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const r = await this.client();
      await r.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.warn("[cache] Upstash SET failed:", err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const r = await this.client();
      await r.del(key);
    } catch (err) {
      console.warn("[cache] Upstash DEL failed:", err);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// In-memory fallback
// ────────────────────────────────────────────────────────────────────────────────
interface MemoryEntry {
  value: unknown;
  expiresAt: number;
  timer?: ReturnType<typeof setTimeout>;
}

class MemoryStore implements CacheStore {
  private store = new Map<string, MemoryEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Clear any previous expiry timer to avoid leaks.
    const prev = this.store.get(key);
    if (prev?.timer) clearTimeout(prev.timer);

    const expiresAt = Date.now() + ttlSeconds * 1000;
    const timer = setTimeout(() => {
      const cur = this.store.get(key);
      if (cur && cur.expiresAt <= Date.now()) this.store.delete(key);
    }, ttlSeconds * 1000);

    // Don't keep the Node process alive for cache cleanup.
    if (typeof (timer as { unref?: () => void }).unref === "function") {
      (timer as { unref: () => void }).unref();
    }

    this.store.set(key, { value, expiresAt, timer });
  }

  async del(key: string): Promise<void> {
    const prev = this.store.get(key);
    if (prev?.timer) clearTimeout(prev.timer);
    this.store.delete(key);
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Singleton factory
// ────────────────────────────────────────────────────────────────────────────────
let instance: CacheStore | null = null;
let loggedBackend = false;

export function getCache(): CacheStore {
  if (instance) return instance;
  const hasUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  instance = hasUpstash ? new UpstashStore() : new MemoryStore();
  if (!loggedBackend) {
    loggedBackend = true;
    console.log(`[cache] Backend: ${hasUpstash ? "upstash-redis" : "in-memory"}`);
  }
  return instance;
}

// Test helper — not part of the public API, but useful for unit tests.
export function __resetCacheForTests(): void {
  instance = null;
  loggedBackend = false;
}
