import assert from "node:assert/strict";
import { test } from "node:test";
import { clientKey, createRateLimiter } from "./rate-limit";

const req = (headers: Record<string, string>) => new Request("http://localhost/api/review", { headers });

const ON_VERCEL = { VERCEL: "1" };
const SELF_HOSTED = {};

test("clientKey on Vercel uses Vercel's edge-set headers and ignores X-Forwarded-For", () => {
  const vercel = clientKey(req({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }), ON_VERCEL);
  assert.equal(vercel, clientKey(req({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "7.7.7.7" }), ON_VERCEL));
  assert.equal(clientKey(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }), ON_VERCEL), vercel);
  assert.notEqual(clientKey(req({ "x-real-ip": "203.0.113.8" }), ON_VERCEL), vercel);
  assert.ok(!vercel.includes("203"));
});

test("clientKey off Vercel ignores every client-settable IP header (one shared key)", () => {
  const shared = clientKey(req({}), SELF_HOSTED);
  const spoofed: Record<string, string>[] = [
    { "x-real-ip": "203.0.113.7" },
    { "x-vercel-forwarded-for": "203.0.113.8" },
    { "x-forwarded-for": "1.1.1.1, 203.0.113.9" },
  ];
  for (const headers of spoofed) assert.equal(clientKey(req(headers), SELF_HOSTED), shared);
});

test("clientKey off Vercel trusts only TRUSTED_PROXY_IP_HEADER, using its last hop", () => {
  const env = { TRUSTED_PROXY_IP_HEADER: "X-Forwarded-For" };
  const a = clientKey(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.7", "x-real-ip": "5.5.5.5" }), env);
  assert.equal(a, clientKey(req({ "x-forwarded-for": "9.9.9.9, 203.0.113.7", "x-real-ip": "6.6.6.6" }), env));
  assert.notEqual(a, clientKey(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.8" }), env));
  assert.equal(clientKey(req({ "x-real-ip": "203.0.113.7" }), env), clientKey(req({}), SELF_HOSTED));
  assert.equal(clientKey(req({ "x-real-ip": "203.0.113.7" }), { TRUSTED_PROXY_IP_HEADER: "bad header" }), clientKey(req({}), SELF_HOSTED));
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
