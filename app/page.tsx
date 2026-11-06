import { REPO, Footer, Nav } from "@/components/Chrome";
import { HeroReceipt, ReceiptOnView } from "@/components/HeroReceipt";
import { RevealRoot } from "@/components/RevealRoot";
import { ReviewApp, type SampleView } from "@/components/ReviewApp";
import { NOT_VERIFIED } from "@/components/VerifierScope";
import { agentMeta } from "@/components/agents";
import { AgentInitial, ButtonLink, SectionHead } from "@/components/ui";
import { loadAllSamples } from "@/lib/samples";

const SAMPLE_META: Record<string, { title: string; tag: string; blurb: string }> = {
  "vuln-auth": { title: "Login service", tag: "Broken auth", blurb: "Token checks and password comparison" },
  "vuln-sql": { title: "Orders API", tag: "SQL injection", blurb: "Search and delete queries for customer orders" },
  "vuln-path": { title: "File uploads", tag: "Path traversal", blurb: "Saves user uploads to disk" },
  "vuln-inject": { title: "Refunds service", tag: "Prompt injection", blurb: "Hides a note asking AI reviewers to approve it" },
};

const STEPS = [
  ["Attest", "A fresh nonce goes to NEAR AI Cloud. Intel TDX and NVIDIA evidence must verify, or your code never leaves the server.", "fails closed"],
  ["Audit", "Security, breaking-change and quality auditors read the code in parallel, each through one lens.", "3 calls"],
  ["Argue", "Every auditor backs or disputes the others' findings, and has to say why.", "up to 3 calls"],
  ["Rule", "A moderator keeps what survived and records what didn't. Confidence is computed from the votes.", "1 call"],
  ["Forget", "You get the verdict and a signed receipt. The code only ever lived in memory, and now it's gone.", "0 bytes kept"],
];

const AGENTS = [
  ["security", "Assumes every input is hostile."],
  ["breaking", "Asks who this change will break."],
  ["quality", "Reads it like the next person on call."],
  ["moderator", "Rules on what survived. Keeps the arguments on record."],
];

type Msg = { who: string; verb: "finding" | "backs" | "disputes" | "ruling"; ref?: string; text: string };
const THREAD: Msg[] = [
  { who: "security", verb: "finding", ref: "S1 · high", text: "searchOrders concatenates id into the SQL string. Anyone can rewrite the query." },
  { who: "breaking", verb: "backs", ref: "S1", text: "Same line also breaks on any id with a quote in it. Real bug either way." },
  { who: "quality", verb: "finding", ref: "Q1 · low", text: "db.query has no error path. A failed lookup quietly returns undefined." },
  { who: "security", verb: "disputes", ref: "Q1", text: "The caller already wraps this in try/catch. Not a defect here." },
  { who: "moderator", verb: "ruling", text: "S1 stands, backed by both. Q1 stays on record as a disagreement: one back, one dispute." },
];

const VERB_STYLE: Record<Msg["verb"], string> = {
  finding: "bg-paper/10 text-paper",
  backs: "bg-[#1d7a4f]/25 text-[#7fd6a8]",
  disputes: "bg-coral/20 text-[#ff9b8c]",
  ruling: "bg-paper text-night",
};

const RECEIPT_NOTES = [
  ["Intel TDX quotes", "The gateway and model enclaves sign a hardware quote. We check it with dcap-qvl, replay RTMR3 and match the app-compose hash."],
  ["NVIDIA GPU", "GPU evidence goes to NVIDIA's attestation service, and its signed answer is checked against NVIDIA's keys."],
  ["Nonce bound", "A 32-byte nonce made for your review is baked into every quote, so an old report can't be replayed."],
  ["Signatures", "Each model response is signed over its exact request and response bytes by a key the quotes just vouched for."],
  ["Code retained", "No database, no disk, no analytics. Code never appears in logs or error messages."],
];

const FAQ = [
  ["Is my code stored anywhere?", "No. It lives in memory for one request. There is no database, no disk write and no analytics, and code never appears in logs or error messages."],
  ["Who can see my code?", "The models inside the attested enclaves, and our serverless function for the length of the request. It is never written down, and NEAR's operators can't read inside the enclave."],
  ["Why three auditors instead of one?", "One model agrees with itself. Three with different jobs have to defend their findings, and real disagreements stay on screen instead of being averaged away."],
  ["What does the confidence number mean?", "It is computed from the challenge votes, weighted by severity, never taken from a model's guess. No ruling means no confidence."],
  ["Is it free and open source?", "Yes, MIT licensed. The demo samples are fictional, and you can paste your own code."],
];

const BUILT_ON: [string, string, string][] = [
  ["NEAR AI Cloud", "for private inference", "Every model call runs in NEAR's confidential cloud."],
  ["Intel TDX", "for sealed enclaves", "Hardware quotes prove which code is running."],
  ["NVIDIA NRAS", "for GPU attestation", "The GPUs prove they're in confidential mode."],
  ["Qwen3", "for the three auditors", "An open model, served inside the enclave."],
];

const FACTS: [string, string][] = [
  ["Intel TDX", "quotes verified"],
  ["NVIDIA GPU", "evidence verified"],
  ["Every response", "signed and checked"],
  ["Your code", "never stored"],
];

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 ${className}`}>{children}</div>;
}

export default function Home() {
  // Only file names and contents reach the client; README bug notes stay server-side.
  const samples: SampleView[] = loadAllSamples().map((s) => ({
    id: s.id,
    title: SAMPLE_META[s.id]?.title ?? s.id,
    tag: SAMPLE_META[s.id]?.tag ?? "",
    blurb: SAMPLE_META[s.id]?.blurb ?? "",
    files: s.files,
  }));
  return (
    <>
      <Nav />
      <main className="flex flex-1 flex-col">
        <Wrap className="grid grid-cols-1 items-center gap-14 pb-24 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
          <div className="flex flex-col gap-8">
            <h1 className="headline text-[3rem] sm:text-[4.6rem]">
              <span className="anim-rise inline-block">Code review in a sealed room.</span>{" "}
              <span className="tone anim-rise inline-block" style={{ animationDelay: "0.25s" }}>
                With receipts.
              </span>
            </h1>
            <p className="anim-rise max-w-xl text-lg leading-relaxed text-ink-2" style={{ animationDelay: "0.45s" }}>
              Your code goes into a hardware-attested enclave. Three AI auditors pull it apart, argue about what they find, and a moderator rules. You walk
              out with the verdict and a signed receipt. The code doesn&apos;t walk out at all.
            </p>
            <div className="anim-rise flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.6s" }}>
              <ButtonLink href="#review">Run a free review →</ButtonLink>
              <ButtonLink href="#proof" variant="ghost">
                Read the receipt
              </ButtonLink>
            </div>
            <ul className="anim-rise grid max-w-xl grid-cols-2 overflow-hidden rounded-2xl border border-line" style={{ animationDelay: "0.75s" }}>
              {FACTS.map(([k, v], i) => (
                <li key={k} className={`flex flex-col gap-0.5 px-4 py-3.5 ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line" : ""}`}>
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45 bg-coral" />
                    {k}
                  </span>
                  <span className="pl-3.5 text-muted">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <HeroReceipt />
        </Wrap>

        <Wrap className="pb-28">
          <div data-reveal className="overflow-hidden rounded-3xl border border-line bg-card">
            <div className="flex flex-col gap-1 border-b border-line px-6 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:px-8">
              <p className="font-display text-[1.6rem] leading-tight tracking-tight">
                Built on <span className="italic text-coral-deep">NEAR</span>
              </p>
              <p className="text-muted">Private AI code review, end to end inside NEAR AI Cloud.</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {BUILT_ON.map(([name, role, line], i) => (
                <li
                  key={name}
                  data-reveal
                  style={d(0.1 + i * 0.12)}
                  className={`flex flex-col gap-2 border-line px-6 py-6 sm:px-8 ${i > 0 ? "border-t" : ""} sm:border-t-0 ${i % 2 ? "sm:border-l" : ""} ${i > 1 ? "sm:border-t lg:border-t-0" : ""} lg:border-l lg:first:border-l-0`}
                >
                  <span className="font-display text-[1.9rem] font-semibold leading-none tracking-tight">{name}</span>
                  <span className="draw block h-[2px] w-10 bg-coral" style={d(0.1 + i * 0.12)} />
                  <span className="font-mono text-ink">{role}</span>
                  <span className="leading-relaxed text-muted">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </Wrap>

        <Wrap className="pb-28">
          <SectionHead
            id="how"
            title={
              <>
                Five steps. <span className="tone">The last one is forgetting.</span>
              </>
            }
          />
          <ol className="mt-12 border-t-2 border-ink">
            {STEPS.map(([name, desc, tag], i) => (
              <li
                key={name}
                data-reveal
                style={d(i * 0.09)}
                className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-b border-line py-7 sm:grid-cols-[4.5rem_11rem_minmax(0,1fr)_auto] sm:gap-x-6"
              >
                <span className="font-display text-[1.6rem] italic leading-none text-coral-deep">0{i + 1}</span>
                <h3 className="font-display text-[1.9rem] leading-none tracking-tight">{name}</h3>
                <p className="col-start-2 text-base leading-relaxed text-ink-2 sm:col-start-auto sm:text-lg">{desc}</p>
                <span className="col-start-2 w-fit rounded-full border border-line px-3 py-0.5 font-mono text-base text-muted sm:col-start-auto">{tag}</span>
              </li>
            ))}
          </ol>
        </Wrap>

        <section id="swarm" className="on-night scroll-mt-16 border-y border-night-line bg-night py-24 text-paper sm:py-32">
          <Wrap className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex flex-col gap-10">
              <SectionHead
                title={
                  <>
                    Inside, they argue. <span className="tone">On purpose.</span>
                  </>
                }
                lede="One model agrees with itself. CodeCloak gives three auditors one job each, makes them cross-examine each other, and lets a moderator rule. Disagreements stay on the record."
              />
              <ul className="flex flex-col divide-y divide-night-line border-y border-night-line">
                {AGENTS.map(([id, line], i) => (
                  <li key={id} data-reveal style={d(i * 0.1)} className="flex items-center gap-4 py-4">
                    <AgentInitial name={id} size={`h-10 w-10 text-lg ${id === "moderator" ? "ring-1 ring-paper/40" : ""}`} />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{agentMeta(id).label}</span>
                      <span className="text-paper/60">{line}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div data-reveal className="brackets scan relative flex flex-col gap-5 p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-base text-paper/60">
                <span className="flex items-center gap-2 text-coral">
                  <span aria-hidden className="anim-pulse h-2 w-2 rounded-full bg-coral" />
                  inside the enclave
                </span>
                <span>orders.ts · fictional</span>
              </div>
              <ol className="flex flex-col gap-4">
                {THREAD.map((m, i) => {
                  const meta = agentMeta(m.who);
                  return (
                    <li key={i} data-reveal style={d(0.5 + i * 0.55)} className={`flex gap-3 ${m.verb === "backs" || m.verb === "disputes" ? "sm:pl-12" : ""}`}>
                      <AgentInitial name={m.who} size={`h-9 w-9 text-base ${m.who === "moderator" ? "ring-1 ring-paper/40" : ""}`} />
                      <div className={`flex min-w-0 flex-1 flex-col gap-2 rounded-2xl rounded-tl-sm border px-4 py-3 ${m.verb === "ruling" ? "border-paper/30 bg-night-2" : "border-night-line bg-night-2/60"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{meta.label}</span>
                          <span className={`rounded-full px-2.5 py-0.5 font-mono text-base ${VERB_STYLE[m.verb]}`}>
                            {m.verb}
                            {m.ref ? ` ${m.ref}` : ""}
                          </span>
                        </div>
                        <p className="leading-relaxed text-paper/80">{m.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p data-reveal style={d(3.4)} className="caret border-t border-night-line pt-4 font-mono text-base text-paper/60">Kept after the response: nothing.</p>
            </div>
          </Wrap>
        </section>

        <Wrap className="py-28">
          <ReviewApp samples={samples} />
        </Wrap>

        <section className="border-y border-line bg-paper-2/60 py-24 sm:py-28">
          <Wrap className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <div className="order-2 mx-auto w-full max-w-[28rem] rotate-[-0.6deg] lg:order-1">
              <ReceiptOnView perf="color-mix(in oklab, var(--paper-2) 60%, var(--paper))" />
            </div>
            <div className="order-1 flex flex-col gap-10 lg:order-2">
              <SectionHead
                id="proof"
                title={
                  <>
                    You leave with a receipt, <span className="tone">not a promise.</span>
                  </>
                }
                lede="Every review ends with one. Each line is checked on the server before or after the models run, and a failed check is shown as failed, never as a badge."
              />
              <ol className="flex flex-col gap-5">
                {RECEIPT_NOTES.map(([t, desc], i) => (
                  <li key={t} data-reveal style={d(i * 0.1)} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-base text-paper">{i + 1}</span>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{t}</span>
                      <span className="leading-relaxed text-ink-2">{desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div data-reveal className="rounded-2xl border-2 border-dashed border-line p-6">
                <p className="font-medium">What it doesn&apos;t prove, yet</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {NOT_VERIFIED.map((t) => (
                    <li key={t} className="flex gap-3 leading-relaxed text-ink-2">
                      <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Wrap>
        </section>

        <Wrap className="grid grid-cols-1 gap-14 py-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="flex flex-col gap-8">
            <SectionHead
              id="faq"
              title={
                <>
                  Fair questions, <span className="tone">straight answers.</span>
                </>
              }
            />
            <div data-reveal className="divide-y divide-line border-y border-line">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="group py-5" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden className="shrink-0 font-display text-2xl leading-none text-coral-deep transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-ink-2">{a}</p>
                </details>
              ))}
            </div>
          </div>
          <div data-reveal style={d(0.15)} className="flex flex-col gap-5 lg:pt-24">
            <p className="font-display text-[1.9rem] leading-tight tracking-tight">
              Run it yourself. <span className="italic text-coral-deep">One key.</span>
            </p>
            <div className="overflow-hidden rounded-2xl bg-night text-paper">
              <div className="flex items-center gap-2 border-b border-night-line px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span key={d} aria-hidden className="h-2.5 w-2.5 rounded-full bg-night-line" />
                ))}
                <span className="ml-2 font-mono text-base text-paper/60">quick start</span>
              </div>
              <pre className="code-scroll overflow-x-auto px-5 py-5 font-mono text-base leading-8">
                {[
                  ["$", "git clone https://github.com/PinnacleCryptNG/CodeCloak"],
                  ["$", "cp .env.example .env.local"],
                  ["#", "set NEARAI_API_KEY"],
                  ["$", "npm install && npm run dev"],
                  ["$", "npm run test:failclosed"],
                ].map(([p, c]) => (
                  <div key={c}>
                    <span className={p === "#" ? "text-paper/40" : "text-coral"}>{p}</span> <span className={p === "#" ? "text-paper/40" : ""}>{c}</span>
                  </div>
                ))}
              </pre>
            </div>
            <a href={REPO} target="_blank" rel="noreferrer" className="w-fit font-medium underline decoration-coral decoration-2 underline-offset-4 hover:text-coral-deep">
              Read the source on GitHub →
            </a>
          </div>
        </Wrap>

        <section className="on-night border-t border-night-line bg-night text-paper">
          <Wrap className="flex flex-col items-start gap-8 border-b border-night-line py-24 sm:py-28">
            <h2 data-reveal className="headline max-w-4xl text-[2.8rem] sm:text-[4.6rem]">
              Bring your code. <span className="tone">Take only the receipt.</span>
            </h2>
            <ButtonLink href="#review" variant="ink">
              Run a free review →
            </ButtonLink>
          </Wrap>
        </section>
      </main>
      <Footer />
      <RevealRoot />
    </>
  );
}
