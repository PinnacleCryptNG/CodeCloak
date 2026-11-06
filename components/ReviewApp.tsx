"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReviewError, ReviewResponse } from "@/lib/types";
import { AgentCard, type ReceivedVote } from "./AgentCard";
import { CodeView } from "./CodeView";
import { ConsensusPanel } from "./ConsensusPanel";
import { Steps, type Phase } from "./Steps";
import { Card, Eyebrow, Gauge, RichText, SectionHead, Status } from "./ui";
import { VerifiedPanel } from "./VerifiedPanel";

export type SampleView = { id: string; title: string; tag: string; blurb: string; files: { name: string; content: string }[] };

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

function ResultHead({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-[2.4rem]">{title}</h3>
      </div>
      {aside}
    </div>
  );
}

export function ReviewApp({ samples }: { samples: SampleView[] }) {
  const [mode, setMode] = useState<"demo" | "paste">("demo");
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [failure, setFailure] = useState<ReviewError | null>(null);
  const [subject, setSubject] = useState("");

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const sample = samples.find((s) => s.id === sampleId);
  const pasteBytes = useMemo(() => new TextEncoder().encode(code).length, [code]);
  const overLimit = pasteBytes > MAX_PASTE_BYTES;
  const running = phase === "verifying" || phase === "auditors" || phase === "challenge" || phase === "moderator";
  const canRun = !running && (mode === "demo" ? Boolean(sample) : code.trim() !== "" && !overLimit);

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
    setSubject(mode === "demo" ? (sample?.title ?? sampleId) : "your code");
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
  const moderator = result?.agents.moderator;
  const moderatorFailed = Boolean(moderator && (moderator.error || moderator.parseError));
  const recordFor = (agent: string, round: string) => result?.verified.completions.find((c) => c.agent === agent && c.round === round);

  return (
    <div className="flex flex-col gap-20">
      <section className="flex flex-col gap-10">
        <SectionHead
          id="review"
          eyebrow="Live demo"
          title={
            <>
              Try it on a <em className="text-coral">planted bug.</em>
            </>
          }
          lede="Four fictional samples, each hiding a real class of bug. Pick one, or paste your own code. It is reviewed in memory and never stored."
        />

        <Card className="grid min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex min-w-0 flex-col gap-6 border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <div role="tablist" aria-label="Input mode" className="grid grid-cols-2 gap-1 rounded-full bg-paper-2 p-1">
              {(["demo", "paste"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  type="button"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-4 py-2.5 text-base font-semibold transition ${mode === m ? "bg-card text-ink shadow-[0_1px_3px_rgba(22,19,15,0.15)]" : "text-muted hover:text-ink"}`}
                >
                  {m === "demo" ? "Demo sample" : "Paste code"}
                </button>
              ))}
            </div>

            {mode === "demo" ? (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
                  <span className="text-base font-semibold text-ink">Choose a sample</span>
                  <span className="text-base text-muted">All fictional</span>
                </legend>
                {samples.map((s) => {
                  const selected = s.id === sampleId;
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border px-4 py-3.5 transition ${
                        selected ? "border-ink bg-card shadow-[0_6px_18px_-12px_rgba(22,19,15,0.5)]" : "border-line hover:border-ink/30"
                      }`}
                    >
                      <input type="radio" name="sample" value={s.id} checked={selected} onChange={() => setSampleId(s.id)} className="sr-only" />
                      <span aria-hidden className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${selected ? "border-coral" : "border-line"}`}>
                        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-coral" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="font-semibold text-ink">{s.title}</span>
                          <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-base text-ink-2">{s.tag}</span>
                        </span>
                        <span className="text-base text-muted">{s.blurb}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-base leading-relaxed text-ink-2">
                  Paste a diff or a single file: TypeScript, JavaScript, Python or Go. It is held in memory for this request only and never logged.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div className={`h-full rounded-full ${overLimit ? "bg-bad" : "bg-ink"}`} style={{ width: `${Math.min(100, (pasteBytes / MAX_PASTE_BYTES) * 100)}%` }} />
                  </div>
                  <p className={`font-mono text-base tabular-nums ${overLimit ? "text-bad" : "text-muted"}`}>{(pasteBytes / 1024).toFixed(1)} / 80 KB</p>
                  {overLimit ? (
                    <p role="alert" className="text-base font-medium text-bad">
                      That&apos;s over the 80 KB limit. Trim it to run a review.
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-auto flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={run}
                disabled={!canRun}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral px-6 py-4 text-lg font-semibold text-white transition hover:bg-coral-deep disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/50"
              >
                {running ? "Reviewing…" : "Run private review"}
                {running ? null : (
                  <span aria-hidden className="transition group-hover:translate-x-0.5">
                    →
                  </span>
                )}
              </button>
              <p className="text-center text-base text-muted">About a minute · 7 attested, signed model calls</p>
            </div>
          </div>

          <div className="relative min-w-0 bg-paper/40 p-3 sm:p-4 lg:min-h-[34rem]">
            <div className="h-full lg:absolute lg:inset-4">
            {mode === "demo" ? (
              sample ? (
                <CodeView key={sample.id} files={sample.files} />
              ) : null
            ) : (
              <>
                <label htmlFor="code" className="sr-only">
                  Code to review
                </label>
                <textarea
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  rows={16}
                  placeholder="// Paste code here"
                  className="code-scroll h-full min-h-[22rem] w-full resize-none rounded-2xl bg-ink p-5 font-mono text-base leading-7 text-[#e9e1d4] placeholder:text-[#7d7467] focus:outline-none focus:ring-2 focus:ring-coral/60 lg:min-h-0"
                />
              </>
            )}
            </div>
          </div>
        </Card>

        {phase !== "idle" && phase !== "error" ? (
          <Card className="anim-rise p-5 sm:p-7">
            <Steps phase={phase} elapsed={elapsed} subject={subject} />
          </Card>
        ) : null}

        {failure ? (
          <div role="alert" className="anim-rise flex gap-4 rounded-[1.25rem] border border-[#efc3bb] bg-[#fbe6e2] p-5 sm:p-6">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bad text-lg text-white">
              ✗
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-[#7d1d10]">{ERROR_TEXT[failure.error] ?? failure.message ?? `Review failed (${failure.error}).`}</p>
              {failure.error === "attestation_failed" ? <p className="mt-1 text-base text-[#7d1d10]/80">Fail-closed: no model call was made.</p> : null}
              {failure.checks?.length ? (
                <ul className="mt-3 flex flex-col gap-1">
                  {failure.checks.map((c, i) => (
                    <li key={`${c.report}-${c.name}-${i}`} className="text-base">
                      <span className={c.ok ? "text-ok" : "text-bad"}>{c.ok ? "✓" : "✗"}</span>{" "}
                      <span className="font-mono text-ink">
                        {c.report} · {c.name}
                      </span>
                      {c.detail ? <span className="text-muted"> ({c.detail})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {result && moderator ? (
        <div ref={resultsRef} className="flex scroll-mt-28 flex-col gap-14">
          <section className="flex flex-col gap-6">
            <ResultHead
              eyebrow="Result"
              title="The verdict"
              aside={<Status ok={result.verified.allSignaturesVerified}>{signed}/{result.verified.completions.length} responses signed</Status>}
            />
            <Card className="anim-rise flex min-w-0 flex-col overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="flex min-w-0 flex-col gap-4 p-6 sm:p-8">
                  <span className="text-base font-medium text-muted">What the swarm concluded</span>
                  <p className="font-display text-xl font-normal leading-relaxed text-ink sm:text-2xl sm:leading-snug">
                    {moderatorFailed ? "The moderator gave no ruling for this run." : <RichText text={moderator.summary || "No summary given."} />}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center gap-3 border-t border-line bg-paper/50 p-6 text-center lg:border-l lg:border-t-0">
                  <span className="text-base font-medium text-muted">Swarm confidence</span>
                  <Gauge value={moderatorFailed ? null : moderator.confidence} label="Swarm confidence" />
                  <p className="text-base text-ink-2">
                    {moderatorFailed ? "No ruling, so no confidence." : moderator.confidenceBasis ?? "Computed from the challenge votes, not taken from the model."}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4 [&>*]:bg-card">
                {[
                  ["Findings", findingCount, "text-ink"],
                  ["Disagreements", moderator.disagreements.length, "text-warn"],
                  ["Agreed", moderator.consensus.length, "text-ink"],
                  ["Signed", `${signed}/${result.verified.completions.length}`, result.verified.allSignaturesVerified ? "text-ok" : "text-bad"],
                ].map(([label, value, tone]) => (
                  <div key={label as string} className="flex min-w-0 flex-col gap-1.5 px-6 py-5">
                    <dt className="text-base text-muted">{label}</dt>
                    <dd className={`font-display text-4xl font-semibold leading-none tabular-nums ${tone}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>

          <section className="flex flex-col gap-6">
            <ResultHead eyebrow="Rounds 1 & 2" title="Each auditor's findings" aside={<span className="text-base text-muted">Tap a finding to see the votes</span>} />
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
              {AUDITORS.map((a) => (
                <AgentCard key={a} name={a} output={result.agents[a]} record={recordFor(a, "audit")} votes={votesByFinding} />
              ))}
            </div>
            {result.challenges.some((c) => c.parseError || c.missing?.length) ? (
              <div role="status" className="rounded-2xl border border-[#ecd3a6] bg-[#fbefd9] p-5 text-base text-[#6e4300]">
                <p className="font-semibold">Challenge round incomplete</p>
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
          </section>

          <section className="flex flex-col gap-6">
            <ResultHead eyebrow="Round 3" title="What the moderator ruled" />
            <ConsensusPanel moderator={moderator} record={recordFor("moderator", "moderate")} />
          </section>

          <section className="flex flex-col gap-6">
            <ResultHead eyebrow="Proof" title="Proof it ran privately" />
            <VerifiedPanel verified={result.verified} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
