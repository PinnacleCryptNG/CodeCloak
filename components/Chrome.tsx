import Link from "next/link";
import { Wordmark } from "./Logo";

export const REPO = "https://github.com/PinnacleCryptNG/CodeCloak";

const LINKS = [
  ["/#how", "How it works"],
  ["/#review", "Live demo"],
  ["/#proof", "Security"],
  ["/#faq", "FAQ"],
] as const;

export function Nav() {
  return (
    <nav className="sticky top-2 z-30 mx-2 mt-2 rounded-2xl border border-line bg-card/90 shadow-[0_1px_2px_rgba(1,24,41,0.05)] backdrop-blur-md sm:mx-3">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="codecloak home" className="shrink-0">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 text-base">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hidden rounded-lg px-3 py-2 text-ink transition hover:bg-paper md:block">
              {label}
            </Link>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer" className="hidden rounded-lg px-3 py-2 text-ink transition hover:bg-paper sm:block">
            GitHub
          </a>
          <Link href="/#review" className="ml-2 rounded-xl bg-coral px-4 py-2 font-medium text-white transition hover:bg-coral-deep">
            Try the demo
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-5 py-14 text-base sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-sm text-muted">Private, multi-agent code review on NEAR AI Cloud. Demo samples are fictional. Open source under MIT.</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-mono uppercase tracking-[0.14em] text-muted">Product</p>
          <Link className="text-ink-2 hover:text-ink" href="/#how">
            How it works
          </Link>
          <Link className="text-ink-2 hover:text-ink" href="/#review">
            Live demo
          </Link>
          <Link className="text-ink-2 hover:text-ink" href="/#proof">
            What we prove
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-mono uppercase tracking-[0.14em] text-muted">Source</p>
          <a className="text-ink-2 hover:text-ink" href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="text-ink-2 hover:text-ink" href={`${REPO}/blob/main/VERIFIED_STACK.md`} target="_blank" rel="noreferrer">
            Verified stack
          </a>
          <a className="text-ink-2 hover:text-ink" href="https://docs.near.ai/cloud/verification" target="_blank" rel="noreferrer">
            NEAR AI verification
          </a>
        </div>
      </div>
    </footer>
  );
}
