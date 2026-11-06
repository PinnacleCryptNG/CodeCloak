import { REPO, Footer, Nav } from "@/components/Chrome";
import { HeroPreview } from "@/components/HeroPreview";
import { ReviewApp, type SampleView } from "@/components/ReviewApp";
import { NOT_VERIFIED } from "@/components/VerifierScope";
import { AGENT_META } from "@/components/agents";
import { AgentInitial, ButtonLink, Card, Eyebrow, SectionHead } from "@/components/ui";
import { loadAllSamples } from "@/lib/samples";

const SAMPLE_LABELS: Record<string, string> = {
  "vuln-auth": "JWT login and password check",
  "vuln-sql": "Order lookup queries",
  "vuln-path": "File upload storage",
  "vuln-inject": "Refunds, with a note to AI reviewers",
};

const PROOF_STRIP = [
  ["Intel TDX", "Quotes verified with dcap-qvl"],
  ["NVIDIA GPU", "NRAS verdict verified"],
  ["Signed bytes", "ECDSA over exact bytes"],
  ["Zero retention", "No database, disk or logs"],
];

const ROUNDS = [
  { title: "Attest, or refuse.", body: "A fresh nonce goes to NEAR AI Cloud. If any Intel TDX, RTMR3, config or GPU check fails, the review stops before your code is sent." },
  { title: "Three auditors.", body: "Security, breaking-change and quality auditors read your code in parallel, each in its own enclave call with its own lens." },
  { title: "Challenge round.", body: "Each auditor reads the other two's findings and backs or disputes every one, with a reason you can read." },
  { title: "Rule and sign.", body: "A moderator rules on what survived. Confidence comes from the votes, and every response signature is checked." },
];

const AGENT_QUESTIONS: Record<string, string> = {
  security: "Can an attacker reach this?",
  breaking: "Will this break a caller?",
  quality: "Will the next engineer understand it?",
  moderator: "What actually survived the argument?",
};

const PROVEN = [
  ["The enclave is real", "Intel TDX quotes for the gateway and model, bound to a nonce minted for your review."],
  ["The GPU is real", "NVIDIA evidence goes to NRAS; the verdict token is verified against NVIDIA's keys."],
  ["The answer is untouched", "Every response is signed over its exact bytes by a signer attested before your code left."],
  ["Nothing is kept", "No database, no disk, no analytics. Code never appears in logs or error messages."],
];

export default function Home() {
  // Only file names and contents reach the client; README bug notes stay server-side.
  const samples: SampleView[] = loadAllSamples().map((s) => ({ id: s.id, label: SAMPLE_LABELS[s.id] ?? "", files: s.files }));
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-28 px-5 pb-24 pt-14 sm:gap-36 sm:pt-20">
        <header className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col gap-8">
            <a
              href="https://docs.near.ai/cloud/verification"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2.5 rounded-full border border-line bg-card px-4 py-1.5 text-base text-ink-2 transition hover:border-ink/30"
            >
              <span className="h-2 w-2 rounded-full bg-coral" />
              Built on NEAR AI Cloud private inference
            </a>
            <h1 className="font-display text-[3.3rem] font-semibold leading-[0.95] text-ink sm:text-[5rem] lg:text-[5.6rem]">
              Private code review, <em className="block text-coral">with receipts.</em>
            </h1>
            <p className="max-w-xl text-xl leading-relaxed text-ink-2">
              Three AI auditors review your code inside hardware-attested enclaves, argue over each other&apos;s findings, and a moderator rules. We verify the
              enclave before your code leaves our server, check every signature, and keep nothing.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#review">Run a private review →</ButtonLink>
              <ButtonLink href="#how" variant="ghost">
                See how it works
              </ButtonLink>
            </div>
          </div>
          <HeroPreview />
        </header>

        <section aria-label="Checked on every review" className="-mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[1.25rem] border border-line bg-line sm:-mt-16 lg:grid-cols-4">
          {PROOF_STRIP.map(([t, d]) => (
            <div key={t} className="flex flex-col gap-1 bg-card p-5 sm:p-6">
              <span className="font-display text-xl font-semibold text-ink">{t}</span>
              <span className="text-base text-muted">{d}</span>
            </div>
          ))}
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
            lede="Most AI review tools hand you a single model's opinion and ask you to trust where your code went. CodeCloak proves the second part and stress-tests the first."
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
                A swarm that <em className="text-coral">disagrees on purpose.</em>
              </>
            }
            lede="Agreement is cheap. Each auditor has to defend its findings against the other two, and the disagreements stay on screen instead of being averaged away."
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
            lede="Every review ends with a verification receipt. We would rather tell you the limits than sell you a badge."
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
              Your code stays yours. <em className="text-coral">Prove it.</em>
            </h2>
            <p className="max-w-xl text-lg text-[#cfc6b8]">Run a review on a planted bug and open the receipt. It takes about a minute.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#review">Run a private review →</ButtonLink>
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
