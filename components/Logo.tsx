import { useId } from "react";

/** CodeCloak mark: a hooded shield veiling a pair of code brackets. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4ff0b8" />
          <stop offset="1" stopColor="#8f7dff" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 27 6.6v8.2c0 6.9-4.6 12.2-11 14.7C9.6 27 5 21.7 5 14.8V6.6L16 2.5Z" fill={`url(#${id}-g)`} />
      <path d="M16 5.6 24.2 8.7v6.1c0 5.3-3.4 9.5-8.2 11.6-4.8-2.1-8.2-6.3-8.2-11.6V8.7L16 5.6Z" fill="#05060a" />
      <path d="m13.2 12.2-3.3 3.6 3.3 3.6M18.8 12.2l3.3 3.6-3.3 3.6" stroke={`url(#${id}-g)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.8 9.6C11 11.4 13.4 12 16 12s5-.6 8.2-2.4" stroke={`url(#${id}-g)`} strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-white">
        Code<span className="text-gradient">Cloak</span>
      </span>
    </span>
  );
}
