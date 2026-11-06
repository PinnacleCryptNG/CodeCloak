"use client";

import { useEffect, useRef, useState } from "react";

const CODE: [string, boolean][] = [
  ["// FICTIONAL demo sample", false],
  ["export function searchOrders(id) {", false],
  ['  const q = "… WHERE id=" + id;', true],
  ["  return db.query(q);", false],
  ["}", false],
];

type Line =
  | { kind: "row"; k: string; v: string; ok?: boolean; mark?: string }
  | { kind: "finding"; ref: string; title: string; sev: string; votes: string; mark?: string }
  | { kind: "rule" };

export const RECEIPT: Line[] = [
  { kind: "row", k: "Intel TDX quotes", v: "verified", ok: true, mark: "1" },
  { kind: "row", k: "NVIDIA GPU", v: "verified", ok: true, mark: "2" },
  { kind: "row", k: "Nonce bound", v: "8785ff…", mark: "3" },
  { kind: "rule" },
  { kind: "finding", ref: "S1", title: "SQL injection", sev: "HIGH", votes: "Breaking backs · Quality backs" },
  { kind: "finding", ref: "B2", title: "Export renamed", sev: "MED", votes: "Quality disputes" },
  { kind: "finding", ref: "Q1", title: "No error path", sev: "LOW", votes: "Security backs" },
  { kind: "rule" },
  { kind: "row", k: "Confidence", v: "61 / 100" },
  { kind: "row", k: "Signatures", v: "7/7 valid", ok: true, mark: "4" },
  { kind: "row", k: "Code retained", v: "0 bytes", mark: "5" },
];

function Mark({ n }: { n?: string }) {
  if (!n) return null;
  return (
    <span aria-hidden className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-base leading-none text-white">
      {n}
    </span>
  );
}

/** The receipt itself. `animate` prints it line by line; `marks` shows the numbered callouts. */
export function Receipt({ animate = false, marks = false, perf, delay = 0 }: { animate?: boolean; marks?: boolean; perf?: string; delay?: number }) {
  const step = (i: number) => (animate ? { animationDelay: `${delay + i * 0.32}s` } : undefined);
  const cls = animate ? "anim-print" : "";
  return (
    <div className="receipt w-full px-6 pb-10 pt-9 font-mono text-base text-ink shadow-[0_18px_40px_-18px_rgba(17,18,20,0.35)]" style={perf ? ({ "--perf": perf } as React.CSSProperties) : undefined}>
      <div className={`flex flex-col items-center gap-1 text-center ${cls}`} style={step(0)}>
        <span className="font-display text-[1.6rem] italic leading-none tracking-tight">codecloak</span>
        <span className="uppercase tracking-[0.16em] text-muted">Review receipt</span>
        <span className="text-muted">orders.ts · sha256 8ee4…a88b</span>
      </div>
      <div className="my-4 border-t-2 border-dashed border-ink/20" />
      <div className="flex flex-col gap-2">
        {RECEIPT.map((l, i) => {
          if (l.kind === "rule") return <div key={i} className={`my-2 border-t-2 border-dashed border-ink/20 ${cls}`} style={step(i + 1)} />;
          if (l.kind === "finding")
            return (
              <div key={i} className={`flex flex-col ${cls}`} style={step(i + 1)}>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted">{l.ref}</span>
                  <span className="min-w-0 flex-1">{l.title}</span>
                  <span className={l.sev === "HIGH" ? "text-coral-deep" : l.sev === "MED" ? "text-warn" : "text-muted"}>{l.sev}</span>
                </div>
                <span className="pl-8 text-muted">{l.votes}</span>
              </div>
            );
          return (
            <div key={i} className={`flex items-baseline ${cls}`} style={step(i + 1)}>
              {marks ? <Mark n={l.mark} /> : null}
              <span className="shrink-0">{l.k}</span>
              <span className="leader mx-2" />
              <span className={`shrink-0 ${l.ok ? "text-ok" : ""}`}>{l.v}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex justify-end">
        <span
          className={`inline-flex flex-col items-center rounded-md border-[3px] border-coral px-3 py-1 text-center leading-tight text-coral-deep ${animate ? "anim-stamp" : "-rotate-[9deg]"}`}
          style={animate ? { animationDelay: `${delay + (RECEIPT.length + 1) * 0.32 + 0.2}s` } : undefined}
        >
          <span className="font-semibold uppercase tracking-[0.12em]">Signed in enclave</span>
          <span>nothing kept</span>
        </span>
      </div>
    </div>
  );
}

/** Hero scene: code is redacted on its way into the enclave, a signed receipt prints out. */
export function HeroReceipt() {
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setRun((r) => r + 1), 12500);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div key={run} className="relative mx-auto flex w-full max-w-[29rem] flex-col items-center">
      <div className="relative z-10 w-[94%] -rotate-[1.5deg] overflow-hidden on-night rounded-xl border border-night-line bg-night text-paper shadow-[0_20px_40px_-20px_rgba(17,18,20,0.6)]">
        <div className="flex items-center justify-between gap-3 border-b border-night-line px-4 py-2.5">
          <span className="font-mono text-base">orders.ts</span>
          <span className="flex items-center gap-2 font-mono text-base text-coral">
            <span aria-hidden className="anim-pulse h-2 w-2 rounded-full bg-coral" />
            sealing
          </span>
        </div>
        <pre className="flex flex-col gap-1 overflow-hidden px-4 py-3 font-mono text-base leading-6">
          {CODE.map(([line, hot], i) => (
            <span key={i} className="relative block whitespace-pre">
              <span className={`anim-print inline-block ${hot ? "text-coral" : i === 0 ? "text-[#8b8f99]" : ""}`} style={{ animationDelay: `${0.2 + i * 0.22}s` }}>
                {line}
              </span>
              <span aria-hidden className="anim-redact absolute inset-y-0.5 left-0 right-0 rounded-[3px] bg-[#2a2e38]" style={{ animationDelay: `${1.9 + i * 0.14}s` }} />
            </span>
          ))}
        </pre>
      </div>
      <div className="z-0 -mt-3 w-full rotate-[0.8deg]">
        <Receipt animate delay={2.7} />
      </div>
      <p className="mt-4 text-center text-base text-muted">Example receipt from a fictional sample.</p>
    </div>
  );
}

/** The annotated receipt in the proof section; prints once it scrolls into view. */
export function ReceiptOnView({ perf }: { perf?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={seen ? "" : "await-view"}>
      <Receipt marks animate={seen} perf={perf} />
    </div>
  );
}
