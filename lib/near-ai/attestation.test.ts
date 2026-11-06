import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  AttestationError,
  assertAttestationOrThrow,
  extractSigningAddresses,
  fetchAttestationReport,
  generateNonce,
  getApiKey,
  NVIDIA_ISSUER,
  NVIDIA_NRAS_URL,
  verifyNonceEcho,
  type AttestationDeps,
  type RawReport,
} from "./attestation";
import { DEFAULT_TRUSTED_MEASUREMENTS, loadTrustedMeasurements, TRUSTED_MEASUREMENTS_ENV } from "./measurements";
import { composeTemplateHash, expectedMrConfigId, replayRtmr3, type VerifiedQuote } from "./tdx";

const MODEL = "Qwen/Qwen3.8-27B";
const OS = { mrTd: "a1".repeat(48), rtMr0: "a2".repeat(48), rtMr1: "a3".repeat(48), rtMr2: "a4".repeat(48) };
const GATEWAY_ADDR = "0x" + "11".repeat(20);
const MODEL_ADDR = "0x" + "22".repeat(20);
const APP_COMPOSE = '{"docker_compose_file":"services: {}"}';
const COMPOSE_HASH = createHash("sha256").update(APP_COMPOSE).digest("hex");
const TRUSTED = { gateway: { os: [OS], composeTemplates: [COMPOSE_HASH] }, model: { os: [OS], composeTemplates: [COMPOSE_HASH] } };
const ENV = { NEARAI_API_KEY: "test-key", [TRUSTED_MEASUREMENTS_ENV]: JSON.stringify(TRUSTED) };

function runtimeEvent(event: string, payloadHex: string) {
  const type = Buffer.alloc(4);
  type.writeUInt32LE(0x08000001);
  const digest = createHash("sha384").update(type).update(":").update(event).update(":").update(Buffer.from(payloadHex, "hex")).digest("hex");
  return { imr: 3, event_type: 0x08000001, digest, event, event_payload: payloadHex };
}
const EVENT_LOG = [
  { imr: 0, event_type: 1, digest: "aa".repeat(48), event: "", event_payload: "" },
  runtimeEvent("compose-hash", "ab".repeat(32)),
  runtimeEvent("app-id", "cd".repeat(20)),
];

function report(addr: string, nonce: string, extra: Partial<RawReport> = {}): RawReport {
  return {
    signing_address: addr,
    signing_algo: "ecdsa",
    request_nonce: nonce,
    intel_quote: addr.slice(2),
    event_log: EVENT_LOG,
    info: { tcb_info: JSON.stringify({ app_compose: APP_COMPOSE }) },
    ...extra,
  };
}

/** Fake dcap-qvl: a "quote" is the signer hex; returns measurements consistent with the report. */
function fakeQuoteVerifier(nonceRef: { value: string }, overrides: Partial<VerifiedQuote> = {}) {
  return async (quoteHex: string): Promise<VerifiedQuote> => ({
    status: "UpToDate",
    advisoryIds: [],
    tdAttributes: "0000001000000000",
    reportData: quoteHex + "00".repeat(12) + nonceRef.value,
    mrConfigId: expectedMrConfigId(APP_COMPOSE).toString("hex"),
    rtMr3: replayRtmr3(EVENT_LOG).toString("hex"),
    ...OS,
    ...overrides,
  });
}

type Scenario = {
  mutate?: (body: { gateway_attestation: RawReport; model_attestations: RawReport[] }, nonce: string) => void;
  quote?: Partial<VerifiedQuote>;
  gpuVerdict?: boolean;
  status?: number;
  env?: Record<string, string | undefined>;
};

async function setup(s: Scenario = {}) {
  const urls: string[] = [];
  const nonceRef = { value: "" };
  const { publicKey, privateKey } = await generateKeyPair("ES384");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "ES384" };
  const fetchMock = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    urls.push(url);
    if (url.startsWith(NVIDIA_NRAS_URL)) {
      const token = await new SignJWT({ "x-nvidia-overall-att-result": s.gpuVerdict ?? true, eat_nonce: nonceRef.value })
        .setProtectedHeader({ alg: "ES384", kid: "test" })
        .setIssuer(NVIDIA_ISSUER)
        .setIssuedAt()
        .setNotBefore("0s")
        .setExpirationTime("5m")
        .sign(privateKey);
      return Response.json([["JWT", token], { "GPU-0": token }]);
    }
    nonceRef.value = new URL(url).searchParams.get("nonce") ?? "";
    assert.equal(new Headers(init?.headers).get("x-no-aliasing"), "true");
    if (s.status) return new Response("upstream error", { status: s.status });
    const body = {
      gateway_attestation: report(GATEWAY_ADDR, nonceRef.value),
      model_attestations: [
        report(MODEL_ADDR, nonceRef.value, { model_name: MODEL, nvidia_payload: JSON.stringify({ nonce: nonceRef.value, evidence_list: [] }) }),
      ],
    };
    s.mutate?.(body, nonceRef.value);
    return Response.json(body);
  }) as typeof fetch;
  const deps: AttestationDeps = {
    env: s.env ?? ENV,
    fetch: fetchMock,
    verifyQuote: fakeQuoteVerifier(nonceRef, s.quote),
    nvidiaKeys: createLocalJWKSet({ keys: [jwk] }),
  };
  return { deps, urls };
}

async function assertFails(s: Scenario, checkName?: string) {
  const { deps, urls } = await setup(s);
  await assert.rejects(assertAttestationOrThrow(MODEL, deps), (error: unknown) => {
    assert.ok(error instanceof AttestationError);
    assert.equal(error.code, "attestation_failed");
    if (checkName) assert.ok(error.checks.some((c) => c.name === checkName && !c.ok), JSON.stringify(error.checks));
    return true;
  });
  assert.ok(!urls.some((u) => u.includes("/chat/completions")));
  return urls;
}

test("generateNonce returns fresh 32-byte hex", () => {
  const a = generateNonce();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, generateNonce());
});

test("getApiKey uses NEARAI_API_KEY, then NEARAI_CLOUD_API_KEY, else throws", () => {
  assert.equal(getApiKey({ NEARAI_API_KEY: "a", NEARAI_CLOUD_API_KEY: "b" }), "a");
  assert.equal(getApiKey({ NEARAI_CLOUD_API_KEY: "b" }), "b");
  assert.throws(() => getApiKey({}), AttestationError);
});

test("fetchAttestationReport sends the documented query and headers", async () => {
  let seen: { url: string; headers: Headers } | undefined;
  const nonce = generateNonce();
  const fetchMock = (async (input: string | URL | Request, init?: RequestInit) => {
    seen = { url: String(input), headers: new Headers(init?.headers) };
    return Response.json({});
  }) as typeof fetch;
  await fetchAttestationReport(MODEL, nonce, { env: ENV, fetch: fetchMock });
  const url = new URL(seen!.url);
  assert.equal(url.origin + url.pathname, "https://cloud-api.near.ai/v1/attestation/report");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    model: MODEL,
    provider: "near",
    include_tls_fingerprint: "false",
    signing_algo: "ecdsa",
    nonce,
  });
  assert.equal(seen!.headers.get("authorization"), "Bearer test-key");
  assert.equal(seen!.headers.get("x-no-aliasing"), "true");
  assert.equal(seen!.headers.get("accept"), "application/json");
});

test("failed fetch throws (HTTP error and network error), without leaking the body", async () => {
  const urls = await assertFails({ status: 500 }, "fetch");
  assert.equal(urls.length, 1);
  const networkDown = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  await assert.rejects(assertAttestationOrThrow(MODEL, { env: ENV, fetch: networkDown }), (error: unknown) => {
    assert.ok(error instanceof AttestationError);
    assert.ok(!JSON.stringify(error.checks).includes("upstream error"));
    return true;
  });
});

test("missing API key throws before any request", async () => {
  const { deps, urls } = await setup();
  await assert.rejects(assertAttestationOrThrow(MODEL, { ...deps, env: {} }), AttestationError);
  assert.equal(urls.length, 0);
});

test("happy path verifies gateway + every model report", async () => {
  const { deps, urls } = await setup();
  const result = await assertAttestationOrThrow(MODEL, deps);
  assert.equal(result.gateway.signingAddress, GATEWAY_ADDR);
  assert.equal(result.models.length, 1);
  assert.equal(result.models[0].signingAddress, MODEL_ADDR);
  assert.deepEqual(result.models[0].gpu, { verdict: true, nonceMatches: true });
  assert.equal(result.gateway.gpu, "not_present");
  assert.ok(result.checks.every((c) => c.ok));
  assert.ok(urls.some((u) => u.startsWith(NVIDIA_NRAS_URL)));
  assert.ok(!urls.some((u) => u.includes("/chat/completions")));
});

test("wrong echoed nonce throws (model and gateway)", async () => {
  const wrong = "f".repeat(64);
  await assertFails({ mutate: (b) => (b.model_attestations[0].request_nonce = wrong) }, "nonce_echo");
  await assertFails({ mutate: (b) => (b.gateway_attestation.request_nonce = wrong) }, "nonce_echo");
  assert.throws(() => verifyNonceEcho({ request_nonce: wrong }, "0".repeat(64)), AttestationError);
});

test("missing or empty model_attestations throws", async () => {
  await assertFails({ mutate: (b) => (b.model_attestations = []) });
  await assertFails({ mutate: (b) => delete (b as Partial<typeof b>).model_attestations });
});

test("quote failures throw: bad status, debug mode, report_data, RTMR3, MRCONFIGID", async () => {
  await assertFails({ quote: { status: "Revoked" } }, "tdx_quote");
  await assertFails({ quote: { tdAttributes: "0100001000000000" } }, "tdx_quote");
  await assertFails({ quote: { reportData: "33".repeat(20) + "00".repeat(44) } }, "report_data_binds_signer_and_nonce");
  await assertFails({ quote: { rtMr3: "00".repeat(48) } }, "rtmr3_event_log_replay");
  await assertFails({ mutate: (b) => (b.model_attestations[0].info = { tcb_info: { app_compose: "tampered" } }) }, "mrconfigid_app_compose");
  const tamperedLog = [...EVENT_LOG.slice(0, 2), { ...EVENT_LOG[2], event_payload: "00" }];
  await assertFails({ mutate: (b) => (b.gateway_attestation.event_log = JSON.stringify(tamperedLog)) }, "rtmr3_event_log_replay");
});

test("GPU: payload nonce mismatch never reaches NRAS; false verdict throws", async () => {
  const urls = await assertFails(
    { mutate: (b) => (b.model_attestations[0].nvidia_payload = JSON.stringify({ nonce: "e".repeat(64) })) },
    "nvidia_gpu",
  );
  assert.ok(!urls.some((u) => u.startsWith(NVIDIA_NRAS_URL)));
  await assertFails({ gpuVerdict: false }, "nvidia_gpu");
});

test("review fixes: null model entry, missing model_name, empty GPU payload, no remote text in checks", async () => {
  await assertFails({ mutate: (b) => ((b.model_attestations as unknown[])[0] = null) }, "present");
  await assertFails({ mutate: (b) => delete b.model_attestations[0].model_name }, "model_name");
  await assertFails({ mutate: (b) => (b.model_attestations[0].model_name = "other/model") }, "model_name");
  await assertFails({ mutate: (b) => (b.model_attestations[0].nvidia_payload = "") }, "nvidia_gpu");
  const bad = [...EVENT_LOG.slice(0, 2), { ...EVENT_LOG[2], event: "SECRET-EVENT-NAME" }];
  const { deps } = await setup({ mutate: (b) => (b.gateway_attestation.event_log = bad) });
  await assert.rejects(assertAttestationOrThrow(MODEL, deps), (error: unknown) => {
    assert.ok(error instanceof AttestationError);
    assert.ok(!JSON.stringify(error.checks).includes("SECRET-EVENT-NAME"));
    return true;
  });
});

test("measurements must be on the allowlist: MRTD, RTMR0-2 and compose hash", async () => {
  await assertFails({ quote: { mrTd: "ee".repeat(48) } }, "os_measurements_pinned");
  await assertFails({ quote: { rtMr0: "ee".repeat(48) } }, "os_measurements_pinned");
  await assertFails({ quote: { rtMr1: "ee".repeat(48) } }, "os_measurements_pinned");
  await assertFails({ quote: { rtMr2: "ee".repeat(48) } }, "os_measurements_pinned");
  await assertFails({ quote: { mrTd: "" } }, "os_measurements_pinned");
  // Self-consistent report (MRCONFIGID matches its own compose) whose compose is not allowlisted.
  const other = '{"docker_compose_file":"services: {logger: {}}"}';
  await assertFails(
    {
      mutate: (b) => (b.model_attestations[0].info = { tcb_info: { app_compose: other } }),
      quote: { mrConfigId: expectedMrConfigId(other).toString("hex") },
    },
    "compose_hash_pinned",
  );
});

test("composeTemplateHash masks only well-formed INSTANCE_LABEL values", () => {
  const compose = (label: string, image = "img@sha256:aa") =>
    JSON.stringify({ docker_compose_file: `services:\n  m:\n    image: ${image}\n    environment:\n      - INSTANCE_LABEL=${label}\n` });
  assert.equal(composeTemplateHash(compose("gpu13")), composeTemplateHash(compose("cm-gpu32-g7")));
  assert.notEqual(composeTemplateHash(compose("gpu13")), composeTemplateHash(compose("gpu13", "img@sha256:bb")));
  assert.notEqual(composeTemplateHash(compose("gpu13")), composeTemplateHash(compose("gpu13\n    image: evil")));
  assert.equal(composeTemplateHash(APP_COMPOSE), COMPOSE_HASH);
});

test("pins are per role and per OS tuple: no mix-and-match", async () => {
  const otherOs = { mrTd: "b1".repeat(48), rtMr0: "b2".repeat(48), rtMr1: "b3".repeat(48), rtMr2: "b4".repeat(48) };
  // Gateway pinned to a different OS image or compose than the one it presents: only the gateway fails.
  for (const gateway of [
    { os: [otherOs], composeTemplates: [COMPOSE_HASH] },
    { os: [OS], composeTemplates: ["cd".repeat(32)] },
  ]) {
    const env = { ...ENV, [TRUSTED_MEASUREMENTS_ENV]: JSON.stringify({ ...TRUSTED, gateway }) };
    const { deps } = await setup({ env });
    await assert.rejects(assertAttestationOrThrow(MODEL, deps), (error: unknown) => {
      assert.ok(error instanceof AttestationError);
      const failed = error.checks.filter((c) => !c.ok).map((c) => `${c.report}:${c.name}`);
      const expected = gateway.os[0] === OS ? "gateway:compose_hash_pinned" : "gateway:os_measurements_pinned";
      assert.deepEqual(failed, [expected]);
      return true;
    });
  }
  const split = { ...TRUSTED, model: { ...TRUSTED.model, os: [{ ...OS, rtMr2: otherOs.rtMr2 }, { ...otherOs, rtMr2: OS.rtMr2 }] } };
  await assertFails({ env: { ...ENV, [TRUSTED_MEASUREMENTS_ENV]: JSON.stringify(split) } }, "os_measurements_pinned");
});

test("without an override, the built-in allowlist is enforced", async () => {
  await assertFails({ env: { NEARAI_API_KEY: "test-key" } }, "os_measurements_pinned");
  assert.equal(loadTrustedMeasurements({}), DEFAULT_TRUSTED_MEASUREMENTS);
  assert.ok(DEFAULT_TRUSTED_MEASUREMENTS.model.composeTemplates.length >= 2);
});

test("malformed trusted-measurements config fails closed before any request", async () => {
  for (const bad of ["{", "{}", JSON.stringify({ gateway: TRUSTED.gateway, model: { os: [], composeTemplates: [COMPOSE_HASH] } }), JSON.stringify({ ...TRUSTED, model: { os: [{ ...OS, mrTd: "zz" }], composeTemplates: [COMPOSE_HASH] } })]) {
    const { deps, urls } = await setup({ env: { ...ENV, [TRUSTED_MEASUREMENTS_ENV]: bad } });
    await assert.rejects(assertAttestationOrThrow(MODEL, deps), (error: unknown) => {
      assert.ok(error instanceof AttestationError);
      assert.ok(error.checks.some((c) => c.name === "trusted_measurements" && !c.ok));
      return true;
    });
    assert.equal(urls.length, 0);
  }
});

test("model report without nvidia_payload fails; gateway without one passes", async () => {
  const urls = await assertFails({ mutate: (b) => delete b.model_attestations[0].nvidia_payload }, "nvidia_gpu");
  assert.ok(!urls.some((u) => u.startsWith(NVIDIA_NRAS_URL)));
  const { deps } = await setup({ mutate: (b) => delete b.model_attestations[0].nvidia_payload });
  await assert.rejects(assertAttestationOrThrow(MODEL, deps), (error: unknown) => {
    assert.ok(error instanceof AttestationError);
    assert.ok(error.checks.some((c) => c.report === "model[0]" && c.name === "nvidia_gpu" && c.detail === "gpu_payload_missing"));
    return true;
  });
});

test("non-ecdsa or malformed signer is rejected", () => {
  const nonce = "0".repeat(64);
  assert.throws(
    () => extractSigningAddresses({ gateway_attestation: report(GATEWAY_ADDR, nonce), model_attestations: [report("0x1234", nonce)] }),
    AttestationError,
  );
});

test("attestation module makes no chat completion calls", () => {
  for (const file of ["attestation.ts", "tdx.ts"]) {
    const source = readFileSync(path.join(process.cwd(), "lib/near-ai", file), "utf8");
    assert.ok(!source.includes("chat/completions"), file);
  }
});
