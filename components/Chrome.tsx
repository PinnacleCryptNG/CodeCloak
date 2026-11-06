import Link from "next/link";
import { Wordmark } from "./Logo";

export const REPO = "https://github.com/PinnacleCryptNG/CodeCloak";

const LINKS = [
  ["/#how", "How it works"],
  ["/#swarm", "The swarm"],
  ["/#proof", "Proof"],
] as const;

export function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="codecloak home" className="shrink-0">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 text-base">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hidden rounded-full px-3.5 py-2 text-ink-2 transition hover:bg-paper-2 hover:text-ink md:block">
              {label}
            </Link>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer" className="hidden rounded-full px-3.5 py-2 text-ink-2 transition hover:bg-paper-2 hover:text-ink sm:block">
            GitHub
          </a>
          <Link href="/#review" className="ml-2 rounded-full bg-ink px-4 py-2.5 font-semibold text-paper transition hover:bg-ink-2">
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
