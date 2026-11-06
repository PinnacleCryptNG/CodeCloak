import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import { LogoMark } from "@/components/Logo";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-5 py-28 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-violet/30 blur-3xl" />
          <LogoMark className="h-20 w-20" />
        </div>
        <p className="font-mono text-base tracking-[0.3em] text-white/40">ERROR 404</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          This page is <span className="font-serif text-5xl font-normal italic text-gradient sm:text-6xl">cloaked.</span>
        </h1>
        <p className="max-w-md text-lg text-white/60">Or it never existed. Unlike your code, we can&apos;t prove which.</p>
        <Link href="/" className="rounded-xl bg-white px-5 py-3 text-base font-semibold text-black transition hover:bg-white/90">
          Back to CodeCloak
        </Link>
      </main>
      <Footer />
    </>
  );
}
