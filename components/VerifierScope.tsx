export const VERIFIED = [
  "Intel TDX quotes of the NEAR AI gateway and every model enclave, checked with dcap-qvl against Intel collateral. TCB status UpToDate, OutOfDate and TDRelaunchAdvised are accepted and shown above.",
  "Each quote's report data binds the enclave's signing address to this review's fresh 32-byte nonce.",
  "RTMR3 is replayed from the event log, and MRCONFIGID matches the hash of the app compose in the report.",
  "MRTD, RTMR0-2 (firmware, boot chain, kernel) and the app compose must match an allowlist of NEAR's published enclave images.",
  "Every model report must carry NVIDIA GPU evidence, checked by NVIDIA NRAS, and its verdict token is verified against NVIDIA's signing keys.",
  "Every response signature covers the exact request and response bytes and must come from a model signer attested before your code was sent.",
];
export const NOT_VERIFIED = [
  "That the container images in the app compose are reproducible builds of published source. The compose is pinned, not rebuilt.",
  "That the model weights are the named model.",
  "The TLS certificate. It is not bound to the attestation (include_tls_fingerprint=false).",
  "Anything outside the enclaves. Privacy there relies on the TEE boundary.",
  "Your browser does not re-check the quotes. It trusts this server's verdict.",
];

export function VerifierScope() {
  return (
    <aside aria-labelledby="verifier-scope" className="rounded-2xl border border-line bg-paper/60 p-5 text-base text-ink-2 sm:p-6">
      <h4 id="verifier-scope" className="text-xl font-semibold text-ink">
        Demo verifier scope
      </h4>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="font-semibold text-ok">Verified on the server for every review</p>
          <ul className="mt-2 flex flex-col gap-2">
            {VERIFIED.map((t) => (
              <li key={t} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-ink">Not verified here</p>
          <ul className="mt-2 flex flex-col gap-2">
            {NOT_VERIFIED.map((t) => (
              <li key={t} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4">
        Responses signed only by the gateway, or with an unreadable signature, are marked unverified above.{" "}
        <a className="font-medium text-coral-deep underline underline-offset-4" href="https://docs.near.ai/cloud/verification" target="_blank" rel="noreferrer">
          How NEAR AI Cloud verification works
        </a>
      </p>
    </aside>
  );
}
