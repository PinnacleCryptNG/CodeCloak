/**
 * POST /api/review — fail-closed private code review (Task 04: security agent only).
 *
 * Flow (SPEC.md C): attestation preflight → ONLY THEN chat completion → response signature check.
 * Docs: https://docs.near.ai/cloud/verification · https://docs.near.ai/cloud/verification/cloud-api/response-signatures
 *
 * ZERO RETENTION:
 * - Submitted code exists only in this request's memory; no DB, no disk writes, no analytics.
 * - Nothing in this route logs. No request/response bodies, prompts or code appear in logs or errors:
 *   every error response is a fixed code (plus attestation check names), never upstream text.
 * - The response may include SHA-256 of the reviewed text, never the text itself.
 * - NEARAI_API_KEY is read server-side only and never placed in any response.
 */
import { createHash } from "node:crypto";
import { AttestationError, assertAttestationOrThrow, type VerifiedAttestation } from "@/lib/near-ai/attestation";
import { ChatError, chatCompletion, fetchSignature, parseAgentOutput, resolveModel, verifySignature } from "@/lib/near-ai/chat";
import { SECURITY_SYSTEM_PROMPT, buildReviewMessage, newDelimiter, type ReviewFile } from "@/lib/near-ai/prompts/security";
import { isSampleId, loadSample } from "@/lib/samples";

// Node.js runtime is the default (Cache Components forbids the `runtime` export).
export const maxDuration = 60;

const MAX_CODE_BYTES = 80 * 1024;
const MAX_BODY_BYTES = 100 * 1024;
const MAX_TOKENS = 3000;

const error = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  Response.json({ error: code, ...extra }, { status, headers: { "Cache-Control": "no-store" } });

type Input = { ok: true; mode: "demo" | "paste"; files: ReviewFile[] } | { ok: false; status: number; code: string };

function parseInput(body: unknown): Input {
  if (!body || typeof body !== "object") return { ok: false, status: 400, code: "invalid_request" };
  const { mode, sampleId, code } = body as Record<string, unknown>;
  if (mode === "demo") {
    if (!isSampleId(sampleId)) return { ok: false, status: 400, code: "unknown_sample" };
    return { ok: true, mode, files: loadSample(sampleId).files };
  }
  if (mode === "paste") {
    if (typeof code !== "string" || code.trim() === "") return { ok: false, status: 400, code: "code_required" };
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) return { ok: false, status: 413, code: "code_too_large" };
    if (code.includes("\u0000")) return { ok: false, status: 415, code: "binary_not_supported" };
    return { ok: true, mode, files: [{ name: "pasted", content: code }] };
  }
  return { ok: false, status: 400, code: "invalid_mode" };
}

/** Reads at most `max` bytes; stops (returns null) as soon as the body is larger, so oversized uploads never sit in memory. */
async function readCapped(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * SHA-256 of the reviewed text. Paste: SHA-256 of exactly the pasted code. Demo: SHA-256 of each file as
 * `<name>\n<content>`, joined with "\n", in sample order.
 */
function reviewedDigest(files: ReviewFile[], mode: "demo" | "paste"): string {
  const text = mode === "paste" ? files[0].content : files.map((f) => `${f.name}\n${f.content}`).join("\n");
  return createHash("sha256").update(text).digest("hex");
}

function publicAttestation(a: VerifiedAttestation) {
  const report = (r: VerifiedAttestation["gateway"]) => ({
    report: r.report,
    signingAddress: r.signingAddress,
    signingAlgo: r.signingAlgo,
    tcbStatus: r.tcbStatus,
    nvidia: r.gpu === "not_present" ? "not_present" : "verified",
  });
  return {
    model: a.model,
    nonce: a.nonce,
    verifiedAt: a.verifiedAt,
    verifier: "Intel TDX quote (dcap-qvl) + RTMR3 replay + MRCONFIGID + NVIDIA NRAS",
    gateway: report(a.gateway),
    models: a.models.map(report),
    checks: a.checks,
  };
}

export async function POST(request: Request): Promise<Response> {
  const env = process.env;
  if (!env.NEARAI_API_KEY && !env.NEARAI_CLOUD_API_KEY) return error(500, "server_not_configured");

  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return error(413, "body_too_large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "invalid_json");
  }
  const input = parseInput(body);
  if (!input.ok) return error(input.status, input.code);

  const model = resolveModel(env);

  // 1. Fail closed: no code leaves this server unless every attestation check passes.
  let attestation: VerifiedAttestation;
  try {
    attestation = await assertAttestationOrThrow(model);
  } catch (e) {
    const checks = e instanceof AttestationError ? e.checks : [{ report: "preflight", name: "unexpected", ok: false }];
    return error(403, "attestation_failed", { checks });
  }

  // 2. Only now send the (delimited, untrusted) code to the attested model.
  const userMessage = buildReviewMessage(input.files, newDelimiter());
  const reviewedSha256 = reviewedDigest(input.files, input.mode);
  let completion;
  try {
    completion = await chatCompletion(
      model,
      [
        { role: "system", content: SECURITY_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      MAX_TOKENS,
    );
  } catch (e) {
    return error(502, e instanceof ChatError ? e.code : "completion_failed");
  }

  // 3. Response signature, bound to our exact bytes and to the preflight-verified signer.
  const signature = verifySignature(await fetchSignature(completion.chatId, model), completion, model, attestation);
  const output = parseAgentOutput("security", completion.content);

  return Response.json(
    {
      agent: "security",
      findings: output.findings,
      summary: output.summary,
      ...(output.parseError ? { parseError: true } : {}),
      verified: {
        ...publicAttestation(attestation),
        completion: { chatId: completion.chatId, model: completion.model, signature },
        reviewedSha256,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
