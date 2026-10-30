import { Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, ApiError, problemsApi, type Problem, type ProblemStats } from "../../api/client";
import DifficultyLabel from "../../components/DifficultyLabel";
import Message from "../../components/Message";
import { buttonPrimary, buttonSecondary, focusRing } from "../../components/ui";
import { sortByDifficulty } from "../../lib/progress";
import AdminLayout from "./AdminLayout";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; problems: Problem[]; stats: Map<number, ProblemStats> };

export default function AdminProblems() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [showDrafts, setShowDrafts] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([problemsApi.list(), adminApi.stats()]).then(
      ([problems, stats]) => {
        if (cancelled) return;
        setState({ kind: "ready", problems, stats: new Map(stats.map((row) => [row.problem_id, row])) });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({ kind: "error", message: error instanceof ApiError ? error.message : "Problems could not be loaded." });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const visible = useMemo(() => {
    if (state.kind !== "ready") return [];
    // Drafts first: they are the ones that need work.
    const sorted = sortByDifficulty(state.problems).sort(
      (a, b) => Number(a.is_published) - Number(b.is_published),
    );
    return showDrafts ? sorted.filter((problem) => !problem.is_published) : sorted;
  }, [state, showDrafts]);

  const draftCount = state.kind === "ready" ? state.problems.filter((problem) => !problem.is_published).length : 0;

  return (
    <AdminLayout
      title="Problems"
      description={
        state.kind === "ready"
          ? `${state.problems.length} ${state.problems.length === 1 ? "problem" : "problems"}, ${draftCount} ${draftCount === 1 ? "draft" : "drafts"}. Students only see published ones.`
          : "Students only see published problems."
      }
      actions={
        <Link to="/admin/problems/new" className={buttonPrimary}>
          <Plus size={16} weight="bold" aria-hidden="true" />
          New problem
        </Link>
      }
    >
      {state.kind === "loading" && (
        <div aria-busy="true" aria-label="Loading problems" className="flex animate-pulse flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-14 rounded-lg bg-ink-1" />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <Message
          title="Problems could not be loaded"
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

      {state.kind === "ready" && state.problems.length === 0 && (
        <Message
          title="No problems yet"
          body="Add the first past CPE problem: statement, limits and tests."
          action={
            <Link to="/admin/problems/new" className={buttonPrimary}>
              New problem
            </Link>
          }
        />
      )}

      {state.kind === "ready" && state.problems.length > 0 && (
        <>
          <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-400">
            <input
              type="checkbox"
              checked={showDrafts}
              onChange={(event) => setShowDrafts(event.target.checked)}
              className="h-4 w-4 accent-white"
            />
            Only drafts
          </label>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[96px_1fr_96px_160px_112px] gap-4 px-3 pb-3 font-mono text-xs text-neutral-500 md:grid"
          >
            <span>UVa</span>
            <span>Title</span>
            <span>Difficulty</span>
            <span>Tests</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {visible.map((problem) => {
              const stats = state.stats.get(problem.id);
              const tests = stats?.test_count ?? 0;
              const samples = stats?.sample_count ?? 0;

              return (
                <li key={problem.id}>
                  <Link
                    to={`/admin/problems/${problem.id}`}
                    className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 md:grid-cols-[96px_1fr_96px_160px_112px] ${focusRing}`}
                  >
                    <span className="hidden font-mono text-sm text-neutral-500 md:block">{problem.uva_id ?? "—"}</span>
                    <span className="min-w-0 truncate text-base font-medium text-white">{problem.title}</span>
                    <span className="hidden md:block">
                      <DifficultyLabel difficulty={problem.difficulty} />
                    </span>
                    <span className={`col-start-1 font-mono text-sm md:col-start-auto ${tests === 0 ? "text-yzu-red" : "text-neutral-400"}`}>
                      {tests} {tests === 1 ? "test" : "tests"} · {samples} {samples === 1 ? "sample" : "samples"}
                    </span>
                    <span
                      className={`col-start-2 row-start-1 text-right font-mono text-sm md:col-start-auto md:row-start-auto ${
                        problem.is_published ? "text-emerald-400" : "text-yzu-yellow"
                      }`}
                    >
                      {problem.is_published ? "Published" : "Draft"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AdminLayout>
  );
}
