// Server-only allowlist of NEAR AI Cloud enclave measurements (TDX quote fields, all hex).
// A verified quote only proves genuine TDX hardware; these pins prove WHICH software runs inside.
// Defaults were read from ~45 dcap-qvl-verified reports served by cloud-api.near.ai (2026-11-06, provider=near,
// Qwen/Qwen3.8-27B and z-ai/glm-5.3-flash; several GPU hosts per model). When NEAR rotates images, regenerate with `npm run measurements`
// and set CODECLOAK_TRUSTED_MEASUREMENTS (same JSON shape) — it replaces these defaults.

if (typeof window !== "undefined") throw new Error("lib/near-ai/measurements is server-only");

/** One dstack OS image: MRTD (firmware) + RTMR0-2 (boot chain, kernel, cmdline). Matched as a whole tuple. */
export type OsMeasurement = { mrTd: string; rtMr0: string; rtMr1: string; rtMr2: string };
/** composeTemplates: composeTemplateHash() of each trusted app_compose (lib/near-ai/tdx.ts). */
export type RolePolicy = { os: OsMeasurement[]; composeTemplates: string[] };
export type TrustedMeasurements = { gateway: RolePolicy; model: RolePolicy };

export const TRUSTED_MEASUREMENTS_ENV = "CODECLOAK_TRUSTED_MEASUREMENTS";

export const DEFAULT_TRUSTED_MEASUREMENTS: TrustedMeasurements = {
  gateway: {
    os: [
      {
        mrTd: "7fe60787222bd394cb516abca2435f22f035ab2cc9c0a4b4b3b148e46297f3d931a237b72f359052c6e657d8c1409173",
        rtMr0: "d090162bff4b1d1dc74dc59dc548838efc4b811b173da8536efa8e2a9c045da70ee092301293ad90afebee448bcd0211",
        rtMr1: "4ae609807c765916a31d724786ed74bcb97e168a9d937b04936aeef2015c907eba5ac352c6bcd749c246fd62ffb659ec",
        rtMr2: "764489f277a8540189761e72b4238ba36d4d647e11bd958d8ab5522af2a4867b0ff63e06b0c4967f1857236244040a5d",
      },
    ],
    composeTemplates: ["dc14d62b75ffde97f64fdba40c6be681b6818eb12312e1adee60b3cd4de2533b"], // dstack-0.5.12
  },
  model: {
    os: [
      {
        mrTd: "df4d77c857de652bd0fafa343a2026b51071ee03773d076d283abf1a7d36ff91ffa279ee4a617ac664f7e2a2c8d5891b",
        rtMr0: "f0f303d15fb7619b87ec60daf0db241e937b30a4e1f2c405b5420f14b27c6e301735094feea9693a33b868d00eeb07f9",
        rtMr1: "4ae609807c765916a31d724786ed74bcb97e168a9d937b04936aeef2015c907eba5ac352c6bcd749c246fd62ffb659ec",
        rtMr2: "bd67ab7554dc27ab03a077bc1447a1a67d0624ff547c4c809a8626f12d6a89712f8ec60e781e99b98208574065d21a71",
      },
      {
        mrTd: "df4d77c857de652bd0fafa343a2026b51071ee03773d076d283abf1a7d36ff91ffa279ee4a617ac664f7e2a2c8d5891b",
        rtMr0: "bc122d143ab768565ba5c3774ff5f03a63c89a4df7c1f5ea38d3bd173409d14f8cbdcc36d40e703cccb996a9d9687590",
        rtMr1: "4ae609807c765916a31d724786ed74bcb97e168a9d937b04936aeef2015c907eba5ac352c6bcd749c246fd62ffb659ec",
        rtMr2: "bd67ab7554dc27ab03a077bc1447a1a67d0624ff547c4c809a8626f12d6a89712f8ec60e781e99b98208574065d21a71",
      },
    ],
    composeTemplates: [
      "61ca1ea0dfbe92c25c7f54d4c5bc61f44b1ca4c28a4fc13650ecebd5b855be21", // dstack-nvidia-0.5.12 (Qwen/Qwen3.8-27B)
      "69944f4817ee9db24b4d1c9a19148e7b7d2af69f9b164c566a221ccf654de9f6", // dstack-nvidia-0.5.12 (Qwen/Qwen3.8-27B)
      "ecb4e08a964ef5e73cefa2a28bf4b753aaa95a96a51be10547fff9a2330867db", // dstack-nvidia-0.5.11 (z-ai/glm-5.3-flash)
    ],
  },
};

const HEX48 = /^[0-9a-f]{96}$/;
const HEX32 = /^[0-9a-f]{64}$/;

function hexList(value: unknown, re: RegExp): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("trusted_measurements_invalid");
  return value.map((v) => {
    const hex = typeof v === "string" ? v.replace(/^0x/i, "").toLowerCase() : "";
    if (!re.test(hex)) throw new Error("trusted_measurements_invalid");
    return hex;
  });
}

function parseRole(value: unknown): RolePolicy {
  const role = value as { os?: unknown; composeTemplates?: unknown } | undefined;
  if (!Array.isArray(role?.os) || role.os.length === 0) throw new Error("trusted_measurements_invalid");
  const os = role.os.map((entry: unknown) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const [mrTd, rtMr0, rtMr1, rtMr2] = hexList([e.mrTd, e.rtMr0, e.rtMr1, e.rtMr2], HEX48);
    return { mrTd, rtMr0, rtMr1, rtMr2 };
  });
  return { os, composeTemplates: hexList(role.composeTemplates, HEX32) };
}

/** Allowlist from CODECLOAK_TRUSTED_MEASUREMENTS (replaces defaults) or the built-in defaults. Throws if malformed. */
export function loadTrustedMeasurements(env: Record<string, string | undefined> = process.env): TrustedMeasurements {
  const raw = env[TRUSTED_MEASUREMENTS_ENV]?.trim();
  if (!raw) return DEFAULT_TRUSTED_MEASUREMENTS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("trusted_measurements_invalid");
  }
  const p = parsed as { gateway?: unknown; model?: unknown } | null;
  return { gateway: parseRole(p?.gateway), model: parseRole(p?.model) };
}
