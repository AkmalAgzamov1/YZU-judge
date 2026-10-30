import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { focusRing } from "../../components/ui";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1 text-sm font-medium transition duration-300 ease-soft ${focusRing} ${
    isActive ? "bg-ink-3 text-white" : "text-neutral-400 hover:text-white"
  }`;

interface AdminLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminLayout({ title, description, actions, children }: AdminLayoutProps) {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl py-12">
        <nav aria-label="Admin sections" className="inline-flex rounded-lg border border-white/10 bg-ink-1 p-1">
          <NavLink to="/admin/problems" className={tabClass}>
            Problems
          </NavLink>
          <NavLink to="/admin/papers" className={tabClass}>
            CPE papers
          </NavLink>
        </nav>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-4xl font-semibold tracking-tight text-white">{title}</h1>
            {description && <p className="mt-2 text-base text-neutral-400">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </AppShell>
  );
}
