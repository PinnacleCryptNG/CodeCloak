"use client";

export function ThemeToggle() {
  const flip = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("cc-theme", next);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-label="Switch between dark and light mode"
      title="Switch theme"
      className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-ink transition hover:border-ink/40"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform duration-500 [[data-theme=light]_&]:rotate-180" aria-hidden>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
        <circle cx="12" cy="12" r="2.2" fill="var(--coral)" />
      </svg>
    </button>
  );
}
