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

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main id="main" className="flex flex-col px-4 py-8 md:px-12">
        <div className="flex items-center justify-between">
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
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
          <h1 className="text-hero text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-base text-neutral-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>

      <aside className="hidden p-2 lg:block" aria-hidden="true">
        <img
          src="/yzu-campus.jpg"
          alt=""
          className="h-full w-full rounded-2xl object-cover"
        />
      </aside>
    </div>
  );
}
