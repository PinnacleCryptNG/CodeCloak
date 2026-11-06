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

/**
 * Client IP, hashed. Only headers a proxy sets are trusted: Vercel's `x-vercel-forwarded-for` / `x-real-ip`
 * (Vercel overwrites both), else the LAST X-Forwarded-For hop (appended by the nearest proxy). The first hop is
 * client-controlled, so rotating it must not reset the quota. With no proxy (local dev) every request shares one key.
 */
export function clientKey(request: Request): string {
  const h = request.headers;
  const ip =
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
