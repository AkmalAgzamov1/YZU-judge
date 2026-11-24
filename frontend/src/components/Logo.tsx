const IBPI_NAME = "Yuan Ze University International Bachelor Program in Informatics";

// The wordmark is wide and its three lines of text need room to be readable,
// so it only appears on large screens; below that the emblem stands in for it.
// compact also hides the "Judge" word there, where the app nav is tight.
// mark is the nav bar version: the emblem and "Judge" at every width, without the
// three line wordmark, so the bar stays small.
export default function Logo({ compact = false, mark = false }: { compact?: boolean; mark?: boolean }) {
  if (mark) {
    return (
      <span className="flex items-center gap-3">
        <img src="/ibpi-emblem.svg" alt={IBPI_NAME} width={551} height={560} className="h-8 w-auto" />
        <span className="text-base font-semibold tracking-tight text-white">Judge</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <img
        src="/ibpi-emblem.svg"
        alt={IBPI_NAME}
        width={551}
        height={560}
        className="h-8 w-auto lg:hidden"
      />
      <img
        src="/ibpi-logo-wordmark.svg"
        alt={IBPI_NAME}
        width={253}
        height={56}
        className="hidden h-10 w-auto lg:block"
      />
      <span aria-hidden="true" className={`h-6 w-px bg-white/20 ${compact ? "hidden lg:block" : ""}`} />
      <span className={`text-base font-semibold tracking-tight text-white ${compact ? "hidden lg:inline" : ""}`}>
        Judge
      </span>
    </span>
  );
}
