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
