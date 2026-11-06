import Link from "next/link";
import { Wordmark } from "./Logo";

const REPO = "https://github.com/PinnacleCryptNG/CodeCloak";

export function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#05060a]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="CodeCloak home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 text-base sm:gap-2">
          <Link href="/#how" className="hidden rounded-lg px-3 py-2 text-white/60 transition hover:text-white md:block">
            How it works
          </Link>
          <Link href="/#trust" className="hidden rounded-lg px-3 py-2 text-white/60 transition hover:text-white md:block">
            Verification
          </Link>
          <a href={REPO} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-2 text-white/60 transition hover:text-white">
            GitHub
          </a>
          <Link href="/#review" className="rounded-lg bg-white px-3.5 py-2 font-medium text-black transition hover:bg-white/90">
            Try it
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 text-base text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Wordmark />
          <p>Samples are fictional. Code is reviewed in memory only and never stored. MIT licensed.</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a className="transition hover:text-white" href={REPO} target="_blank" rel="noreferrer">
            Source
          </a>
          <a className="transition hover:text-white" href={`${REPO}/blob/main/VERIFIED_STACK.md`} target="_blank" rel="noreferrer">
            Verified stack
          </a>
          <a className="transition hover:text-white" href="https://docs.near.ai/cloud/verification" target="_blank" rel="noreferrer">
            NEAR AI verification
          </a>
        </div>
      </div>
    </footer>
  );
}
