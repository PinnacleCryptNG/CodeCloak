import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { C_PATH } from "./Logo";

export const OG_ALT = "codecloak — code review in a sealed room, with receipts. Built on NEAR AI Cloud.";
export const OG_SIZE = { width: 1200, height: 630 };

const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));
const fonts = Promise.all([font("Geist-500.ttf"), font("Fraunces-500.ttf"), font("Fraunces-Italic-400.ttf")]);

const INK = "#111214";
const PAPER = "#f4f1ea";
const CARD = "#fffdf8";
const CORAL = "#ff4f3a";
const CORAL_DEEP = "#d63a25";
const MUTED = "#7f7c74";

const ROWS: [string, string, string?][] = [
  ["Intel TDX quotes", "verified", "#1d7a4f"],
  ["NVIDIA GPU", "verified", "#1d7a4f"],
  ["Signatures", "7/7 valid", "#1d7a4f"],
  ["Code retained", "0 bytes"],
];

export async function renderOg() {
  const [sans, serif, italic] = await fonts;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, color: INK, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 0 60px 72px", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="60" height="60" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="18" fill={CORAL} />
              <path d={C_PATH} fill={INK} transform="translate(10 50.5) scale(0.043 -0.043)" />
              <circle cx="44.5" cy="44.5" r="4.2" fill={PAPER} />
            </svg>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 44, letterSpacing: -1 }}>codecloak</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 84, lineHeight: 1.0, letterSpacing: -3 }}>Code review in a</div>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 84, lineHeight: 1.0, letterSpacing: -3 }}>sealed room.</div>
            <div style={{ display: "flex", fontFamily: "Fraunces Italic", fontSize: 84, lineHeight: 1.1, letterSpacing: -3, color: CORAL_DEEP }}>With receipts.</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#3c3e44" }}>Three AI auditors argue inside NEAR AI Cloud enclaves.</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 400, background: CARD, padding: "36px 32px", transform: "rotate(2deg)", boxShadow: "0 20px 40px rgba(17,18,20,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "center", fontFamily: "Fraunces Italic", fontSize: 34 }}>codecloak</div>
            <div style={{ display: "flex", justifyContent: "center", fontSize: 20, letterSpacing: 4, color: MUTED, marginTop: 4 }}>REVIEW RECEIPT</div>
            <div style={{ display: "flex", borderTop: "3px dashed #e0d9cb", margin: "20px 0" }} />
            {ROWS.map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 24, padding: "7px 0" }}>
                <span>{k}</span>
                <span style={{ color: c ?? INK }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
              <div style={{ display: "flex", border: `4px solid ${CORAL}`, borderRadius: 8, padding: "6px 14px", color: CORAL_DEEP, fontSize: 22, letterSpacing: 2, transform: "rotate(-9deg)" }}>
                SIGNED IN ENCLAVE
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: sans, style: "normal", weight: 500 },
        { name: "Fraunces", data: serif, style: "normal", weight: 500 },
        { name: "Fraunces Italic", data: italic, style: "normal", weight: 400 },
      ],
    },
  );
}
