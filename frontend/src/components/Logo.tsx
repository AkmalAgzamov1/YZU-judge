export default function Logo() {
  return (
    <span className="flex items-center gap-3">
      <img
        src="/yzu-logo-wordmark.png"
        alt="Yuan Ze University"
        width={310}
        height={99}
        className="h-8 w-auto"
      />
      <span aria-hidden="true" className="h-6 w-px bg-white/20" />
      <span className="text-base font-semibold tracking-tight text-white">Judge</span>
    </span>
  );
}
