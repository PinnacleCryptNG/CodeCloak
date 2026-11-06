export type AgentMeta = { label: string; role: string; lens: string; color: string; tint: string };

export const AGENT_META: Record<string, AgentMeta> = {
  security: { label: "Security", role: "Auditor", lens: "Vulnerabilities, secrets, authz and injection", color: "#e2412c", tint: "#fde7e2" },
  breaking: { label: "Breaking", role: "Auditor", lens: "API, type and behaviour regressions", color: "#b46b00", tint: "#fbefd9" },
  quality: { label: "Quality", role: "Auditor", lens: "Readability, dead code and missing tests", color: "#2f56c9", tint: "#e3e9fb" },
  moderator: { label: "Moderator", role: "Judge", lens: "Rules on what survived the challenge round", color: "#16130f", tint: "#ebe4d8" },
};

export function agentMeta(name: string): AgentMeta {
  return AGENT_META[name] ?? { label: name, role: "Agent", lens: "", color: "#6b6257", tint: "#ebe4d8" };
}
