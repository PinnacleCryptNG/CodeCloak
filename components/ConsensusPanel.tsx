import type { CompletionRecord, ModeratorOutput } from "@/lib/types";
import { SignatureBadge } from "./AgentCard";
import { AgentInitial, AgentTag, Card, RichText, SeverityChip } from "./ui";

export function ConsensusPanel({ moderator, record }: { moderator: ModeratorOutput & { error?: string }; record?: CompletionRecord }) {
  const failed = Boolean(moderator.error || moderator.parseError);
  return (
    <Card as="article" className="anim-rise flex min-w-0 flex-col overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3.5">
          <AgentInitial name="moderator" />
          <div>
            <h4 className="font-display text-2xl font-semibold leading-tight text-ink">Moderator ruling</h4>
            <p className="text-base text-ink-2">Reads every finding and vote, then rules</p>
          </div>
        </div>
        <SignatureBadge record={record} />
      </header>

      {failed ? (
        <p role="alert" className="m-5 rounded-xl border border-[#efc3bb] bg-[#fbe6e2] p-4 text-base text-bad sm:m-6">
          {moderator.error ? `Moderator failed (${moderator.error}).` : "Moderator reply was unreadable, so there is no ruling."} No consensus or confidence is
          shown; the disputes below come straight from the challenge votes.
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-4 border-b border-line p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <h5 className="flex items-center justify-between gap-3 font-semibold text-ink">
            Disagreements
            <span className="rounded-full bg-[#fbecd2] px-2.5 py-0.5 font-mono text-base text-[#8a5200]">{moderator.disagreements.length}</span>
          </h5>
          {moderator.disagreements.length === 0 ? (
            <p className="text-base text-ink-2">No finding was disputed in the challenge round.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {moderator.disagreements.map((d) => (
                <li key={d.topic} className="rounded-xl border border-line bg-paper/60 p-4">
                  <p className="font-semibold leading-snug text-ink">
                    <RichText text={d.topic} />
                  </p>
                  <dl className="mt-3 flex flex-col gap-3">
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
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <h5 className="flex items-center justify-between gap-3 font-semibold text-ink">
            Consensus
            <span className="rounded-full bg-[#e6f2ea] px-2.5 py-0.5 font-mono text-base text-ok">{moderator.consensus.length}</span>
          </h5>
          {moderator.consensus.length === 0 ? <p className="text-base text-ink-2">Nothing survived the challenge round unanimously.</p> : null}
          <ul className="flex flex-col gap-3">
            {moderator.consensus.map((c) => (
              <li key={c.title} className="rounded-xl border border-line bg-card p-4">
                <div className="flex items-start gap-3">
                  <SeverityChip severity={c.severity} />
                  <p className="min-w-0 font-semibold leading-snug text-ink">
                    <RichText text={c.title} />
                  </p>
                </div>
                <p className="mt-2 text-base leading-relaxed text-ink-2">
                  <RichText text={c.detail} />
                </p>
                {c.agreed_by.length > 0 ? (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-base text-muted">
                    Agreed by
                    {c.agreed_by.map((a) => (
                      <AgentTag key={a} name={a} />
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Card>
  );
}
