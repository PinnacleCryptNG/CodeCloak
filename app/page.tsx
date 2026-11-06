import { REPO, Footer, Nav } from "@/components/Chrome";
import { HeroScene } from "@/components/HeroScene";
import { ReviewApp, type SampleView } from "@/components/ReviewApp";
import { NOT_VERIFIED } from "@/components/VerifierScope";
import { AGENT_META } from "@/components/agents";
import { AgentInitial, ButtonLink, Card, Eyebrow, SectionHead } from "@/components/ui";
import { loadAllSamples } from "@/lib/samples";

const SAMPLE_META: Record<string, { title: string; tag: string; blurb: string }> = {
  "vuln-auth": { title: "Login service", tag: "Broken auth", blurb: "Token checks and password comparison" },
  "vuln-sql": { title: "Orders API", tag: "SQL injection", blurb: "Search and delete queries for customer orders" },
  "vuln-path": { title: "File uploads", tag: "Path traversal", blurb: "Saves user uploads to disk" },
  "vuln-inject": { title: "Refunds service", tag: "Prompt injection", blurb: "Hides a note asking AI reviewers to approve it" },
};

const PROOF_STRIP = [
  ["Intel TDX", "Enclave quotes verified on every run"],
  ["NVIDIA GPU", "Confidential GPU, checked by NVIDIA"],
  ["Signed answers", "Every response signed over its exact bytes"],
  ["Zero retention", "No database, no disk, no logs"],
];

const ROUNDS = [
  { title: "Attest, or refuse.", body: "We ask NEAR AI Cloud to prove its enclave with a fresh nonce. If any hardware check fails, the review stops and your code is never sent." },
  { title: "Three auditors.", body: "Security, breaking-change and quality auditors read your code at the same time, each inside the enclave, each with one job." },
  { title: "They argue.", body: "Every auditor reads the other two's findings and backs or disputes each one, with a reason you can read." },
  { title: "A signed verdict.", body: "A moderator rules on what survived. Confidence comes from the votes, and every answer's signature is checked." },
];

const AGENT_QUESTIONS: Record<string, string> = {
  security: "Can an attacker reach this?",
  breaking: "Will this break a caller?",
  quality: "Will the next engineer understand it?",
  moderator: "What survived the argument?",
};

const PROVEN = [
  ["The enclave is real", "Intel TDX quotes for the gateway and the model, bound to a nonce made for your review."],
  ["The GPU is real", "NVIDIA evidence goes to NVIDIA's attestation service, and its verdict is signature-checked."],
  ["The answer is untouched", "Each response is signed over its exact bytes by a key that was attested before your code left."],
  ["Nothing is kept", "No database, no disk, no analytics. Code never shows up in logs or error messages."],
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-28 px-5 pb-24 pt-12 sm:gap-36 sm:pt-16">
        <header className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col gap-8">
            <h1 className="font-display text-[3.3rem] font-semibold leading-[0.95] text-ink sm:text-[5rem] lg:text-[5.4rem]">
              Private code review, <em className="block text-coral">with receipts.</em>
            </h1>
            <p className="max-w-xl text-xl leading-relaxed text-ink-2">
              Three AI auditors review your code inside hardware-verified enclaves, argue over each other&apos;s findings, and a moderator makes the call. You get the
              verdict and the proof. We keep nothing.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#review">Run a free review →</ButtonLink>
              <ButtonLink href="#how" variant="ghost">
                How it works
              </ButtonLink>
            </div>
          </div>
          <HeroScene />
        </header>

        <section aria-labelledby="strip" className="-mt-12 flex flex-col gap-4 sm:-mt-20">
          <p id="strip" className="text-base text-muted">
            Checked on every review, running on <span className="font-semibold text-ink">NEAR AI Cloud</span>
          </p>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[1.25rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PROOF_STRIP.map(([t, d]) => (
              <div key={t} className="flex flex-col gap-1 bg-card p-5 sm:p-6">
                <span className="font-display text-xl font-semibold text-ink">{t}</span>
                <span className="text-base text-muted">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-12">
          <SectionHead
            id="how"
            eyebrow="How it works"
            title={
              <>
                Four rounds. <em className="text-coral">One honest answer.</em>
              </>
            }
            lede="Most AI code review asks you to trust where your code went and trust a single model's opinion. CodeCloak proves the first and stress-tests the second."
          />
          <ol className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {ROUNDS.map((r, i) => (
              <li key={r.title} className="flex flex-col gap-3 border-t-2 border-ink pt-5">
                <span className="font-display text-5xl font-semibold italic leading-none text-coral">{i + 1}</span>
                <h3 className="font-display text-2xl font-semibold text-ink">{r.title}</h3>
                <p className="text-base leading-relaxed text-ink-2">{r.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-12">
          <SectionHead
            id="swarm"
            eyebrow="The swarm"
            title={
              <>
                A team that <em className="text-coral">disagrees on purpose.</em>
              </>
            }
            lede="One model agreeing with itself is cheap. Each auditor has to defend its findings against the other two, and real disagreements stay on screen instead of being averaged away."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(AGENT_META).map(([key, m]) => (
              <Card key={key} as="article" className="flex flex-col gap-5 p-6">
                <div className="flex items-center gap-3">
                  <AgentInitial name={key} />
                  <div>
                    <h3 className="font-display text-2xl font-semibold leading-tight text-ink">{m.label}</h3>
                    <p className="text-base text-muted">{m.role}</p>
                  </div>
                </div>
                <p className="font-display text-xl italic leading-snug text-ink">&ldquo;{AGENT_QUESTIONS[key]}&rdquo;</p>
                <p className="mt-auto border-t border-line pt-4 text-base text-ink-2">{m.lens}</p>
              </Card>
            ))}
          </div>
        </section>

        <ReviewApp samples={samples} />

        <section className="flex flex-col gap-12">
          <SectionHead
            id="proof"
            eyebrow="Proof, not promises"
            title={
              <>
                What we prove, <em className="text-coral">and what we don&apos;t.</em>
              </>
            }
            lede="Every review ends with a verification receipt. We'd rather show you the limits than sell you a badge."
          />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Card className="grid grid-cols-1 gap-px overflow-hidden bg-line sm:grid-cols-2 [&>*]:bg-card">
              {PROVEN.map(([t, d]) => (
                <div key={t} className="flex flex-col gap-2 p-6">
                  <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-ok text-base text-white">
                    ✓
                  </span>
                  <h3 className="font-display text-xl font-semibold text-ink">{t}</h3>
                  <p className="text-base leading-relaxed text-ink-2">{d}</p>
                </div>
              ))}
            </Card>
            <Card className="flex flex-col gap-4 bg-paper-2/60 p-6 sm:p-7">
              <Eyebrow>Not verified here</Eyebrow>
              <ul className="flex flex-col gap-3">
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

        <section className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center sm:px-12 sm:py-20">
          <div aria-hidden className="glow-coral absolute -bottom-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-50" />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="font-display max-w-3xl text-[2.6rem] font-semibold leading-[1] text-paper sm:text-[4rem]">
              Your code stays yours. <em className="text-coral">Now you can prove it.</em>
            </h2>
            <p className="max-w-xl text-lg text-[#cfc6b8]">Pick a sample, run the swarm, open the receipt. About a minute, start to finish.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#review">Run a free review →</ButtonLink>
              <a
                href={REPO}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-paper/25 px-6 py-3.5 text-base font-semibold text-paper transition hover:border-paper/60"
              >
                Read the source
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
