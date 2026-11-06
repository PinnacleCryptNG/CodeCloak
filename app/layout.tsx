import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
const DESCRIPTION =
  "Three AI auditors review your code inside attested NEAR AI Cloud enclaves, argue over each other's findings, and a moderator rules. Verified before your code leaves the server. Nothing stored.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "CodeCloak · Private multi-agent code review", template: "%s · CodeCloak" },
  description: DESCRIPTION,
  openGraph: { title: "CodeCloak · Private multi-agent code review", description: DESCRIPTION, siteName: "CodeCloak", type: "website" },
  twitter: { card: "summary_large_image", title: "CodeCloak · Private multi-agent code review", description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05060a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="backdrop" aria-hidden />
        {children}
      </body>
    </html>
  );
}
