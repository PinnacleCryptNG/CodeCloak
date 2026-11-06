import { ImageResponse } from "next/og";

export const alt = "CodeCloak — private multi-agent code review in attested NEAR AI Cloud enclaves";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const AGENTS = [
  ["S", "Security", "#ff7a93"],
  ["B", "Breaking", "#ffb547"],
  ["Q", "Quality", "#6cc4ff"],
  ["M", "Moderator", "#8f7dff"],
] as const;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(900px 600px at 90% -10%, rgba(143,125,255,0.35), transparent 60%), radial-gradient(800px 500px at -10% 110%, rgba(79,240,184,0.22), transparent 60%), #05060a",
          color: "#e9ebf1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4ff0b8" />
                <stop offset="1" stopColor="#8f7dff" />
              </linearGradient>
            </defs>
            <path d="M16 2.5 27 6.6v8.2c0 6.9-4.6 12.2-11 14.7C9.6 27 5 21.7 5 14.8V6.6L16 2.5Z" fill="url(#g)" />
            <path d="M16 5.6 24.2 8.7v6.1c0 5.3-3.4 9.5-8.2 11.6-4.8-2.1-8.2-6.3-8.2-11.6V8.7L16 5.6Z" fill="#05060a" />
            <path d="m13.2 12.2-3.3 3.6 3.3 3.6M18.8 12.2l3.3 3.6-3.3 3.6" stroke="url(#g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>CodeCloak</div>
          <div style={{ marginLeft: "auto", fontSize: 26, color: "rgba(233,235,241,0.55)" }}>NEAR AI Cloud · private TEE</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
            Code review by an AI swarm that argues in private.
          </div>
          <div style={{ fontSize: 30, color: "rgba(233,235,241,0.65)", maxWidth: 980 }}>
            Attested before your code leaves the server. Every response signed. Nothing stored.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {AGENTS.map(([g, label, color]) => (
            <div
              key={g}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderRadius: 16, border: `2px solid ${color}66`, background: `${color}14`, fontSize: 26 }}
            >
              <div style={{ color, fontWeight: 700 }}>{g}</div>
              <div>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
