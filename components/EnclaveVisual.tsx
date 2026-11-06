import { AGENT_META } from "./agents";

const R = 140;
const NODES = [
  { key: "security", x: 200, y: 200 - R },
  { key: "breaking", x: 200 + R * Math.cos(Math.PI / 6), y: 200 + R * Math.sin(Math.PI / 6) },
  { key: "quality", x: 200 - R * Math.cos(Math.PI / 6), y: 200 + R * Math.sin(Math.PI / 6) },
] as const;

/** Decorative hero: three auditors around an attested enclave, challenging each other. */
export function EnclaveVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[28rem]">
      <div aria-hidden className="absolute inset-[18%] rounded-full bg-violet/25 blur-3xl" />
      <div aria-hidden className="absolute inset-[30%] rounded-full bg-mint/20 blur-3xl" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full" role="img" aria-label="Three auditors and a moderator inside an attested enclave">
        <defs>
          <linearGradient id="ev-g" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#4ff0b8" />
            <stop offset="1" stopColor="#8f7dff" />
          </linearGradient>
          <radialGradient id="ev-core" cx="0.5" cy="0.45" r="0.6">
            <stop stopColor="#1a1f33" />
            <stop offset="1" stopColor="#07080d" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="188" stroke="rgb(255 255 255 / 0.06)" fill="none" />
        <circle className="anim-orbit" cx="200" cy="200" r="172" stroke="url(#ev-g)" strokeOpacity=".5" strokeDasharray="2 10" strokeLinecap="round" strokeWidth="2" fill="none" />
        <circle cx="200" cy="200" r={R} stroke="rgb(255 255 255 / 0.08)" fill="none" />

        {/* challenge round: auditors argue with each other */}
        {NODES.map((a, i) => {
          const b = NODES[(i + 1) % NODES.length];
          return <line key={`c-${a.key}`} className="anim-dash" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffb547" strokeOpacity=".45" strokeWidth="1.5" />;
        })}
        {/* each auditor reports to the moderator in the enclave */}
        {NODES.map((n) => (
          <line key={`m-${n.key}`} className="anim-dash" x1={n.x} y1={n.y} x2="200" y2="200" stroke={AGENT_META[n.key].color} strokeOpacity=".6" strokeWidth="1.5" />
        ))}

        <g className="anim-breathe">
          <circle cx="200" cy="200" r="66" fill="url(#ev-g)" opacity=".18" />
        </g>
        <path d="M200 146 248 164v34c0 29-19 51-48 62-29-11-48-33-48-62v-34l48-18Z" fill="url(#ev-core)" stroke="url(#ev-g)" strokeWidth="2.5" />
        <path d="m188 190-14 14 14 14M212 190l14 14-14 14" stroke="url(#ev-g)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {NODES.map((n) => {
          const m = AGENT_META[n.key];
          return (
            <g key={n.key}>
              <circle cx={n.x} cy={n.y} r="30" fill="#0b0d14" stroke={m.color} strokeWidth="2" />
              <circle cx={n.x} cy={n.y} r="38" fill="none" stroke={m.color} strokeOpacity=".2" />
              <text x={n.x} y={n.y + 7} textAnchor="middle" fill={m.color} fontSize="20" fontWeight="600" fontFamily="var(--font-geist-mono), monospace">
                {m.glyph}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute left-0 top-[6%] hidden rounded-xl border border-white/10 bg-[#0b0d14]/85 px-3.5 py-2.5 shadow-xl backdrop-blur sm:block">
        <p className="flex items-center gap-2 text-base text-white">
          <span className="text-mint">✓</span> Enclave attested
        </p>
        <p className="font-mono text-base text-white/45">TDX · GPU · nonce</p>
      </div>
      <div className="absolute bottom-[4%] right-0 hidden rounded-xl border border-white/10 bg-[#0b0d14]/85 px-3.5 py-2.5 shadow-xl backdrop-blur sm:block">
        <p className="flex items-center gap-2 text-base text-white">
          <span className="text-amber-300">⇄</span> Findings challenged
        </p>
        <p className="font-mono text-base text-white/45">back · dispute · rule</p>
      </div>
    </div>
  );
}
