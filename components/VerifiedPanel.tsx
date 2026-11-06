import type { VerifiedPayload } from "@/lib/types";
import type { ReactNode } from "react";
import { Card, Mono, Status } from "./ui";
import { VerifierScope } from "./VerifierScope";

const short = (hex: string) => (hex.length > 20 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex);

function Check({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none text-white ${ok ? "bg-ok" : "bg-bad"}`}>
        {ok ? "✓" : "✗"}
      </span>
      <span className="shrink-0 font-medium text-ink">{label}</span>
      <span aria-hidden className="min-w-4 flex-1 translate-y-1 border-b-2 border-dotted border-line" />
      <span className={`shrink-0 font-mono text-base tabular-nums ${ok ? "text-ink" : "text-bad"}`}>{value}</span>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-base text-muted">{label}</dt>
      <dd className="min-w-0 text-base text-ink">{children}</dd>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-b border-line py-3 last:border-0 sm:flex-row sm:items-start sm:gap-6">
      <dt className="shrink-0 text-base text-muted sm:w-40">{label}</dt>
      <dd className="min-w-0 text-base text-ink">{children}</dd>
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
  const total = verified.completions.length;
  return (
    <Card as="article" className="anim-rise flex min-w-0 flex-col overflow-hidden">
      <header className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1">
          <h4 className="text-2xl font-semibold leading-none text-ink">Verification receipt</h4>
          <p className="text-base text-muted">Checked on the server before your code left it · {new Date(verified.verifiedAt).toLocaleString()}</p>
        </div>
        <Status ok={verified.allSignaturesVerified}>{verified.allSignaturesVerified ? "Attested · every response signed" : "Attested · some responses unverified"}</Status>
      </header>
      <div className="h-1 bg-ok" aria-hidden />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:divide-x lg:divide-line">
        <ul className="flex flex-col divide-y divide-line px-5 py-2 sm:px-6">
          <Check ok={passed === verified.checks.length} label="Intel TDX quotes" value={`${passed}/${verified.checks.length}`} />
          <Check ok={nvidiaOk} label="NVIDIA GPU" value={nvidiaOk ? "verified" : "no"} />
          <Check ok={signerMatches === total} label="Signer attested" value={`${signerMatches}/${total}`} />
          <Check ok={verified.allSignaturesVerified} label="Response signatures" value={`${signedCount}/${total}`} />
        </ul>
        <dl className="grid grid-cols-1 gap-4 border-t border-line bg-paper/50 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-1 lg:border-t-0">
          <Fact label="Model">
            <Mono>{verified.model}</Mono>
          </Fact>
          <Fact label="Signed by">
            {signingReports.length ? (
              signingReports.map((m) => (
                <Mono key={m.signingAddress}>
                  <span title={m.signingAddress}>{short(m.signingAddress)}</span>
                </Mono>
              ))
            ) : (
              <span className="text-bad">no attested model signer</span>
            )}
          </Fact>
          <Fact label="Fresh nonce">
            <Mono>
              <span title={verified.nonce}>{short(verified.nonce)}</span>
            </Mono>
          </Fact>
          <Fact label="Reviewed code SHA-256">
            <Mono>
              <span title={verified.reviewedSha256}>{short(verified.reviewedSha256)}</span>
            </Mono>
          </Fact>
        </dl>
      </div>

      <div className="flex flex-col gap-5 border-t border-line p-5 sm:p-6">
        <details className="group rounded-2xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
            Technical details
            <span aria-hidden className="text-lg leading-none text-muted transition group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="border-t border-line px-5 pb-2">
            <dl>
              <Row label="Nonce">
                <Mono>{verified.nonce}</Mono>
              </Row>
              <Row label="Signature kind">{kinds.join(", ")}</Row>
              <Row label="Signer match">
                {signerMatches}/{total} responses match a preflight report
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
            <p className="mt-3 font-medium text-ink">Per-response signatures</p>
            <ul className="flex flex-col divide-y divide-line">
              {verified.completions.map((c, i) => (
                <li key={`${c.agent}-${c.round}-${i}`} className="flex flex-col gap-1.5 py-3 text-base">
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
          </div>
        </details>
        <VerifierScope />
      </div>
    </Card>
  );
}
