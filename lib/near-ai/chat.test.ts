import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Wallet } from "ethers";
import { chatCompletion, fetchSignature, parseAgentOutput, verifySignature } from "./chat";
import type { VerifiedAttestation } from "./attestation";

const env = { NEARAI_API_KEY: "test-key" };
const MODEL = "Qwen/Qwen3.8-27B";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const modelWallet = Wallet.createRandom();
const gatewayWallet = Wallet.createRandom();
const report = (label: string, address: string) =>
  ({ report: label, signingAddress: address, signingAlgo: "ecdsa", tcbStatus: "UpToDate", advisoryIds: [], gpu: "not_present" }) as const;
const attestation = {
  model: MODEL,
  nonce: "0".repeat(64),
  verifiedAt: new Date().toISOString(),
  gateway: report("gateway", gatewayWallet.address),
  models: [report("model[0]", modelWallet.address)],
  checks: [],
} as unknown as VerifiedAttestation;
const hashes = { requestHash: sha("req"), responseHash: sha("res") };

test("chatCompletion: non-streaming, x-no-aliasing, hashes exact bytes", async () => {
  const responseText = '{"id":"chatcmpl-1","model":"Qwen/Qwen3.8-27B","choices":[{"message":{"content":"{}"}}]}';
  let sent: { url: string; init: RequestInit } | undefined;
  const fetchStub = (async (url: string, init: RequestInit) => {
    sent = { url: String(url), init };
    return new Response(responseText, { status: 200 });
  }) as unknown as typeof fetch;
  const c = await chatCompletion(MODEL, [{ role: "user", content: "x" }], 100, { fetch: fetchStub, env });
  assert.equal(sent!.url, "https://cloud-api.near.ai/v1/chat/completions");
  const headers = sent!.init.headers as Record<string, string>;
  assert.equal(headers["x-no-aliasing"], "true");
  assert.equal(headers["Accept-Encoding"], "identity");
  const body = JSON.parse(String(sent!.init.body));
  assert.equal(body.stream, false);
  assert.equal(body.model, MODEL);
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
  assert.equal(c.requestHash, sha(String(sent!.init.body)));
  assert.equal(c.responseHash, sha(responseText));
  assert.equal(c.chatId, "chatcmpl-1");
});

test("chatCompletion: HTTP error throws a fixed code without upstream text", async () => {
  const fetchStub = (async () => new Response("SECRET upstream body", { status: 500 })) as unknown as typeof fetch;
  await assert.rejects(chatCompletion(MODEL, [], 10, { fetch: fetchStub, env }), (e: Error) => {
    assert.equal(e.message, "completion_http_500");
    return true;
  });
});

test("fetchSignature: bounded retry on 404, then success; error_code means unavailable", async () => {
  let calls = 0;
  const seq = (async () => (++calls < 3 ? new Response("", { status: 404 }) : Response.json({ text: "t" }))) as unknown as typeof fetch;
  const sig = await fetchSignature("chatcmpl-1", MODEL, { fetch: seq, env, sleep: async () => {} });
  assert.equal(calls, 3);
  assert.deepEqual(sig, { text: "t" });
  const unavailable = (async () => Response.json({ error_code: "x", message: "m" })) as unknown as typeof fetch;
  assert.equal(await fetchSignature("c", MODEL, { fetch: unavailable, env }), null);
  let n = 0;
  const always404 = (async () => (n++, new Response("", { status: 404 }))) as unknown as typeof fetch;
  assert.equal(await fetchSignature("c", MODEL, { fetch: always404, env, sleep: async () => {} }, 4), null);
  assert.equal(n, 4);
});

test("verifySignature: provider_tee bound to exact hashes and a preflight model signer", async () => {
  const text = `${MODEL}:${hashes.requestHash}:${hashes.responseHash}`;
  const sig = { text, signature: await modelWallet.signMessage(text), signing_address: modelWallet.address, signing_algo: "ecdsa", signature_kind: "provider_tee" };
  const ok = verifySignature(sig, hashes, MODEL, attestation);
  assert.equal(ok.status, "verified");
  assert.equal(ok.signerMatchesPreflight, true);

  assert.equal(verifySignature(sig, { ...hashes, responseHash: sha("other") }, MODEL, attestation).reason, "signed_text_mismatch");
  assert.equal(verifySignature({ ...sig, signing_address: gatewayWallet.address }, hashes, MODEL, attestation).reason, "signer_mismatch");
  const stranger = Wallet.createRandom();
  const strangerSig = { ...sig, signature: await stranger.signMessage(text), signing_address: stranger.address };
  assert.equal(verifySignature(strangerSig, hashes, MODEL, attestation).reason, "signer_not_in_preflight");
  assert.equal(verifySignature(null, hashes, MODEL, attestation).status, "unverified");
  assert.equal(verifySignature({ ...sig, signature_kind: undefined }, hashes, MODEL, attestation).reason, "unknown_signature_kind");
});

test("verifySignature: gateway kind must match the gateway report", async () => {
  const text = `${hashes.requestHash}:${hashes.responseHash}`;
  const sig = { text, signature: await gatewayWallet.signMessage(text), signing_address: gatewayWallet.address, signing_algo: "ecdsa", signature_kind: "gateway" };
  const result = verifySignature(sig, hashes, MODEL, attestation);
  assert.equal(result.status, "verified");
  assert.equal(result.signatureKind, "gateway");
  const modelSigned = { ...sig, signature: await modelWallet.signMessage(text), signing_address: modelWallet.address };
  assert.equal(verifySignature(modelSigned, hashes, MODEL, attestation).reason, "signer_not_in_preflight");
});

test("parseAgentOutput: tolerates think blocks/fences, validates fields, never throws", () => {
  const out = parseAgentOutput(
    "security",
    '<think>{"no":1}</think>```json\n{"agent":"security","findings":[{"id":"S1","severity":"critical","title":"t"}],"summary":"s"}\n```',
  );
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].severity, "info");
  assert.equal(out.summary, "s");
  assert.equal(parseAgentOutput("security", "not json").parseError, true);
});

test("chatCompletion: 200 with JSON null or non-object choices → completion_malformed", async () => {
  for (const body of ["null", "[]", '{"id":"x","choices":"nope"}', '{"id":"x","choices":[null]}']) {
    const fetchStub = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
    await assert.rejects(chatCompletion(MODEL, [{ role: "user", content: "x" }], 10, { fetch: fetchStub, env }), { code: "completion_malformed" });
  }
});

test("parseAgentOutput: non-array findings is a parse error, not a clean review", () => {
  assert.equal(parseAgentOutput("security", '{"findings":"SQL injection","summary":"x"}').parseError, true);
  assert.equal(parseAgentOutput("security", "null").parseError, true);
  assert.equal(parseAgentOutput("security", '{"findings":[],"summary":"clean"}').parseError, undefined);
});
