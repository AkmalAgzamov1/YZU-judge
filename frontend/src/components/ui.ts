const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-300 ease-soft active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-50";

export const buttonPrimary = `${base} bg-white px-3 py-2 text-base text-black hover:bg-neutral-200`;

export const buttonSecondary = `${base} border border-white/10 bg-ink-2 px-3 py-2 text-base text-white hover:bg-ink-3`;

export const buttonPrimarySmall = `${base} bg-white px-3 py-2 text-sm text-black hover:bg-neutral-200`;

export const buttonGhostSmall = `${base} px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white`;

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
