import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, problemsApi, submissionsApi, type Problem, type Submission } from "../api/client";
import AppShell from "../components/AppShell";
import Message from "../components/Message";
import { buttonPrimary, buttonSecondary, focusRing } from "../components/ui";
import { formatDateTime, formatRelative, languageLabel, problemLabel } from "../lib/format";
import { isFinished, verdictColor, verdictLabel } from "../lib/verdicts";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; submissions: Submission[]; problems: Map<number, Problem> };

const verdictFilters = [
  { value: "all", label: "All" },
  { value: "accepted", label: "Accepted" },
  { value: "wrong_answer", label: "Wrong answer" },
  { value: "time_limit_exceeded", label: "Time limit" },
  { value: "other", label: "Other" },
] as const;
type VerdictFilter = (typeof verdictFilters)[number]["value"];

const PAGE_SIZE = 25;
const REFRESH_MS = 3000;

function matchesVerdict(submission: Submission, filter: VerdictFilter) {
  if (filter === "all") return true;
  if (filter === "other") {
    return !["accepted", "wrong_answer", "time_limit_exceeded"].includes(submission.status);
  }
  return submission.status === filter;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function SkeletonRows() {
  return (
    <ul aria-busy="true" aria-label="Loading submissions" className="divide-y divide-white/10 border-y border-white/10">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex animate-pulse items-center gap-4 px-3 py-4">
          <span className="h-4 w-12 rounded bg-ink-2" />
          <span className="h-4 flex-1 rounded bg-ink-2" />
          <span className="h-4 w-24 rounded bg-ink-2" />
          <span className="hidden h-4 w-16 rounded bg-ink-2 md:block" />
        </li>
      ))}
    </ul>
  );
}

export default function Submissions() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    Promise.all([submissionsApi.list(), problemsApi.list().catch(() => [] as Problem[])]).then(
      ([submissions, problems]) => {
        if (cancelled) return;
        setState({
          kind: "ready",
          submissions: [...submissions].sort((a, b) => b.id - a.id),
          problems: new Map(problems.map((problem) => [problem.id, problem])),
        });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: error instanceof ApiError ? error.message : "Your submissions could not be loaded.",
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // While anything is still in the queue, refresh the list until it is judged.
  const hasPending =
    state.kind === "ready" && state.submissions.some((submission) => !isFinished(submission.status));

  useEffect(() => {
    if (!hasPending) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      submissionsApi.list().then(
        (submissions) => {
          if (cancelled) return;
          setState((previous) =>
            previous.kind === "ready"
              ? { ...previous, submissions: [...submissions].sort((a, b) => b.id - a.id) }
              : previous,
          );
        },
        () => {},
      );
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasPending, state]);

  const verdictParam = params.get("verdict");
  const verdict: VerdictFilter = verdictFilters.some((filter) => filter.value === verdictParam)
    ? (verdictParam as VerdictFilter)
    : "all";
  const query = params.get("q") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
    setShown(PAGE_SIZE);
  }

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const needle = query.trim().toLowerCase();

    return state.submissions
      .filter((submission) => matchesVerdict(submission, verdict))
      .filter(
        (submission) =>
          !needle ||
          problemLabel(state.problems.get(submission.problem_id), submission.problem_id)
            .toLowerCase()
            .includes(needle),
      );
  }, [state, verdict, query]);

  const summary = useMemo(() => {
    if (state.kind !== "ready") return null;
    const accepted = state.submissions.filter((submission) => submission.status === "accepted");
    return {
      total: state.submissions.length,
      accepted: accepted.length,
      solved: new Set(accepted.map((submission) => submission.problem_id)).size,
    };
  }, [state]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Submissions</h1>
            <p className="mt-2 text-base text-neutral-400">Everything you have sent to the judge, newest first.</p>
          </div>
          {summary && summary.total > 0 && (
            <p className="font-mono text-sm text-neutral-500">
              <span className="text-white">{plural(summary.total, "submission")}</span>
              {" · "}
              <span className="text-emerald-400">{summary.accepted} accepted</span>
              {" · "}
              {plural(summary.solved, "problem")} solved
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div role="group" aria-label="Verdict" className="flex flex-wrap rounded-lg border border-white/10 bg-ink-1 p-1">
            {verdictFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={verdict === filter.value}
                onClick={() => setParam("verdict", filter.value)}
                className={`rounded px-3 py-1 text-sm font-medium transition duration-300 ease-soft active:scale-[0.98] ${focusRing} ${
                  verdict === filter.value ? "bg-ink-3 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="relative lg:ml-auto lg:w-72">
            <span className="sr-only">Search by problem</span>
            <MagnifyingGlass
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setParam("q", event.target.value)}
              placeholder="Problem or UVa number"
              className="w-full rounded-lg border border-white/10 bg-ink-1 py-2 pr-3 pl-10 text-base text-white placeholder:text-neutral-600 transition duration-300 ease-soft hover:border-white/20 focus:bg-ink-2 focus:outline-2 focus:outline-offset-2 focus:outline-white"
            />
          </label>
        </div>

        <div className="mt-6">
          {state.kind === "loading" && <SkeletonRows />}

          {state.kind === "error" && (
            <Message
              title="Submissions could not be loaded"
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

          {state.kind === "ready" && state.submissions.length === 0 && (
            <Message
              title="No submissions yet"
              body="Pick a problem, write a solution and submit it. Every attempt shows up here."
              action={
                <Link to="/problems" className={buttonPrimary}>
                  Browse problems
                </Link>
              }
            />
          )}

          {state.kind === "ready" && state.submissions.length > 0 && filtered.length === 0 && (
            <Message
              title="No submissions match these filters"
              body="Try another verdict or a shorter search."
              action={
                <button type="button" className={buttonSecondary} onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </button>
              }
            />
          )}

          {state.kind === "ready" && filtered.length > 0 && (
            <>
              <div
                aria-hidden="true"
                className="hidden grid-cols-[72px_1fr_176px_72px_96px] gap-4 px-3 pb-3 font-mono text-xs text-neutral-500 md:grid"
              >
                <span>#</span>
                <span>Problem</span>
                <span>Verdict</span>
                <span>Language</span>
                <span className="text-right">When</span>
              </div>
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {filtered.slice(0, shown).map((submission) => {
                  const label = problemLabel(state.problems.get(submission.problem_id), submission.problem_id);
                  const pending = !isFinished(submission.status);

                  return (
                    <li key={submission.id}>
                      <Link
                        to={`/submissions/${submission.id}`}
                        className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 md:grid-cols-[72px_1fr_176px_72px_96px] ${focusRing}`}
                      >
                        <span className="hidden font-mono text-sm text-neutral-500 md:block">#{submission.id}</span>
                        <span className="min-w-0 truncate text-base font-medium text-white">{label}</span>
                        <span
                          className={`col-start-1 font-mono text-sm md:col-start-auto ${verdictColor[submission.status]} ${
                            pending ? "animate-pulse" : ""
                          }`}
                        >
                          {verdictLabel[submission.status]}
                        </span>
                        <span className="hidden font-mono text-sm text-neutral-400 md:block">
                          {languageLabel[submission.language]}
                        </span>
                        <span
                          title={formatDateTime(submission.created_at)}
                          className="col-start-2 row-start-1 text-right font-mono text-xs text-neutral-500 md:col-start-auto md:row-start-auto md:text-sm"
                        >
                          {formatRelative(submission.created_at)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {filtered.length > shown && (
                <div className="mt-6 flex justify-center">
                  <button type="button" className={buttonSecondary} onClick={() => setShown((value) => value + PAGE_SIZE)}>
                    Show more
                    <span className="font-mono text-sm text-neutral-500">
                      {Math.min(PAGE_SIZE, filtered.length - shown)} of {filtered.length - shown}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
