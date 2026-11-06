import type { CompletionRecord, ModeratorOutput } from "@/lib/types";
import { SignatureLine } from "./AgentCard";
import { agentMeta } from "./agents";
import { AgentInitial, AgentTag, Card, RichText, SeverityChip } from "./ui";

function Dots({ agents }: { agents: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {agents.map((a) => {
        const m = agentMeta(a);
        return (
          <span key={a} className="inline-flex items-center gap-1.5 text-base text-muted">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
            {m.label}
          </span>
        );
      })}
    </span>
  );
}

function Column({ title, count, tone, children }: { title: string; count: number; tone: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col">
      <h5 className="flex items-center gap-3 px-5 pb-3 pt-5 font-semibold text-ink sm:px-6">
        {title}
        <span className={`rounded-full px-2.5 py-0.5 font-mono text-base ${tone}`}>{count}</span>
      </h5>
      {children}
    </section>
  );
}

export function ConsensusPanel({ moderator, record }: { moderator: ModeratorOutput & { error?: string }; record?: CompletionRecord }) {
  const failed = Boolean(moderator.error || moderator.parseError);
  const row = "flex cursor-pointer list-none flex-col gap-2 px-5 py-4 transition hover:bg-paper/50 sm:px-6 [&::-webkit-details-marker]:hidden";
  return (
    <Card as="article" className="anim-rise flex min-w-0 flex-col overflow-hidden">
      <header className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <AgentInitial name="moderator" size="h-10 w-10 text-lg" />
          <h4 className="text-2xl font-semibold leading-none text-ink">Moderator ruling</h4>
        </div>
        <SignatureLine record={record} />
      </header>
      <div className="h-1 bg-ink" aria-hidden />

      {failed ? (
        <p role="alert" className="m-5 rounded-xl border border-[#efc3bb] bg-[#fbe6e2] p-4 text-base text-bad sm:mx-6">
          {moderator.error ? `Moderator failed (${moderator.error}).` : "Moderator reply was unreadable, so there is no ruling."} No consensus or confidence is
          shown; the disputes below come straight from the challenge votes.
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-line">
        <Column title="Disagreements" count={moderator.disagreements.length} tone="bg-[#fbecd2] text-[#8a5200]">
          {moderator.disagreements.length === 0 ? (
            <p className="px-5 pb-5 text-base text-ink-2 sm:px-6">No finding was disputed in the challenge round.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line border-t border-line">
              {moderator.disagreements.map((d) => (
                <li key={d.topic}>
                  <details className="group">
                    <summary className={row}>
                      <span className="flex items-start gap-3">
                        <span className="line-clamp-2 min-w-0 flex-1 font-semibold leading-snug text-ink group-open:line-clamp-none">
                          <RichText text={d.topic} />
                        </span>
                        <span aria-hidden className="mt-0.5 shrink-0 text-lg leading-none text-muted transition group-open:rotate-45">
                          +
                        </span>
                      </span>
                      <Dots agents={Object.keys(d.positions)} />
                    </summary>
                    <dl className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
                      {Object.entries(d.positions).map(([agent, position]) => (
                        <div key={agent} className="flex flex-col items-start gap-1">
                          <dt>
                            <AgentTag name={agent} />
                          </dt>
                          <dd className="text-base text-ink-2">
                            <RichText text={position} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Column>

        <Column title="Consensus" count={moderator.consensus.length} tone="bg-[#e6f2ea] text-ok">
          {moderator.consensus.length === 0 ? <p className="px-5 pb-5 text-base text-ink-2 sm:px-6">Nothing survived the challenge round unanimously.</p> : null}
          {moderator.consensus.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line border-t border-line">
              {moderator.consensus.map((c) => (
                <li key={c.title}>
                  <details className="group">
                    <summary className={row}>
                      <span className="flex items-start gap-3">
                        <SeverityChip severity={c.severity} />
                        <span className="line-clamp-2 min-w-0 flex-1 font-semibold leading-snug text-ink group-open:line-clamp-none">
                          <RichText text={c.title} />
                        </span>
                        <span aria-hidden className="mt-0.5 shrink-0 text-lg leading-none text-muted transition group-open:rotate-45">
                          +
                        </span>
                      </span>
                      {c.agreed_by.length > 0 ? <Dots agents={c.agreed_by} /> : null}
                    </summary>
                    <p className="px-5 pb-5 text-base leading-relaxed text-ink-2 sm:px-6">
                      <RichText text={c.detail} />
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          ) : null}
        </Column>
      </div>
    </Card>
  );
}
