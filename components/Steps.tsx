export type Phase = "idle" | "verifying" | "auditors" | "challenge" | "moderator" | "done" | "error";

const STEPS = [
  { key: "verifying", label: "Verifying enclave…", detail: "Intel TDX · NVIDIA GPU · fresh nonce" },
  { key: "auditors", label: "Auditors running…", detail: "3 auditors in parallel, then a challenge round" },
  { key: "moderator", label: "Moderator reconciling…", detail: "Consensus, disagreements, signatures" },
] as const;

function stepIndex(phase: Phase): number {
  if (phase === "verifying") return 0;
  if (phase === "auditors" || phase === "challenge") return 1;
  if (phase === "moderator") return 2;
  return phase === "done" ? 3 : -1;
}

export function Steps({ phase, elapsed }: { phase: Phase; elapsed?: number }) {
  const current = stepIndex(phase);
  const progress = phase === "done" ? 100 : Math.max(0, (current + (phase === "challenge" ? 0.5 : 0.15)) / STEPS.length) * 100;
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-base uppercase tracking-[0.2em] text-white/45">{phase === "done" ? "Review complete" : "Private review in progress"}</span>
        {elapsed !== undefined ? <span className="font-mono text-base tabular-nums text-white/60">{(elapsed / 1000).toFixed(1)} s</span> : null}
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-mint to-violet transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "active" : "pending";
          return (
            <li
              key={step.key}
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition ${
                state === "active" ? "border-mint/40 bg-mint/[0.06]" : state === "done" ? "border-white/[0.08] bg-white/[0.02]" : "border-white/[0.05]"
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base ${
                  state === "done" ? "bg-mint/15 text-mint" : state === "active" ? "bg-mint/20 text-white" : "bg-white/5 text-white/30"
                }`}
              >
                {state === "done" ? "✓" : state === "active" ? <span className="anim-breathe h-2.5 w-2.5 rounded-full bg-mint" /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={state === "pending" ? "text-white/40" : "font-medium text-white"}>
                  {step.label}
                  {i === 1 && phase === "challenge" ? <span className="font-normal text-mint"> challenge round</span> : null}
                </span>
                <span className="text-base text-white/40">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
