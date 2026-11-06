"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewError, ReviewResponse } from "@/lib/types";
import { AgentCard, type ReceivedVote } from "./AgentCard";
import { CodeView } from "./CodeView";
import { ConsensusPanel } from "./ConsensusPanel";
import { Steps, type Phase } from "./Steps";
import { Card, Ring, Section } from "./ui";
import { VerifiedPanel } from "./VerifiedPanel";

export type SampleView = { id: string; label: string; files: { name: string; content: string }[] };

const MAX_PASTE_BYTES = 80 * 1024;
const AUDITORS = ["security", "breaking", "quality"] as const;

const ERROR_TEXT: Record<string, string> = {
  attestation_failed: "Enclave attestation failed, so your code was never sent to a model.",
  code_too_large: "That code is over the 80 KB limit.",
  binary_not_supported: "Binary content is not supported. Paste text source only.",
  code_required: "Paste some code first.",
  server_not_configured: "The server has no NEAR AI API key configured.",
  network_error: "Couldn't reach the server. Check your connection and try again.",
  stream_incomplete: "The review stopped before a result arrived. Nothing was stored; try again.",
};

export function ReviewApp({ samples }: { samples: SampleView[] }) {
  const [mode, setMode] = useState<"demo" | "paste">("demo");
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [failure, setFailure] = useState<ReviewError | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const sample = samples.find((s) => s.id === sampleId);
  const pasteBytes = useMemo(() => new TextEncoder().encode(code).length, [code]);
  const running = phase === "verifying" || phase === "auditors" || phase === "challenge" || phase === "moderator";
  const canRun = !running && (mode === "demo" ? Boolean(sample) : code.trim() !== "" && pasteBytes <= MAX_PASTE_BYTES);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function run() {
    setResult(null);
    setFailure(null);
    setPhase("verifying");
    const t0 = Date.now();
    setStartedAt(t0);
    setNow(t0);
    setFinishedAt(null);
    try {
      await stream();
    } finally {
      setFinishedAt(Date.now());
    }
  }

  async function stream() {
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify(mode === "demo" ? { mode, sampleId } : { mode, code }),
      });
      if (!res.ok || !res.body) {
        setFailure(((await res.json().catch(() => null)) as ReviewError | null) ?? { error: `http_${res.status}` });
        setPhase("error");
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let settled = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as { stage?: Phase; result?: ReviewResponse; error?: string; message?: string };
          if (event.stage) setPhase(event.stage);
          if (event.result || event.error) settled = true;
          if (event.result) {
            setResult(event.result);
            setPhase("done");
          }
          if (event.error) {
            setFailure({ error: event.error, message: event.message });
            setPhase("error");
          }
        }
      }
      if (!settled) {
        setFailure({ error: "stream_incomplete" });
        setPhase("error");
      }
    } catch {
      setFailure({ error: "network_error" });
      setPhase("error");
    }
  }

  const votesByFinding = useMemo(() => {
    const map = new Map<string, ReceivedVote[]>();
    for (const c of result?.challenges ?? []) {
      for (const v of c.votes) map.set(v.finding_id, [...(map.get(v.finding_id) ?? []), { ...v, agent: c.agent }]);
    }
    return map;
  }, [result]);
  const elapsed = startedAt === null ? undefined : (finishedAt ?? now) - startedAt;
  const findingCount = result ? AUDITORS.reduce((n, a) => n + (result.agents[a].findings?.length ?? 0), 0) : 0;
  const signed = result?.verified.completions.filter((c) => c.signature?.status === "verified").length ?? 0;
  const moderatorFailed = Boolean(result && (result.agents.moderator.error || result.agents.moderator.parseError));
  const recordFor = (agent: string, round: string) => result?.verified.completions.find((c) => c.agent === agent && c.round === round);

  return (
    <div className="flex flex-col gap-16">
      <Section id="review" eyebrow="Live demo" title="Run a private review" kicker="Fictional samples or your own code">
        <Card className="ring-gradient flex flex-col gap-6">
          <div role="tablist" aria-label="Input mode" className="grid w-full grid-cols-2 gap-1 rounded-xl bg-black/40 p-1 ring-1 ring-white/[0.06] sm:w-80">
            {(["demo", "paste"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-4 py-2.5 text-base font-medium transition ${mode === m ? "bg-white text-black shadow" : "text-white/60 hover:text-white"}`}
              >
                {m === "demo" ? "Demo sample" : "Paste code"}
              </button>
            ))}
          </div>

          {mode === "demo" ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <fieldset className="flex flex-col gap-2.5">
                <legend className="mb-2.5 text-base text-white/50">Pick a planted bug</legend>
                {samples.map((s) => {
                  const selected = s.id === sampleId;
                  return (
                    <label
                      key={s.id}
                      className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                        selected ? "border-mint/50 bg-mint/[0.06] shadow-[0_0_30px_-12px_var(--mint)]" : "border-white/[0.08] hover:border-white/25 hover:bg-white/[0.02]"
                      }`}
                    >
                      <input type="radio" name="sample" value={s.id} checked={selected} onChange={() => setSampleId(s.id)} className="sr-only" />
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${selected ? "border-mint" : "border-white/25"}`}
                      >
                        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-mint" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-mono text-base text-white">{s.id}</span>
                        <span className="text-base text-white/55">{s.label}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              {sample ? <CodeView key={sample.id} files={sample.files} /> : null}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="code" className="text-base text-white/70">
                Diff or .ts / .js / .py / .go source
              </label>
              <textarea
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                rows={14}
                placeholder="Paste code here. It is reviewed in memory only and never stored."
                className="w-full rounded-xl border border-white/[0.08] bg-[#07080d] p-4 font-mono text-base leading-7 text-white placeholder:text-white/30 focus:border-mint/50 focus:outline-none focus:ring-2 focus:ring-mint/20"
              />
              <div className="flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${pasteBytes > MAX_PASTE_BYTES ? "bg-red-400" : "bg-mint/70"}`}
                    style={{ width: `${Math.min(100, (pasteBytes / MAX_PASTE_BYTES) * 100)}%` }}
                  />
                </div>
                <p className={`font-mono text-base tabular-nums ${pasteBytes > MAX_PASTE_BYTES ? "text-red-300" : "text-white/45"}`}>
                  {(pasteBytes / 1024).toFixed(1)} / 80 KB
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2.5 text-base text-white/50">
              <span aria-hidden className="text-mint">●</span>
              Enclave verified before code leaves the server · nothing stored
            </p>
            <button
              type="button"
              onClick={run}
              disabled={!canRun}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-mint to-[#7fe7ff] px-6 py-3.5 text-base font-semibold text-black shadow-[0_10px_40px_-10px_var(--mint)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:w-auto"
            >
              {running ? "Reviewing…" : "Run private review"}
              <span aria-hidden className="ml-2 inline-block transition group-hover:translate-x-0.5">
                {running ? "" : "→"}
              </span>
            </button>
          </div>
        </Card>

        {phase !== "idle" && phase !== "error" ? (
          <Card className="anim-rise">
            <Steps phase={phase} elapsed={elapsed} />
          </Card>
        ) : null}

        {failure ? (
          <div role="alert" className="anim-rise flex gap-4 rounded-2xl border border-red-400/40 bg-red-500/[0.08] p-5">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-lg text-red-300 ring-1 ring-red-400/40">
              ✗
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-red-100">{ERROR_TEXT[failure.error] ?? failure.message ?? `Review failed (${failure.error}).`}</p>
              {failure.error === "attestation_failed" ? <p className="mt-1 text-base text-red-200/70">Fail-closed: no model call was made.</p> : null}
              {failure.checks?.length ? (
                <ul className="mt-3 flex flex-col gap-1">
                  {failure.checks.map((c, i) => (
                    <li key={`${c.report}-${c.name}-${i}`} className="text-base">
                      <span className={c.ok ? "text-emerald-300" : "text-red-300"}>{c.ok ? "✓" : "✗"}</span>{" "}
                      <span className="font-mono text-white/80">
                        {c.report} · {c.name}
                      </span>
                      {c.detail ? <span className="text-white/50"> ({c.detail})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </Section>

      {result ? (
        <div ref={resultsRef} className="flex scroll-mt-24 flex-col gap-16">
          <div className="anim-rise grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="col-span-2 flex items-center gap-4 lg:col-span-1">
              <Ring value={moderatorFailed ? null : result.agents.moderator.confidence} size={72} label="Swarm confidence" />
              <div className="flex flex-col">
                <span className="text-base text-white/50">Confidence</span>
                <span className="text-base text-white/80">from votes</span>
              </div>
            </Card>
            <Stat label="Disagreements" value={result.agents.moderator.disagreements.length} tone="text-amber-300" />
            <Stat label="Findings" value={findingCount} tone="text-white" />
            <Stat
              className="col-span-2 lg:col-span-1"
              label="Signed responses"
              value={`${signed}/${result.verified.completions.length}`}
              tone={result.verified.allSignaturesVerified ? "text-mint" : "text-red-300"}
            />
          </div>
          <Section eyebrow="Rounds 1 + 2" title="Auditor swarm" kicker="Findings, then each auditor backs or disputes the others">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {AUDITORS.map((a) => (
                <AgentCard key={a} name={a} output={result.agents[a]} record={recordFor(a, "audit")} votes={votesByFinding} />
              ))}
            </div>
            {result.challenges.some((c) => c.parseError || c.missing?.length) ? (
              <div role="status" className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-base text-amber-100">
                <p className="font-medium">Challenge round incomplete</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {result.challenges
                    .filter((c) => c.parseError || c.missing?.length)
                    .map((c) => (
                      <li key={c.agent}>
                        {c.agent}: {c.parseError ? "reply unreadable — no votes counted" : `no valid vote on ${c.missing?.join(", ")}`}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </Section>
          <Section eyebrow="Round 3" title="Consensus" kicker={`${result.agents.moderator.disagreements.length} disagreements`}>
            <ConsensusPanel moderator={result.agents.moderator} record={recordFor("moderator", "moderate")} />
          </Section>
          <Section eyebrow="Proof" title="Verification">
            <VerifiedPanel verified={result.verified} />
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone, className = "" }: { label: string; value: number | string; tone: string; className?: string }) {
  return (
    <Card className={`flex flex-col justify-center gap-1 ${className}`}>
      <span className="text-base text-white/50">{label}</span>
      <span className={`text-3xl font-semibold tabular-nums ${tone}`}>{value}</span>
    </Card>
  );
}
