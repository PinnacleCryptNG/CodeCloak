/**
 * npm run test:failclosed — proves the attestation failure path never reaches a model.
 * Drives the real /api/review handler with stubbed NEAR / Intel / NVIDIA responses. For every attestation
 * failure the response must be 403 attestation_failed, with zero /chat/completions or /signature calls, and the
 * submitted code and API key must never appear in the response or in any console output.
 * A positive control (attestation passes) proves the harness does see completion calls when they happen.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { NVIDIA_ISSUER, NVIDIA_NRAS_URL, type RawReport } from "../lib/near-ai/attestation";
import { expectedMrConfigId, replayRtmr3, type VerifiedQuote } from "../lib/near-ai/tdx";
import { createRateLimiter } from "../lib/rate-limit";
import { handleReview } from "../lib/review/handler";

const MODEL = "Qwen/Qwen3.8-27B";
const KEY = "sk-failclosed-test-key";
const ENV = { NEARAI_API_KEY: KEY };
const SENTINEL = "FAILCLOSED_SENTINEL_7f3a";
const CODE = `export const token = "${SENTINEL}"; // fictional`;
const GATEWAY_ADDR = "0x" + "11".repeat(20);
const MODEL_ADDR = "0x" + "22".repeat(20);
const APP_COMPOSE = '{"docker_compose_file":"services: {}"}';

function runtimeEvent(event: string, payloadHex: string) {
  const type = Buffer.alloc(4);
  type.writeUInt32LE(0x08000001);
  const digest = createHash("sha384").update(type).update(":").update(event).update(":").update(Buffer.from(payloadHex, "hex")).digest("hex");
  return { imr: 3, event_type: 0x08000001, digest, event, event_payload: payloadHex };
}
const EVENT_LOG = [{ imr: 0, event_type: 1, digest: "aa".repeat(48), event: "", event_payload: "" }, runtimeEvent("compose-hash", "ab".repeat(32))];

const report = (addr: string, nonce: string, extra: Partial<RawReport> = {}): RawReport => ({
  signing_address: addr,
  signing_algo: "ecdsa",
  request_nonce: nonce,
  intel_quote: addr.slice(2),
  event_log: EVENT_LOG,
  info: { tcb_info: JSON.stringify({ app_compose: APP_COMPOSE }) },
  ...extra,
});

type Body = { gateway_attestation: RawReport; model_attestations: RawReport[] };
type Scenario = {
  attestation?: (nonce: string) => Response | Promise<Response>;
  mutate?: (body: Body) => void;
  quote?: Partial<VerifiedQuote>;
  quoteThrows?: boolean;
  gpuVerdict?: boolean;
};

let logs: string[] = [];
const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
const original = methods.map((m) => console[m]);
beforeEach(() => {
  logs = [];
  for (const m of methods) console[m] = (...args: unknown[]) => void logs.push(args.map(String).join(" "));
});
afterEach(() => methods.forEach((m, i) => (console[m] = original[i])));

async function harness(s: Scenario) {
  const urls: string[] = [];
  let nonce = "";
  const { publicKey, privateKey } = await generateKeyPair("ES384");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "ES384" };
  const fetchMock = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url.startsWith(NVIDIA_NRAS_URL)) {
      const token = await new SignJWT({ "x-nvidia-overall-att-result": s.gpuVerdict ?? true, eat_nonce: nonce })
        .setProtectedHeader({ alg: "ES384", kid: "test" })
        .setIssuer(NVIDIA_ISSUER)
        .setIssuedAt()
        .setNotBefore("0s")
        .setExpirationTime("5m")
        .sign(privateKey);
      return Response.json([["JWT", token], { "GPU-0": token }]);
    }
    if (url.includes("/attestation/report")) {
      nonce = new URL(url).searchParams.get("nonce") ?? "";
      if (s.attestation) return s.attestation(nonce);
      const body: Body = {
        gateway_attestation: report(GATEWAY_ADDR, nonce),
        model_attestations: [report(MODEL_ADDR, nonce, { model_name: MODEL, nvidia_payload: JSON.stringify({ nonce, evidence_list: [] }) })],
      };
      s.mutate?.(body);
      return Response.json(body);
    }
    // Completions / signatures: only the positive control may ever get here.
    return Response.json({ error: { message: `echo ${SENTINEL}`, type: "no_limit_configured" } }, { status: 402 });
  }) as typeof fetch;
  const verifyQuote = async (quoteHex: string): Promise<VerifiedQuote> => {
    if (s.quoteThrows) throw new Error(`dcap failure ${SENTINEL}`);
    return {
      status: "UpToDate",
      advisoryIds: [],
      tdAttributes: "0000001000000000",
      reportData: quoteHex + "00".repeat(12) + nonce,
      mrConfigId: expectedMrConfigId(APP_COMPOSE).toString("hex"),
      rtMr3: replayRtmr3(EVENT_LOG).toString("hex"),
      ...s.quote,
    };
  };
  const deps = {
    env: ENV,
    attestation: { fetch: fetchMock, verifyQuote, nvidiaKeys: createLocalJWKSet({ keys: [jwk] }) },
    chat: { fetch: fetchMock, sleep: async () => {} },
    rateLimiter: createRateLimiter({ limit: 1000, windowMs: 60_000 }),
  };
  return { deps, urls };
}

const modelCalls = (urls: string[]) => urls.filter((u) => u.includes("/chat/completions") || u.includes("/signature/"));

async function expectFailClosed(s: Scenario) {
  for (const accept of ["application/json", "application/x-ndjson"]) {
    const { deps, urls } = await harness(s);
    const req = new Request("http://localhost/api/review", { method: "POST", headers: { accept }, body: JSON.stringify({ mode: "paste", code: CODE }) });
    const res = await handleReview(req, deps);
    const text = await res.text();
    assert.equal(res.status, 403, text);
    const body = JSON.parse(text);
    assert.equal(body.error, "attestation_failed");
    assert.match(body.message, /never sent to a model/);
    assert.ok(Array.isArray(body.checks) && body.checks.some((c: { ok: boolean }) => !c.ok));
    assert.ok(urls.some((u) => u.includes("/attestation/report")), "attestation was attempted");
    assert.deepEqual(modelCalls(urls), [], "no completion or signature call after a failed attestation");
    assert.ok(!text.includes(SENTINEL) && !text.includes(KEY));
  }
  assert.ok(!logs.join("\n").includes(SENTINEL) && !logs.join("\n").includes(KEY), "code/key never logged");
}

const WRONG = "f".repeat(64);
const scenarios: [string, Scenario][] = [
  ["attestation HTTP 503", { attestation: () => new Response(`down ${SENTINEL}`, { status: 503 }) }],
  ["attestation network error", { attestation: () => Promise.reject(new Error(SENTINEL)) }],
  ["attestation invalid JSON", { attestation: () => new Response("<html>", { status: 200 }) }],
  ["wrong nonce (model report)", { mutate: (b) => (b.model_attestations[0].request_nonce = WRONG) }],
  ["wrong nonce (gateway report)", { mutate: (b) => (b.gateway_attestation.request_nonce = WRONG) }],
  ["empty model_attestations", { mutate: (b) => (b.model_attestations = []) }],
  ["model_name is not the requested model", { mutate: (b) => (b.model_attestations[0].model_name = "other/model") }],
  ["bad TDX quote status", { quote: { status: "Revoked" } }],
  ["TDX debug mode", { quote: { tdAttributes: "0100001000000000" } }],
  ["quote verifier throws", { quoteThrows: true }],
  ["signer mismatch (report_data binds another key)", { quote: { reportData: "33".repeat(20) + "00".repeat(44) } }],
  ["RTMR3 replay mismatch", { quote: { rtMr3: "00".repeat(48) } }],
  ["MRCONFIGID / app compose mismatch", { mutate: (b) => (b.model_attestations[0].info = { tcb_info: { app_compose: "tampered" } }) }],
  ["NVIDIA payload nonce mismatch", { mutate: (b) => (b.model_attestations[0].nvidia_payload = JSON.stringify({ nonce: WRONG })) }],
  ["NVIDIA verdict false", { gpuVerdict: false }],
];
for (const [name, s] of scenarios) test(`fail closed: ${name}`, () => expectFailClosed(s));

test("positive control: a passing attestation does reach completions (harness sees model calls)", async () => {
  const { deps, urls } = await harness({});
  const res = await handleReview(new Request("http://localhost/api/review", { method: "POST", body: JSON.stringify({ mode: "paste", code: CODE }) }), deps);
  const text = await res.text();
  assert.equal(res.status, 502, text);
  assert.equal(JSON.parse(text).error, "completion_http_402");
  assert.ok(modelCalls(urls).length >= 3);
  assert.ok(!text.includes(SENTINEL) && !text.includes(KEY), "upstream text and code never echoed");
  assert.ok(!logs.join("\n").includes(SENTINEL));
});

test("no console logging in server or UI source", () => {
  const root = path.resolve(__dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(p);
    }
  };
  ["app", "lib", "components"].forEach((d) => walk(path.join(root, d)));
  const offenders = files.filter((f) => /\bconsole\s*\.\s*(log|info|warn|error|debug|trace)\b/.test(readFileSync(f, "utf8")));
  assert.ok(files.length > 10);
  assert.deepEqual(offenders.map((f) => path.relative(root, f)), []);
});
