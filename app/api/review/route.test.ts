import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route";

const KEY = "sk-test-secret-key-never-in-responses";
let calls: string[] = [];
let attestationResponse: () => Response;
const realFetch = globalThis.fetch;

beforeEach(() => {
  process.env.NEARAI_API_KEY = KEY;
  calls = [];
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/attestation/report")) return attestationResponse();
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.NEARAI_API_KEY;
});

const review = (body: unknown) =>
  POST(new Request("http://localhost/api/review", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const noCompletions = () => assert.ok(!calls.some((u) => u.includes("chat/completions") || u.includes("/signature/")));

test("attestation fetch failure → 403 attestation_failed with checks, no completion", async () => {
  attestationResponse = () => new Response("down", { status: 503 });
  const res = await review({ mode: "demo", sampleId: "vuln-auth" });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "attestation_failed");
  assert.ok(Array.isArray(body.checks) && body.checks.length > 0);
  assert.equal(calls.length, 1);
  noCompletions();
});

test("wrong echoed nonce → 403, no completion, key and code never in response", async () => {
  const signer = { signing_address: "0x" + "ab".repeat(20), signing_algo: "ecdsa", request_nonce: "f".repeat(64) };
  attestationResponse = () => Response.json({ gateway_attestation: signer, model_attestations: [{ ...signer, model_name: "Qwen/Qwen3.8-27B" }] });
  const pasted = "const SECRET_CODE_MARKER = 1;";
  const res = await review({ mode: "paste", code: pasted });
  assert.equal(res.status, 403);
  const text = await res.text();
  assert.equal(JSON.parse(text).error, "attestation_failed");
  assert.ok(!text.includes(KEY));
  assert.ok(!text.includes("SECRET_CODE_MARKER"));
  noCompletions();
});

test("input validation rejects before any network call", async () => {
  attestationResponse = () => new Response("", { status: 500 });
  assert.equal((await review("{not json")).status, 400);
  assert.equal((await review({ mode: "x" })).status, 400);
  assert.equal((await review({ mode: "demo", sampleId: "../etc" })).status, 400);
  assert.equal((await review({ mode: "paste", code: "a".repeat(80 * 1024 + 1) })).status, 413);
  assert.equal((await review({ mode: "paste", code: "a\u0000b" })).status, 415);
  const huge = new Request("http://localhost/api/review", { method: "POST", body: "x".repeat(200 * 1024) });
  assert.equal((await POST(huge)).status, 413);
  assert.equal(calls.length, 0);
});

test("missing API key → 500 server_not_configured, no network", async () => {
  delete process.env.NEARAI_API_KEY;
  const res = await review({ mode: "demo", sampleId: "vuln-sql" });
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, "server_not_configured");
  assert.equal(calls.length, 0);
});
