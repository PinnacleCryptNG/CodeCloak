import type { CSSProperties, ReactNode } from "react";
import type { Severity } from "@/lib/types";
import { agentMeta } from "./agents";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-base uppercase tracking-[0.14em] text-muted ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-coral" />
      {children}
    </span>
  );
}

export function SectionHead({ eyebrow, title, lede, id, align = "left" }: { eyebrow: string; title: ReactNode; lede?: ReactNode; id?: string; align?: "left" | "center" }) {
  return (
    <div id={id} className={`flex scroll-mt-28 flex-col gap-4 ${align === "center" ? "items-center text-center" : ""}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-display max-w-3xl text-[2.4rem] font-semibold leading-[1.02] text-ink sm:text-[3.4rem]">{title}</h2>
      {lede ? <p className="max-w-2xl text-lg leading-relaxed text-ink-2">{lede}</p> : null}
    </div>
  );
}

export function Card({ children, className = "", style, as: Tag = "div" }: { children: ReactNode; className?: string; style?: CSSProperties; as?: "div" | "section" | "article" | "li" }) {
  return (
    <Tag style={style} className={`rounded-[1.25rem] border border-line bg-card shadow-[0_1px_0_rgba(22,19,15,0.04),0_12px_32px_-24px_rgba(22,19,15,0.35)] ${className}`}>
      {children}
    </Tag>
  );
}

const SEVERITY_STYLE: Record<Severity, string> = {
  high: "bg-[#fde3de] text-[#a42a18]",
  medium: "bg-[#fbecd2] text-[#8a5200]",
  low: "bg-[#e3e9fb] text-[#2443a3]",
  info: "bg-paper-2 text-muted",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-mono text-base font-medium uppercase ${SEVERITY_STYLE[severity]}`}>{severity}</span>;
}

export function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-base font-medium ${ok ? "border-[#bfdcc9] bg-[#e6f2ea] text-ok" : "border-[#efc3bb] bg-[#fbe6e2] text-bad"}`}>
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-ok" : "bg-bad"}`} />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/** Renders `inline code` spans from model text as code; everything else stays plain text. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`\n]+`)/).map((part, i) =>
        part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded bg-paper-2 px-1 py-px font-mono text-[max(1rem,0.85em)] text-ink">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <code className={`break-all font-mono text-base text-ink-2 ${className}`}>{children}</code>;
}

/** Half-circle gauge; value 0–100, or null for "no value". */
export function Gauge({ value, label, className = "w-44", numberClass = "text-[2.6rem]" }: { value: number | null; label: string; className?: string; numberClass?: string }) {
  const v = value ?? 0;
  const r = 52;
  const len = Math.PI * r;
  const color = value === null ? "var(--line)" : v >= 75 ? "var(--ok)" : v >= 50 ? "var(--warn)" : "var(--coral)";
  return (
    <div className={`relative shrink-0 ${className}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <svg viewBox="0 0 128 72" className="w-full" aria-hidden>
        <path d="M12 66a52 52 0 0 1 104 0" fill="none" stroke="var(--paper-2)" strokeWidth="11" strokeLinecap="round" />
        <path
          d="M12 66a52 52 0 0 1 104 0"
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len - (len * v) / 100}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <span className={`font-display absolute inset-x-0 bottom-0 text-center font-semibold leading-none tabular-nums text-ink ${numberClass}`}>
        {value === null ? "—" : value}
      </span>
    </div>
  );
}

export function AgentTag({ name, suffix }: { name: string; suffix?: ReactNode }) {
  const m = agentMeta(name);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-base font-medium" style={{ background: m.tint, color: m.color }}>
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: m.color }} />
      {m.label}
      {suffix}
    </span>
  );
}

export function AgentInitial({ name, size = "h-11 w-11 text-xl" }: { name: string; size?: string }) {
  const m = agentMeta(name);
  return (
    <span aria-hidden className={`font-display flex ${size} shrink-0 items-center justify-center rounded-xl font-semibold`} style={{ background: m.color, color: name === "moderator" ? "var(--paper)" : "#fff" }}>
      {m.label[0]}
    </span>
  );
}

export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "ghost" | "ink"; className?: string }) {
  const styles = {
    primary: "bg-coral text-white hover:bg-coral-deep",
    ink: "bg-ink text-paper hover:bg-ink-2",
    ghost: "border border-ink/15 text-ink hover:border-ink/40 hover:bg-card",
  }[variant];
  return (
    <a href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold transition ${styles} ${className}`}>
      {children}
    </a>
  );
}
