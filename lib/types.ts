/** Shared review types (SPEC.md D schemas). Safe to import from client components: types only. */

export const SEVERITIES = ["high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const AUDITORS = ["security", "breaking", "quality"] as const;
export type AuditorName = (typeof AUDITORS)[number];
export type AgentName = AuditorName | "moderator";

export type Finding = { id: string; severity: Severity; title: string; file: string; line_hint: string; detail: string };

export type AgentOutput = { agent: string; findings: Finding[]; summary: string; parseError?: true };

export type ChallengeVote = { finding_id: string; stance: "back" | "dispute"; reason: string };
/** `missing`: expected finding ids this auditor gave no valid back/dispute vote on (abstained or unreadable). */
export type ChallengeOutput = { agent: string; votes: ChallengeVote[]; parseError?: true; missing?: string[] };

export type ConsensusItem = { severity: Severity; title: string; agreed_by: string[]; detail: string };
/** `topic`/`positions` come from the challenge votes when the finding was disputed; `ruling` is the moderator's text for it. */
export type Disagreement = { topic: string; positions: Record<string, string>; ruling?: string };
export type ModeratorOutput = {
  agent: "moderator";
  consensus: ConsensusItem[];
  disagreements: Disagreement[];
  /** Computed from the challenge votes (swarmConfidence), not taken from the model. */
  confidence: number;
  confidenceBasis?: string;
  summary: string;
  parseError?: true;
};

export type SignatureVerification = {
  status: "verified" | "unverified";
  reason: string;
  signatureKind: "provider_tee" | "gateway" | "unavailable";
  signingAddress: string | null;
  signerMatchesPreflight: boolean;
  requestHash: string;
  responseHash: string;
};

export type CompletionRecord = {
  agent: AgentName;
  round: "audit" | "challenge" | "moderate";
  chatId: string | null;
  model: string | null;
  error?: string;
  signature: SignatureVerification | null;
};

export type PublicReport = {
  report: string;
  signingAddress: string;
  signingAlgo: string;
  tcbStatus: string;
  nvidia: "verified" | "not_present";
};

export type VerifiedPayload = {
  model: string;
  nonce: string;
  verifiedAt: string;
  verifier: string;
  gateway: PublicReport;
  models: PublicReport[];
  checks: { report: string; name: string; ok: boolean; detail?: string }[];
  completions: CompletionRecord[];
  allSignaturesVerified: boolean;
  reviewedSha256: string;
};

export type ReviewResponse = {
  agents: {
    security: AgentOutput & { error?: string };
    breaking: AgentOutput & { error?: string };
    quality: AgentOutput & { error?: string };
    moderator: ModeratorOutput & { error?: string };
  };
  challenges: ChallengeOutput[];
  verified: VerifiedPayload;
};

export type ReviewError = { error: string; message?: string; checks?: VerifiedPayload["checks"] };
