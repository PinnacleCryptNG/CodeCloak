"use client";

import { useEffect, useState } from "react";
import { agentMeta } from "./agents";
import { Gauge } from "./ui";

/** Scripted walkthrough of one review, replayed on a loop. Example data mirrors a real vuln-sql run. */
const LOOP = 12500;
const STAGES = [
  { key: "attest", label: "Attest", status: "Verifying enclave…", at: 0 },
  { key: "audit", label: "Audit", status: "Auditors reviewing…", at: 2800 },
  { key: "challenge", label: "Challenge", status: "Challenge round…", at: 5600 },
  { key: "verdict", label: "Verdict", status: "Verdict signed", at: 8400 },
] as const;

const CODE = [
  "function searchOrders(id) {",
  "  const sql =",
  '    "SELECT * FROM orders " +',
  "    \"WHERE customer_id = '\" +",
  "    id + \"'\";",
  "  return db.query(sql);",
  "}",
];
const HOT = new Set([3, 4]);

const CHECKS = [
  ["Intel TDX quote", 500],
  ["NVIDIA GPU evidence", 1200],
  ["Nonce bound to this review", 1900],
] as const;

const FINDINGS = [
  { agent: "security", sev: "HIGH", title: "SQL injection in searchOrders", at: 4000 },
  { agent: "breaking", sev: "MED", title: "Unvalidated id breaks callers", at: 4500 },
  { agent: "quality", sev: "LOW", title: "No error handling on query", at: 5000 },
] as const;

const VOTES = [
  { agent: "breaking", stance: "backs", reason: "User input reaches the query unescaped.", at: 6200 },
  { agent: "quality", stance: "disputes", reason: "Same bug as S2. Merge them.", at: 7200 },
] as const;

function useLoopTime() {
  const [t, setT] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const id = setInterval(() => {
      if (!document.hidden) setT((performance.now() - start) % LOOP);
    }, 100);
    return () => clearInterval(id);
  }, [reduced]);
  return reduced ? LOOP - 1 : t;
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none transition duration-300 ${on ? "scale-100 bg-ok text-white" : "scale-90 bg-paper-2 text-transparent"}`}
    >
      ✓
    </span>
  );
}

function Pane({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className={`[grid-area:1/1] flex flex-col gap-3 transition ${show ? "translate-y-0 opacity-100 delay-200 duration-300" : "pointer-events-none translate-y-1 opacity-0 duration-150"}`} aria-hidden={!show}>
      {children}
    </div>
  );
}

export function HeroDemo() {
  const t = useLoopTime();
  const stage = STAGES.reduce((acc, s, i) => (t >= s.at ? i : acc), 0);
  const current = STAGES[stage];
  const progress = (k: number, from: number, len: number) => Math.max(0, Math.min(1, (t - from - k * 250) / len));

  return (
    <figure className="relative mx-auto w-full max-w-[34rem]" aria-label="Animated walkthrough of a CodeCloak review">
      <div aria-hidden className="glow-coral absolute -top-8 right-0 h-72 w-72 rounded-full opacity-40 xl:-right-12" />
      <div className="relative overflow-hidden rounded-[1.5rem] border border-line bg-card shadow-[0_30px_80px_-40px_rgba(22,19,15,0.5)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="font-mono text-base text-ink-2">orders.ts</span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-base font-medium transition-colors duration-500 ${stage === 3 ? "bg-[#e6f2ea] text-ok" : "bg-paper-2 text-ink"}`}
            aria-live="polite"
          >
            <span aria-hidden className={`h-2 w-2 rounded-full ${stage === 3 ? "bg-ok" : "anim-pulse bg-coral"}`} />
            {current.status}
          </span>
        </div>

        <div className="relative overflow-hidden bg-ink px-4 py-3 font-mono text-base leading-7 sm:px-5">
          {CODE.map((line, i) => {
            const hot = HOT.has(i) && stage >= 1 && t >= 3600;
            return (
              <div key={i} className={`-mx-2 flex rounded px-2 transition-colors duration-500 ${hot ? "bg-coral/25" : ""}`}>
                <span aria-hidden className="w-6 shrink-0 select-none text-[#5d564c]">
                  {i + 1}
                </span>
                <span className={`whitespace-pre ${hot ? "text-[#ffb3a6]" : "text-[#e9e1d4]"}`}>{line}</span>
                {hot && i === 3 ? <span className="ml-auto hidden pl-2 text-[#ff8a75] sm:inline">S1</span> : null}
              </div>
            );
          })}
          {stage === 1 && t < 4400 ? <span aria-hidden className="anim-scanline pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-coral/20 to-transparent" /> : null}
        </div>

        <div className="grid min-h-[15.5rem] p-4 sm:p-5">
          <Pane show={stage === 0}>
            <p className="font-semibold text-ink">Proving the enclave before any code is sent</p>
            <ul className="flex flex-col gap-2.5">
              {CHECKS.map(([label, at]) => (
                <li key={label} className="flex items-center gap-3 text-base text-ink-2">
                  <Tick on={t >= at} />
                  {label}
                </li>
              ))}
            </ul>
          </Pane>

          <Pane show={stage === 1}>
            <p className="font-semibold text-ink">Three auditors, in parallel</p>
            <ul className="flex flex-col gap-2.5">
              {FINDINGS.map((f, k) => {
                const m = agentMeta(f.agent);
                const found = t >= f.at;
                return (
                  <li key={f.agent} className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base font-semibold text-white" style={{ background: m.color }}>
                      {m.label[0]}
                    </span>
                    {found ? (
                      <span className="anim-rise flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-md bg-paper-2 px-1.5 font-mono text-base text-ink-2">{f.sev}</span>
                        <span className="truncate text-base text-ink">{f.title}</span>
                      </span>
                    ) : (
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                        <span className="block h-full rounded-full transition-[width] duration-200" style={{ width: `${progress(k, 2800, 1300) * 100}%`, background: m.color }} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Pane>

          <Pane show={stage === 2}>
            <p className="flex min-w-0 items-center gap-2 font-semibold text-ink">
              <span className="shrink-0 rounded-md bg-[#fde3de] px-1.5 font-mono text-base text-[#a42a18]">HIGH</span>
              <span className="truncate">S1 · SQL injection in searchOrders</span>
            </p>
            <ul className="flex flex-col gap-3 border-l-2 border-line pl-4">
              {VOTES.map((v) => {
                const m = agentMeta(v.agent);
                const on = t >= v.at;
                return (
                  <li key={v.agent} className={`flex flex-col gap-0.5 transition duration-500 ${on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"}`}>
                    <span className="text-base font-semibold" style={{ color: v.stance === "disputes" ? "var(--coral-deep)" : "var(--ok)" }}>
                      {m.label} {v.stance}
                    </span>
                    <span className="text-base text-ink-2">{v.reason}</span>
                  </li>
                );
              })}
            </ul>
          </Pane>

          <Pane show={stage === 3}>
            <div className="flex items-center gap-4 sm:gap-6">
              <Gauge value={stage === 3 ? 61 : 0} label="Example swarm confidence" className="w-32 sm:w-36" numberClass="text-[2rem]" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-base text-muted">Swarm confidence</span>
                <span className="text-base text-ink">
                  <span className="font-semibold">6</span> disagreements kept
                </span>
                <span className="text-base text-ink">
                  <span className="font-semibold">11/18</span> votes back the findings
                </span>
              </div>
            </div>
            <div
              className={`flex flex-col items-start gap-1 rounded-xl border-2 border-dashed px-4 py-2.5 transition duration-500 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${t >= 9400 ? "rotate-0 scale-100 border-ok opacity-100" : "-rotate-2 scale-95 border-line opacity-0"}`}
            >
              <span className="font-semibold text-ok">✓ Receipt</span>
              <span className="font-mono text-base text-ink">7/7 signed · nothing kept</span>
            </div>
          </Pane>
        </div>

        <ol className="grid grid-cols-4 border-t border-line">
          {STAGES.map((s, i) => (
            <li key={s.key} className="flex flex-col gap-2 px-3 pb-3 pt-2.5 sm:px-4">
              <span className="h-1 overflow-hidden rounded-full bg-paper-2">
                <span
                  className={`block h-full rounded-full ${i < stage ? "bg-ink" : "bg-coral"}`}
                  style={{ width: `${i < stage ? 100 : i === stage ? Math.min(100, ((t - s.at) / ((STAGES[i + 1]?.at ?? LOOP) - s.at)) * 100) : 0}%` }}
                />
              </span>
              <span className={`text-base ${i <= stage ? "font-semibold text-ink" : "text-muted"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 text-center text-base text-muted">A real review, replayed: fictional sample, example numbers.</figcaption>
    </figure>
  );
}
