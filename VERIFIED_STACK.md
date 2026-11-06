# Verified stack (checked live 2026-11-06). Do not invent beyond this.

Base: https://cloud-api.near.ai/v1 (docs: https://docs.near.ai/cloud/quickstart)
Chat: POST /v1/chat/completions, Authorization: Bearer <KEY>, non-streaming, same canonical model id, header x-no-aliasing: true
Models: GET /v1/models (includes Qwen/Qwen3.8-27B, z-ai/glm-5.3-flash)

From near-examples (https://github.com/near-examples/nearai-cloud-verification-example, utils/api.js):
- GET /v1/attestation/report?model={model}&signing_algo=ecdsa&nonce={nonce}
- GET /v1/signature/{chatId}?model={model}&signing_algo=ecdsa (retry on 404)
- NVIDIA: POST https://nras.attestation.nvidia.com/v3/attest/gpu

From docs.near.ai (preferred, https://docs.near.ai/cloud/verification):
- add query provider=near and include_tls_fingerprint=false
- headers: x-no-aliasing: true, Accept: application/json, Authorization: Bearer <KEY>
Policy: use the docs path; if it fails where the example shape works, fall back and label the panel honestly. No third path.

signature_kind: provider_tee (model TEE) or gateway. Prefer non-streaming.
SDK option: @nearai/inference-sdk needs Node 24.22.1+ (https://docs.near.ai/cloud/inference-sdk/javascript); else port example helpers (Node 22+).

Unverified: TDX field names beyond example/SDK; every model attestable; provider=near required for all models.

## Added 2026-11-06 (checked live against docs.near.ai and nearai/nearai-cloud-verifier)
- Attestation response: `gateway_attestation` (gateway) and `model_attestations[]` (NEAR model reports, only with provider=near). Reject missing/empty `model_attestations[]`.
- Report fields: `intel_quote`, `event_log`, `request_nonce`, `signing_address`, `signing_algo`, `nvidia_payload`, `info.tcb_info.app_compose`. `report_data` is not returned in model reports — read it from the verified quote.
- Quote check: dcap-qvl. TS verifier https://github.com/nearai/nearai-cloud-verifier (`ts/model_verifier.ts`, Apache-2.0) uses `@phala/dcap-qvl-node` (`js_get_collateral` from https://api.trustedservices.intel.com/tdx/certification/v4, then `js_verify`).
- MRCONFIGID = `01` + SHA-256(raw app_compose) + 15 zero bytes. RTMR3 = replay of `event_log`.
- Signature (ecdsa): recover EIP-191 signer from `text` + `signature`, compare to `signing_address`. `provider_tee` text = `<MODEL_ID>:<sha256(request bytes)>:<sha256(response bytes)>`; `gateway` text = `<sha256(request bytes)>:<sha256(response bytes)>`. Signer must match a report verified BEFORE the completion.
- Streaming makes the gateway sign instead of the model → non-streaming only. Use Accept-Encoding: identity (or hash after decompression).
- /v1/models: `Qwen/Qwen3.8-27B` lists `datacenters`; `z-ai/glm-5.3-flash` does not (SDK docs still call it a NEAR TEE model) — confirm its model report at runtime.
