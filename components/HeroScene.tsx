import { C_PATH } from "./Logo";

const NODES = [
  { key: "security", label: "Security", x: 92, y: 96, color: "#e2412c" },
  { key: "breaking", label: "Breaking", x: 428, y: 96, color: "#b46b00" },
  { key: "quality", label: "Quality", x: 260, y: 404, color: "#2f56c9" },
] as const;
const C = { x: 260, y: 214 };

// Paths from each auditor into the enclave, and challenge arcs between auditors.
const FEED = NODES.map((n) => `M${n.x} ${n.y} L${C.x} ${C.y}`);
const ARCS = [
  { d: "M92 96 Q260 18 428 96", chip: { x: 260, y: 40, text: "backs", ok: true } },
  { d: "M428 96 Q440 300 260 404", chip: { x: 430, y: 262, text: "disputes", ok: false } },
  { d: "M260 404 Q80 300 92 96", chip: { x: 88, y: 262, text: "backs", ok: true } },
];

/** Animated hero: attest the enclave → auditors report in → challenge round → verdict. Static under reduced motion. */
export function HeroScene() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem]">
      <div aria-hidden className="glow-coral absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40" />
      <svg viewBox="0 0 520 470" className="relative w-full" role="img" aria-label="Three auditors report into an attested enclave, challenge each other, and a verdict is signed">
        <defs>
          <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#16130f" opacity="0.12" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="520" height="470" rx="32" fill="url(#dots)" />

        {ARCS.map((a, i) => (
          <g key={a.d} className="scene-challenge" style={{ animationDelay: `${i * 0.25}s` }}>
            <path d={a.d} fill="none" stroke="#16130f" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
            <circle r="5" fill={a.chip.ok ? "#1d7a4a" : "#ff4f3a"}>
              <animateMotion dur="2.4s" repeatCount="indefinite" path={a.d} begin={`${i * 0.4}s`} />
            </circle>
            <g transform={`translate(${a.chip.x} ${a.chip.y})`}>
              <rect x={-46} y={-17} width="92" height="34" rx="17" fill={a.chip.ok ? "#e6f2ea" : "#fde3de"} stroke={a.chip.ok ? "#bfdcc9" : "#f3b9ae"} />
              <text textAnchor="middle" y="6" fontSize="16" fontWeight="600" fill={a.chip.ok ? "#1d7a4a" : "#a42a18"} fontFamily="var(--font-instrument-sans)">
                {a.chip.text}
              </text>
            </g>
          </g>
        ))}

        {FEED.map((d, i) => (
          <g key={d} className="scene-feed">
            <path d={d} fill="none" stroke={NODES[i].color} strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
            <circle r="5.5" fill={NODES[i].color}>
              <animateMotion dur="1.8s" repeatCount="indefinite" path={d} begin={`${i * 0.3}s`} />
            </circle>
          </g>
        ))}

        <g transform={`translate(${C.x} ${C.y})`}>
          <circle r="86" fill="none" stroke="#ff4f3a" strokeOpacity="0.25" strokeWidth="1.5" className="scene-ripple" />
          <circle r="70" fill="#fffdf9" stroke="#ddd3c3" strokeWidth="1.5" />
          <circle r="70" fill="none" stroke="#1d7a4a" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray="100" className="scene-attest" transform="rotate(-90)" />
          <g transform="translate(-32 -40)">
            <rect width="64" height="64" rx="18" fill="#ff4f3a" />
            <path d={C_PATH} fill="#16130f" transform="translate(10 50.5) scale(0.043 -0.043)" />
            <circle cx="44.5" cy="44.5" r="4.2" fill="#f3eee6" />
          </g>
          <text y="48" textAnchor="middle" fontSize="16" fontWeight="600" fill="#16130f" fontFamily="var(--font-instrument-sans)">
            enclave
          </text>
        </g>

        <g className="scene-attest-chip" transform={`translate(${C.x} 120)`}>
          <rect x="-62" y="-17" width="124" height="34" rx="17" fill="#16130f" />
          <text textAnchor="middle" y="6" fontSize="16" fontWeight="600" fill="#f3eee6" fontFamily="var(--font-instrument-sans)">
            ✓ attested
          </text>
        </g>

        {NODES.map((n) => (
          <g key={n.key} transform={`translate(${n.x} ${n.y})`}>
            <circle r="40" fill={n.color} opacity="0.12" className="scene-pulse" />
            <circle r="30" fill={n.color} />
            <text textAnchor="middle" y="9" fontSize="26" fontWeight="700" fill="#fff" fontFamily="var(--font-fraunces)">
              {n.label[0]}
            </text>
            <text textAnchor="middle" y={n.y > 300 ? 58 : -46} fontSize="17" fontWeight="600" fill="#16130f" fontFamily="var(--font-instrument-sans)">
              {n.label}
            </text>
          </g>
        ))}

        <g className="scene-verdict" transform={`translate(${C.x} 318)`}>
          <rect x="-104" y="-22" width="208" height="44" rx="22" fill="#fffdf9" stroke="#16130f" strokeWidth="1.5" />
          <text textAnchor="middle" y="6" fontSize="16" fontWeight="600" fill="#16130f" fontFamily="var(--font-instrument-sans)">
            verdict · 7/7 signed
          </text>
        </g>
      </svg>
    </div>
  );
}
