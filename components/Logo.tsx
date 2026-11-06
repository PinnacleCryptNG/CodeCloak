/** Fraunces italic "c" (SOFT 100, WONK 1) with a full stop: the CodeCloak mark. */
export const C_PATH =
  "M532 765Q480 765 427.0 719.0Q374 673 335.5 588.5Q297 504 289 388Q280 269 319.5 209.0Q359 149 436 149Q472 149 506.0 162.5Q540 176 572.0 205.0Q604 234 631 282Q652 310 668.5 323.0Q685 336 705 336Q730 336 744.0 309.0Q758 282 733 224Q712 175 678.5 131.0Q645 87 597.0 53.5Q549 20 485.0 1.0Q421 -18 339 -18Q183 -18 105.0 78.0Q27 174 35 344Q41 453 79.5 552.5Q118 652 186.0 729.5Q254 807 347.5 852.0Q441 897 556 897Q649 897 707.0 867.0Q765 837 793.0 788.0Q821 739 821 684Q821 607 777.0 563.5Q733 520 675 520Q634 520 610.0 540.0Q586 560 586 594Q586 623 594.5 644.0Q603 665 603 694Q603 729 584.5 747.0Q566 765 532 765Z";

export function LogoMark({ className = "h-9 w-9", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect width="64" height="64" rx="18" fill="var(--coral)" />
      <path d={C_PATH} fill="var(--ink)" transform="translate(10 50.5) scale(0.043 -0.043)" />
      <circle cx="44.5" cy="44.5" r="4.2" fill="var(--paper)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-[1.6rem] font-semibold leading-none text-ink">
        codecloak
      </span>
    </span>
  );
}
