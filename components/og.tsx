import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { C_PATH } from "./Logo";

export const OG_ALT = "codecloak — private code review, with receipts. Built on NEAR AI Cloud.";
export const OG_SIZE = { width: 1200, height: 630 };

const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));
const fonts = Promise.all([font("Fraunces-Display-700.ttf"), font("Fraunces-DisplayItalic-600.ttf"), font("InstrumentSans-500.ttf")]);

const INK = "#16130f";
const PAPER = "#f3eee6";
const CORAL = "#ff4f3a";

export async function renderOg() {
  const [display, italic, sans] = await fonts;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: PAPER, color: INK, fontFamily: "Instrument Sans" }}>
        <div
          style={{
            position: "absolute",
            right: -180,
            bottom: -220,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: "radial-gradient(circle, #ff6a55 0%, #ff9a88 35%, #f7c9bf 55%, #f3eee6 70%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="68" height="68" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="18" fill={CORAL} />
              <path d={C_PATH} fill={INK} transform="translate(10 50.5) scale(0.043 -0.043)" />
              <circle cx="44.5" cy="44.5" r="4.2" fill={PAPER} />
            </svg>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 48, letterSpacing: -1 }}>
              codecloak<span style={{ color: CORAL }}>.</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 104, lineHeight: 0.95, letterSpacing: -3 }}>Private code review,</div>
            <div style={{ display: "flex", fontFamily: "Fraunces Italic", fontSize: 104, lineHeight: 1.05, letterSpacing: -3, color: CORAL }}>with receipts.</div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 32, color: "#3a342c", maxWidth: 860 }}>
              Three AI auditors argue inside attested NEAR AI Cloud enclaves. Every response signed. Nothing stored.
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {["Intel TDX", "NVIDIA GPU", "Signed responses", "Zero retention"].map((t) => (
              <div key={t} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, border: `2px solid ${INK}`, fontSize: 24, background: PAPER }}>
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
        { name: "Fraunces", data: display, style: "normal", weight: 700 },
        { name: "Fraunces Italic", data: italic, style: "normal", weight: 600 },
        { name: "Instrument Sans", data: sans, style: "normal", weight: 500 },
      ],
    },
  );
}
