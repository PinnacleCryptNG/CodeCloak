# CodeCloak — SPEC.md

Product: Private multi-agent code review on NEAR AI Cloud. Tracks: `privacy`, `swarms`. Deadline: Sun 15 Nov 2026 00:59 WAT (14 Nov 23:59 UTC).

## Users
1. Judge / demo visitor — clicks Demo, runs a sample, sees Verified panel + swarm disagreement → consensus. No API key in browser.
2. Builder — owns `NEARAI_API_KEY` on Vercel.
3. Claude Code / Codex screener — follows README "do X → see Y".

## Flows
A. Demo (default): pick `vuln-auth` | `vuln-sql` | `vuln-path` → "Run private review" → server: nonce → attestation → verify (fail closed) → only then send code to TEE model(s) → verify response signature → findings + Verified payload. UI: agent cards → moderator consensus → Verified panel.

B. Paste/upload: diff or .ts/.js/.py/.go, max 80 KB text, same fail-closed path; reject binary/oversized clearly.

C. Fail-closed attestation (hard requirement), before any code leaves the server:
1. Random 32-byte hex nonce.
2. GET /v1/attestation/report with model, signing_algo=ecdsa, nonce; prefer provider=near + header x-no-aliasing: true.
3. Verify nonce echoed; extract signing addresses; NVIDIA GPU check when payload present (as in near-examples).
4. Any failure → HTTP 403 `{ "error": "attestation_failed", "checks": [...] }` and do NOT call chat completions.
5. After completion: GET /v1/signature/{chatId}?model=...&signing_algo=ecdsa; verify; surface signature_kind, model, nonce, available measurement fields.
6. Verified panel: model, nonce, signature_kind, signer match, NVIDIA result (if run), timestamp. Never show keys.

D. Auditor swarm (separate system prompts):
- security: vulns, secrets, authz, injection
- breaking: API/type/behaviour regressions
- quality: readability, dead code, missing tests
- moderator: reads the three; consensus findings, confidence 0–100, and MUST show disagreements.
Run the three in parallel (Promise.all) after one attestation, then one moderator call. Cap max_tokens.

Agent output JSON: { "agent", "findings": [{ "severity": "high|medium|low|info", "title", "file", "line_hint", "detail" }], "summary" }
Moderator JSON: { "agent": "moderator", "consensus": [{ "severity", "title", "agreed_by": [], "detail" }], "disagreements": [{ "topic", "positions": {} }], "confidence", "summary" }

## Zero retention
No DB, no disk writes of user code, no analytics of prompts, in-memory per request only. Response may include SHA-256 of reviewed text, never a replay.

## Samples (fictional, in samples/)
vuln-auth (JWT verify skipped / alg none), vuln-sql (string-concat SQL), vuln-path (path traversal). Each 1–2 files + README naming the bug and "FICTIONAL — hackathon demo only".

## UI
Mobile-first, ≥16px body, sections: input | swarm cards | consensus | Verified. Loading: "Verifying enclave…" → "Auditors running…" → "Moderator reconciling…". No wallet, paywall or Intents UI.

## Stack
Next.js App Router + TS + Tailwind, Vercel, server route app/api/review/route.ts. Env: NEARAI_API_KEY (fallback NEARAI_CLOUD_API_KEY), NEARAI_MODEL default Qwen/Qwen3.8-27B.

## Non-goals
Wallets, payments, swaps, Intents, x402, Agent Market, Shade Agents/IronClaw deploy, GitHub OAuth, storage, accounts. If verification is not the full Intel TDX verifier, label honestly: "Demo verifier (nonce + NVIDIA + signature)" linking https://docs.near.ai/cloud/verification.

## Done when
Demo works with key; fail-closed proven by test; Verified panel shows; moderator shows ≥1 disagreement on a sample; README passes "do X → see Y"; MIT license; tracks named; README names any other NEAR HACKATHON project by the builder.
