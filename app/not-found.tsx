import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-5 py-28 text-center">
        <p className="font-display text-[7rem] font-semibold italic leading-none text-coral sm:text-[10rem]">404</p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Nothing here. <em className="text-coral">Not even logs.</em>
        </h1>
        <p className="max-w-md text-lg text-ink-2">This page doesn&apos;t exist. Like your code, it was never stored.</p>
        <Link href="/" className="rounded-full bg-ink px-6 py-3.5 text-base font-semibold text-paper transition hover:bg-ink-2">
          Back to codecloak
        </Link>
      </main>
      <Footer />
    </>
  );
}
