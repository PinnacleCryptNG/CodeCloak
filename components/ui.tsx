import type { ReactNode } from "react";
import type { Severity } from "@/lib/types";

export function Section({
  title,
  kicker,
  eyebrow,
  id,
  children,
}: {
  title: string;
  kicker?: ReactNode;
  eyebrow?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          {eyebrow ? <span className="font-mono text-base uppercase tracking-[0.2em] text-mint/80">{eyebrow}</span> : null}
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
        </div>
        {kicker ? <span className="text-base text-white/50">{kicker}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={`rounded-2xl border border-white/[0.08] bg-ink-1/80 p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

const SEVERITY_STYLE: Record<Severity, string> = {
  high: "bg-red-500/15 text-red-300 ring-red-400/30",
  medium: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
  low: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
  info: "bg-white/10 text-white/70 ring-white/20",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-mono text-base font-medium uppercase ring-1 ${SEVERITY_STYLE[severity]}`}>
      {severity}
    </span>
  );
}

export function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-medium ring-1 ${
        ok ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30" : "bg-red-500/15 text-red-300 ring-red-400/30"
      }`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-400"}`} />
      {children}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="break-all font-mono text-base text-white/80">{children}</code>;
}

/** Circular gauge; value 0–100, or null for "no value". */
export function Ring({ value, size = 96, label }: { value: number | null; size?: number; label: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  const color = value === null ? "#3a3f4b" : v >= 75 ? "#4ff0b8" : v >= 50 ? "#ffd166" : "#ff7a93";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums text-white">{value === null ? "—" : value}</span>
    </div>
  );
}

export function AgentAvatar({ glyph, color, size = "h-10 w-10" }: { glyph: string; color: string; size?: string }) {
  return (
    <span
      aria-hidden
      className={`flex ${size} shrink-0 items-center justify-center rounded-xl font-mono text-lg font-semibold`}
      style={{ background: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}55, 0 0 24px -8px ${color}` }}
    >
      {glyph}
    </span>
  );
}
