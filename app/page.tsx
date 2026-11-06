export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        CodeCloak
      </h1>
      <p className="text-base leading-relaxed text-foreground/70">
        Private multi-agent code review inside attested NEAR AI Cloud TEEs.
      </p>
      <button
        type="button"
        disabled
        className="w-full rounded-lg bg-foreground px-5 py-3 text-base font-medium text-background disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:self-start"
      >
        Run private review
      </button>
    </main>
  );
}
