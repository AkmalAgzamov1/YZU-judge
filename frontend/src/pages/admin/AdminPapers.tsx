import { Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, cpePapersApi, type CpePaper } from "../../api/client";
import Message from "../../components/Message";
import { buttonPrimary, buttonSecondary, focusRing } from "../../components/ui";
import { letter } from "../../lib/mock";
import AdminLayout from "./AdminLayout";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; papers: CpePaper[] };

export default function AdminPapers() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    cpePapersApi.list().then(
      (papers) => {
        if (!cancelled) setState({ kind: "ready", papers });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ kind: "error", message: error instanceof ApiError ? error.message : "Papers could not be loaded." });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <AdminLayout
      title="CPE papers"
      description="Each paper is one past CPE sitting. Students take it as a timed mock exam."
      actions={
        <Link to="/admin/papers/new" className={buttonPrimary}>
          <Plus size={16} weight="bold" aria-hidden="true" />
          New paper
        </Link>
      }
    >
      {state.kind === "loading" && <div aria-busy="true" aria-label="Loading papers" className="h-40 animate-pulse rounded-lg bg-ink-1" />}

      {state.kind === "error" && (
        <Message
          title="Papers could not be loaded"
          body={state.message}
          action={
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => {
                setState({ kind: "loading" });
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          }
        />
      )}

      {state.kind === "ready" && state.papers.length === 0 && (
        <Message
          title="No papers yet"
          body="Add the problems of a past CPE first, then group them into a paper here."
          action={
            <Link to="/admin/papers/new" className={buttonPrimary}>
              New paper
            </Link>
          }
        />
      )}

      {state.kind === "ready" && state.papers.length > 0 && (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {state.papers.map((paper) => (
            <li key={paper.id}>
              <Link
                to={`/admin/papers/${paper.id}`}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 md:grid-cols-[1fr_128px_1fr] ${focusRing}`}
              >
                <span className="min-w-0 truncate text-base font-medium text-white">{paper.title}</span>
                <span className="font-mono text-sm text-neutral-500">{paper.held_on}</span>
                <span className="col-span-2 truncate font-mono text-xs text-neutral-500 md:col-span-1">
                  {paper.problems.map((item) => `${letter(item.position)} ${item.uva_id ?? item.title}`).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
