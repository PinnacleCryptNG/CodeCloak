import type { AgentOutput, ChallengeVote, CompletionRecord } from "@/lib/types";
import { Badge, Card, SeverityChip } from "./ui";

export type ReceivedVote = ChallengeVote & { agent: string };

export function SignatureBadge({ record }: { record?: CompletionRecord }) {
  if (!record) return <Badge ok={false}>Not run</Badge>;
  const sig = record.signature;
  if (sig?.status === "verified") return <Badge ok>Signed · {sig.signatureKind === "provider_tee" ? "model TEE" : "gateway"}</Badge>;
  return <Badge ok={false}>Unverified{record.error ? ` · ${record.error}` : sig ? ` · ${sig.reason}` : ""}</Badge>;
}

export function AgentCard({
  name,
  lens,
  output,
  record,
  votes,
}: {
  name: string;
  lens: string;
  output: AgentOutput & { error?: string };
  record?: CompletionRecord;
  votes: Map<string, ReceivedVote[]>;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold capitalize text-white">{name}</h3>
          <p className="text-base text-white/50">{lens}</p>
        </div>
        <SignatureBadge record={record} />
      </header>
      {output.error ? (
        <p className="text-base text-red-300">Auditor failed ({output.error}).</p>
      ) : output.findings.length === 0 ? (
        <p className="text-base text-white/60">{output.parseError ? "Reply could not be parsed." : "No findings in this lens."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {output.findings.map((f) => {
            const received = votes.get(f.id) ?? [];
            return (
              <li key={f.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <SeverityChip severity={f.severity} />
                  <p className="font-medium text-white">
                    <span className="text-white/40">{f.id} </span>
                    {f.title}
                  </p>
                </div>
                {f.file || f.line_hint ? (
                  <p className="mt-2 break-all font-mono text-base text-white/50">
                    {f.file}
                    {f.line_hint ? ` · ${f.line_hint}` : ""}
                  </p>
                ) : null}
                <p className="mt-2 text-base leading-relaxed text-white/75">{f.detail}</p>
                {received.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                    {received.map((v) => (
                      <li key={v.agent} className="text-base">
                        <span className={v.stance === "dispute" ? "font-medium text-amber-300" : "font-medium text-emerald-300"}>
                          {v.agent} {v.stance === "dispute" ? "disputes" : "backs"}:
                        </span>{" "}
                        <span className="text-white/70">{v.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {output.summary ? <p className="text-base leading-relaxed text-white/60">{output.summary}</p> : null}
    </Card>
  );
}
