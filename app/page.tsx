import { ReviewApp, type SampleView } from "@/components/ReviewApp";
import { loadAllSamples } from "@/lib/samples";

const SAMPLE_LABELS: Record<string, string> = {
  "vuln-auth": "JWT login and password check",
  "vuln-sql": "Order lookup queries",
  "vuln-path": "File upload storage",
  "vuln-inject": "Billing refunds, with a note to AI reviewers",
};

export default function Home() {
  // Only file names and contents reach the client; README bug notes stay server-side.
  const samples: SampleView[] = loadAllSamples().map((s) => ({ id: s.id, label: SAMPLE_LABELS[s.id] ?? "", files: s.files }));
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-5 py-12 sm:py-16">
      <header className="flex flex-col gap-4">
        <p className="text-base font-medium uppercase tracking-[0.2em] text-white/40">NEAR AI Cloud · private TEE</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">CodeCloak</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-white/65">
          Three AI auditors review your code inside attested enclaves, challenge each other&apos;s findings, and a moderator reconciles them.
          The enclave is verified before your code leaves the server, and nothing is stored.
        </p>
      </header>
      <ReviewApp samples={samples} />
      <footer className="border-t border-white/10 pt-6 text-base text-white/40">
        Samples are fictional. Code is reviewed in memory only. MIT licensed.
      </footer>
    </main>
  );
}
