import type { VerifiedPayload } from "@/lib/types";
import { Badge, Card, Mono } from "./ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <dt className="shrink-0 text-base text-white/50 sm:w-44">{label}</dt>
      <dd className="min-w-0 text-base text-white">{children}</dd>
    </div>
  );
}

export function VerifiedPanel({ verified }: { verified: VerifiedPayload }) {
  const kinds = [...new Set(verified.completions.map((c) => c.signature?.signatureKind ?? "unavailable"))];
  const signerMatches = verified.completions.filter((c) => c.signature?.signerMatchesPreflight).length;
  const signers = new Set(verified.completions.map((c) => c.signature?.signingAddress?.toLowerCase()).filter(Boolean));
  const signingReports = verified.models.filter((m) => signers.has(m.signingAddress.toLowerCase()));
  const passed = verified.checks.filter((c) => c.ok).length;
  return (
    <Card className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Verified</h3>
          <p className="text-base text-white/50">Checked on the server before your code left it</p>
        </div>
        <Badge ok={verified.allSignaturesVerified}>
          {verified.allSignaturesVerified ? "Attested + all responses signed" : "Attested · some responses unverified"}
        </Badge>
      </header>
      <dl>
        <Row label="Model">
          <Mono>{verified.model}</Mono>
        </Row>
        <Row label="Nonce">
          <Mono>{verified.nonce}</Mono>
        </Row>
        <Row label="Signature kind">{kinds.join(", ")}</Row>
        <Row label="Signer match">
          <Badge ok={signerMatches === verified.completions.length}>
            {signerMatches}/{verified.completions.length} responses match a preflight report
          </Badge>
        </Row>
        <Row label="Intel TDX">
          gateway {verified.gateway.tcbStatus}
          {verified.models.map((m, i) => ` · model[${i}] ${m.tcbStatus}`).join("")} · {passed}/{verified.checks.length} checks passed
        </Row>
        <Row label="NVIDIA GPU">
          {verified.models.map((m) => (m.nvidia === "verified" ? "NRAS verdict verified" : "no GPU evidence")).join(", ") || "—"}
        </Row>
        <Row label="Model signer">
          {signingReports.length ? (
            <div className="flex flex-col gap-1">
              {signingReports.map((m) => (
                <Mono key={m.signingAddress}>
                  {m.signingAddress} ({m.report})
                </Mono>
              ))}
            </div>
          ) : (
            "no response signed by a preflight model report"
          )}
        </Row>
        <Row label="Verified at">{new Date(verified.verifiedAt).toLocaleString()}</Row>
        <Row label="Reviewed SHA-256">
          <Mono>{verified.reviewedSha256}</Mono>
        </Row>
        <Row label="Verifier">
          {verified.verifier} ·{" "}
          <a className="text-sky-300 underline underline-offset-4" href="https://docs.near.ai/cloud/verification" target="_blank" rel="noreferrer">
            docs
          </a>
        </Row>
      </dl>
      <details className="rounded-xl border border-white/10 bg-black/20 p-4">
        <summary className="cursor-pointer text-base text-white/70">Per-response signatures ({verified.completions.length})</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {verified.completions.map((c, i) => (
            <li key={`${c.agent}-${c.round}-${i}`} className="flex flex-col gap-1 text-base">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium capitalize text-white">
                  {c.agent} · {c.round}
                </span>
                <Badge ok={c.signature?.status === "verified"}>{c.signature?.status === "verified" ? "verified" : c.error ?? c.signature?.reason ?? "unverified"}</Badge>
              </span>
              {c.signature ? (
                <span className="text-white/50">
                  req <Mono>{c.signature.requestHash.slice(0, 16)}…</Mono> · res <Mono>{c.signature.responseHash.slice(0, 16)}…</Mono>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
