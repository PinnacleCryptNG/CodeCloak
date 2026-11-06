import type { AgentOutput, ChallengeVote, CompletionRecord } from "@/lib/types";
import { agentMeta } from "./agents";
import { AgentInitial, AgentTag, Card, RichText, SeverityChip, Status } from "./ui";

export type ReceivedVote = ChallengeVote & { agent: string };

export function SignatureBadge({ record }: { record?: CompletionRecord }) {
  if (!record) return <Status ok={false}>Not run</Status>;
  const sig = record.signature;
  if (sig?.status === "verified") return <Status ok>Signed · {sig.signatureKind === "provider_tee" ? "model TEE" : "gateway"}</Status>;
  return <Status ok={false}>Unverified{record.error ? ` · ${record.error}` : sig ? ` · ${sig.reason}` : ""}</Status>;
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
    <Card as="article" className="anim-rise flex min-w-0 flex-col overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-line p-5 sm:p-6" style={{ background: `linear-gradient(180deg, ${meta.tint}, transparent)` }}>
        <div className="flex items-start gap-3.5">
          <AgentInitial name={name} />
          <div className="min-w-0">
            <h4 className="font-display text-2xl font-semibold leading-tight text-ink">{meta.label}</h4>
            <p className="text-base text-ink-2">{meta.lens}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SignatureBadge record={record} />
          {!output.error ? (
            <span className="text-base text-muted">
              {output.findings.length} {output.findings.length === 1 ? "finding" : "findings"}
            </span>
          ) : null}
        </div>
      </header>
      {output.error ? (
        <p className="p-5 text-base text-bad sm:p-6">Auditor failed ({output.error}).</p>
      ) : output.findings.length === 0 ? (
        <p className="p-5 text-base text-ink-2 sm:p-6">{output.parseError ? "Reply could not be parsed." : "No findings in this lens."}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {output.findings.map((f) => {
            const received = votes.get(f.id) ?? [];
            const disputes = received.filter((v) => v.stance === "dispute").length;
            return (
              <li key={f.id} className="flex flex-col gap-2.5 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <SeverityChip severity={f.severity} />
                  <p className="min-w-0 font-semibold leading-snug text-ink">
                    <span className="font-mono font-normal text-muted">{f.id} </span>
                    <RichText text={f.title} />
                  </p>
                </div>
                {f.file || f.line_hint ? (
                  <p className="line-clamp-2 break-all font-mono text-base text-muted">
                    {f.file}
                    {f.line_hint ? ` · ${f.line_hint}` : ""}
                  </p>
                ) : null}
                <p className="text-base leading-relaxed text-ink-2">
                  <RichText text={f.detail} />
                </p>
                {received.length > 0 ? (
                  <div className="mt-1 flex flex-col gap-2.5 rounded-xl bg-paper/70 p-4">
                    <p className="text-base font-medium text-ink">
                      Challenge · {received.length - disputes} back, <span className={disputes ? "text-coral-deep" : ""}>{disputes} dispute</span>
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {received.map((v) => (
                        <li key={v.agent} className="flex flex-col items-start gap-1">
                          <AgentTag name={v.agent} suffix={v.stance === "dispute" ? " disputes" : " backs"} />
                          <span className="text-base text-ink-2">
                            <RichText text={v.reason} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {output.summary ? <p className="mt-auto border-t border-line bg-paper/50 p-5 text-base leading-relaxed text-ink-2 sm:px-6"><RichText text={output.summary} /></p> : null}
    </Card>
  );
}
