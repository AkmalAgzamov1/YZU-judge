import { ArrowLeft } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { focusRing } from "./ui";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

// One narrow centered column on a plain background, the pattern used by
// Linear, Vercel and Supabase. No photo competing with the form.
export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col px-4">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-6">
        <Link to="/" className={`rounded-lg ${focusRing}`} aria-label="YZU Judge home">
          <Logo />
        </Link>
        <Link
          to="/"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to home
        </Link>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <img
              src="/yzu-logo.png"
              alt=""
              width={316}
              height={316}
              className="mx-auto h-16 w-16 rounded-full bg-white p-0.5"
            />
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-base text-neutral-400">{subtitle}</p>
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl justify-between py-6 text-xs text-neutral-600">
        <span>© 2026 YZU Judge</span>
        <span className="flex gap-4">
          <Link to="/privacy" className={`rounded-sm hover:text-neutral-400 ${focusRing}`}>
            Privacy
          </Link>
          <Link to="/terms" className={`rounded-sm hover:text-neutral-400 ${focusRing}`}>
            Terms
          </Link>
        </span>
      </footer>
    </div>
  );
}
