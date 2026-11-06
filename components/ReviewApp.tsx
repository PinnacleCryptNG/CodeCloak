"use client";

import { useMemo, useState } from "react";
import type { ReviewError, ReviewResponse } from "@/lib/types";
import { AgentCard, type ReceivedVote } from "./AgentCard";
import { ConsensusPanel } from "./ConsensusPanel";
import { Steps, type Phase } from "./Steps";
import { Card, Section } from "./ui";
import { VerifiedPanel } from "./VerifiedPanel";

export type SampleView = { id: string; label: string; files: { name: string; content: string }[] };

const MAX_PASTE_BYTES = 80 * 1024;
const AUDITORS = [
  { name: "security", lens: "Vulnerabilities, secrets, authz, injection" },
  { name: "breaking", lens: "API, type and behaviour regressions" },
  { name: "quality", lens: "Readability, dead code, missing tests" },
] as const;

const ERROR_TEXT: Record<string, string> = {
  attestation_failed: "Enclave attestation failed, so your code was never sent to a model.",
  code_too_large: "That code is over the 80 KB limit.",
  binary_not_supported: "Binary content is not supported. Paste text source only.",
  code_required: "Paste some code first.",
  server_not_configured: "The server has no NEAR AI API key configured.",
};

export function ReviewApp({ samples }: { samples: SampleView[] }) {
  const [mode, setMode] = useState<"demo" | "paste">("demo");
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [failure, setFailure] = useState<ReviewError | null>(null);

  const sample = samples.find((s) => s.id === sampleId);
  const pasteBytes = useMemo(() => new TextEncoder().encode(code).length, [code]);
  const running = phase === "verifying" || phase === "auditors" || phase === "challenge" || phase === "moderator";
  const canRun = !running && (mode === "demo" ? Boolean(sample) : code.trim() !== "" && pasteBytes <= MAX_PASTE_BYTES);

  async function run() {
    setResult(null);
    setFailure(null);
    setPhase("verifying");
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
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as { stage?: Phase; result?: ReviewResponse; error?: string };
          if (event.stage) setPhase(event.stage);
          if (event.result) {
            setResult(event.result);
            setPhase("done");
          }
          if (event.error) {
            setFailure({ error: event.error });
            setPhase("error");
          }
        }
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
  const recordFor = (agent: string, round: string) => result?.verified.completions.find((c) => c.agent === agent && c.round === round);

  return (
    <div className="flex flex-col gap-12">
      <Section title="Input" kicker="Fictional samples or your own code">
        <Card className="flex flex-col gap-5">
          <div role="tablist" aria-label="Input mode" className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
            {(["demo", "paste"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-4 py-2.5 text-base font-medium transition ${mode === m ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
              >
                {m === "demo" ? "Demo sample" : "Paste code"}
              </button>
            ))}
          </div>

          {mode === "demo" ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {samples.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border p-4 transition ${
                      s.id === sampleId ? "border-white/60 bg-white/[0.07]" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <input type="radio" name="sample" value={s.id} checked={s.id === sampleId} onChange={() => setSampleId(s.id)} className="sr-only" />
                    <span className="font-mono text-base text-white">{s.id}</span>
                    <span className="text-base text-white/55">{s.label}</span>
                  </label>
                ))}
              </div>
              {sample ? (
                <details className="rounded-xl border border-white/10 bg-black/30">
                  <summary className="cursor-pointer px-4 py-3 text-base text-white/70">
                    View code ({sample.files.map((f) => f.name).join(", ")})
                  </summary>
                  {sample.files.map((f) => (
                    <pre key={f.name} className="max-h-80 overflow-auto border-t border-white/10 p-4 font-mono text-base leading-relaxed text-white/80">
                      <span className="text-white/40">{`// ${f.name}\n`}</span>
                      {f.content}
                    </pre>
                  ))}
                </details>
              ) : null}
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
                rows={12}
                placeholder="Paste code here. It is reviewed in memory only and never stored."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-base leading-relaxed text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
              />
              <p className={`text-base ${pasteBytes > MAX_PASTE_BYTES ? "text-red-300" : "text-white/45"}`}>
                {(pasteBytes / 1024).toFixed(1)} / 80 KB
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={run}
            disabled={!canRun}
            className="w-full rounded-xl bg-white px-5 py-3.5 text-base font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:self-start"
          >
            {running ? "Reviewing…" : "Run private review"}
          </button>
          {phase !== "idle" && phase !== "error" ? <Steps phase={phase} /> : null}
        </Card>

        {failure ? (
          <div role="alert" className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5">
            <p className="font-semibold text-red-200">{ERROR_TEXT[failure.error] ?? failure.message ?? `Review failed (${failure.error}).`}</p>
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
        ) : null}
      </Section>

      {result ? (
        <>
          <Section title="Auditor swarm" kicker="Round 1 findings · round 2 votes">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {AUDITORS.map((a) => (
                <AgentCard key={a.name} name={a.name} lens={a.lens} output={result.agents[a.name]} record={recordFor(a.name, "audit")} votes={votesByFinding} />
              ))}
            </div>
          </Section>
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
          <Section title="Consensus" kicker={`${result.agents.moderator.disagreements.length} disagreements`}>
            <ConsensusPanel moderator={result.agents.moderator} record={recordFor("moderator", "moderate")} />
          </Section>
          <Section title="Verification">
            <VerifiedPanel verified={result.verified} />
          </Section>
        </>
      ) : null}
    </div>
  );
}
