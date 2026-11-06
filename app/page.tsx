import { REPO, Footer, Nav } from "@/components/Chrome";
import { HeroDemo } from "@/components/HeroDemo";
import { HeroStage } from "@/components/HeroStage";
import { ReviewApp, type SampleView } from "@/components/ReviewApp";
import { NOT_VERIFIED } from "@/components/VerifierScope";
import { ButtonLink, Card, Eyebrow, SectionHead } from "@/components/ui";
import { loadAllSamples } from "@/lib/samples";

const SAMPLE_META: Record<string, { title: string; tag: string; blurb: string }> = {
  "vuln-auth": { title: "Login service", tag: "Broken auth", blurb: "Token checks and password comparison" },
  "vuln-sql": { title: "Orders API", tag: "SQL injection", blurb: "Search and delete queries for customer orders" },
  "vuln-path": { title: "File uploads", tag: "Path traversal", blurb: "Saves user uploads to disk" },
  "vuln-inject": { title: "Refunds service", tag: "Prompt injection", blurb: "Hides a note asking AI reviewers to approve it" },
};

const BUILT_ON = [
  ["NEAR AI Cloud", "Private inference"],
  ["Intel TDX", "Enclave quotes"],
  ["NVIDIA", "GPU attestation"],
  ["dcap-qvl", "Quote verifier"],
];

const PROBLEMS = [
  ["01", "Your code leaves your hands", "Most AI review sends source to a server you can't inspect, on a promise that nobody looks."],
  ["02", "One model, one opinion", "A single reviewer agrees with itself. Nothing challenges a weak finding or a missed one."],
  ["03", "No proof afterwards", "When the review ends, you have an answer and no way to show where it ran or that it wasn't altered."],
];

const STEPS = [
  ["01", "Attest", "A fresh nonce goes to NEAR AI Cloud. Any failed hardware check stops the review before your code is sent.", "Intel TDX · NVIDIA"],
  ["02", "Audit", "Security, breaking-change and quality auditors read your code at the same time, each with one job.", "3 parallel calls"],
  ["03", "Argue", "Each auditor backs or disputes the other two's findings, with a reason you can read.", "Challenge round"],
  ["04", "Rule", "A moderator rules on what survived. Confidence comes from the votes; every signature is checked.", "Signed verdict"],
];

const PROVEN = [
  ["The enclave is real", "Intel TDX quotes for the gateway and the model, bound to a nonce made for your review."],
  ["The GPU is real", "NVIDIA evidence goes to NVIDIA's attestation service, and its verdict is signature-checked."],
  ["The answer is untouched", "Each response is signed over its exact bytes by a key attested before your code left."],
  ["Nothing is kept", "No database, no disk, no analytics. Code never shows up in logs or error messages."],
];

const FAQ = [
  ["Is my code stored anywhere?", "No. It lives in memory for the length of one request. There is no database, no disk write and no analytics, and code never appears in logs or error messages."],
  ["What exactly is verified?", "Intel TDX quotes for the NEAR AI gateway and model enclave, bound to a fresh nonce; RTMR3 and the app-compose hash; NVIDIA GPU evidence through NRAS; and an ECDSA signature over every response's exact bytes."],
  ["What isn't verified?", "Reproducible builds of the container images, the model weights, and the TLS certificate. The receipt lists these limits on every run."],
  ["Why three auditors instead of one?", "Each has a single lens and must defend its findings against the other two. Real disagreements stay on screen instead of being averaged away."],
  ["What does the confidence number mean?", "It is computed from the challenge votes, weighted by severity, not taken from a model's guess. No ruling means no confidence."],
  ["Is it free and open source?", "Yes, MIT licensed. The demo samples are fictional; you can also paste your own code."],
];

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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-28 px-5 pb-24 sm:gap-36">
        <header className="flex flex-col items-center gap-8 pt-6 text-center">
          <HeroStage />
          <h1 className="headline max-w-4xl text-[2.7rem] sm:text-[4.2rem]">
            Private code review, <span className="tone">with receipts.</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
            Three AI auditors review your code inside hardware-verified enclaves, challenge each other&apos;s findings, and a moderator makes the call. You get
            the verdict and the proof. We keep nothing.
          </p>
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="#review" className="w-full sm:w-auto">
              Run a free review →
            </ButtonLink>
            <ButtonLink href="#how" variant="ghost" className="w-full sm:w-auto">
              See how it decides
            </ButtonLink>
          </div>
        </header>

        <section aria-label="Built on" className="dots -mt-12 grid grid-cols-2 overflow-hidden rounded-[1.25rem] border border-line bg-card sm:-mt-20 lg:grid-cols-[auto_repeat(4,minmax(0,1fr))]">
          <p className="col-span-2 flex items-center border-b border-line px-6 py-4 font-mono text-base uppercase tracking-[0.12em] text-muted lg:col-span-1 lg:border-b-0 lg:border-r">Built on</p>
          {BUILT_ON.map(([name, cap], i) => (
            <div key={name} className={`flex flex-col gap-1 px-6 py-5 ${i % 2 === 0 ? "border-r border-line" : ""} ${i < 2 ? "border-b border-line lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}>
              <span className="text-xl font-semibold tracking-tight text-ink">{name}</span>
              <span className="font-mono text-base text-muted">{cap}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-10">
          <SectionHead
            eyebrow="The problem"
            title={
              <>
                AI can review code now. <span className="tone">It still can&apos;t prove where it looked.</span>
              </>
            }
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PROBLEMS.map(([n, t, d]) => (
              <Card key={n} className="dots flex flex-col gap-3 p-7">
                <span className="font-mono text-base text-muted">{n}</span>
                <h3 className="text-xl font-medium tracking-tight text-ink">{t}</h3>
                <p className="text-base leading-relaxed text-ink-2">{d}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex flex-col gap-6">
            <SectionHead
              eyebrow="The product"
              title={
                <>
                  A second opinion, <span className="tone">and a third, and a ruling.</span>
                </>
              }
              lede="Before a single line reaches a model, CodeCloak proves the enclave. Then three auditors work, argue, and a moderator rules. Here is one review, replayed."
            />
          </div>
          <HeroDemo />
        </section>

        <section className="flex flex-col gap-10">
          <SectionHead
            id="how"
            eyebrow="How it works"
            title={
              <>
                Four steps <span className="tone">between your code and a verdict.</span>
              </>
            }
          />
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([n, t, d, tag]) => (
              <li key={n} className="dots flex flex-col gap-4 rounded-[1.25rem] border border-coral/30 bg-card p-6">
                <span className="font-dot text-[2.2rem] leading-none text-coral">{n}</span>
                <h3 className="text-xl font-medium tracking-tight text-ink">{t}</h3>
                <p className="text-base leading-relaxed text-ink-2">{d}</p>
                <span className="mt-auto w-fit rounded-full bg-coral-soft px-3 py-1 font-mono text-base text-coral-deep">{tag}</span>
              </li>
            ))}
          </ol>
        </section>

        <ReviewApp samples={samples} />

        <section className="flex flex-col gap-10">
          <SectionHead
            id="proof"
            eyebrow="Security and proof"
            title={
              <>
                Careful with your code, <span className="tone">by design.</span>
              </>
            }
            lede="Every review ends with a verification receipt. We'd rather show you the limits than sell you a badge."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROVEN.map(([t, d]) => (
              <Card key={t} className="dots flex flex-col gap-3 p-7">
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-ok text-base text-white">
                  ✓
                </span>
                <h3 className="text-xl font-medium tracking-tight text-ink">{t}</h3>
                <p className="text-base leading-relaxed text-ink-2">{d}</p>
              </Card>
            ))}
            <Card className="flex flex-col gap-3 bg-paper-2/60 p-7 sm:col-span-2 lg:col-span-2">
              <Eyebrow>Not verified here</Eyebrow>
              <ul className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
                {NOT_VERIFIED.map((t) => (
                  <li key={t} className="flex gap-3 text-base leading-relaxed text-ink-2">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <SectionHead
            eyebrow="Developers"
            title={
              <>
                Run it yourself. <span className="tone">One key.</span>
              </>
            }
            lede="Clone it, add a NEAR AI Cloud key, and every review runs the same attestation and signature checks you see here."
          />
          <Card className="dots overflow-hidden">
            <div className="flex gap-2 border-b border-line px-4 py-3">
              <span className="rounded-lg bg-coral-soft px-3 py-1 font-mono text-base text-coral-deep">Quick start</span>
            </div>
            <pre className="code-scroll overflow-x-auto px-5 py-5 font-mono text-base leading-8 text-ink">
              {[
                ["$", "git clone https://github.com/PinnacleCryptNG/CodeCloak"],
                ["$", "cp .env.example .env.local"],
                ["#", "set NEARAI_API_KEY"],
                ["$", "npm install && npm run dev"],
                ["$", "npm run test:failclosed"],
              ].map(([p, c]) => (
                <div key={c}>
                  <span className={p === "#" ? "text-muted" : "text-coral"}>{p}</span> <span className={p === "#" ? "text-muted" : ""}>{c}</span>
                </div>
              ))}
            </pre>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <SectionHead
            id="faq"
            eyebrow="FAQ"
            title={
              <>
                Questions, <span className="tone">answered.</span>
              </>
            }
          />
          <Card className="dots divide-y divide-line px-6">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="group py-5" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden className="shrink-0 text-xl leading-none text-coral transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-base leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </Card>
        </section>

        <section className="dots flex flex-col items-center gap-6 rounded-[1.5rem] border border-line bg-card px-6 py-16 text-center sm:py-20">
          <h2 className="headline max-w-3xl text-[2.4rem] sm:text-[3.4rem]">
            Your code stays yours. <span className="tone">Now you can prove it.</span>
          </h2>
          <p className="max-w-xl text-lg text-ink-2">Pick a sample, run the swarm, open the receipt. About a minute, start to finish.</p>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="#review" className="w-full sm:w-auto">
              Run a free review →
            </ButtonLink>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-card px-5 py-3 text-base font-medium text-ink transition hover:border-ink/30 sm:w-auto"
            >
              View on GitHub
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
