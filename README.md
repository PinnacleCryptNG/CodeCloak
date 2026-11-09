# CodeCloak

**Private multi-agent code review on NEAR AI Cloud.** Three AI auditors review your code inside hardware enclaves (TEEs), argue about each other's findings, and a moderator reports consensus *and* disagreements. Before any code leaves the server, CodeCloak verifies the enclaves' attestation, and it fails closed if any check fails.

Built at NEAR HACKATHON (Nov 2026). Tracks: **Privacy & Private AI** (`privacy`), **AI Security & Defense** (`security`), **AI Swarms** (`swarms`).

It builds one of the ideas Illia Polosukhin listed for NEAR builders on 2026-10-03: "Code review that is fully private - agent that verifiably privately runs code review on private PRs using @near_ai" ([post](https://x.com/ilblackdragon/status/2106269343881519444)).

**Live:** https://codecloak-two.vercel.app — no wallet, no sign-in. It runs on NEAR AI Cloud's production API (`cloud-api.near.ai`). CodeCloak makes no NEAR blockchain transactions and has no smart contract, so there is nothing deployed on NEAR mainnet.

## The problem

Sending proprietary code to a hosted AI reviewer means trusting the provider not to read, log or train on it. "We don't retain your data" is a policy, not a proof. One AI reviewer also gives you one opinion, with no second voice to challenge a false positive or a missed bug.

## What CodeCloak does

1. **Attests first, fails closed.** Each review starts with a fresh 32-byte nonce and a NEAR AI attestation report. CodeCloak verifies the Intel TDX quotes of the gateway and the model enclaves, replays RTMR3, checks MRCONFIGID, pins MRTD/RTMR0-2 and the app compose to an allowlist of NEAR's enclave images, and requires NVIDIA's verdict on every model GPU. If any check fails, the API returns `403 attestation_failed` and **no model is ever called**.
2. **Runs an auditor swarm in the enclave.** `security`, `breaking` and `quality` audit in parallel. In a challenge round, each auditor backs or disputes the other auditors' findings. A `moderator` then rules: consensus and **disagreements** (always shown, never flattened). The 0–100 confidence is computed from the challenge votes, not taken from the model (e.g. "10 of 16 challenge votes back the findings"). That is up to 7 calls per review (3 + 3 + 1), all after one attestation; clean code with no findings skips the challenge round and uses 4.
3. **Verifies every response.** For each completion, the ECDSA signature must cover the exact request and response bytes (`model:request_hash:response_hash`). It must also come from a model signer that was attested *before* your code was sent.
4. **Keeps nothing.** There is no database, no disk writes and no analytics. Code lives in request memory only and is never logged or echoed. The response carries only a SHA-256 of the reviewed text.

## How NEAR fits

- **NEAR AI Cloud private inference.** The models (default `Qwen/Qwen3.8-27B`) run in Intel TDX + NVIDIA confidential-computing enclaves.
- **NEAR AI attestation.** The `/v1/attestation/report` and `/v1/signature/{id}` endpoints are verified as NEAR documents at https://docs.near.ai/cloud/verification. The quote checks are ported from NEAR's [nearai-cloud-verifier](https://github.com/nearai/nearai-cloud-verifier) (Apache-2.0), with thanks.
- **A swarm of agents** that disagree and reconcile, every one of them inside the attested enclave.

One review is 1 + 2 × (completions) NEAR AI Cloud calls, all made from the server:

| Call | When | What CodeCloak checks |
| --- | --- | --- |
| `GET /v1/attestation/report?nonce=…` | once, before any code is sent | gateway and model-enclave Intel TDX quotes (dcap-qvl), pinned measurements, nonce echo, NVIDIA GPU verdict, enclave signing key |
| `POST /v1/chat/completions` | up to 7 (3 auditors, up to 3 challenges, 1 moderator) | only runs if attestation passed |
| `GET /v1/signature/{chat_id}` | once per completion | ECDSA signature over the request and response hashes, from the attested signer |

A full review is therefore 15 calls (1 + 7 + 7). The site shows the same sequence in its **What happens on NEAR AI Cloud** section (`/#near`), and the live result shows the count, e.g. "15 NEAR AI Cloud calls, all attested or signed".

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

1. **Open http://localhost:3000** (or the live site) → the page opens in dark mode with a "Runs on NEAR AI Cloud" pill above "Code review in a sealed room. With receipts." Clicking the pill (or **On NEAR** in the nav) jumps to **What happens on NEAR AI Cloud**, which lists the three NEAR calls above. The round button in the nav switches to light mode and remembers your choice. There is no wallet and no sign-in.
2. **Click Run a free review →** → you jump to the demo: four fictional samples (Login service · Broken auth, **Orders API · SQL injection**, File uploads · Path traversal, Refunds service · Prompt injection), a **Paste code** tab and **Run private review**.
3. **Pick Orders API and click Run private review** → the steps go "Attesting NEAR AI Cloud…" → "Auditors on NEAR AI Cloud…" → "Moderator on NEAR AI Cloud…". This takes about 35–80 s (a live production run on 2026-11-06 took 43 s, a 2026-11-09 run took 35 s). When it finishes, the status line reads "cloud-api.near.ai · 15 NEAR AI Cloud calls, all attested or signed" (fewer when clean code skips the challenge round).
4. **When it finishes**, you see:
   - **The verdict:** the moderator's summary, a **Swarm confidence** gauge with its vote basis, and counts of findings, disputes and signatures;
   - under **Each auditor's findings**, each card is marked "Signed in model enclave", and the **Security** card flags the **SQL injection in `searchOrders`** (high severity); tap any finding row to see the other auditors' back/dispute votes and reasons;
   - **What the moderator ruled** lists agreed findings and at least one **disagreement** with each auditor's position;
   - **Proof it ran privately:** "Verified against NEAR AI Cloud before your code left our server" and "Attested · every response signed", with each check labelled by its NEAR scope: Intel TDX quotes (NEAR gateway + model enclave, e.g. 16/16; the quote count depends on how many enclaves NEAR serves), NVIDIA GPU (NEAR model enclave GPUs), Signer attested (NEAR enclave signing key) and Response signatures 7/7 (NEAR /v1/signature, per response), plus the model, signer, nonce and SHA-256 of the reviewed code, with raw checks under **Technical details** and a **Demo verifier scope** footnote that says what is and isn't verified.
5. **Pick Refunds service and run** → the security agent reports the code comment that tells AI reviewers to approve the code, flagging it as a prompt-injection attempt instead of obeying it.
6. **Click Paste, paste more than 80 KB** → the counter turns red and the button is disabled. Sending it to the API anyway returns `413 code_too_large` with "Pasted code is over the 80 KB limit."
7. **Remove `NEARAI_API_KEY` from `.env.local`, restart `npm run dev`, and run a review** → a red banner says "The server has no NEAR AI API key configured." The API returns `500 server_not_configured` and nothing is sent anywhere.
8. **Run `npm run test:failclosed`** → 25 tests pass, proving the attestation-failure path never reaches a model. They cover tampered-attestation cases (bad nonce, bad quote, empty `model_attestations`, signer mismatch, RTMR3, MRCONFIGID, MRTD/RTMR0-2 or compose not on the allowlist, missing or failing NVIDIA evidence and more). Each must return `403 attestation_failed` with zero completion calls, and the code and key must never appear in a response or log.
9. **Check the API directly** (with the dev server running):
   ```bash
   curl -s -X POST localhost:3000/api/review -H 'Content-Type: application/json' \
     -d '{"mode":"demo","sampleId":"vuln-sql"}' | head -c 600
   ```
      (`vuln-sql` is the API id of Orders API; the others are `vuln-auth`, `vuln-path`, `vuln-inject`.) → JSON with `agents` (`security`, `breaking`, `quality`, `moderator`), `challenges`, and `verified` (`nonce`, `checks`, `completions[].signature`, `allSignaturesVerified`, `reviewedSha256`).

Other checks: `npm test` (78 unit tests), `npm run lint`, `npm run build`.

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
- Paste is capped at 80 KB, request bodies at 100 KB, and each review at up to 7 model calls with capped `max_tokens`.
- Cross-origin browser requests are rejected. Each IP gets 8 reviews per 10 minutes; this limit is kept in memory per server instance. The IP comes only from headers a proxy controls: Vercel's edge headers when `VERCEL=1`, otherwise the header named in `TRUSTED_PROXY_IP_HEADER` (your proxy must overwrite it). With neither, all clients share one 8-per-10-minute bucket, so spoofed IP headers cannot bypass the limit.

## Project layout

- `app/api/review/route.ts`: the `POST /api/review` route, a thin wrapper around `lib/review/handler.ts`.
- `lib/near-ai/attestation.ts` and `lib/near-ai/tdx.ts`: the attestation preflight (nonce, TDX quote, RTMR3, MRCONFIGID, pinned measurements, NVIDIA). `lib/near-ai/measurements.ts`: the measurement allowlist.
- `lib/near-ai/chat.ts`: non-streaming completions and signature verification.
- `lib/near-ai/swarm.ts` and `lib/near-ai/prompts/`: the auditors, the challenge round and the moderator.
- `app/page.tsx`: the landing page (hero receipt, Built on NEAR, What happens on NEAR AI Cloud, how it works, swarm, live demo, receipt, FAQ). `app/opengraph-image.tsx`: the share image.
- `components/`: the UI. `ReviewApp.tsx` is the live demo; `ThemeToggle.tsx` and the script in `app/layout.tsx` handle dark/light mode. `samples/`: fictional vulnerable code, labelled "FICTIONAL — for hackathon demo only".

## Non-goals

No wallets, payments, swaps, Intents or x402. No accounts, GitHub OAuth or storage. No Agent Market or Shade Agents deployment. No non-TEE models on the verified path. Scope is private code review only.

## Hackathon notes

- **Built in the window.** All code was written during NEAR HACKATHON: the first commit is 2026-11-06, after the 2026-10-19 announcement. There is no pre-hackathon baseline and no version on another chain.
- **Third-party code.** The Intel TDX quote checks, RTMR3 replay and MRCONFIGID check are ported from [nearai/nearai-cloud-verifier](https://github.com/nearai/nearai-cloud-verifier) (Apache-2.0). Runtime libraries: `next`, `react`, `@phala/dcap-qvl-node` (TDX quote verification), `ethers` (ECDSA signer recovery), `jose` (NVIDIA NRAS JWT verification). The code was written with AI coding agents.
- **Hosted demo.** https://codecloak-two.vercel.app stays up through judging (2026-11-16 to 2026-11-18). It uses the builder's NEAR AI Cloud key, rate-limited to 8 reviews per IP per 10 minutes.
- **No mainnet deployment.** CodeCloak uses NEAR AI Cloud only, so there is no contract or account to look up.

## Builder

Built by [PinnacleCryptNG](https://github.com/PinnacleCryptNG). The builder's other NEAR HACKATHON project is **[Privue](https://github.com/PinnacleCryptNG/privue)** (private copy trading on NEAR Intents). The two projects are independent.

## License

MIT. See [LICENSE](LICENSE).
