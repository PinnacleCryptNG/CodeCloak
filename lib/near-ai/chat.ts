/**
 * Server-only NEAR AI Cloud chat completion + response-signature verification.
 *
 * Docs:
 * - https://docs.near.ai/cloud/quickstart (POST /v1/chat/completions)
 * - https://docs.near.ai/cloud/verification/cloud-api/response-signatures
 * - https://github.com/near-examples/nearai-cloud-verification-example (utils/api.js, signature retry on 404)
 *
 * Zero retention: request/response bytes live only in local variables for the duration of one
 * call; only their SHA-256 hashes are returned. Nothing here logs, and errors carry fixed codes only.
 */
import { createHash } from "node:crypto";
import { verifyMessage } from "ethers";
import { getApiKey, NEARAI_BASE_URL, type VerifiedAttestation } from "./attestation";

if (typeof window !== "undefined") {
  throw new Error("lib/near-ai/chat is server-only");
}

export const DEFAULT_MODEL = "Qwen/Qwen3.8-27B";

export type ChatDeps = {
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
  sleep?: (ms: number) => Promise<void>;
};

export type ChatMessage = { role: "system" | "user"; content: string };

export class ChatError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "ChatError";
    this.code = code;
  }
}

export type Completion = {
  chatId: string;
  model: string;
  content: string;
  requestHash: string;
  responseHash: string;
};

const sha256Hex = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

export function resolveModel(env: Record<string, string | undefined> = process.env): string {
  return env.NEARAI_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Non-streaming completion with the canonical model id and x-no-aliasing, so the model TEE
 * (not the gateway) signs `<MODEL_ID>:<request_hash>:<response_hash>`. Hashes cover the exact
 * request bytes we sent and the exact (uncompressed) response bytes we received, before parsing.
 */
export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  deps: ChatDeps = {},
): Promise<Completion> {
  const apiKey = getApiKey(deps.env);
  // Qwen3 reasoning otherwise spends the whole max_tokens budget before any answer (observed live: content null,
  // finish_reason "length"). The flag is part of the hashed request bytes, so signature binding is unchanged.
  const requestBody = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.2,
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
  });
  let response: Response;
  try {
    response = await (deps.fetch ?? fetch)(`${NEARAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-no-aliasing": "true",
      },
      body: requestBody,
    });
  } catch {
    throw new ChatError("completion_network_error");
  }
  if (!response.ok) throw new ChatError(`completion_http_${response.status}`);
  const raw = new Uint8Array(await response.arrayBuffer());
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new ChatError("completion_invalid_json");
  }
  if (!json || typeof json !== "object" || !Array.isArray((json as { choices?: unknown }).choices)) {
    throw new ChatError("completion_malformed");
  }
  const parsed = json as { id?: unknown; model?: unknown; choices: { message?: { content?: unknown } }[] };
  const first = parsed.choices[0];
  const content = first && typeof first === "object" ? first.message?.content : undefined;
  if (typeof parsed.id !== "string" || !parsed.id || typeof content !== "string") {
    throw new ChatError("completion_malformed");
  }
  return {
    chatId: parsed.id,
    model: typeof parsed.model === "string" ? parsed.model : model,
    content,
    requestHash: sha256Hex(requestBody),
    responseHash: sha256Hex(raw),
  };
}

export type RawSignature = {
  text?: unknown;
  signature?: unknown;
  signing_address?: unknown;
  signing_algo?: unknown;
  signature_kind?: unknown;
  error_code?: unknown;
};

/** GET /v1/signature/{chatId}; bounded retry on 404; a 2xx with error_code is "unavailable" (null). */
export async function fetchSignature(
  chatId: string,
  model: string,
  deps: ChatDeps = {},
  attempts = 5,
  delayMs = 1000,
): Promise<RawSignature | null> {
  const apiKey = getApiKey(deps.env);
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const url = new URL(`${NEARAI_BASE_URL}/signature/${encodeURIComponent(chatId)}`);
  url.search = new URLSearchParams({ model, signing_algo: "ecdsa" }).toString();
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response: Response;
    try {
      response = await (deps.fetch ?? fetch)(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "x-no-aliasing": "true" },
      });
    } catch {
      return null;
    }
    if (response.status === 404 && attempt < attempts) {
      await sleep(delayMs);
      continue;
    }
    if (!response.ok) return null;
    try {
      const body = (await response.json()) as RawSignature;
      return body && typeof body === "object" && body.error_code === undefined ? body : null;
    } catch {
      return null;
    }
  }
  return null;
}

export type SignatureVerification = {
  status: "verified" | "unverified";
  reason: string;
  signatureKind: "provider_tee" | "gateway" | "unavailable";
  signingAddress: string | null;
  signerMatchesPreflight: boolean;
  requestHash: string;
  responseHash: string;
};

/**
 * Recover the EIP-191 signer, check the signed text against our own hashes, and require the signer
 * to match a report verified BEFORE the completion (provider_tee → exactly one model report;
 * gateway → the gateway report). Anything else is "unverified" — never a green badge.
 */
export function verifySignature(
  signature: RawSignature | null,
  completion: Pick<Completion, "requestHash" | "responseHash">,
  requestModel: string,
  attestation: VerifiedAttestation,
): SignatureVerification {
  const base = { requestHash: completion.requestHash, responseHash: completion.responseHash };
  const fail = (reason: string, kind: SignatureVerification["signatureKind"] = "unavailable", address: string | null = null) =>
    ({ ...base, status: "unverified", reason, signatureKind: kind, signingAddress: address, signerMatchesPreflight: false }) as const;

  if (!signature) return fail("signature_unavailable");
  const { text, signature: sig, signing_address: address, signing_algo: algo, signature_kind: kind } = signature;
  if (kind !== "provider_tee" && kind !== "gateway") return fail("unknown_signature_kind");
  if (typeof text !== "string" || typeof sig !== "string" || typeof address !== "string") return fail("signature_malformed", kind);
  if (algo !== "ecdsa") return fail("unsupported_signing_algo", kind, address);

  let recovered: string;
  try {
    recovered = verifyMessage(text, sig);
  } catch {
    return fail("signature_invalid", kind, address);
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) return fail("signer_mismatch", kind, address);

  const expectedText =
    kind === "provider_tee"
      ? `${requestModel}:${completion.requestHash}:${completion.responseHash}`
      : `${completion.requestHash}:${completion.responseHash}`;
  if (text !== expectedText) return fail("signed_text_mismatch", kind, address);

  const same = (r: { signingAddress: string; signingAlgo: string }) =>
    r.signingAlgo === "ecdsa" && r.signingAddress.toLowerCase() === address.toLowerCase();
  const matches = kind === "provider_tee" ? attestation.models.filter(same).length : same(attestation.gateway) ? 1 : 0;
  if (matches !== 1) return fail("signer_not_in_preflight", kind, address);

  return { ...base, status: "verified", reason: "ok", signatureKind: kind, signingAddress: address, signerMatchesPreflight: true };
}

export const SEVERITIES = ["high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];
export type Finding = { id: string; severity: Severity; title: string; file: string; line_hint: string; detail: string };
export type AgentOutput = { agent: string; findings: Finding[]; summary: string; parseError?: true };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Extract the agent JSON from model text (tolerates <think> blocks and ``` fences); never throws. */
export function parseAgentOutput(agent: string, content: string): AgentOutput {
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  let raw: { findings?: unknown; summary?: unknown };
  try {
    raw = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return { agent, findings: [], summary: "", parseError: true };
  }
  // "No findings" must be an explicit empty array; anything else is unreadable, never "clean".
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.findings)) return { agent, findings: [], summary: "", parseError: true };
  const findings = (raw.findings as Record<string, unknown>[]).slice(0, 12).map((f: Record<string, unknown>, i): Finding => ({
    id: str(f?.id, 16) || `${agent[0].toUpperCase()}${i + 1}`,
    severity: (SEVERITIES as readonly string[]).includes(f?.severity as string) ? (f.severity as Severity) : "info",
    title: str(f?.title, 200),
    file: str(f?.file, 200),
    line_hint: str(f?.line_hint, 200),
    detail: str(f?.detail, 1200),
  }));
  return { agent, findings, summary: str(raw.summary, 1200) };
}
