import { AgentTag, SeverityChip, Status } from "./ui";

/** Static product shot for the hero; mirrors the real result UI with example data. */
export function HeroPreview() {
  return (
    <div className="relative">
      <div aria-hidden className="glow-coral absolute -top-10 right-0 h-80 w-80 xl:-right-16 rounded-full opacity-60" />
      <figure className="relative overflow-hidden rounded-[1.5rem] border border-line bg-card shadow-[0_30px_80px_-40px_rgba(22,19,15,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-2/60 px-5 py-3.5">
          <span className="truncate font-mono text-base text-ink-2">orders.ts · vuln-sql</span>
          <Status ok>Enclave attested</Status>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <SeverityChip severity="high" />
            <p className="min-w-0 font-semibold leading-snug text-ink">
              <span className="font-mono font-normal text-muted">S1 </span>SQL injection in searchOrders
            </p>
          </div>
          <pre className="overflow-hidden rounded-xl bg-ink px-4 py-3 font-mono text-base leading-7 text-[#e9e1d4]">
            <code>
              {"const sql = \"…WHERE customer_id = '\"\n  "}
              <span className="text-[#ff8a75]">+ customerId +</span>
              {" \"'\";"}
            </code>
          </pre>
          <ul className="flex flex-col gap-3 border-l-2 border-line pl-4">
            <li className="flex flex-col gap-1">
              <AgentTag name="breaking" suffix=" backs" />
              <span className="text-ink-2">Real: user input reaches the query unescaped.</span>
            </li>
            <li className="flex flex-col gap-1">
              <AgentTag name="quality" suffix=" disputes" />
              <span className="text-ink-2">Severity is right, but S2 is the same bug twice.</span>
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-3 border-t border-line">
          {[
            ["61", "confidence"],
            ["6", "disputes"],
            ["7/7", "signed"],
          ].map(([v, l]) => (
            <div key={l} className="flex flex-col gap-0.5 border-r border-line px-5 py-4 last:border-r-0">
              <span className="font-display text-3xl font-semibold leading-none tabular-nums text-ink">{v}</span>
              <span className="text-base text-muted">{l}</span>
            </div>
          ))}
        </div>
        <figcaption className="sr-only">Example CodeCloak result for the fictional vuln-sql sample</figcaption>
      </figure>
    </div>
  );
}
