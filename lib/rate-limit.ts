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

/** First X-Forwarded-For hop (set by Vercel), else X-Real-IP, hashed. */
export function clientKey(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
