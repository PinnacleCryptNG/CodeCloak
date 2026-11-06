/**
 * Auditor swarm (SPEC.md D): ONE attestation (done by the caller) → round 1: security, breaking,
 * quality in parallel → round 2: each challenges the other two in parallel → round 3: moderator.
 * Every completion's response signature is fetched and verified against the preflight reports.
 * Hard cap: 3 + 3 + 1 model calls. Zero retention: everything lives in this call's memory only.
 */
import {
  AUDITORS,
  SEVERITIES,
  type AgentName,
  type AgentOutput,
  type AuditorName,
  type ChallengeOutput,
  type ChallengeVote,
  type CompletionRecord,
  type Disagreement,
  type Finding,
  type ModeratorOutput,
  type ReviewResponse,
  type Severity,
} from "../types";
import type { VerifiedAttestation } from "./attestation";
import { ChatError, chatCompletion, extractJson, fetchSignature, parseAgentOutput, str, verifySignature, type ChatDeps } from "./chat";
import { BREAKING_SYSTEM_PROMPT } from "./prompts/breaking";
import { buildChallengeMessage, challengeSystemPrompt } from "./prompts/challenge";
import { buildReviewMessage, newDelimiter, type ReviewFile } from "./prompts/common";
import { MODERATOR_SYSTEM_PROMPT, buildModeratorMessage } from "./prompts/moderator";
import { QUALITY_SYSTEM_PROMPT } from "./prompts/quality";
import { SECURITY_SYSTEM_PROMPT } from "./prompts/security";

export const MAX_TOKENS = { audit: 2000, challenge: 1200, moderate: 2500 } as const;
export const MAX_CALLS = 7;

const AUDIT_PROMPTS: Record<AuditorName, string> = {
  security: SECURITY_SYSTEM_PROMPT,
  breaking: BREAKING_SYSTEM_PROMPT,
  quality: QUALITY_SYSTEM_PROMPT,
};
const ID_PREFIX: Record<AuditorName, string> = { security: "S", breaking: "B", quality: "Q" };

/** Progress hook for the UI (stage names only, never content). */
export type SwarmStage = "challenge" | "moderator";

export type SwarmResult = Pick<ReviewResponse, "agents" | "challenges"> & { completions: CompletionRecord[] };

type AgentCall = { content: string | null; record: CompletionRecord };

async function callAgent(
  agent: AgentName,
  round: CompletionRecord["round"],
  system: string,
  user: string,
  maxTokens: number,
  model: string,
  attestation: VerifiedAttestation,
  deps: ChatDeps,
): Promise<AgentCall> {
  try {
    const c = await chatCompletion(model, [{ role: "system", content: system }, { role: "user", content: user }], maxTokens, deps);
    const signature = verifySignature(await fetchSignature(c.chatId, model, deps), c, model, attestation);
    return { content: c.content, record: { agent, round, chatId: c.chatId, model: c.model, signature } };
  } catch (e) {
    const error = e instanceof ChatError ? e.code : "completion_failed";
    return { content: null, record: { agent, round, chatId: null, model: null, error, signature: null } };
  }
}

export function parseChallengeOutput(agent: string, content: string, allowedIds: Set<string>): ChallengeOutput {
  const raw = extractJson(content);
  if (!raw) return { agent, votes: [], parseError: true, missing: [...allowedIds] };
  const votes: ChallengeVote[] = [];
  for (const v of (Array.isArray(raw.votes) ? raw.votes : []) as Record<string, unknown>[]) {
    const finding_id = str(v?.finding_id, 16);
    // Only exact stances count; an unreadable stance is never treated as agreement.
    if (!allowedIds.has(finding_id) || (v?.stance !== "back" && v?.stance !== "dispute")) continue;
    const prior = votes.find((x) => x.finding_id === finding_id);
    if (prior) {
      // Conflicting duplicates resolve to dispute so dissent can never be hidden by an earlier "back".
      if (prior.stance === "back" && v.stance === "dispute") Object.assign(prior, { stance: "dispute", reason: `conflicting votes; dispute: ${str(v?.reason, 360)}` });
      continue;
    }
    votes.push({ finding_id, stance: v.stance, reason: str(v?.reason, 400) });
  }
  const missing = [...allowedIds].filter((id) => !votes.some((v) => v.finding_id === id));
  return missing.length ? { agent, votes, missing } : { agent, votes };
}

export function parseModeratorOutput(content: string): ModeratorOutput {
  const raw = extractJson(content);
  // A ruling must carry both required arrays; anything else is unreadable, not an empty ruling.
  if (!raw || !Array.isArray(raw.consensus) || !Array.isArray(raw.disagreements)) {
    return { agent: "moderator", consensus: [], disagreements: [], confidence: 0, summary: "", parseError: true };
  }
  const sev = (v: unknown): Severity => ((SEVERITIES as readonly string[]).includes(v as string) ? (v as Severity) : "info");
  const consensus = (raw.consensus as Record<string, unknown>[]).slice(0, 16).map((c: Record<string, unknown>) => ({
    severity: sev(c?.severity),
    title: str(c?.title, 200),
    agreed_by: (Array.isArray(c?.agreed_by) ? c.agreed_by : []).filter((a): a is string => typeof a === "string").slice(0, 3),
    detail: str(c?.detail, 1200),
  }));
  const disagreements = (raw.disagreements as Record<string, unknown>[]).slice(0, 16).map((d: Record<string, unknown>) => {
    const positions: Record<string, string> = {};
    if (d?.positions && typeof d.positions === "object") {
      for (const [k, v] of Object.entries(d.positions as Record<string, unknown>).slice(0, 4)) positions[k.slice(0, 32)] = str(v, 400);
    }
    return { topic: str(d?.topic, 300), positions };
  });
  const n = Number(raw.confidence);
  const confidence = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  return { agent: "moderator", consensus, disagreements, confidence, summary: str(raw.summary, 1200) };
}

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 3, medium: 2, low: 1, info: 0.5 };

/**
 * Swarm confidence from the challenge votes, not the moderator's guess: for each finding, the share of the other
 * auditors that backed it (disputes and missing votes count against), weighted by severity, then scaled by the
 * share of auditors that ran. Three clean audits with no findings score 100.
 */
export function swarmConfidence(audits: (AgentOutput & { error?: string })[], challenges: ChallengeOutput[]): { confidence: number; basis: string } {
  const ran = audits.filter((a) => !a.error && !a.parseError).length;
  let weight = 0;
  let support = 0;
  let backs = 0;
  let total = 0;
  for (const audit of audits) {
    for (const f of audit.findings) {
      const voters = challenges.filter((c) => c.agent !== audit.agent);
      const b = voters.filter((c) => c.votes.some((v) => v.finding_id === f.id && v.stance === "back")).length;
      const w = SEVERITY_WEIGHT[f.severity] ?? 1;
      weight += w;
      support += w * (voters.length ? b / voters.length : 0);
      backs += b;
      total += voters.length;
    }
  }
  const agreement = weight ? support / weight : 1;
  const confidence = Math.round(100 * agreement * (ran / AUDITORS.length));
  const runNote = ran < AUDITORS.length ? `; only ${ran} of ${AUDITORS.length} auditors ran` : "";
  const basis = total
    ? `${backs} of ${total} challenge votes back the findings (severity-weighted)${runNote}`
    : `no findings to challenge${runNote}`;
  return { confidence, basis };
}

/** Every finding with at least one dispute, with each involved auditor's position, from the raw votes. */
export function contestedFindings(audits: AgentOutput[], challenges: ChallengeOutput[]): Disagreement[] {
  const out: Disagreement[] = [];
  for (const audit of audits) {
    for (const f of audit.findings) {
      const votes = challenges.flatMap((c) => c.votes.filter((v) => v.finding_id === f.id).map((v) => ({ agent: c.agent, ...v })));
      if (!votes.some((v) => v.stance === "dispute")) continue;
      const positions: Record<string, string> = { [audit.agent]: `raised (${f.severity}): ${f.detail}`.slice(0, 400) };
      for (const v of votes) positions[v.agent] = `${v.stance}: ${v.reason}`.slice(0, 400);
      for (const c of challenges) if (c.missing?.includes(f.id)) positions[c.agent] = "no valid vote (abstained or unreadable)";
      out.push({ topic: `${f.id}: ${f.title}`.slice(0, 300), positions });
    }
  }
  return out;
}

/** Keep the moderator's disagreements, then add any contested finding it left out (matched by the leading "ID:" of each topic). */
export function mergeDisagreements(moderator: Disagreement[], contested: Disagreement[]): Disagreement[] {
  const leadingId = (topic: string) => /^\s*([A-Za-z]\d{1,3})\s*:/.exec(topic)?.[1].toUpperCase();
  const covered = new Set(moderator.map((d) => leadingId(d.topic)).filter(Boolean));
  return [...moderator, ...contested.filter((c) => !covered.has(leadingId(c.topic)))];
}

export async function runSwarm(
  files: ReviewFile[],
  model: string,
  attestation: VerifiedAttestation,
  deps: ChatDeps = {},
  onStage?: (stage: SwarmStage) => void,
): Promise<SwarmResult> {
  const reviewMessage = buildReviewMessage(files, newDelimiter());
  const call = (agent: AgentName, round: CompletionRecord["round"], system: string, user: string) =>
    callAgent(agent, round, system, user, MAX_TOKENS[round === "moderate" ? "moderate" : round], model, attestation, deps);

  // Round 1 — three auditors in parallel.
  const round1 = await Promise.all(AUDITORS.map((agent) => call(agent, "audit", AUDIT_PROMPTS[agent], reviewMessage)));
  const audits = round1.map(({ content }, i): AgentOutput & { error?: string } => {
    const agent = AUDITORS[i];
    if (content === null) return { agent, findings: [], summary: "", error: round1[i].record.error };
    const parsed = parseAgentOutput(agent, content);
    // Unique ids per auditor (S1, B1, Q1, ...) so votes can reference findings unambiguously.
    parsed.findings = parsed.findings.map((f: Finding, n) => ({ ...f, id: `${ID_PREFIX[agent]}${n + 1}` }));
    return parsed;
  });

  onStage?.("challenge");
  // Round 2 — each auditor backs or disputes the other two's findings, in parallel.
  const round2 = await Promise.all(
    AUDITORS.map(async (agent, i): Promise<{ challenge: ChallengeOutput; record?: CompletionRecord }> => {
      const others = audits.filter((_, j) => j !== i).flatMap((a) => a.findings);
      if (others.length === 0) return { challenge: { agent, votes: [] } };
      const ids = new Set(others.map((f) => f.id));
      // A failed auditor or challenge call casts no votes; report them as missing, never as silent agreement.
      if (audits[i].error) return { challenge: { agent, votes: [], missing: [...ids] } };
      const res = await call(agent, "challenge", challengeSystemPrompt(agent), buildChallengeMessage(reviewMessage, others));
      const challenge = res.content === null ? { agent, votes: [], parseError: true as const, missing: [...ids] } : parseChallengeOutput(agent, res.content, ids);
      return { challenge, record: res.record };
    }),
  );
  const challenges = round2.map((r) => r.challenge);
  const contested = contestedFindings(audits, challenges);

  onStage?.("moderator");
  // Round 3 — one moderator call rules on what survived.
  const mod = await call(
    "moderator",
    "moderate",
    MODERATOR_SYSTEM_PROMPT,
    buildModeratorMessage(audits, challenges, contested.map((c) => c.topic)),
  );
  const parsed: ModeratorOutput & { error?: string } =
    mod.content === null
      ? { agent: "moderator", consensus: [], disagreements: [], confidence: 0, summary: "", error: mod.record.error }
      : parseModeratorOutput(mod.content);
  parsed.disagreements = mergeDisagreements(parsed.disagreements, contested);
  // No ruling, no confidence: a failed or unreadable moderator keeps 0 and no basis.
  if (!parsed.error && !parsed.parseError) {
    const { confidence, basis } = swarmConfidence(audits, challenges);
    parsed.confidence = confidence;
    parsed.confidenceBasis = basis;
  } else {
    parsed.confidence = 0;
  }

  const completions = [
    ...round1.map((r) => r.record),
    ...round2.flatMap((r) => (r.record ? [r.record] : [])),
    mod.record,
  ];
  const [security, breaking, quality] = audits;
  return { agents: { security, breaking, quality, moderator: parsed }, challenges, completions };
}
