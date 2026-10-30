import { Code } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PageShell from "../components/PageShell";
import { buttonPrimary, buttonSecondary } from "../components/ui";

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <PageShell>
      <section className="px-4 pt-24">
        <div className="mx-auto max-w-4xl pt-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-neutral-500">Signed in as {user?.email}</p>
              <h1 className="text-hero mt-2 text-4xl font-semibold tracking-tight">
                Hi, {user?.username}
              </h1>
            </div>
            <button type="button" onClick={handleLogout} className={buttonSecondary}>
              Sign out
            </button>
          </div>

          <div className="mt-12 flex flex-col items-center rounded-3xl border border-white/10 bg-ink-1 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink-3 text-white">
              <Code size={24} aria-hidden="true" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold text-white">No submissions yet</h2>
            <p className="mt-3 max-w-md text-base text-neutral-400">
              Solve your first past CPE problem and your submissions and
              verdicts will show up here.
            </p>
            <Link to="/problems" className={`${buttonPrimary} mt-6`}>
              Browse problems
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
