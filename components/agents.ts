/** Visual identity per agent, shared by cards, votes and disagreement positions. */
export const AGENT_META: Record<string, { label: string; lens: string; color: string; glyph: string }> = {
  security: { label: "Security", lens: "Vulnerabilities, secrets, authz, injection", color: "#ff7a93", glyph: "S" },
  breaking: { label: "Breaking", lens: "API, type and behaviour regressions", color: "#ffb547", glyph: "B" },
  quality: { label: "Quality", lens: "Readability, dead code, missing tests", color: "#6cc4ff", glyph: "Q" },
  moderator: { label: "Moderator", lens: "Rules on what survived the challenge round", color: "#8f7dff", glyph: "M" },
};

export function agentMeta(name: string) {
  return AGENT_META[name.toLowerCase()] ?? { label: name, lens: "", color: "#9aa3b2", glyph: name.slice(0, 1).toUpperCase() };
}
