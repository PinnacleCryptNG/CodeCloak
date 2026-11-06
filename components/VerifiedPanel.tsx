import type { VerifiedPayload } from "@/lib/types";
import type { ReactNode } from "react";
import { Card, Mono, Status } from "./ui";
import { VerifierScope } from "./VerifierScope";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-b border-line py-3.5 last:border-0 sm:flex-row sm:items-start sm:gap-6">
      <dt className="shrink-0 text-base text-muted sm:w-40">{label}</dt>
      <dd className="min-w-0 text-base text-ink">{children}</dd>
    </div>
  );
}

function Tile({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 p-5">
      <span className="flex items-center gap-2 text-base text-muted">
        <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-full text-base leading-none text-white ${ok ? "bg-ok" : "bg-bad"}`}>
          {ok ? "✓" : "✗"}
        </span>
        {label}
      </span>
      <span className={`font-display text-2xl font-semibold leading-tight tabular-nums ${ok ? "text-ink" : "text-bad"}`}>{value}</span>
    </div>
  );
}

export function VerifiedPanel({ verified }: { verified: VerifiedPayload }) {
  const kinds = [...new Set(verified.completions.map((c) => c.signature?.signatureKind ?? "unavailable"))];
  const signerMatches = verified.completions.filter((c) => c.signature?.signerMatchesPreflight).length;
  const signers = new Set(
    verified.completions.flatMap((c) =>
      c.signature?.status === "verified" && c.signature.signatureKind === "provider_tee" && c.signature.signingAddress
        ? [c.signature.signingAddress.toLowerCase()]
        : [],
    ),
  );
  const signingReports = verified.models.filter((m) => signers.has(m.signingAddress.toLowerCase()));
  const passed = verified.checks.filter((c) => c.ok).length;
  const nvidiaOk = verified.models.length > 0 && verified.models.every((m) => m.nvidia === "verified");
  const signedCount = verified.completions.filter((c) => c.signature?.status === "verified").length;
  return (
    <Card as="article" className="anim-rise flex min-w-0 flex-col overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h4 className="font-display text-2xl font-semibold leading-tight text-ink">Verification receipt</h4>
          <p className="text-base text-ink-2">Checked on the server before your code left it</p>
        </div>
        <Status ok={verified.allSignaturesVerified}>{verified.allSignaturesVerified ? "Attested · every response signed" : "Attested · some responses unverified"}</Status>
      </header>
      <div className="grid grid-cols-2 gap-px border-b border-line bg-line lg:grid-cols-4 [&>*]:bg-card">
        <Tile ok={passed === verified.checks.length} label="Intel TDX" value={`${passed}/${verified.checks.length} checks`} />
        <Tile ok={nvidiaOk} label="NVIDIA GPU" value={nvidiaOk ? "NRAS verified" : "Not verified"} />
        <Tile ok={signerMatches === verified.completions.length} label="Signer match" value={`${signerMatches}/${verified.completions.length}`} />
        <Tile ok={verified.allSignaturesVerified} label="Signatures" value={`${signedCount}/${verified.completions.length}`} />
      </div>
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <dl>
          <Row label="Model">
            <Mono>{verified.model}</Mono>
          </Row>
          <Row label="Nonce">
            <Mono>{verified.nonce}</Mono>
          </Row>
          <Row label="Signature kind">{kinds.join(", ")}</Row>
          <Row label="Signer match">
            <Status ok={signerMatches === verified.completions.length}>
              {signerMatches}/{verified.completions.length} match a preflight report
            </Status>
          </Row>
          <Row label="Intel TDX">
            gateway {verified.gateway.tcbStatus}
            {verified.models.map((m, i) => ` · model[${i}] ${m.tcbStatus}`).join("")} · {passed}/{verified.checks.length} checks passed
          </Row>
          <Row label="NVIDIA GPU">{verified.models.map((m) => (m.nvidia === "verified" ? "NRAS verdict verified" : "no GPU evidence")).join(", ") || "—"}</Row>
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
            <a className="font-medium text-coral-deep underline underline-offset-4" href="https://docs.near.ai/cloud/verification" target="_blank" rel="noreferrer">
              docs
            </a>
          </Row>
        </dl>
        <details className="group rounded-2xl border border-line">
          <summary className="cursor-pointer list-none px-5 py-4 font-medium text-ink marker:hidden">
            <span className="flex items-center justify-between gap-3">
              Per-response signatures ({verified.completions.length})<span aria-hidden className="text-muted transition group-open:rotate-45">+</span>
            </span>
          </summary>
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {verified.completions.map((c, i) => (
              <li key={`${c.agent}-${c.round}-${i}`} className="flex flex-col gap-2 px-5 py-4 text-base">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium capitalize text-ink">
                    {c.agent} · {c.round}
                  </span>
                  <Status ok={c.signature?.status === "verified"}>{c.signature?.status === "verified" ? "verified" : c.error ?? c.signature?.reason ?? "unverified"}</Status>
                </span>
                {c.signature ? (
                  <span className="text-muted">
                    req <Mono>{c.signature.requestHash.slice(0, 16)}…</Mono> · res <Mono>{c.signature.responseHash.slice(0, 16)}…</Mono>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
        <VerifierScope />
      </div>
    </Card>
  );
}
