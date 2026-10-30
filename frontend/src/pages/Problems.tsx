import { CheckCircle, Circle, CircleHalf, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, problemsApi, submissionsApi, type Problem } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AppShell from "../components/AppShell";
import Message from "../components/Message";
import DifficultyLabel, {
  difficultyColor,
  difficultyLabel,
  type Difficulty,
} from "../components/DifficultyLabel";
import { buttonSecondary, focusRing } from "../components/ui";
import { formatTime } from "../lib/format";
import { buildStatuses, type SolveStatus } from "../lib/progress";


type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; problems: Problem[] };

const difficulties: Difficulty[] = ["easy", "medium", "hard"];
const difficultyOrder: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

const statusFilters = ["solved", "attempted", "untried"] as const;
type StatusFilter = (typeof statusFilters)[number];

function StatusIcon({ status }: { status?: SolveStatus }) {
  if (status === "solved") {
    return (
      <CheckCircle size={20} weight="fill" className="text-emerald-400" aria-label="Solved" />
    );
  }
  if (status === "attempted") {
    return (
      <CircleHalf size={20} weight="fill" className="text-yzu-yellow" aria-label="Attempted" />
    );
  }
  return <Circle size={20} className="text-neutral-700" aria-label="Not tried" />;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: { value: T | "all"; label: string }[];
  value: T | "all";
  onChange: (value: T | "all") => void;
}

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-white/10 bg-ink-1 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1 text-sm font-medium transition duration-300 ease-soft active:scale-[0.98] ${focusRing} ${
            value === option.value
              ? "bg-ink-3 text-white"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Progress({ problems, statuses }: { problems: Problem[]; statuses: Map<number, SolveStatus> }) {
  const solved = problems.filter((problem) => statuses.get(problem.id) === "solved");

  return (
    <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-sm">
      <div className="flex items-baseline gap-2">
        <dt className="text-neutral-500">Solved</dt>
        <dd className="text-white">
          <span className="text-2xl font-semibold">{solved.length}</span>
          <span className="text-neutral-500"> / {problems.length}</span>
        </dd>
      </div>
      {difficulties.map((difficulty) => (
        <div key={difficulty} className="flex items-baseline gap-2">
          <dt className={difficultyColor[difficulty]}>{difficultyLabel[difficulty]}</dt>
          <dd className="text-neutral-300">
            {solved.filter((problem) => problem.difficulty === difficulty).length}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SkeletonRows() {
  return (
    <ul aria-busy="true" aria-label="Loading problems" className="divide-y divide-white/10 border-y border-white/10">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex animate-pulse items-center gap-4 px-3 py-4">
          <span className="h-5 w-5 rounded-full bg-ink-2" />
          <span className="h-4 w-16 rounded bg-ink-2" />
          <span className="h-4 flex-1 rounded bg-ink-2" />
          <span className="hidden h-4 w-16 rounded bg-ink-2 md:block" />
        </li>
      ))}
    </ul>
  );
}

export default function Problems() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [statuses, setStatuses] = useState<Map<number, SolveStatus>>(new Map());
  const [attempt, setAttempt] = useState(0);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    problemsApi.list().then(
      (problems) => {
        if (!cancelled) setState({ kind: "ready", problems });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            error instanceof ApiError ? error.message : "The problem list could not be loaded.",
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    // Without submissions the list still works, just without solve status.
    submissionsApi.list().then(
      (submissions) => {
        if (!cancelled) setStatuses(buildStatuses(submissions));
      },
      () => {},
    );

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const visibleStatuses = useMemo(
    () => (user ? statuses : new Map<number, SolveStatus>()),
    [user, statuses],
  );

  const difficultyParam = params.get("difficulty");
  const difficulty: Difficulty | "all" = difficulties.includes(difficultyParam as Difficulty)
    ? (difficultyParam as Difficulty)
    : "all";
  const statusParam = params.get("status");
  const status: StatusFilter | "all" =
    user && statusFilters.includes(statusParam as StatusFilter) ? (statusParam as StatusFilter) : "all";
  const query = params.get("q") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const problems = useMemo(() => (state.kind === "ready" ? state.problems : []), [state]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return problems
      .filter((problem) => difficulty === "all" || problem.difficulty === difficulty)
      .filter((problem) => {
        if (status === "all") return true;
        const current = visibleStatuses.get(problem.id);
        return status === "untried" ? !current : current === status;
      })
      .filter(
        (problem) =>
          !needle ||
          problem.title.toLowerCase().includes(needle) ||
          String(problem.uva_id ?? "").includes(needle),
      )
      .sort(
        (a, b) =>
          difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] || a.id - b.id,
      );
  }, [problems, difficulty, status, query, visibleStatuses]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Problems</h1>
            <p className="mt-2 text-base text-neutral-400">
              {state.kind === "ready"
                ? `${problems.length} past CPE problems, sorted from easy to hard.`
                : "Past CPE problems, sorted from easy to hard."}
            </p>
          </div>
          {user && state.kind === "ready" && problems.length > 0 && (
            <Progress problems={problems} statuses={visibleStatuses} />
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <Segmented<Difficulty>
            label="Difficulty"
            value={difficulty}
            onChange={(value) => setParam("difficulty", value)}
            options={[
              { value: "all", label: "All" },
              ...difficulties.map((value) => ({ value, label: difficultyLabel[value] })),
            ]}
          />
          {user && (
            <Segmented<StatusFilter>
              label="Status"
              value={status}
              onChange={(value) => setParam("status", value)}
              options={[
                { value: "all", label: "All" },
                { value: "solved", label: "Solved" },
                { value: "attempted", label: "Attempted" },
                { value: "untried", label: "Not tried" },
              ]}
            />
          )}
          <label className="relative lg:ml-auto lg:w-72">
            <span className="sr-only">Search problems</span>
            <MagnifyingGlass
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setParam("q", event.target.value)}
              placeholder="Search by title or UVa number"
              className="w-full rounded-lg border border-white/10 bg-ink-1 py-2 pr-3 pl-10 text-base text-white placeholder:text-neutral-600 transition duration-300 ease-soft hover:border-white/20 focus:bg-ink-2 focus:outline-2 focus:outline-offset-2 focus:outline-white"
            />
          </label>
        </div>

        <div className="mt-6">
          {state.kind === "loading" && <SkeletonRows />}

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

          {state.kind === "ready" && problems.length === 0 && (
            <Message
              title="The problem set is being prepared"
              body="Past CPE problems are being added right now. Check back soon."
            />
          )}

          {state.kind === "ready" && problems.length > 0 && filtered.length === 0 && (
            <Message
              title="No problems match these filters"
              body="Try another difficulty or a shorter search."
              action={
                <button type="button" className={buttonSecondary} onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </button>
              }
            />
          )}

          {filtered.length > 0 && (
            <div>
              <div
                aria-hidden="true"
                className="hidden grid-cols-[24px_96px_1fr_96px_80px_80px] gap-4 px-3 pb-3 font-mono text-xs text-neutral-500 md:grid"
              >
                <span />
                <span>UVa</span>
                <span>Title</span>
                <span>Difficulty</span>
                <span className="text-right">Time</span>
                <span className="text-right">Memory</span>
              </div>
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {filtered.map((problem) => (
                  <li key={problem.id}>
                    <Link
                      to={`/problems/${problem.id}`}
                      className={`grid grid-cols-[24px_1fr] items-center gap-4 rounded-lg px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 md:grid-cols-[24px_96px_1fr_96px_80px_80px] ${focusRing}`}
                    >
                      <StatusIcon status={visibleStatuses.get(problem.id)} />
                      <span className="hidden font-mono text-sm text-neutral-500 md:block">
                        {problem.uva_id ?? "—"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium text-white">
                          {problem.title}
                        </span>
                        <span className="mt-1 flex gap-3 font-mono text-xs text-neutral-500 md:hidden">
                          {problem.uva_id && <span>UVa {problem.uva_id}</span>}
                          <span className={difficultyColor[problem.difficulty]}>
                            {difficultyLabel[problem.difficulty]}
                          </span>
                          <span>{formatTime(problem.time_limit_ms)}</span>
                          <span>{problem.memory_limit_mb} MB</span>
                        </span>
                      </span>
                      <span className="hidden md:block">
                        <DifficultyLabel difficulty={problem.difficulty} />
                      </span>
                      <span className="hidden text-right font-mono text-sm text-neutral-400 md:block">
                        {formatTime(problem.time_limit_ms)}
                      </span>
                      <span className="hidden text-right font-mono text-sm text-neutral-400 md:block">
                        {problem.memory_limit_mb} MB
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
