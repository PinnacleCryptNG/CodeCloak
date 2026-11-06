import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const SAMPLE_IDS = ["vuln-auth", "vuln-sql", "vuln-path", "vuln-inject"] as const;
export type SampleId = (typeof SAMPLE_IDS)[number];

export type SampleFile = { name: string; content: string };
export type Sample = {
  id: SampleId;
  /** Source files sent for review. */
  files: SampleFile[];
  /** Planted-bug notes for humans. Never sent to the auditors. */
  readme: string;
};

const SAMPLES_DIR = path.join(process.cwd(), "samples");

export function isSampleId(value: unknown): value is SampleId {
  return typeof value === "string" && (SAMPLE_IDS as readonly string[]).includes(value);
}

export function loadSample(id: SampleId): Sample {
  if (!isSampleId(id)) throw new Error("unknown_sample");
  const dir = path.join(SAMPLES_DIR, id);
  const files = readdirSync(dir)
    .filter((name) => name !== "README.md")
    .sort()
    .map((name) => ({ name, content: readFileSync(path.join(dir, name), "utf8") }));
  return { id, files, readme: readFileSync(path.join(dir, "README.md"), "utf8") };
}

export function loadAllSamples(): Sample[] {
  return SAMPLE_IDS.map(loadSample);
}
