# CodeCloak

**Private multi-agent code review on NEAR AI Cloud.** Three AI auditors review your code inside hardware enclaves (TEEs), argue about each other's findings, and a moderator reports consensus *and* disagreements. Before any code leaves the server, CodeCloak verifies the enclaves' attestation, and it fails closed if any check fails.

Built for NEAR HACKATHON. Tracks: **`privacy`**, **`security`**, **`swarms`**.

## The problem

Sending proprietary code to a hosted AI reviewer means trusting the provider not to read, log or train on it. "We don't retain your data" is a policy, not a proof. One AI reviewer also gives you one opinion, with no second voice to challenge a false positive or a missed bug.

## What CodeCloak does

1. **Attests first, fails closed.** Each review starts with a fresh 32-byte nonce and a NEAR AI attestation report. CodeCloak verifies the Intel TDX quotes of the gateway and the model enclaves, replays RTMR3, checks MRCONFIGID, pins MRTD/RTMR0-2 and the app compose to an allowlist of NEAR's enclave images, and requires NVIDIA's verdict on every model GPU. If any check fails, the API returns `403 attestation_failed` and **no model is ever called**.
2. **Runs an auditor swarm in the enclave.** `security`, `breaking` and `quality` audit in parallel. In a challenge round, each auditor backs or disputes the other auditors' findings. A `moderator` then rules: consensus, **disagreements** (always shown, never flattened) and a 0–100 confidence. That is 7 calls per review (3 + 3 + 1), all after one attestation.
3. **Verifies every response.** For each of the 7 completions, the ECDSA signature must cover the exact request and response bytes (`model:request_hash:response_hash`). It must also come from a model signer that was attested *before* your code was sent.
4. **Keeps nothing.** There is no database, no disk writes and no analytics. Code lives in request memory only and is never logged or echoed. The response carries only a SHA-256 of the reviewed text.

## How NEAR fits

- **NEAR AI Cloud private inference.** The models (default `Qwen/Qwen3.8-27B`) run in Intel TDX + NVIDIA confidential-computing enclaves.
- **NEAR AI attestation.** The `/v1/attestation/report` and `/v1/signature/{id}` endpoints are verified as NEAR documents at https://docs.near.ai/cloud/verification. The quote checks are ported from NEAR's [nearai-cloud-verifier](https://github.com/nearai/nearai-cloud-verifier) (Apache-2.0), with thanks.
- **A swarm of agents** that disagree and reconcile, every one of them inside the attested enclave.

Every endpoint and field used is listed in [VERIFIED_STACK.md](VERIFIED_STACK.md).

## Run it (one command after setup)

Requires **Node 22+** and a NEAR AI Cloud API key from https://cloud.near.ai. The account needs credits or a spending limit; without them, model calls return HTTP 402.

```bash
git clone https://github.com/PinnacleCryptNG/CodeCloak.git && cd CodeCloak
cp .env.example .env.local        # then set NEARAI_API_KEY=... in .env.local
npm install && npm run dev        # open http://localhost:3000
```

A `NEARAI_API_KEY` exported in your shell overrides `.env.local`. If the key you set seems to be ignored, run `unset NEARAI_API_KEY` first.

## Do X → see Y

1. **Open http://localhost:3000** → you see the CodeCloak page with a sample picker (`vuln-auth`, `vuln-sql`, `vuln-path`, `vuln-inject`), a paste box and **Run private review**. There is no wallet and no sign-in.
2. **Pick `vuln-sql` and click Run private review** → the steps go "Verifying enclave…" → "Auditors running…" → "Moderator reconciling…". This takes about 40–80 s.
3. **When it finishes**, you see:
   - the **security** card flags the **SQL injection from string-concatenated queries** (high severity);
   - each finding shows the other auditors' back/dispute votes;
   - the **Consensus** panel lists agreed findings, at least one **Disagreement** with each auditor's position, and a confidence score;
   - the **Verified** panel shows the model, the nonce, signature kind `provider_tee`, "7/7 responses match a preflight report", Intel TDX status, the NVIDIA verdict, a timestamp, and a **Demo verifier scope** footnote that says what is and isn't verified.
4. **Pick `vuln-inject` and run** → the security agent reports the code comment that tells AI reviewers to approve the code, flagging it as a prompt-injection attempt instead of obeying it.
5. **Click Paste, paste more than 80 KB** → the counter turns red and the button is disabled. Sending it to the API anyway returns `413 code_too_large` with "Pasted code is over the 80 KB limit."
6. **Remove `NEARAI_API_KEY` from `.env.local`, restart `npm run dev`, and run a review** → a red banner says "The server has no NEAR AI API key configured." The API returns `500 server_not_configured` and nothing is sent anywhere.
7. **Run `npm run test:failclosed`** → 23 tests pass, proving the attestation-failure path never reaches a model. They cover 21 tampered-attestation cases (bad nonce, bad quote, empty `model_attestations`, signer mismatch, RTMR3, MRCONFIGID, MRTD/RTMR0-2 or compose not on the allowlist, missing or failing NVIDIA evidence and more). Each must return `403 attestation_failed` with zero completion calls, and the code and key must never appear in a response or log.
8. **Check the API directly** (with the dev server running):
   ```bash
   curl -s -X POST localhost:3000/api/review -H 'Content-Type: application/json' \
     -d '{"mode":"demo","sampleId":"vuln-sql"}' | head -c 600
   ```
   → JSON with `agents` (`security`, `breaking`, `quality`, `moderator`), `challenges`, and `verified` (`nonce`, `checks`, `completions[].signature`, `allSignaturesVerified`, `reviewedSha256`).

Other checks: `npm test` (all unit tests), `npm run lint`, `npm run build`.

## Environment variables

| Name | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEARAI_API_KEY` | yes | — | NEAR AI Cloud key. Server-side only; never sent to the browser. |
| `NEARAI_CLOUD_API_KEY` | no | — | Accepted as a fallback name for the key. |
| `NEARAI_MODEL` | no | `Qwen/Qwen3.8-27B` | Model to attest and run. `z-ai/glm-5.3-flash` also passes attestation. Use NEAR TEE models only. |
| `CODECLOAK_TRUSTED_MEASUREMENTS` | no | built-in (`lib/near-ai/measurements.ts`) | JSON allowlist of enclave measurements; replaces the defaults. When NEAR ships new images, reviews fail closed until you run `npm run measurements`, review the output and set it here. |
| `TRUSTED_PROXY_IP_HEADER` | no | — | Off Vercel only: the client-IP header your reverse proxy overwrites or appends to (e.g. `X-Forwarded-For`, last hop used). Unset means one shared rate-limit bucket for all clients. |

## Zero retention and abuse limits

- Code exists only in the memory of one request. There is no database, no disk writes and no analytics, and request or response bodies are never logged. Every error is a fixed code and message produced by `safeError()` (`lib/errors.ts`).
- Paste is capped at 80 KB, request bodies at 100 KB, and each review at 7 model calls with capped `max_tokens`.
- Cross-origin browser requests are rejected. Each IP gets 8 reviews per 10 minutes; this limit is kept in memory per server instance. The IP comes only from headers a proxy controls: Vercel's edge headers when `VERCEL=1`, otherwise the header named in `TRUSTED_PROXY_IP_HEADER` (your proxy must overwrite it). With neither, all clients share one 8-per-10-minute bucket, so spoofed IP headers cannot bypass the limit.

## Project layout

- `app/api/review/route.ts`: the `POST /api/review` route, a thin wrapper around `lib/review/handler.ts`.
- `lib/near-ai/attestation.ts` and `lib/near-ai/tdx.ts`: the attestation preflight (nonce, TDX quote, RTMR3, MRCONFIGID, pinned measurements, NVIDIA). `lib/near-ai/measurements.ts`: the measurement allowlist.
- `lib/near-ai/chat.ts`: non-streaming completions and signature verification.
- `lib/near-ai/swarm.ts` and `lib/near-ai/prompts/`: the auditors, the challenge round and the moderator.
- `components/`: the UI. `samples/`: fictional vulnerable code, labelled "FICTIONAL — for hackathon demo only".

## Non-goals

No wallets, payments, swaps, Intents or x402. No accounts, GitHub OAuth or storage. No Agent Market or Shade Agents deployment. No non-TEE models on the verified path. Scope is private code review only.

## Builder

Built by [PinnacleCryptNG](https://github.com/PinnacleCryptNG). No other NEAR HACKATHON projects by this builder.

## License

MIT. See [LICENSE](LICENSE).
