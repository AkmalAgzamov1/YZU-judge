import { ArrowRight, Timer } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ApiError,
  cpePapersApi,
  mockExamsApi,
  submissionsApi,
  type CpePaper,
  type MockExam,
  type MockExamSummary,
} from "../api/client";
import AppShell from "../components/AppShell";
import ConfirmDialog from "../components/ConfirmDialog";
import Message from "../components/Message";
import { buttonPrimary, buttonSecondary, focusRing } from "../components/ui";
import { formatClock, formatDuration, PASS_BAR, useCountdown } from "../lib/mock";
import { serverDate } from "../lib/progress";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      papers: CpePaper[];
      exams: MockExamSummary[];
      active: MockExam | null;
      practiceSolved: Set<number>;
    };

const rules = [
  { term: "Time", value: "3 hours, one sitting. The clock runs on the server." },
  { term: "Problems", value: "The exact problems of that CPE, in the same order." },
  { term: "Judging", value: "Hidden tests, strict limits, a verdict per submission." },
  { term: "To pass", value: `${PASS_BAR} problems solved before time runs out.` },
];

function formatDate(isoDate: string) {
  // held_on is a plain date, so read it as local midnight.
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ActiveBanner({ exam }: { exam: MockExam }) {
  const left = useCountdown(exam.ends_at, exam.server_time);

  return (
    <section
      aria-label="Exam in progress"
      className="flex flex-col gap-4 rounded-2xl border border-yzu-yellow/40 bg-ink-1 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <Timer size={28} className="shrink-0 text-yzu-yellow" aria-hidden="true" />
        <div>
          <p className="font-mono text-sm text-neutral-500">Exam in progress</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {exam.paper_title} · <span className="font-mono">{formatClock(left)}</span> left
          </p>
        </div>
      </div>
      <Link to={`/mock/${exam.id}`} className={`${buttonPrimary} self-start sm:self-auto`}>
        Resume
        <ArrowRight size={18} weight="bold" aria-hidden="true" />
      </Link>
    </section>
  );
}

export default function MockHome() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<CpePaper | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      cpePapersApi.list(),
      mockExamsApi.list(),
      mockExamsApi.active(),
      submissionsApi.list(),
    ]).then(
      ([papers, exams, active, submissions]) => {
        if (cancelled) return;
        const practiceSolved = new Set(
          submissions
            .filter((submission) => submission.mock_exam_id == null && submission.status === "accepted")
            .map((submission) => submission.problem_id),
        );
        setState({ kind: "ready", papers, exams, active, practiceSolved });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: error instanceof ApiError ? error.message : "Mock exams could not be loaded.",
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const bestByPaper = useMemo(() => {
    const best = new Map<number, number>();
    if (state.kind !== "ready") return best;
    for (const exam of state.exams) {
      if (exam.is_active) continue;
      best.set(exam.paper_id, Math.max(best.get(exam.paper_id) ?? 0, exam.solved_count));
    }
    return best;
  }, [state]);

  async function start() {
    if (!pending) return;
    setStarting(true);
    setStartError(null);

    try {
      const exam = await mockExamsApi.start(pending.id);
      navigate(`/mock/${exam.id}`);
    } catch (error) {
      setStartError(error instanceof ApiError ? error.message : "The exam could not be started. Try again.");
      setStarting(false);
    }
  }

  const alreadySolved =
    pending && state.kind === "ready"
      ? pending.problems.filter((item) => state.practiceSolved.has(item.problem_id)).length
      : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Mock CPE</h1>
            <p className="mt-2 max-w-[680px] text-base text-neutral-400">
              Take a real past CPE under exam conditions. Same problems, same order, same three
              hours.
            </p>
          </div>
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {rules.map((rule) => (
              <div key={rule.term} className="grid grid-cols-[96px_1fr] gap-4 py-3 text-sm">
                <dt className="font-mono text-neutral-500">{rule.term}</dt>
                <dd className="text-neutral-300">{rule.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {state.kind === "loading" && (
          <div aria-busy="true" aria-label="Loading papers" className="mt-12 flex animate-pulse flex-col gap-4">
            <div className="h-20 rounded-lg bg-ink-1" />
            <div className="h-20 rounded-lg bg-ink-1" />
          </div>
        )}

        {state.kind === "error" && (
          <div className="mt-12">
            <Message
              title="Mock exams could not be loaded"
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
            {state.active && <ActiveBanner exam={state.active} />}

            <section aria-label="Past CPE papers">
              <h2 className="font-mono text-sm text-neutral-500">Past CPE papers</h2>
              {state.papers.length === 0 ? (
                <div className="mt-4">
                  <Message
                    title="No CPE papers yet"
                    body="Past CPE papers are being added. Until then, practice single problems."
                    action={
                      <Link to="/problems" className={buttonPrimary}>
                        Browse problems
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                  {state.papers.map((paper) => {
                    const best = bestByPaper.get(paper.id);
                    return (
                      <li
                        key={paper.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 py-4 md:grid-cols-[1fr_120px_160px_auto]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-white">{paper.title}</p>
                          <p className="font-mono text-xs text-neutral-500">{formatDate(paper.held_on)}</p>
                        </div>
                        <span className="hidden font-mono text-sm text-neutral-400 md:block">
                          {paper.problems.length} problems
                        </span>
                        <span
                          className={`col-start-1 font-mono text-sm md:col-start-auto ${
                            best === undefined
                              ? "text-neutral-500"
                              : best >= PASS_BAR
                                ? "text-emerald-400"
                                : "text-yzu-yellow"
                          }`}
                        >
                          {best === undefined ? "Not taken yet" : `Best ${best} / ${paper.problems.length}`}
                        </span>
                        <button
                          type="button"
                          disabled={state.active != null}
                          title={state.active ? "Finish your current exam first" : undefined}
                          onClick={() => {
                            setStartError(null);
                            setPending(paper);
                          }}
                          className={`col-start-2 row-span-2 row-start-1 md:col-start-auto md:row-span-1 md:row-start-auto ${buttonSecondary}`}
                        >
                          Start
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {state.exams.some((exam) => !exam.is_active) && (
              <section aria-label="Your mock exams">
                <h2 className="font-mono text-sm text-neutral-500">Your mock exams</h2>
                <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                  {state.exams
                    .filter((exam) => !exam.is_active)
                    .map((exam) => {
                      const ended = serverDate(exam.finished_at ?? exam.ends_at);
                      const used = Math.round((ended.getTime() - serverDate(exam.started_at).getTime()) / 60000);
                      const passed = exam.solved_count >= PASS_BAR;
                      return (
                        <li key={exam.id}>
                          <Link
                            to={`/mock/${exam.id}`}
                            className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 md:grid-cols-[1fr_120px_120px_120px] ${focusRing}`}
                          >
                            <span className="min-w-0 truncate text-base text-white">{exam.paper_title}</span>
                            <span className="font-mono text-sm text-neutral-300">
                              {exam.solved_count} / {exam.problem_count}
                            </span>
                            <span className={`font-mono text-sm ${passed ? "text-emerald-400" : "text-neutral-500"}`}>
                              {passed ? "Would pass" : "Not yet"}
                            </span>
                            <span className="text-right font-mono text-xs text-neutral-500 md:text-sm">
                              {serverDate(exam.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              {" · "}
                              {formatDuration(used)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending != null}
        title={pending ? `Start ${pending.title}?` : ""}
        confirmLabel="Start the clock"
        busy={starting}
        error={startError}
        onConfirm={start}
        onCancel={() => setPending(null)}
      >
        <p>
          You get {pending ? formatDuration(pending.duration_minutes) : ""} for{" "}
          {pending?.problems.length} problems. The clock starts now and does not pause, even if you
          close the tab.
        </p>
        {alreadySolved > 0 && (
          <p className="text-yzu-yellow">
            You already solved {alreadySolved} of these problems in practice, so this mock will feel
            easier than the real one.
          </p>
        )}
      </ConfirmDialog>
    </AppShell>
  );
}
