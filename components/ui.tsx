import type { ReactNode } from "react";
import type { Severity } from "@/lib/types";

export function Section({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        {kicker ? <span className="text-base text-white/50">{kicker}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] ${className}`}>
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
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-base font-medium uppercase tracking-wide ring-1 ${SEVERITY_STYLE[severity]}`}>
      {severity}
    </span>
  );
}

export function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-medium ring-1 ${
        ok ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" : "bg-red-500/15 text-red-300 ring-red-400/30"
      }`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {children}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="break-all font-mono text-base text-white/80">{children}</code>;
}
