import { LogoMark } from "./Logo";

const LEFT = [{ label: "Intel TDX" }, { label: "NVIDIA GPU" }];
const RIGHT = [{ label: "3 auditors" }, { label: "7/7 signed" }];

function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-3 py-1 font-mono text-base ${active ? "border-coral/40 bg-coral-soft text-coral-deep" : "border-line bg-card text-ink"}`}>{children}</span>
  );
}

/** Hero stage: the codecloak tile in the middle, wired to what it verifies and what it runs. Decorative. */
export function HeroStage() {
  return (
    <div className="relative mx-auto w-full max-w-6xl" aria-hidden>
      <div className="tiles pointer-events-none absolute inset-0" />
      <div className="relative grid grid-cols-1 items-center gap-6 py-6 md:grid-cols-[1fr_auto_1fr] md:gap-0 md:py-10">
        <p className="font-dot text-center text-[2.6rem] leading-none text-coral md:text-right md:text-[3.6rem]">ATTEST.</p>
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center md:mx-10 md:h-60 md:w-60">
          <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-paper-2 p-4">
            <div className="dots flex h-full w-full items-center justify-center rounded-[2rem] border border-line bg-card shadow-[0_10px_30px_-18px_rgba(1,24,41,0.35)]">
              <LogoMark className="h-16 w-16 md:h-24 md:w-24" />
            </div>
          </div>
        </div>
        <p className="font-dot text-center text-[2.6rem] leading-none text-coral md:text-left md:text-[3.6rem]">ARGUE.</p>
      </div>
      <div className="relative hidden justify-between gap-4 px-2 md:flex">
        <div className="flex items-center gap-3">
          {LEFT.map((p) => (
            <Pill key={p.label}>{p.label}</Pill>
          ))}
          <span className="h-px w-16 bg-line" />
          <span className="anim-pulse h-2 w-2 rounded-full bg-coral" />
        </div>
        <div className="flex items-center gap-3">
          <span className="anim-pulse h-2 w-2 rounded-full bg-coral" />
          <span className="h-px w-16 bg-line" />
          {RIGHT.map((p, i) => (
            <Pill key={p.label} active={i === 1}>
              {p.label}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}
