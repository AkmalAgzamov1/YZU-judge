import { ArrowRight, Fire } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, problemsApi, submissionsApi, type Problem, type Submission } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AppShell from "../components/AppShell";
import Avatar from "../components/Avatar";
import { difficultyColor, difficultyLabel, type Difficulty } from "../components/DifficultyLabel";
import Message from "../components/Message";
import { buttonPrimary, buttonSecondary, focusRing } from "../components/ui";
import { formatRelative, problemLabel } from "../lib/format";
import {
  activityGrid,
  buildStatuses,
  countByDay,
  serverDate,
  sortByDifficulty,
  streaks,
} from "../lib/progress";
import { verdictColor, verdictLabel } from "../lib/verdicts";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; problems: Problem[]; submissions: Submission[] };

const WEEKS = 12;
const difficulties: Difficulty[] = ["easy", "medium", "hard"];
const barColor: Record<Difficulty, string> = {
  easy: "bg-emerald-400",
  medium: "bg-yzu-yellow",
  hard: "bg-yzu-red",
};

function activityLevel(count: number) {
  if (count === 0) return "bg-ink-2";
  if (count === 1) return "bg-emerald-900";
  if (count <= 3) return "bg-emerald-700";
  if (count <= 6) return "bg-emerald-500";
  return "bg-emerald-400";
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-mono text-sm text-neutral-500">{children}</h2>;
}

function NextStep({ problems, submissions }: { problems: Problem[]; submissions: Submission[] }) {
  const statuses = buildStatuses(submissions);
  const byId = new Map(problems.map((problem) => [problem.id, problem]));

  // Newest unsolved attempt first, then the easiest problem not tried yet.
  const lastUnsolved = submissions.find((submission) => statuses.get(submission.problem_id) === "attempted");
  const untried = sortByDifficulty(problems).find((problem) => !statuses.has(problem.id));

  let eyebrow: string;
  let title: string;
  let detail: string | null = null;
  let to: string | null = null;

  if (lastUnsolved) {
    eyebrow = "Continue where you left off";
    title = problemLabel(byId.get(lastUnsolved.problem_id), lastUnsolved.problem_id);
    detail = `Last verdict: ${verdictLabel[lastUnsolved.status]}`;
    to = `/problems/${lastUnsolved.problem_id}`;
  } else if (untried) {
    eyebrow = submissions.length === 0 ? "Start with an easy one" : "Next up";
    title = problemLabel(untried, untried.id);
    detail = `${difficultyLabel[untried.difficulty]} · not tried yet`;
    to = `/problems/${untried.id}`;
  } else if (problems.length > 0) {
    eyebrow = "All done";
    title = "You solved every problem in the set";
    detail = "New past CPE problems are added over time. Check back soon.";
  } else {
    eyebrow = "Getting started";
    title = "The problem set is being prepared";
  }

  return (
    <section
      aria-label="Next step"
      className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-ink-1 p-6 md:flex-row md:items-center md:justify-between md:p-8"
    >
      <div className="min-w-0">
        <p className="font-mono text-sm text-neutral-500">{eyebrow}</p>
        <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">{title}</p>
        {detail && (
          <p
            className={`mt-2 text-base ${
              lastUnsolved ? verdictColor[lastUnsolved.status] : "text-neutral-400"
            }`}
          >
            {detail}
          </p>
        )}
      </div>
      {to && (
        <Link to={to} className={`${buttonPrimary} shrink-0 self-start md:self-auto`}>
          Open problem
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

function DifficultyProgress({ problems, submissions }: { problems: Problem[]; submissions: Submission[] }) {
  const statuses = buildStatuses(submissions);

  return (
    <section aria-label="Progress by difficulty">
      <SectionTitle>Progress</SectionTitle>
      <dl className="mt-4 flex flex-col gap-4">
        {difficulties.map((difficulty) => {
          const inLevel = problems.filter((problem) => problem.difficulty === difficulty);
          const solved = inLevel.filter((problem) => statuses.get(problem.id) === "solved").length;
          const share = inLevel.length === 0 ? 0 : solved / inLevel.length;

          return (
            <div key={difficulty} className="grid grid-cols-[72px_1fr_64px] items-center gap-4">
              <dt className={`text-sm font-medium ${difficultyColor[difficulty]}`}>
                {difficultyLabel[difficulty]}
              </dt>
              <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-ink-2">
                <div
                  className={`h-full origin-left rounded-full ${barColor[difficulty]}`}
                  style={{ transform: `scaleX(${share})` }}
                />
              </div>
              <dd className="text-right font-mono text-sm text-neutral-300">
                {solved} / {inLevel.length}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Activity({ submissions }: { submissions: Submission[] }) {
  const counts = useMemo(() => countByDay(submissions), [submissions]);
  const grid = useMemo(() => activityGrid(counts, WEEKS), [counts]);
  const { current, best } = useMemo(() => streaks(counts), [counts]);
  const recent = grid.flat().filter((day) => !day.future && day.count > 0).length;

  return (
    <section aria-label="Activity">
      <SectionTitle>{`Activity, last ${WEEKS} weeks`}</SectionTitle>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div role="img" aria-label={`Active on ${recent} days in the last ${WEEKS} weeks`} className="flex gap-1">
            {grid.map((week, index) => (
              <div key={index} className="flex flex-col gap-1">
                {week.map((day) => (
                  <span
                    key={day.key}
                    title={
                      day.future
                        ? undefined
                        : `${day.count} submission${day.count === 1 ? "" : "s"} on ${day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                    }
                    className={`h-4 w-4 rounded-sm ${day.future ? "bg-transparent" : activityLevel(day.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="mt-3 flex items-center gap-1 font-mono text-xs text-neutral-500">
            <span className="mr-1">Less</span>
            {[0, 1, 2, 4, 7].map((count) => (
              <span key={count} className={`h-3 w-3 rounded-sm ${activityLevel(count)}`} />
            ))}
            <span className="ml-1">More</span>
          </div>
        </div>

        <dl className="flex gap-8 font-mono text-sm">
          <div>
            <dt className="text-neutral-500">Current streak</dt>
            <dd className="mt-1 flex items-center gap-2 text-2xl font-semibold text-white">
              {current > 0 && <Fire size={20} weight="fill" className="text-yzu-yellow" aria-hidden="true" />}
              {current} {current === 1 ? "day" : "days"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Best streak</dt>
            <dd className="mt-1 text-2xl font-semibold text-white">
              {best} {best === 1 ? "day" : "days"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function RecentSubmissions({ problems, submissions }: { problems: Problem[]; submissions: Submission[] }) {
  const byId = new Map(problems.map((problem) => [problem.id, problem]));

  return (
    <section aria-label="Recent submissions">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Recent submissions</SectionTitle>
        <Link
          to="/submissions"
          className={`rounded-sm text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
        >
          View all
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {submissions.slice(0, 5).map((submission) => (
          <li key={submission.id}>
            <Link
              to={`/submissions/${submission.id}`}
              className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-3 transition duration-300 ease-soft hover:bg-ink-1 md:grid-cols-[1fr_176px_96px] ${focusRing}`}
            >
              <span className="min-w-0 truncate text-base text-white">
                {problemLabel(byId.get(submission.problem_id), submission.problem_id)}
              </span>
              <span className={`col-start-1 font-mono text-sm md:col-start-auto ${verdictColor[submission.status]}`}>
                {verdictLabel[submission.status]}
              </span>
              <span className="col-start-2 row-start-1 text-right font-mono text-xs text-neutral-500 md:col-start-auto md:row-start-auto md:text-sm">
                {formatRelative(submission.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccountSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your progress" className="mt-12 flex animate-pulse flex-col gap-12">
      <div className="h-32 rounded-2xl bg-ink-1" />
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="h-32 rounded-lg bg-ink-1" />
        <div className="h-32 rounded-lg bg-ink-1" />
      </div>
      <div className="h-48 rounded-lg bg-ink-1" />
    </div>
  );
}

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([problemsApi.list(), submissionsApi.list()]).then(
      ([problems, submissions]) => {
        if (cancelled) return;
        setState({ kind: "ready", problems, submissions: [...submissions].sort((a, b) => b.id - a.id) });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: error instanceof ApiError ? error.message : "Your progress could not be loaded.",
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const memberSince = user
    ? serverDate(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {user && <Avatar name={user.username} size="lg" />}
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight text-white">{user?.username}</h1>
              <p className="mt-1 truncate text-sm text-neutral-400">
                {user?.email} · Member since {memberSince}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className={`${buttonSecondary} self-start sm:self-auto`}>
            Sign out
          </button>
        </div>

        {state.kind === "loading" && <AccountSkeleton />}

        {state.kind === "error" && (
          <div className="mt-12">
            <Message
              title="Your progress could not be loaded"
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
          </div>
        )}

        {state.kind === "ready" && (
          <div className="mt-12 flex flex-col gap-12">
            <NextStep problems={state.problems} submissions={state.submissions} />

            {state.submissions.length > 0 ? (
              <>
                <div className="grid gap-12 lg:grid-cols-2">
                  <DifficultyProgress problems={state.problems} submissions={state.submissions} />
                  <Activity submissions={state.submissions} />
                </div>
                <RecentSubmissions problems={state.problems} submissions={state.submissions} />
              </>
            ) : (
              <DifficultyProgress problems={state.problems} submissions={state.submissions} />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
