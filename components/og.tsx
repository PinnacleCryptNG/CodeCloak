import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { C_PATH } from "./Logo";

export const OG_ALT = "codecloak — private code review, with receipts. Built on NEAR AI Cloud.";
export const OG_SIZE = { width: 1200, height: 630 };

const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));
const fonts = Promise.all([font("Geist-500.ttf"), font("Doto-800.ttf")]);

const INK = "#011829";
const PAPER = "#eef1f6";
const CORAL = "#ff4f3a";
const MUTED = "#7d8799";

export async function renderOg() {
  const [sans, dot] = await fonts;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, color: INK, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width="60" height="60" viewBox="0 0 64 64">
                <rect width="64" height="64" rx="18" fill={CORAL} />
                <path d={C_PATH} fill={INK} transform="translate(10 50.5) scale(0.043 -0.043)" />
                <circle cx="44.5" cy="44.5" r="4.2" fill="#ffffff" />
              </svg>
              <div style={{ display: "flex", fontSize: 40, letterSpacing: -1 }}>codecloak</div>
            </div>
            <div style={{ display: "flex", fontFamily: "Doto", fontSize: 44, letterSpacing: 2, color: CORAL }}>ATTEST. ARGUE.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 96, lineHeight: 1.02, letterSpacing: -4 }}>Private code review,</div>
            <div style={{ display: "flex", fontSize: 96, lineHeight: 1.02, letterSpacing: -4, color: MUTED }}>with receipts.</div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 30, color: "#33415a", maxWidth: 900 }}>
              Three AI auditors argue inside attested NEAR AI Cloud enclaves. Every response signed. Nothing stored.
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {["Intel TDX", "NVIDIA GPU", "Signed responses", "Zero retention"].map((t) => (
              <div key={t} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, border: "2px solid #dde2e9", fontSize: 24, background: "#ffffff" }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: sans, style: "normal", weight: 500 },
        { name: "Doto", data: dot, style: "normal", weight: 800 },
      ],
    },
  );
}
