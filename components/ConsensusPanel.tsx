import type { CompletionRecord, ModeratorOutput } from "@/lib/types";
import { SignatureBadge } from "./AgentCard";
import { agentMeta } from "./agents";
import { AgentAvatar, Card, Ring, SeverityChip } from "./ui";

export function ConsensusPanel({ moderator, record }: { moderator: ModeratorOutput & { error?: string }; record?: CompletionRecord }) {
  const failed = Boolean(moderator.error || moderator.parseError);
  const confidence = failed ? 0 : moderator.confidence;
  const meta = agentMeta("moderator");
  return (
    <Card className="anim-rise flex flex-col gap-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AgentAvatar glyph={meta.glyph} color={meta.color} />
          <div>
            <h3 className="text-lg font-semibold text-white">Moderator ruling</h3>
            <p className="text-base text-white/50">{meta.lens}</p>
          </div>
        </div>
        <SignatureBadge record={record} />
      </header>

      <div className="flex flex-col gap-5 rounded-xl border border-white/[0.07] bg-black/25 p-5 sm:flex-row sm:items-center">
        <Ring value={failed ? null : confidence} label="Swarm confidence" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-base uppercase tracking-[0.2em] text-white/45">Swarm confidence</span>
          <p className="text-base text-white/70">
            {failed
              ? "No ruling, so no confidence."
              : moderator.confidenceBasis ?? "Computed from the challenge votes, not taken from the model."}
          </p>
          {moderator.summary && !failed ? <p className="mt-2 text-base leading-relaxed text-white/85">{moderator.summary}</p> : null}
        </div>
      </div>

      {failed ? (
        <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-base text-red-200">
          {moderator.error ? `Moderator failed (${moderator.error}).` : "Moderator reply was unreadable, so there is no ruling."} No consensus or confidence is
          shown; the disputes below come straight from the challenge votes.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 font-mono text-base uppercase tracking-[0.15em] text-amber-300">
            <span aria-hidden className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d]" />
            Disagreements ({moderator.disagreements.length})
          </h4>
          {moderator.disagreements.length === 0 ? (
            <p className="text-base text-white/60">No finding was disputed in the challenge round.</p>
          ) : (
            moderator.disagreements.map((d) => (
              <div key={d.topic} className="rounded-xl border border-amber-400/25 bg-amber-500/[0.05] p-4">
                <p className="font-medium text-amber-50">{d.topic}</p>
                <dl className="mt-3 flex flex-col gap-2.5">
                  {Object.entries(d.positions).map(([agent, position]) => {
                    const am = agentMeta(agent);
                    return (
                      <div key={agent} className="flex gap-2.5 text-base">
                        <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: am.color }} />
                        <div>
                          <dt className="inline font-medium text-white">{am.label}: </dt>
                          <dd className="inline text-white/70">{position}</dd>
                        </div>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 font-mono text-base uppercase tracking-[0.15em] text-emerald-300">
            <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
            Consensus ({moderator.consensus.length})
          </h4>
          {moderator.consensus.length === 0 ? <p className="text-base text-white/60">Nothing survived the challenge round unanimously.</p> : null}
          {moderator.consensus.map((c) => (
            <div key={c.title} className="rounded-xl border border-white/[0.07] bg-black/25 p-4">
              <div className="flex items-start gap-3">
                <SeverityChip severity={c.severity} />
                <p className="font-medium leading-snug text-white">{c.title}</p>
              </div>
              <p className="mt-2 text-base leading-relaxed text-white/70">{c.detail}</p>
              {c.agreed_by.length > 0 ? (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-base text-white/45">
                  Agreed by
                  {c.agreed_by.map((a) => {
                    const am = agentMeta(a);
                    return (
                      <span key={a} className="rounded-md px-2 py-0.5 text-base" style={{ background: `${am.color}1a`, color: am.color }}>
                        {am.label}
                      </span>
                    );
                  })}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
