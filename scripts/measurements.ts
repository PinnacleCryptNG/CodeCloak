/**
 * npm run measurements [model ...] — print the measurements NEAR AI Cloud serves right now, as JSON for
 * CODECLOAK_TRUSTED_MEASUREMENTS (see lib/near-ai/measurements.ts). Values are read from dcap-qvl-verified quotes
 * whose MRCONFIGID matches their app_compose. Each run hits one host per model; run it a few times to see every
 * host. Review the compose files (images, pre_launch_script) before trusting new values.
 * The attestation endpoint needs no API key, so none is sent.
 */
import { randomBytes } from "node:crypto";
import { NEARAI_BASE_URL, type AttestationResponse, type RawReport } from "../lib/near-ai/attestation";
import type { OsMeasurement, RolePolicy, TrustedMeasurements } from "../lib/near-ai/measurements";
import { composeTemplateHash, expectedMrConfigId, hexToBuffer, readAppCompose, verifyQuoteWithDcap } from "../lib/near-ai/tdx";

const models = process.argv.slice(2).length ? process.argv.slice(2) : ["Qwen/Qwen3.8-27B", "z-ai/glm-5.3-flash"];
const out: TrustedMeasurements = { gateway: { os: [], composeTemplates: [] }, model: { os: [], composeTemplates: [] } };

async function add(role: RolePolicy, report: RawReport | undefined, label: string) {
  if (!report) throw new Error(`${label}: report missing`);
  const q = await verifyQuoteWithDcap(String(report.intel_quote ?? ""));
  const appCompose = readAppCompose(report.info);
  if (!hexToBuffer(q.mrConfigId, "mr_config_id").equals(expectedMrConfigId(appCompose))) throw new Error(`${label}: MRCONFIGID mismatch`);
  const os: OsMeasurement = { mrTd: q.mrTd, rtMr0: q.rtMr0, rtMr1: q.rtMr1, rtMr2: q.rtMr2 };
  if (!role.os.some((m) => JSON.stringify(m) === JSON.stringify(os))) role.os.push(os);
  const template = composeTemplateHash(appCompose);
  if (!role.composeTemplates.includes(template)) role.composeTemplates.push(template);
  process.stderr.write(`${label}: TCB ${q.status}, compose template ${template}, nvidia_payload ${report.nvidia_payload ? "present" : "MISSING"}\n`);
}

async function main() {
  for (const model of models) {
    const params = new URLSearchParams({ model, provider: "near", include_tls_fingerprint: "false", signing_algo: "ecdsa", nonce: randomBytes(32).toString("hex") });
    const res = await fetch(`${NEARAI_BASE_URL}/attestation/report?${params}`, { headers: { Accept: "application/json", "x-no-aliasing": "true" } });
    if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
    const body = (await res.json()) as AttestationResponse;
    await add(out.gateway, body.gateway_attestation, `${model} gateway`);
    for (const [i, m] of (body.model_attestations ?? []).entries()) await add(out.model, m, `${model} model[${i}]`);
  }
  process.stdout.write(`${JSON.stringify(out)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
