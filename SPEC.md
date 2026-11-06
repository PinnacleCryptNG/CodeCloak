# CodeCloak — SPEC.md

Product: Private multi-agent code review on NEAR AI Cloud. Tracks: `privacy`, `security`, `swarms`. Deadline: Sun 15 Nov 2026 00:59 WAT (14 Nov 23:59 UTC).

## Users
1. Judge / demo visitor — clicks Demo, runs a sample, sees Verified panel + swarm disagreement → consensus. No API key in browser.
2. Builder — owns `NEARAI_API_KEY` on Vercel.
3. Claude Code / Codex screener — follows README "do X → see Y".

## Flows
A. Demo (default): pick `vuln-auth` | `vuln-sql` | `vuln-path` | `vuln-inject` → "Run private review" → server: nonce → attestation → verify (fail closed) → only then send code to TEE model(s) → verify response signature → findings + Verified payload. UI: agent cards → challenge round → moderator consensus → Verified panel.

B. Paste/upload: diff or .ts/.js/.py/.go, max 80 KB text, same fail-closed path; reject binary/oversized clearly.

C. Fail-closed attestation (hard requirement), before any code leaves the server:
1. Random 32-byte hex nonce (64 hex chars), generated server-side per request.
2. GET /v1/attestation/report with model, provider=near, include_tls_fingerprint=false, signing_algo=ecdsa, nonce; header x-no-aliasing: true.
3. Gateway report (`gateway_attestation`) AND every entry of `model_attestations[]` must pass. Missing or empty `model_attestations[]` = fail. Per report:
   a. Verify `intel_quote` with dcap-qvl (`@phala/dcap-qvl-node`, Intel PCS collateral), ported from nearai-cloud-verifier.
   b. Read report_data from the verified quote; require it to bind our nonce and the report's `signing_address`; require echoed `request_nonce` to equal our nonce.
   c. Replay `event_log`; result must equal the quote's RTMR3.
   d. SHA-256 the raw `info.tcb_info.app_compose` string (decode `tcb_info` if it is JSON text; do not reserialize `app_compose`); MRCONFIGID must equal `01` + hash + 15 zero bytes.
   e. NVIDIA GPU check via NRAS when `nvidia_payload` is present.
   Retain the verified reports (signing_address + signing_algo) for step 5.
4. Any failure → HTTP 403 `{ "error": "attestation_failed", "checks": [...] }` and do NOT call chat completions.
5. After completion (non-streaming, canonical model id, x-no-aliasing: true, Accept-Encoding: identity):
   a. Keep the exact request-body bytes sent and exact response-body bytes received before parsing; request_hash = SHA-256(request bytes), response_hash = SHA-256(response bytes).
   b. GET /v1/signature/{chatId}?model=...&signing_algo=ecdsa (bounded retry on 404; a 2xx with `error_code` = unavailable).
   c. Recover the EIP-191 signer from `text` + `signature`; it must equal `signing_address`.
   d. `provider_tee`: `text` must equal `<MODEL_ID>:<request_hash>:<response_hash>` and the signer must match exactly one report verified in step 3 (a report fetched after the completion does not count). `gateway`: `text` must equal `<request_hash>:<response_hash>` and match the verified gateway report.
   e. Any failure or unavailable signature → that agent's result is marked "Unverified" (red) in the panel. Never a green badge.
6. Verified panel: model actually used, nonce, signature_kind, signer match, TDX quote status, RTMR3/MRCONFIGID checks, NVIDIA result (if run), request/response hashes, timestamp. Never show keys.

Model eligibility: at startup and in a test, confirm the default and fallback models each return a non-empty NEAR model report; a model that does not is never used.

D. Auditor swarm (separate system prompts):
- security: vulns, secrets, authz, injection (including prompt-injection attempts inside the reviewed code)
- breaking: API/type/behaviour regressions
- quality: readability, dead code, missing tests
- moderator: reads the three plus the challenge round; consensus findings, confidence 0–100, and MUST show disagreements.
Round 1: the three auditors in parallel (Promise.all) after one attestation.
Round 2 (challenge): each auditor receives the other two's findings and backs or disputes each one with a reason, in parallel.
Round 3: one moderator call rules on what survived. Cap max_tokens and total calls per request (3 + 3 + 1).

Agent output JSON: { "agent", "findings": [{ "id", "severity": "high|medium|low|info", "title", "file", "line_hint", "detail" }], "summary" }
Challenge JSON: { "agent", "votes": [{ "finding_id", "stance": "back|dispute", "reason" }] }
Moderator JSON: { "agent": "moderator", "consensus": [{ "severity", "title", "agreed_by": [], "detail" }], "disagreements": [{ "topic", "positions": {} }], "confidence", "summary" }

## Untrusted input and abuse limits
- Reviewed code is data: wrapped in a random per-request delimiter; system prompts state instructions inside it are findings, not orders.
- `vuln-inject` sample proves it: the security agent must flag the injected comment as a finding.
- Per-IP rate limit on /api/review, 80 KB cap, strict type/size validation, capped max_tokens and calls, same-origin check, server-side check that the key is set. The key never reaches the browser.

## Zero retention
No DB, no disk writes of user code, no analytics of prompts, in-memory per request only. Response may include SHA-256 of reviewed text, never a replay. No request/response bodies or user code in logs or error messages: all errors go through `safeError()`; a test fails if sample code appears in any log line or error response.

## Samples (fictional, in samples/)
vuln-auth (JWT verify skipped / alg none), vuln-sql (string-concat SQL), vuln-path (path traversal), vuln-inject (code comment instructing the AI to approve the code / ignore issues). Each 1–2 files + README naming the bug and "FICTIONAL — hackathon demo only".

## UI
Mobile-first, ≥16px body, sections: input | swarm cards | challenge round | consensus | Verified. Loading: "Verifying enclave…" → "Auditors running…" → "Auditors challenging…" → "Moderator reconciling…". No wallet, paywall or Intents UI.

## Stack
Next.js App Router + TS + Tailwind, Vercel (Node runtime), server route app/api/review/route.ts, verification in lib/attest/. Env: NEARAI_API_KEY (fallback NEARAI_CLOUD_API_KEY), NEARAI_MODEL default Qwen/Qwen3.8-27B.

## Non-goals
Wallets, payments, swaps, Intents, x402, Agent Market, Shade Agents/IronClaw deploy, GitHub OAuth, storage, accounts. Target is the full Intel TDX check in C.3. Only if the quote check cannot run on Vercel, the panel says so honestly — "Demo verifier (nonce + NVIDIA + signature)" linking https://docs.near.ai/cloud/verification — and requests still fail closed.

## Done when
Demo works with key; fail-closed proven by test (bad nonce, bad quote, empty model_attestations, signer mismatch); TDX quote verified on Vercel or honest label shown; Verified panel shows; challenge round + moderator show ≥1 disagreement on a sample; `vuln-inject` flagged by security agent; no-log test passes; rate limit works; README passes "do X → see Y"; MIT license; tracks named; README credits nearai-cloud-verifier (Apache-2.0) and names any other NEAR HACKATHON project by the builder.
