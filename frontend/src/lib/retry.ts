/**
 * Retry helper with exponential backoff + full jitter.
 *
 * Why full jitter (Math.random() * cap) rather than equal jitter or no jitter:
 *  - Marc Brooker (AWS Architecture Blog, 2015) showed full jitter minimizes throughput
 *    variance and avoids thundering-herd retries.
 *  - Without jitter, N instances all retry at exactly base*2^n ms, hammering the
 *    upstream at the same moment.
 *
 * Default policy: retry on transient network/5xx/429 errors only. NEVER retry on
 * 4xx (other than 429) — they are caller bugs and won't fix themselves.
 */

export interface RetryOptions {
  /** Total attempts (default 3 — initial try + 2 retries). */
  maxAttempts?: number;
  /** Backoff base in ms (default 200). */
  baseMs?: number;
  /** Cap on the backoff window in ms (default 5000). */
  maxMs?: number;
  /** Decide which errors are retryable. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retryOn?: (err: any) => boolean;
  /** Allows the caller to abort all pending sleeps + future attempts. */
  signal?: AbortSignal;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defaultRetryOn(err: any): boolean {
  // Caller explicitly aborted — never retry.
  if (err?.name === "AbortError") return false;

  // HTTP status (works for Response-like errors and many SDKs).
  const status: number | undefined = err?.status ?? err?.response?.status;
  if (typeof status === "number") {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false; // other 4xx → do not retry
  }

  // Common Node fetch / network conditions.
  const code: string | undefined = err?.code ?? err?.cause?.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "EAI_AGAIN" || code === "ENOTFOUND") {
    return true;
  }

  // Undici / fetch wraps low-level failures in TypeError("fetch failed").
  if (err?.name === "TypeError") return true;

  // AbortSignal.timeout() throws a DOMException("TimeoutError"). Treat as transient.
  if (err?.name === "TimeoutError") return true;

  return false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Wrap an async function with retry + exponential backoff + full jitter.
 *
 * Example:
 *   const json = await withRetry(() => fetchYahoo(url), {
 *     maxAttempts: 3,
 *     retryOn: (e) => e.status === 429 || e.status >= 500,
 *   });
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseMs = opts.baseMs ?? 200;
  const maxMs = opts.maxMs ?? 5000;
  const retryOn = opts.retryOn ?? defaultRetryOn;
  const signal = opts.signal;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastErr: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const isLast = attempt === maxAttempts - 1;
      if (isLast || !retryOn(err)) throw err;

      // Exponential backoff cap, then full jitter.
      const cap = Math.min(maxMs, baseMs * 2 ** attempt);
      const delay = Math.random() * cap;
      await sleep(delay, signal);
    }
  }
  // Unreachable, but satisfies the type checker.
  throw lastErr;
}
