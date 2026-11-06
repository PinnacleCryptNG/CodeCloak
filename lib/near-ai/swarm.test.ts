import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Wallet } from "ethers";
import type { VerifiedAttestation } from "./attestation";
import { MAX_CALLS, contestedFindings, mergeDisagreements, parseChallengeOutput, parseModeratorOutput, runSwarm } from "./swarm";

const MODEL = "Qwen/Qwen3.8-27B";
const env = { NEARAI_API_KEY: "test-key" };
const wallet = Wallet.createRandom();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const attestation = {
  model: MODEL,
  nonce: "0".repeat(64),
  verifiedAt: new Date().toISOString(),
  gateway: { report: "gateway", signingAddress: Wallet.createRandom().address, signingAlgo: "ecdsa", tcbStatus: "UpToDate", advisoryIds: [], gpu: "not_present" },
  models: [{ report: "model[0]", signingAddress: wallet.address, signingAlgo: "ecdsa", tcbStatus: "UpToDate", advisoryIds: [], gpu: "not_present" }],
  checks: [],
} as unknown as VerifiedAttestation;
const files = [{ name: "a.ts", content: "export const x = 1;" }];

function agentOf(system: string): string {
  if (system.startsWith("CHALLENGE ROUND")) return `challenge:${/You are "(\w+)"/.exec(system)![1]}`;
  return /You are "(\w+)"/.exec(system)![1];
}

const REPLIES: Record<string, unknown> = {
  security: { agent: "security", findings: [{ id: "S1", severity: "high", title: "alg none accepted", file: "a.ts", line_hint: "1", detail: "d" }], summary: "s" },
  breaking: { agent: "breaking", findings: [{ id: "B1", severity: "medium", title: "throws on empty", file: "a.ts", line_hint: "1", detail: "d" }], summary: "s" },
  quality: { agent: "quality", findings: [], summary: "clean" },
  "challenge:security": { agent: "security", votes: [{ finding_id: "B1", stance: "dispute", reason: "not reachable" }] },
  "challenge:breaking": { agent: "breaking", votes: [{ finding_id: "S1", stance: "back", reason: "agree" }] },
  "challenge:quality": { agent: "quality", votes: [{ finding_id: "S1", stance: "back", reason: "ok" }, { finding_id: "B1", stance: "back", reason: "ok" }] },
  // Moderator tries to flatten everything into agreement.
  moderator: { agent: "moderator", consensus: [{ severity: "high", title: "alg none", agreed_by: ["security", "breaking", "quality"], detail: "d" }], disagreements: [], confidence: 140, summary: "all agree" },
};

function fakeNear(opts: { fail?: string } = {}) {
  const order: string[] = [];
  let inFlight = 0;
  let maxAuditInFlight = 0;
  const signed = new Map<string, string>();
  let n = 0;
  const fetchStub = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/signature/")) {
      const id = decodeURIComponent(u.split("/signature/")[1].split("?")[0]);
      const text = signed.get(id)!;
      return Response.json({ text, signature: await wallet.signMessage(text), signing_address: wallet.address, signing_algo: "ecdsa", signature_kind: "provider_tee" });
    }
    assert.ok(u.endsWith("/chat/completions"));
    const req = String(init!.body);
    const agent = agentOf(JSON.parse(req).messages[0].content);
    order.push(agent);
    inFlight++;
    if (!agent.includes(":") && agent !== "moderator") maxAuditInFlight = Math.max(maxAuditInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    if (opts.fail === agent) return new Response("upstream secret", { status: 500 });
    const id = `chat-${++n}`;
    const res = JSON.stringify({ id, model: MODEL, choices: [{ message: { content: JSON.stringify(REPLIES[agent]) } }] });
    signed.set(id, `${MODEL}:${sha(req)}:${sha(res)}`);
    return new Response(res, { status: 200 });
  }) as unknown as typeof fetch;
  return { fetchStub, order, maxAuditInFlight: () => maxAuditInFlight };
}

test("swarm: 3 parallel auditors → 3 challenges → moderator; four blocks; every signature verified", async () => {
  const near = fakeNear();
  const r = await runSwarm(files, MODEL, attestation, { fetch: near.fetchStub, env });
  assert.deepEqual(Object.keys(r.agents), ["security", "breaking", "quality", "moderator"]);
  assert.equal(near.maxAuditInFlight(), 3);
  assert.equal(near.order.length, MAX_CALLS);
  assert.deepEqual(near.order.slice(0, 3).sort(), ["breaking", "quality", "security"]);
  assert.equal(near.order.at(-1), "moderator");
  assert.equal(r.completions.length, 7);
  assert.ok(r.completions.every((c) => c.signature?.status === "verified"));
  assert.equal(r.agents.moderator.confidence, 100);
});

test("swarm: moderator cannot flatten a real dispute — contested findings are added to disagreements", async () => {
  const r = await runSwarm(files, MODEL, attestation, { fetch: fakeNear().fetchStub, env });
  const d = r.agents.moderator.disagreements;
  assert.equal(d.length, 1);
  assert.match(d[0].topic, /^B1: /);
  assert.match(d[0].positions.security, /^dispute: not reachable/);
  assert.match(d[0].positions.breaking, /^raised \(medium\)/);
});

test("swarm: a failed auditor is reported with a fixed code and the swarm continues", async () => {
  const r = await runSwarm(files, MODEL, attestation, { fetch: fakeNear({ fail: "breaking" }).fetchStub, env });
  assert.equal(r.agents.breaking.error, "completion_http_500");
  assert.ok(!JSON.stringify(r).includes("upstream secret"));
  assert.equal(r.agents.security.findings.length, 1);
  assert.equal(r.completions.find((c) => c.agent === "breaking")?.signature, null);
});

test("mergeDisagreements keeps moderator entries and does not duplicate covered ids", () => {
  const contested = [{ topic: "B1: throws", positions: {} }, { topic: "S2: x", positions: {} }];
  const merged = mergeDisagreements([{ topic: "B1: ruled minor", positions: { quality: "minor" } }], contested);
  assert.deepEqual(merged.map((d) => d.topic), ["B1: ruled minor", "S2: x"]);
  assert.equal(contestedFindings([], []).length, 0);
  assert.equal(parseModeratorOutput("garbage").parseError, true);
});

test("mergeDisagreements: only a topic's leading ID counts as coverage", () => {
  const merged = mergeDisagreements([{ topic: "B1: related to S1", positions: {} }], [
    { topic: "B1: crash", positions: {} },
    { topic: "S1: unsafe input", positions: {} },
  ]);
  assert.deepEqual(merged.map((d) => d.topic), ["B1: related to S1", "S1: unsafe input"]);
});

test("parseChallengeOutput: invalid stances are never agreement; missing votes are reported", () => {
  const ids = new Set(["S1", "B1"]);
  const c = parseChallengeOutput("quality", '{"votes":[{"finding_id":"B1","stance":"disputed","reason":"x"},{"finding_id":"S1","stance":"back","reason":"ok"},{"finding_id":"S1","stance":"dispute","reason":"dup"}]}', ids);
  assert.deepEqual(c.votes, [{ finding_id: "S1", stance: "dispute", reason: "conflicting votes; dispute: dup" }]);
  assert.deepEqual(c.missing, ["B1"]);
  assert.deepEqual(parseChallengeOutput("quality", "nope", ids).missing, ["S1", "B1"]);
  const contested = contestedFindings(
    [{ agent: "breaking", findings: [{ id: "B1", severity: "medium", title: "t", file: "", line_hint: "", detail: "d" }], summary: "" }],
    [{ agent: "security", votes: [{ finding_id: "B1", stance: "dispute", reason: "no" }] }, c],
  );
  assert.match(contested[0].positions.quality, /^no valid vote/);
});

test("parseChallengeOutput: back+dispute on one finding stays a dispute in either order", () => {
  const ids = new Set(["B1"]);
  for (const order of [["back", "dispute"], ["dispute", "back"]]) {
    const c = parseChallengeOutput("quality", JSON.stringify({ votes: order.map((stance) => ({ finding_id: "B1", stance, reason: stance })) }), ids);
    assert.equal(c.votes.length, 1);
    assert.equal(c.votes[0].stance, "dispute");
    const contested = contestedFindings(
      [{ agent: "breaking", findings: [{ id: "B1", severity: "low", title: "t", file: "", line_hint: "", detail: "d" }], summary: "" }],
      [c],
    );
    assert.equal(contested.length, 1);
  }
});

test("swarm: a failed challenge call is reported as unreadable with every expected vote missing", async () => {
  const r = await runSwarm(files, MODEL, attestation, { fetch: fakeNear({ fail: "challenge:security" }).fetchStub, env });
  const sec = r.challenges.find((c) => c.agent === "security")!;
  assert.equal(sec.parseError, true);
  assert.ok(sec.missing && sec.missing.length > 0);
});

test("swarm: a failed auditor's challenge votes are reported missing", async () => {
  const r = await runSwarm(files, MODEL, attestation, { fetch: fakeNear({ fail: "breaking" }).fetchStub, env });
  const br = r.challenges.find((c) => c.agent === "breaking")!;
  assert.ok(br.missing && br.missing.length > 0);
});
