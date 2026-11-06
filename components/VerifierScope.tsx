const VERIFIED = [
  "Intel TDX quotes of the NEAR AI gateway and every model enclave, checked with dcap-qvl against Intel collateral. TCB status UpToDate, OutOfDate and TDRelaunchAdvised are accepted and shown above.",
  "Each quote's report data binds the enclave's signing address to this review's fresh 32-byte nonce.",
  "RTMR3 is replayed from the event log, and MRCONFIGID matches the hash of the app compose in the report.",
  "NVIDIA GPU evidence is checked by NVIDIA NRAS, and its verdict token is verified against NVIDIA's signing keys.",
  "Every response signature covers the exact request and response bytes and must come from a model signer attested before your code was sent.",
];
const NOT_VERIFIED = [
  "That the container images in the app compose are reproducible builds of published source. Only the compose hash is checked.",
  "That the model weights are the named model.",
  "The TLS certificate. It is not bound to the attestation (include_tls_fingerprint=false).",
  "Anything outside the enclaves. Privacy there relies on the TEE boundary.",
  "Your browser does not re-check the quotes. It trusts this server's verdict.",
];

export function VerifierScope() {
  return (
    <aside aria-labelledby="verifier-scope" className="rounded-xl border border-white/[0.07] bg-black/25 p-4 text-base text-white/60">
      <h4 id="verifier-scope" className="font-semibold text-white/80">
        Demo verifier scope
      </h4>
      <p className="mt-2 text-white/70">Verified on the server for every review:</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {VERIFIED.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-white/70">Not verified here:</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {NOT_VERIFIED.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="mt-3">
        Responses signed only by the gateway, or with an unreadable signature, are marked unverified above.{" "}
        <a className="text-mint underline underline-offset-4" href="https://docs.near.ai/cloud/verification" target="_blank" rel="noreferrer">
          How NEAR AI Cloud verification works
        </a>
      </p>
    </aside>
  );
}
