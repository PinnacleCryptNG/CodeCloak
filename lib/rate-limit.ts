/**
 * Per-IP sliding-window limit for /api/review, so a public demo cannot burn the NEAR AI credits.
 * In-memory per server instance (no DB, per SPEC zero retention): best effort on serverless, where each warm
 * instance keeps its own window. Keys are truncated SHA-256 hashes of the client IP; raw IPs are never kept.
 */
import { createHash } from "node:crypto";

export const REVIEW_RATE_LIMIT = { limit: 8, windowMs: 10 * 60_000 } as const;
const MAX_KEYS = 10_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterS: number };
export type RateLimiter = { take(key: string): RateLimitResult };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }, now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    take(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterS: Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000)) };
      }
      recent.push(t);
      hits.delete(key);
      hits.set(key, recent);
      if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value!);
      return { ok: true };
    },
  };
}

const SHARED_KEY = "shared";
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9a-z-]+$/i;

/**
 * Client IP, hashed. The IP source is explicit because any header a client sends reaches us unchanged unless a
 * proxy overwrites it (Next.js keeps a client-sent X-Forwarded-For):
 * - On Vercel (`VERCEL=1`), `x-vercel-forwarded-for` / `x-real-ip`, which Vercel's edge overwrites.
 * - Elsewhere, only `TRUSTED_PROXY_IP_HEADER`, a header your proxy overwrites or appends to; the LAST
 *   comma-separated value is used (the hop added by the nearest proxy).
 * - Otherwise every request shares one key (fail closed: the limit becomes global, never bypassable).
 */
export function clientKey(request: Request, env: Record<string, string | undefined> = process.env): string {
  const h = request.headers;
  let ip: string | undefined;
  if (env.VERCEL === "1") {
    ip = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  } else {
    const name = env.TRUSTED_PROXY_IP_HEADER?.trim();
    if (name && HEADER_NAME.test(name)) ip = h.get(name)?.split(",").at(-1)?.trim();
  }
  return createHash("sha256").update(ip || SHARED_KEY).digest("hex").slice(0, 32);
}
