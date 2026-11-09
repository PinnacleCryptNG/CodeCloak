import Link from "next/link";
import { Wordmark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export const REPO = "https://github.com/PinnacleCryptNG/CodeCloak";

const LINKS = [
  ["/#how", "How it works"],
  ["/#near", "On NEAR"],
  ["/#swarm", "The swarm"],
  ["/#review", "Live demo"],
  ["/#proof", "Receipt"],
  ["/#faq", "FAQ"],
] as const;

export function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="codecloak home" className="shrink-0">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 text-base">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="hidden rounded-lg px-3 py-2 text-ink transition hover:bg-paper-2 md:block">
              {label}
            </Link>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer" className="hidden rounded-lg px-3 py-2 text-ink transition hover:bg-paper-2 sm:block">
            GitHub
          </a>
          <ThemeToggle />
          <Link href="/#review" className="ml-2 rounded-full bg-ink px-5 py-2 font-medium text-paper transition hover:bg-coral-deep">
            Try the demo
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="on-night border-t border-night-line bg-night text-paper">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-5 py-14 text-base sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-sm text-paper/60">Private AI code review on NEAR AI Cloud. Demo samples are fictional. Open source under MIT.</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-mono uppercase tracking-[0.14em] text-paper/50">Product</p>
          <Link className="text-paper/75 hover:text-paper" href="/#how">
            How it works
          </Link>
          <Link className="text-paper/75 hover:text-paper" href="/#review">
            Live demo
          </Link>
          <Link className="text-paper/75 hover:text-paper" href="/#proof">
            The receipt
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-mono uppercase tracking-[0.14em] text-paper/50">Source</p>
          <a className="text-paper/75 hover:text-paper" href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="text-paper/75 hover:text-paper" href={`${REPO}/blob/main/VERIFIED_STACK.md`} target="_blank" rel="noreferrer">
            Verified stack
          </a>
          <a className="text-paper/75 hover:text-paper" href="https://docs.near.ai/cloud/verification" target="_blank" rel="noreferrer">
            NEAR AI verification
          </a>
        </div>
      </div>
    </footer>
  );
}
