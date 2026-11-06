import type { AgentOutput, ChallengeVote, CompletionRecord } from "@/lib/types";
import { agentMeta } from "./agents";
import { AgentAvatar, Badge, Card, SeverityChip } from "./ui";

export type ReceivedVote = ChallengeVote & { agent: string };

export function SignatureBadge({ record }: { record?: CompletionRecord }) {
  if (!record) return <Badge ok={false}>Not run</Badge>;
  const sig = record.signature;
  if (sig?.status === "verified") return <Badge ok>Signed · {sig.signatureKind === "provider_tee" ? "model TEE" : "gateway"}</Badge>;
  return <Badge ok={false}>Unverified{record.error ? ` · ${record.error}` : sig ? ` · ${sig.reason}` : ""}</Badge>;
}

export function AgentCard({
  name,
  output,
  record,
  votes,
}: {
  name: string;
  output: AgentOutput & { error?: string };
  record?: CompletionRecord;
  votes: Map<string, ReceivedVote[]>;
}) {
  const meta = agentMeta(name);
  return (
    <Card className="anim-rise relative flex flex-col gap-4 overflow-hidden">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }} />
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <AgentAvatar glyph={meta.glyph} color={meta.color} />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white">{meta.label} auditor</h3>
            <p className="text-base text-white/50">{meta.lens}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SignatureBadge record={record} />
          {!output.error ? <span className="text-base text-white/45">{output.findings.length} findings</span> : null}
        </div>
      </header>
      {output.error ? (
        <p className="text-base text-red-300">Auditor failed ({output.error}).</p>
      ) : output.findings.length === 0 ? (
        <p className="text-base text-white/60">{output.parseError ? "Reply could not be parsed." : "No findings in this lens."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {output.findings.map((f) => {
            const received = votes.get(f.id) ?? [];
            const disputes = received.filter((v) => v.stance === "dispute").length;
            return (
              <li key={f.id} className="rounded-xl border border-white/[0.07] bg-black/25 p-4">
                <div className="flex items-start gap-3">
                  <SeverityChip severity={f.severity} />
                  <p className="font-medium leading-snug text-white">
                    <span className="font-mono text-white/35">{f.id} </span>
                    {f.title}
                  </p>
                </div>
                {f.file || f.line_hint ? (
                  <p className="mt-2 break-all font-mono text-base text-white/45">
                    {f.file}
                    {f.line_hint ? ` · ${f.line_hint}` : ""}
                  </p>
                ) : null}
                <p className="mt-2 text-base leading-relaxed text-white/70">{f.detail}</p>
                {received.length > 0 ? (
                  <div className="mt-3 border-t border-white/[0.07] pt-3">
                    <p className="mb-2 text-base text-white/40">
                      Challenge: {received.length - disputes} back · <span className={disputes ? "text-amber-300" : ""}>{disputes} dispute</span>
                    </p>
                    <ul className="flex flex-col gap-2">
                      {received.map((v) => {
                        const vm = agentMeta(v.agent);
                        return (
                          <li key={v.agent} className="flex gap-2 text-base">
                            <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: vm.color }} />
                            <span>
                              <span className={v.stance === "dispute" ? "font-medium text-amber-300" : "font-medium text-emerald-300"}>
                                {vm.label} {v.stance === "dispute" ? "disputes" : "backs"}:
                              </span>{" "}
                              <span className="text-white/65">{v.reason}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {output.summary ? <p className="mt-auto border-t border-white/[0.06] pt-4 text-base leading-relaxed text-white/55">{output.summary}</p> : null}
    </Card>
  );
}
