export type Phase = "idle" | "verifying" | "auditors" | "challenge" | "moderator" | "done" | "error";

const STEPS = [
  { key: "verifying", label: "Verifying enclave…", detail: "Intel TDX, NVIDIA GPU, fresh nonce" },
  { key: "auditors", label: "Auditors running…", detail: "Three lenses in parallel, then the challenge round" },
  { key: "moderator", label: "Moderator reconciling…", detail: "Ruling, disagreements, signature checks" },
] as const;

function stepIndex(phase: Phase): number {
  if (phase === "verifying") return 0;
  if (phase === "auditors" || phase === "challenge") return 1;
  if (phase === "moderator") return 2;
  return phase === "done" ? 3 : -1;
}

export function Steps({ phase, elapsed, subject }: { phase: Phase; elapsed?: number; subject?: string }) {
  const current = stepIndex(phase);
  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-2xl font-semibold text-ink">
          {phase === "done" ? "Review complete" : "Reviewing privately"}
          {subject ? <span className="font-mono text-lg font-normal text-muted"> · {subject}</span> : null}
        </p>
        {elapsed !== undefined ? <span className="font-mono text-lg tabular-nums text-ink-2">{(elapsed / 1000).toFixed(1)}s</span> : null}
      </div>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "active" : "pending";
          return (
            <li key={step.key} className="flex flex-col gap-3">
              <span className="relative h-1.5 overflow-hidden rounded-full bg-paper-2">
                <span className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ${state === "pending" ? "w-0" : "w-full"} ${state === "done" ? "bg-ink" : "anim-pulse bg-coral"}`} />
              </span>
              <span className="flex flex-col">
                <span className={`flex items-center gap-2 font-semibold ${state === "pending" ? "text-muted" : "text-ink"}`}>
                  {state === "done" ? <span aria-hidden className="text-ok">✓</span> : state === "active" ? <span aria-hidden className="anim-pulse h-2 w-2 rounded-full bg-coral" /> : null}
                  {step.label}
                  {i === 1 && phase === "challenge" ? <span className="font-normal text-coral-deep">challenge round</span> : null}
                </span>
                <span className="text-base text-muted">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
