# CodeCloak

**Private multi-agent code review on NEAR AI Cloud.** Three AI auditors review your code inside hardware enclaves (TEEs), argue about each other's findings, and a moderator reports consensus *and* disagreements. Before any code leaves the server, CodeCloak verifies the enclaves' attestation, and it fails closed if any check fails.

Built for NEAR HACKATHON. Tracks: **`privacy`**, **`security`**, **`swarms`**.

**Live:** https://codecloak-two.vercel.app — no wallet, no sign-in. It runs on NEAR AI Cloud's production API (`cloud-api.near.ai`). CodeCloak makes no NEAR blockchain transactions and has no smart contract, so there is nothing deployed on NEAR mainnet.

## The problem

Sending proprietary code to a hosted AI reviewer means trusting the provider not to read, log or train on it. "We don't retain your data" is a policy, not a proof. One AI reviewer also gives you one opinion, with no second voice to challenge a false positive or a missed bug.

## What CodeCloak does

1. **Attests first, fails closed.** Each review starts with a fresh 32-byte nonce and a NEAR AI attestation report. CodeCloak verifies the Intel TDX quotes of the gateway and the model enclaves, replays RTMR3, checks MRCONFIGID, and gets NVIDIA's verdict on the GPU. If any check fails, the API returns `403 attestation_failed` and **no model is ever called**.
2. **Runs an auditor swarm in the enclave.** `security`, `breaking` and `quality` audit in parallel. In a challenge round, each auditor backs or disputes the other auditors' findings. A `moderator` then rules: consensus and **disagreements** (always shown, never flattened). The 0–100 confidence is computed from the challenge votes, not taken from the model (e.g. "10 of 16 challenge votes back the findings"). That is up to 7 calls per review (3 + 3 + 1), all after one attestation; clean code with no findings skips the challenge round and uses 4.
3. **Verifies every response.** For each completion, the ECDSA signature must cover the exact request and response bytes (`model:request_hash:response_hash`). It must also come from a model signer that was attested *before* your code was sent.
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

1. **Open http://localhost:3000** (or the live site) → the page opens in dark mode with "Code review in a sealed room. With receipts." The round button in the nav switches to light mode and remembers your choice. There is no wallet and no sign-in.
2. **Click Run a free review →** → you jump to the demo: four fictional samples (Login service · Broken auth, **Orders API · SQL injection**, File uploads · Path traversal, Refunds service · Prompt injection), a **Paste code** tab and **Run private review**.
3. **Pick Orders API and click Run private review** → the steps go "Verifying enclave…" → "Auditors running…" → "Moderator reconciling…". This takes about 40–80 s (a live production run on 2026-11-06 took 43 s).
4. **When it finishes**, you see:
   - **The verdict:** the moderator's summary, a **Swarm confidence** gauge with its vote basis, and counts of findings, disputes and signatures;
   - under **Each auditor's findings**, the **Security** card flags the **SQL injection in `searchOrders`** (high severity); tap any finding row to see the other auditors' back/dispute votes and reasons;
   - **What the moderator ruled** lists agreed findings and at least one **disagreement** with each auditor's position;
   - **Proof it ran privately:** "Attested · every response signed", Intel TDX quotes 12/12, NVIDIA GPU verified, Response signatures 7/7, plus the model, signer, nonce and SHA-256 of the reviewed code, with raw checks under **Technical details** and a **Demo verifier scope** footnote that says what is and isn't verified.
5. **Pick Refunds service and run** → the security agent reports the code comment that tells AI reviewers to approve the code, flagging it as a prompt-injection attempt instead of obeying it.
6. **Click Paste, paste more than 80 KB** → the counter turns red and the button is disabled. Sending it to the API anyway returns `413 code_too_large` with "Pasted code is over the 80 KB limit."
7. **Remove `NEARAI_API_KEY` from `.env.local`, restart `npm run dev`, and run a review** → a red banner says "The server has no NEAR AI API key configured." The API returns `500 server_not_configured` and nothing is sent anywhere.
8. **Run `npm run test:failclosed`** → 17 tests pass, proving the attestation-failure path never reaches a model. They cover 15 tampered-attestation cases (bad nonce, bad quote, empty `model_attestations`, signer mismatch, RTMR3, MRCONFIGID, NVIDIA and more). Each must return `403 attestation_failed` with zero completion calls, and the code and key must never appear in a response or log.
9. **Check the API directly** (with the dev server running):
   ```bash
   curl -s -X POST localhost:3000/api/review -H 'Content-Type: application/json' \
     -d '{"mode":"demo","sampleId":"vuln-sql"}' | head -c 600
   ```
      (`vuln-sql` is the API id of Orders API; the others are `vuln-auth`, `vuln-path`, `vuln-inject`.) → JSON with `agents` (`security`, `breaking`, `quality`, `moderator`), `challenges`, and `verified` (`nonce`, `checks`, `completions[].signature`, `allSignaturesVerified`, `reviewedSha256`).

Other checks: `npm test` (60 unit tests), `npm run lint`, `npm run build`.

## Environment variables

| Name | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEARAI_API_KEY` | yes | — | NEAR AI Cloud key. Server-side only; never sent to the browser. |
| `NEARAI_CLOUD_API_KEY` | no | — | Accepted as a fallback name for the key. |
| `NEARAI_MODEL` | no | `Qwen/Qwen3.8-27B` | Model to attest and run. `z-ai/glm-5.3-flash` also passes attestation. Use NEAR TEE models only. |

## Zero retention and abuse limits

- Code exists only in the memory of one request. There is no database, no disk writes and no analytics, and request or response bodies are never logged. Every error is a fixed code and message produced by `safeError()` (`lib/errors.ts`).
- Paste is capped at 80 KB, request bodies at 100 KB, and each review at up to 7 model calls with capped `max_tokens`.
- Cross-origin browser requests are rejected. Each IP gets 8 reviews per 10 minutes; this limit is kept in memory per server instance.

## Project layout

- `app/api/review/route.ts`: the `POST /api/review` route, a thin wrapper around `lib/review/handler.ts`.
- `lib/near-ai/attestation.ts` and `lib/near-ai/tdx.ts`: the attestation preflight (nonce, TDX quote, RTMR3, MRCONFIGID, NVIDIA).
- `lib/near-ai/chat.ts`: non-streaming completions and signature verification.
- `lib/near-ai/swarm.ts` and `lib/near-ai/prompts/`: the auditors, the challenge round and the moderator.
- `app/page.tsx`: the landing page (hero receipt, Built on NEAR, how it works, swarm, live demo, receipt, FAQ). `app/opengraph-image.tsx`: the share image.
- `components/`: the UI. `ReviewApp.tsx` is the live demo; `ThemeToggle.tsx` and the script in `app/layout.tsx` handle dark/light mode. `samples/`: fictional vulnerable code, labelled "FICTIONAL — for hackathon demo only".

## Non-goals

No wallets, payments, swaps, Intents or x402. No accounts, GitHub OAuth or storage. No Agent Market or Shade Agents deployment. No non-TEE models on the verified path. Scope is private code review only.

## Builder

Built by [PinnacleCryptNG](https://github.com/PinnacleCryptNG). No other NEAR HACKATHON projects by this builder.

## License

MIT. See [LICENSE](LICENSE).
