import type { AgentOutput, ChallengeVote, CompletionRecord } from "@/lib/types";
import { agentMeta } from "./agents";
import { AgentInitial, AgentTag, Card, RichText, SeverityChip } from "./ui";

export type ReceivedVote = ChallengeVote & { agent: string };

/** One-line signature state. Green only for a verified signature. */
export function SignatureLine({ record }: { record?: CompletionRecord }) {
  const sig = record?.signature;
  const ok = sig?.status === "verified";
  const text = !record
    ? "Not run"
    : ok
      ? `Signed in ${sig.signatureKind === "provider_tee" ? "model enclave" : "gateway"}`
      : `Unverified${record.error ? ` · ${record.error}` : sig ? ` · ${sig.reason}` : ""}`;
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 text-base font-medium ${ok ? "text-ok" : "text-bad"}`}>
      <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-base leading-none text-paper ${ok ? "bg-ok" : "bg-bad"}`}>
        {ok ? "✓" : "✗"}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function VoteDots({ votes }: { votes: ReceivedVote[] }) {
  if (votes.length === 0) return <span className="text-base text-muted">No votes</span>;
  const backs = votes.filter((v) => v.stance !== "dispute").length;
  const disputes = votes.length - backs;
  return (
    <span className="flex items-center gap-2 text-base text-muted">
      <span className="flex -space-x-1" aria-hidden>
        {votes.map((v) => (
          <span key={v.agent} className={`h-3 w-3 rounded-full ring-2 ring-card ${v.stance === "dispute" ? "bg-coral" : "bg-ok"}`} />
        ))}
      </span>
      <span>
        {backs} back{disputes ? <span className="text-coral-deep"> · {disputes} dispute</span> : null}
      </span>
    </span>
  );
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
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <AgentInitial name={name} size="h-10 w-10 text-lg" />
          <h4 className="text-2xl font-semibold leading-none text-ink">{meta.label}</h4>
        </div>
        {!output.error ? (
          <span className="shrink-0 rounded-full px-3 py-1 font-mono text-base" style={{ background: `color-mix(in oklab, ${meta.color} 16%, transparent)`, color: `color-mix(in oklab, ${meta.color} 60%, var(--ink))` }}>
            {output.findings.length} {output.findings.length === 1 ? "finding" : "findings"}
          </span>
        ) : null}
      </header>
      <div className="h-1" style={{ background: meta.color }} aria-hidden />

      {output.error ? (
        <p className="p-5 text-base text-bad sm:px-6">Auditor failed ({output.error}).</p>
      ) : output.findings.length === 0 ? (
        <p className="p-5 text-base text-ink-2 sm:px-6">{output.parseError ? "Reply could not be parsed." : "Nothing found through this lens."}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {output.findings.map((f) => {
            const received = votes.get(f.id) ?? [];
            return (
              <li key={f.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-col gap-2 px-5 py-4 transition hover:bg-paper/50 sm:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start gap-3">
                      <SeverityChip severity={f.severity} />
                      <span className="line-clamp-2 min-w-0 flex-1 font-semibold leading-snug text-ink group-open:line-clamp-none">
                        <RichText text={f.title} />
                      </span>
                      <span aria-hidden className="mt-0.5 shrink-0 text-lg leading-none text-muted transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-3 pl-0.5">
                      <span className="font-mono text-base text-muted">{f.id}</span>
                      <VoteDots votes={received} />
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
                    {f.file || f.line_hint ? (
                      <p className="line-clamp-2 break-all rounded-lg bg-paper-2/70 px-3 py-2 font-mono text-base text-ink-2">
                        {f.file}
                        {f.line_hint ? ` · ${f.line_hint}` : ""}
                      </p>
                    ) : null}
                    <p className="text-base leading-relaxed text-ink-2">
                      <RichText text={f.detail} />
                    </p>
                    {received.length > 0 ? (
                      <ul className="flex flex-col gap-3 border-l-2 border-line pl-4">
                        {received.map((v) => (
                          <li key={v.agent} className="flex flex-col items-start gap-1">
                            <AgentTag name={v.agent} suffix={v.stance === "dispute" ? " disputes" : " backs"} />
                            <span className="text-base text-ink-2">
                              <RichText text={v.reason} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-auto flex flex-col gap-3 border-t border-line px-5 py-4 sm:px-6">
        {output.summary ? (
          <p className="text-base leading-relaxed text-muted">
            <RichText text={output.summary} />
          </p>
        ) : null}
        <SignatureLine record={record} />
      </footer>
    </Card>
  );
}
