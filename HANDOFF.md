# CodeCloak — HANDOFF.md

**Devin: read this file at the start of every session before writing code.**

## Decisions (locked)
1. Product = CodeCloak — private multi-agent code review; NEAR HACKATHON tracks `privacy` + `swarms`.
2. No wallets / payments / swaps / Intents / x402 — ever.
3. Fail-closed attestation BEFORE sending code; Verified panel after.
4. Swarm = `security` + `breaking` + `quality` + `moderator`.
5. Default model `Qwen/Qwen3.8-27B` (Private TEE). Override with `NEARAI_MODEL`. Fallback `z-ai/glm-5.3-flash`.
6. Stack = Next.js App Router + TypeScript + Tailwind on Vercel; secrets only in env.
7. Zero retention of user code after the HTTP response.
8. Follow VERIFIED_STACK.md — do not invent API paths.
9. Use attestation helpers ported from https://github.com/near-examples/nearai-cloud-verification-example if Node < 24.22.1; else `@nearai/inference-sdk` is OK.
10. Fictional samples only for Demo.

## Don't-touch rules
- No wallet SDKs, wagmi, near-api-js for payments, Intents clients.
- Never commit `.env`, API keys or secrets.
- Do not expand scope beyond code review.
- Do not modify files outside the current prompt's "Files allowed" list.
- Never replace fail-closed verification with a cosmetic "Verified" badge.
- Never use non-TEE models (OpenAI/Anthropic/Gemini IDs) for the verified path.

## What's next
Prompts 01–08 in order: scaffold, samples, attestation, single review, swarm, UI, harden, README.

## Environment (set by Pinnacle, not Devin)
`NEARAI_API_KEY` on Vercel and `.env.local`; optional `NEARAI_MODEL`.

## Session start checklist
1. Read HANDOFF.md + SPEC.md + VERIFIED_STACK.md.
2. `git status`; only touch allowed files for the active prompt.
3. Run the prompt's acceptance checks before stopping.
4. Append a "Session log" bullet at the bottom of this file: date, prompt #, done, blockers.

## Session log
