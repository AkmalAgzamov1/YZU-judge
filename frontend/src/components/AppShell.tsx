import type { ReactNode } from "react";
import AppNav from "./AppNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="fixed top-4 left-4 z-[60] -translate-y-24 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition duration-300 ease-soft focus:translate-y-0"
      >
        Skip to content
      </a>
      <AppNav />
      <main id="main" className="min-h-[calc(100svh-4rem)] px-4">
        {children}
      </main>
    </>
  );
}
