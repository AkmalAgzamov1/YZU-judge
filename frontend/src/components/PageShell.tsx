import type { ReactNode } from "react";
import SiteFooter from "./SiteFooter";
import SiteNav from "./SiteNav";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="fixed top-4 left-4 z-[60] -translate-y-24 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition duration-300 ease-soft focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main" className="min-h-[70vh]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
