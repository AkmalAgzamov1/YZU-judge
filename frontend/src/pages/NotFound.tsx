import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { buttonPrimary } from "../components/ui";

export default function NotFound() {
  return (
    <PageShell>
      <section className="px-4 pt-24 pb-24">
        <div className="mx-auto flex max-w-[680px] flex-col items-center pt-16 text-center">
          <p className="rounded-lg border border-white/10 bg-ink-1 px-3 py-1 font-mono text-sm text-yzu-yellow">
            Verdict: 404 Not Found
          </p>
          <h1 className="text-hero mt-6 text-5xl font-semibold tracking-tight">
            This page did not pass the tests
          </h1>
          <p className="mt-6 text-lg text-neutral-400">
            The link may be old or mistyped. Head back to the home page and try
            again from there.
          </p>
          <Link to="/" className={`${buttonPrimary} mt-8`}>
            Back to home
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
