export type Phase = "idle" | "verifying" | "auditors" | "challenge" | "moderator" | "done" | "error";

const STEPS = [
  { key: "verifying", label: "Verifying enclave…" },
  { key: "auditors", label: "Auditors running…" },
  { key: "moderator", label: "Moderator reconciling…" },
] as const;

function stepIndex(phase: Phase): number {
  if (phase === "verifying") return 0;
  if (phase === "auditors" || phase === "challenge") return 1;
  if (phase === "moderator") return 2;
  return phase === "done" ? 3 : -1;
}

export function Steps({ phase }: { phase: Phase }) {
  const current = stepIndex(phase);
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:gap-4" aria-live="polite">
      {STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={step.key} className="flex items-center gap-2.5 text-base">
            <span
              aria-hidden
              className={`flex h-6 w-6 items-center justify-center rounded-full text-base ${
                state === "done"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : state === "active"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/30"
              }`}
            >
              {state === "done" ? "✓" : state === "active" ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : i + 1}
            </span>
            <span className={state === "pending" ? "text-white/40" : "text-white"}>
              {step.label}
              {i === 1 && phase === "challenge" ? <span className="text-white/50"> challenge round</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
