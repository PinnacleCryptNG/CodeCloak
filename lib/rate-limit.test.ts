import assert from "node:assert/strict";
import { test } from "node:test";
import { clientKey, createRateLimiter } from "./rate-limit";

const req = (headers: Record<string, string>) => new Request("http://localhost/api/review", { headers });

test("clientKey ignores the client-controlled first X-Forwarded-For hop", () => {
  const a = clientKey(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }));
  const b = clientKey(req({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }));
  assert.equal(a, b);
  assert.notEqual(a, clientKey(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.8" })));
});

test("clientKey prefers Vercel's proxy-set headers over X-Forwarded-For", () => {
  const vercel = clientKey(req({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }));
  assert.equal(vercel, clientKey(req({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "7.7.7.7" })));
  assert.equal(clientKey(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6" })), vercel);
  assert.ok(!vercel.includes("203"));
});

test("limiter blocks after the limit and frees the slot after the window", () => {
  let t = 0;
  const l = createRateLimiter({ limit: 2, windowMs: 1000 }, () => t);
  assert.ok(l.take("k").ok && l.take("k").ok);
  const blocked = l.take("k");
  assert.ok(!blocked.ok && blocked.retryAfterS === 1);
  t = 1000;
  assert.ok(l.take("k").ok);
});
