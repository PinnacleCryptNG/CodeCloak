import type { CompletionRecord, ModeratorOutput } from "@/lib/types";
import { SignatureBadge } from "./AgentCard";
import { Card, SeverityChip } from "./ui";

export function ConsensusPanel({ moderator, record }: { moderator: ModeratorOutput & { error?: string }; record?: CompletionRecord }) {
  const failed = Boolean(moderator.error || moderator.parseError);
  const confidence = failed ? 0 : moderator.confidence;
  return (
    <Card className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Moderator</h3>
          <p className="text-base text-white/50">Rules on what survived the challenge round</p>
        </div>
        <SignatureBadge record={record} />
      </header>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-base text-white/60">Swarm confidence</span>
          <span className="text-3xl font-semibold tabular-nums text-white">{failed ? "—" : confidence}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={confidence} aria-label="Swarm confidence">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${confidence}%` }} />
        </div>
      </div>

      {failed ? (
        <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-base text-red-200">
          {moderator.error ? `Moderator failed (${moderator.error}).` : "Moderator reply was unreadable, so there is no ruling."} No consensus or confidence is
          shown; the disputes below come straight from the challenge votes.
        </p>
      ) : null}
      {moderator.summary ? <p className="text-base leading-relaxed text-white/80">{moderator.summary}</p> : null}

      <div className="flex flex-col gap-3">
        <h4 className="text-base font-semibold uppercase tracking-wide text-amber-300">Disagreements ({moderator.disagreements.length})</h4>
        {moderator.disagreements.length === 0 ? (
          <p className="text-base text-white/60">No finding was disputed in the challenge round.</p>
        ) : (
          moderator.disagreements.map((d) => (
            <div key={d.topic} className="rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-4">
              <p className="font-medium text-amber-100">{d.topic}</p>
              <dl className="mt-3 flex flex-col gap-2">
                {Object.entries(d.positions).map(([agent, position]) => (
                  <div key={agent} className="text-base">
                    <dt className="inline font-medium capitalize text-white">{agent}: </dt>
                    <dd className="inline text-white/75">{position}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-base font-semibold uppercase tracking-wide text-emerald-300">Consensus ({moderator.consensus.length})</h4>
        {moderator.consensus.map((c) => (
          <div key={c.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <SeverityChip severity={c.severity} />
              <p className="font-medium text-white">{c.title}</p>
            </div>
            <p className="mt-2 text-base leading-relaxed text-white/75">{c.detail}</p>
            {c.agreed_by.length > 0 ? <p className="mt-2 text-base text-white/50">Agreed by {c.agreed_by.join(", ")}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
