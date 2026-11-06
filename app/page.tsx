import { Footer, Nav } from "@/components/Chrome";
import { EnclaveVisual } from "@/components/EnclaveVisual";
import { ReviewApp, type SampleView } from "@/components/ReviewApp";
import { AGENT_META } from "@/components/agents";
import { loadAllSamples } from "@/lib/samples";

const SAMPLE_LABELS: Record<string, string> = {
  "vuln-auth": "JWT login and password check",
  "vuln-sql": "Order lookup queries",
  "vuln-path": "File upload storage",
  "vuln-inject": "Billing refunds, with a note to AI reviewers",
};

const PIPELINE = [
  {
    n: "01",
    title: "Attest, or refuse",
    body: "A fresh nonce goes to NEAR AI Cloud. Intel TDX quotes, RTMR3, MRCONFIGID and NVIDIA GPU evidence are verified. Any failure stops the review before your code is sent.",
    tag: "fail-closed",
  },
  {
    n: "02",
    title: "Three auditors",
    body: "Security, breaking-change and quality auditors review the code in parallel, each inside the TEE, each with its own lens.",
    tag: "parallel",
  },
  {
    n: "03",
    title: "Challenge round",
    body: "Every auditor reads the other two's findings and backs or disputes each one, with a reason. Disagreement is a feature, not noise.",
    tag: "swarm",
  },
  {
    n: "04",
    title: "Moderate & sign",
    body: "A moderator rules on what survived. Confidence comes from the votes. Every response signature is bound to the exact request and response bytes.",
    tag: "7 signed calls",
  },
];

const GUARANTEES = [
  { title: "Fail-closed attestation", body: "No verified enclave, no model call. A test fakes 15 attestation failures and proves none reaches a completion." },
  { title: "Signed, byte-exact", body: "Each response's ECDSA signature covers hashes of the exact request and response, from a signer attested before your code left." },
  { title: "Zero retention", body: "No database, no disk, no analytics. Code lives in memory for the request and never appears in logs or errors." },
  { title: "Injection-aware", body: "Code is wrapped as untrusted data. Instructions inside it become findings, not orders. Try vuln-inject." },
];

export default function Home() {
  // Only file names and contents reach the client; README bug notes stay server-side.
  const samples: SampleView[] = loadAllSamples().map((s) => ({ id: s.id, label: SAMPLE_LABELS[s.id] ?? "", files: s.files }));
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-28 px-5 pb-8 pt-12 sm:pt-20">
        <header className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-7">
            <a
              href="https://github.com/PinnacleCryptNG/CodeCloak"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-base text-white/70 transition hover:border-white/25"
            >
              <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_10px_var(--mint)]" />
              NEAR AI Cloud · private TEE inference
            </a>
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Code review by an AI swarm that{" "}
              <span className="font-serif text-[3rem] font-normal italic leading-none text-gradient sm:text-7xl">argues in private.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/65">
              Three auditors review your code inside attested enclaves, challenge each other&apos;s findings, and a moderator rules. The enclave is
              verified before your code leaves the server. Nothing is stored.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#review"
                className="rounded-xl bg-gradient-to-r from-mint to-[#7fe7ff] px-6 py-3.5 text-center text-base font-semibold text-black shadow-[0_10px_40px_-10px_var(--mint)] transition hover:brightness-110"
              >
                Run a private review →
              </a>
              <a href="#how" className="rounded-xl border border-white/15 px-6 py-3.5 text-center text-base font-medium text-white transition hover:bg-white/[0.04]">
                How it works
              </a>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-4 border-t border-white/[0.06] pt-6">
              {[
                ["4", "agents"],
                ["7", "signed calls"],
                ["0", "bytes stored"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="text-3xl font-semibold tabular-nums text-white">{v}</dd>
                  <dd className="text-base text-white/45">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <EnclaveVisual />
        </header>

        <section id="how" className="flex scroll-mt-24 flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="font-mono text-base uppercase tracking-[0.2em] text-mint/80">How it works</span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Trust, <span className="font-serif font-normal italic text-gradient">but verify.</span> Then argue.
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((p) => (
              <li key={p.n} className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-1/70 p-6 transition hover:border-white/20">
                <span aria-hidden className="absolute -right-3 -top-6 font-serif text-8xl italic text-white/[0.04] transition group-hover:text-white/[0.07]">
                  {p.n}
                </span>
                <span className="w-fit rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-base text-white/55">{p.tag}</span>
                <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                <p className="text-base leading-relaxed text-white/60">{p.body}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {Object.entries(AGENT_META).map(([k, m]) => (
              <span key={k} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-1.5 text-base text-white/70">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                {m.label}
                <span className="hidden text-white/35 sm:inline">· {m.lens}</span>
              </span>
            ))}
          </div>
        </section>

        <ReviewApp samples={samples} />

        <section id="trust" className="flex scroll-mt-24 flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="font-mono text-base uppercase tracking-[0.2em] text-mint/80">Guarantees</span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">What CodeCloak proves, and what it doesn&apos;t.</h2>
            <p className="text-lg text-white/60">
              Every run ends with a Verified panel and an honest scope note: reproducible images, model weights and TLS binding are listed as not
              verified.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {GUARANTEES.map((g) => (
              <div key={g.title} className="flex gap-4 rounded-2xl border border-white/[0.08] bg-ink-1/70 p-6">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint ring-1 ring-mint/30">
                  ✓
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-white">{g.title}</h3>
                  <p className="text-base leading-relaxed text-white/60">{g.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
