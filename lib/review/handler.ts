/**
 * Fail-closed private multi-agent code review (served by app/api/review/route.ts).
 *
 * Flow (SPEC.md C + D): same-origin + size + type checks → per-IP rate limit → ONE attestation preflight →
 * ONLY THEN the auditor swarm (3 auditors ∥ → 3 challenges ∥ → moderator, max 7 calls) → every completion's
 * response signature checked against the preflight reports.
 * Docs: https://docs.near.ai/cloud/verification · https://docs.near.ai/cloud/verification/cloud-api/response-signatures
 *
 * ZERO RETENTION:
 * - Submitted code exists only in this request's memory; no DB, no disk writes, no analytics.
 * - Nothing here logs. Every failure goes through safeError(): a fixed code + fixed message (plus sanitised
 *   attestation check names), never upstream text, exception messages or code.
 * - The response may include SHA-256 of the reviewed text, never the text itself.
 * - NEARAI_API_KEY is read server-side only and never placed in any response.
 */
import { createHash } from "node:crypto";
import { AttestationError, assertAttestationOrThrow, type AttestationDeps, type VerifiedAttestation } from "@/lib/near-ai/attestation";
import { resolveModel, type ChatDeps } from "@/lib/near-ai/chat";
import type { ReviewFile } from "@/lib/near-ai/prompts/common";
import { runSwarm, type SwarmStage } from "@/lib/near-ai/swarm";
import { MAX_BODY_BYTES, MAX_CODE_BYTES, safeError, safeErrorBody } from "@/lib/errors";
import { clientKey, createRateLimiter, REVIEW_RATE_LIMIT, type RateLimiter } from "@/lib/rate-limit";
import type { ReviewResponse, VerifiedPayload } from "@/lib/types";
import { isSampleId, loadSample } from "@/lib/samples";

export type ReviewDeps = {
  env?: Record<string, string | undefined>;
  attestation?: AttestationDeps;
  chat?: ChatDeps;
  rateLimiter?: RateLimiter;
};

const defaultLimiter = createRateLimiter(REVIEW_RATE_LIMIT);

type Input = { ok: true; mode: "demo" | "paste"; files: ReviewFile[] } | { ok: false; code: string };

function parseInput(body: unknown): Input {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, code: "invalid_request" };
  const { mode, sampleId, code } = body as Record<string, unknown>;
  if (mode === "demo") {
    if (!isSampleId(sampleId)) return { ok: false, code: "unknown_sample" };
    return { ok: true, mode, files: loadSample(sampleId).files };
  }
  if (mode === "paste") {
    if (typeof code !== "string" || code.trim() === "") return { ok: false, code: "code_required" };
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) return { ok: false, code: "code_too_large" };
    if (code.includes("\u0000")) return { ok: false, code: "binary_not_supported" };
    return { ok: true, mode, files: [{ name: "pasted", content: code }] };
  }
  return { ok: false, code: "invalid_mode" };
}

/** Browsers always send Origin / Sec-Fetch-Site on cross-site POSTs; reject those. Non-browser clients are rate limited. */
function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
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

function publicAttestation(a: VerifiedAttestation): Omit<VerifiedPayload, "completions" | "allSignaturesVerified" | "reviewedSha256"> {
  const report = (r: VerifiedAttestation["gateway"]) => ({
    report: r.report,
    signingAddress: r.signingAddress,
    signingAlgo: r.signingAlgo,
    tcbStatus: r.tcbStatus,
    nvidia: r.gpu === "not_present" ? ("not_present" as const) : ("verified" as const),
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

export async function handleReview(request: Request, deps: ReviewDeps = {}): Promise<Response> {
  try {
    return await review(request, deps);
  } catch {
    return safeError("internal_error");
  }
}

async function review(request: Request, deps: ReviewDeps): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!env.NEARAI_API_KEY?.trim() && !env.NEARAI_CLOUD_API_KEY?.trim()) return safeError("server_not_configured");
  if (!sameOrigin(request)) return safeError("origin_not_allowed");

  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return safeError("body_too_large", { limit_bytes: MAX_CODE_BYTES });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return safeError("invalid_json");
  }
  const input = parseInput(body);
  if (!input.ok) return safeError(input.code, input.code === "code_too_large" ? { limit_bytes: MAX_CODE_BYTES } : {});

  const limited = (deps.rateLimiter ?? defaultLimiter).take(clientKey(request, env));
  if (!limited.ok) return safeError("rate_limited", { retry_after_s: limited.retryAfterS });

  const model = resolveModel(env);

  // 1. Fail closed: no code leaves this server unless every attestation check passes.
  let attestation: VerifiedAttestation;
  try {
    attestation = await assertAttestationOrThrow(model, { env, ...deps.attestation });
  } catch (e) {
    const checks = e instanceof AttestationError ? e.checks : [{ report: "preflight", name: "unexpected", ok: false }];
    return safeError("attestation_failed", { checks });
  }

  // 2. Only now send the (delimited, untrusted) code to the attested model(s).
  const reviewedSha256 = reviewedDigest(input.files, input.mode);
  const run = async (onStage?: (stage: SwarmStage) => void): Promise<ReviewResponse | { error: string }> => {
    const swarm = await runSwarm(input.files, model, attestation, { env, ...deps.chat }, onStage);
    if (swarm.completions.filter((c) => c.round === "audit").every((c) => c.error)) {
      return { error: swarm.completions[0]?.error ?? "completion_failed" };
    }
    // 3. Each completion carries its own signature verdict; the panel is green only if all verified.
    return {
      agents: swarm.agents,
      challenges: swarm.challenges,
      verified: {
        ...publicAttestation(attestation),
        completions: swarm.completions,
        allSignaturesVerified: swarm.completions.every((c) => c.signature?.status === "verified"),
        reviewedSha256,
      },
    };
  };

  if (!request.headers.get("accept")?.includes("application/x-ndjson")) {
    const result = await run();
    return "error" in result ? safeError(result.error) : Response.json(result, { headers: { "Cache-Control": "no-store" } });
  }

  // Progress stream for the UI: stage names only, then the final result. Attestation already passed.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        send({ stage: "auditors" });
        const result = await run((stage) => send({ stage }));
        send("error" in result ? safeErrorBody(result.error) : { result });
      } catch {
        send(safeErrorBody("review_failed"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
