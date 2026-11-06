/**
 * safeError() — the only way /api/review reports failures (SPEC.md "Zero retention").
 * Every public error is a fixed code + fixed human message from the table below. Upstream bodies, exception
 * messages, request text and user code never reach a response or a log line; unknown codes become `internal_error`.
 */
import type { Check } from "@/lib/near-ai/attestation";

export const MAX_CODE_BYTES = 80 * 1024;
export const MAX_BODY_BYTES = 100 * 1024;

const COMPLETION_FAILED = "The model call failed after attestation passed, so no review was produced. Nothing was stored.";

const PUBLIC_ERRORS = {
  invalid_json: [400, "Request body is not valid JSON."],
  invalid_request: [400, "Request body must be a JSON object."],
  invalid_mode: [400, 'mode must be "demo" or "paste".'],
  unknown_sample: [400, "Unknown sample. Use vuln-auth, vuln-sql, vuln-path or vuln-inject."],
  code_required: [400, "Paste some code to review."],
  code_too_large: [413, "Pasted code is over the 80 KB limit. Trim it and try again."],
  body_too_large: [413, "Request is over the 100 KB limit. Pasted code may be at most 80 KB."],
  binary_not_supported: [415, "Binary content is not supported. Paste text source only."],
  origin_not_allowed: [403, "Cross-origin requests are not allowed. Use the CodeCloak page on this site."],
  rate_limited: [429, "Too many reviews from your address. Wait a few minutes and try again."],
  attestation_failed: [403, "Enclave attestation failed, so your code was never sent to a model."],
  server_not_configured: [500, "The server has no NEAR AI API key configured."],
  completion_failed: [502, COMPLETION_FAILED],
  completion_network_error: [502, COMPLETION_FAILED],
  completion_invalid_json: [502, COMPLETION_FAILED],
  completion_malformed: [502, COMPLETION_FAILED],
  review_failed: [500, "Review failed unexpectedly. Nothing was stored."],
  internal_error: [500, "Review failed unexpectedly. Nothing was stored."],
} as const satisfies Record<string, readonly [number, string]>;

export type PublicErrorCode = keyof typeof PUBLIC_ERRORS | `completion_http_${number}`;
export type SafeErrorBody = { error: PublicErrorCode; message: string; checks?: Check[]; limit_bytes?: number; retry_after_s?: number };
type Extra = { checks?: readonly Check[]; limit_bytes?: number; retry_after_s?: number };

const CHECK_REPORT = /^[a-z]{1,16}(\[\d{1,3}\])?$/;
const TOKEN = /^[a-z0-9_]{1,64}$/;

function normalise(code: string): { code: PublicErrorCode; status: number; message: string } {
  if (Object.hasOwn(PUBLIC_ERRORS, code)) {
    const [status, message] = PUBLIC_ERRORS[code as keyof typeof PUBLIC_ERRORS];
    return { code: code as PublicErrorCode, status, message };
  }
  const http = /^completion_http_(\d{3})$/.exec(code);
  if (http) {
    const hint = http[1] === "402" ? " NEAR AI reports no credits or spending limit on this account." : "";
    return { code: code as PublicErrorCode, status: 502, message: `${COMPLETION_FAILED} (NEAR AI HTTP ${http[1]}.)${hint}` };
  }
  return { code: "internal_error", status: 500, message: PUBLIC_ERRORS.internal_error[1] };
}

/** Attestation checks carry only fixed identifiers; anything else is dropped or replaced. */
function sanitiseChecks(checks: readonly Check[]): Check[] {
  return checks.slice(0, 64).map((c) => ({
    report: CHECK_REPORT.test(String(c.report)) ? c.report : "report",
    name: TOKEN.test(String(c.name)) ? c.name : "check",
    ok: c.ok === true,
    ...(c.detail !== undefined ? { detail: TOKEN.test(String(c.detail)) ? c.detail : "failed" } : {}),
  }));
}

export function safeErrorBody(code: string, extra: Extra = {}): SafeErrorBody {
  const n = normalise(code);
  const body: SafeErrorBody = { error: n.code, message: n.message };
  if (extra.checks) body.checks = sanitiseChecks(extra.checks);
  if (Number.isSafeInteger(extra.limit_bytes)) body.limit_bytes = extra.limit_bytes;
  if (Number.isSafeInteger(extra.retry_after_s)) body.retry_after_s = extra.retry_after_s;
  return body;
}

export function safeError(code: string, extra: Extra = {}): Response {
  const body = safeErrorBody(code, extra);
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (body.retry_after_s !== undefined) headers["Retry-After"] = String(body.retry_after_s);
  return Response.json(body, { status: normalise(code).status, headers });
}
