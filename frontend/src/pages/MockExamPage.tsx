import { CheckCircle, Circle, CircleHalf } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, mockExamsApi, type MockExam } from "../api/client";
import AppShell from "../components/AppShell";
import ConfirmDialog from "../components/ConfirmDialog";
import { difficultyColor, difficultyLabel } from "../components/DifficultyLabel";
import ProblemWorkspace from "../components/problem/ProblemWorkspace";
import { buttonPrimary, buttonSecondary, focusRing } from "../components/ui";
import { formatClock, formatDuration, letter, PASS_BAR, useCountdown } from "../lib/mock";
import { serverDate } from "../lib/progress";

type ExamProblem = MockExam["problems"][number];

function StatusIcon({ status }: { status: ExamProblem["status"] }) {
  if (status === "solved") return <CheckCircle size={16} weight="fill" className="text-emerald-400" aria-label="Solved" />;
  if (status === "attempted") return <CircleHalf size={16} weight="fill" className="text-yzu-yellow" aria-label="Attempted" />;
  return <Circle size={16} className="text-neutral-600" aria-label="Not tried" />;
}

function clockColor(ms: number) {
  if (ms <= 5 * 60_000) return "text-yzu-red";
  if (ms <= 30 * 60_000) return "text-yzu-yellow";
  return "text-white";
}

function ExamView({ exam, onRefresh }: { exam: MockExam; onRefresh: () => void }) {
  const left = useCountdown(exam.ends_at, exam.server_time);
  const firstOpen = exam.problems.find((problem) => problem.status !== "solved") ?? exam.problems[0];
  const [position, setPosition] = useState(firstOpen.position);
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const current = exam.problems.find((problem) => problem.position === position) ?? exam.problems[0];

  // At zero the server has closed the exam; keep asking until it says so,
  // in case this computer's clock runs a little ahead.
  const timeUp = left === 0;

  useEffect(() => {
    if (!timeUp) return;
    onRefresh();
    const timer = setInterval(onRefresh, 3000);
    return () => clearInterval(timer);
  }, [timeUp, onRefresh]);

  async function finish() {
    setFinishing(true);
    setFinishError(null);
    try {
      await mockExamsApi.finish(exam.id);
      onRefresh();
    } catch (error) {
      setFinishError(error instanceof ApiError ? error.message : "The exam could not be finished. Try again.");
      setFinishing(false);
    }
  }

  return (
    <>
      <div className="sticky top-16 z-20 -mx-4 border-b border-white/10 bg-ink-0/90 px-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 py-2 lg:h-14 lg:flex-nowrap lg:py-0">
          <p className="hidden min-w-0 truncate text-sm font-medium text-neutral-400 lg:block lg:max-w-48">
            {exam.paper_title}
          </p>

          <div role="tablist" aria-label="Problems" className="order-3 flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto">
            {exam.problems.map((problem) => (
              <button
                key={problem.position}
                type="button"
                role="tab"
                aria-selected={problem.position === position}
                title={problem.title}
                onClick={() => setPosition(problem.position)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-mono text-sm transition duration-300 ease-soft ${focusRing} ${
                  problem.position === position ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {letter(problem.position)}
                <StatusIcon status={problem.status} />
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <p
              aria-live="off"
              aria-label={`${formatClock(left)} left`}
              className={`font-mono text-2xl font-semibold tabular-nums ${clockColor(left)}`}
            >
              {formatClock(left)}
            </p>
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => {
                setFinishError(null);
                setConfirming(true);
              }}
            >
              Finish
            </button>
          </div>
        </div>
      </div>

      <ProblemWorkspace
        key={current.problem_id}
        problemId={current.problem_id}
        mockExamId={exam.id}
        heightClass="lg:h-[calc(100svh-7.5rem)]"
        metaSlot={
          <span className="rounded border border-white/10 px-1 text-xs text-neutral-400">
            Problem {letter(current.position)} of {exam.problem_count}
          </span>
        }
        onSubmissionFinished={onRefresh}
        onExamEnded={onRefresh}
      />

      <ConfirmDialog
        open={confirming}
        title="Finish the exam now?"
        confirmLabel="Finish exam"
        busy={finishing}
        error={finishError}
        onConfirm={finish}
        onCancel={() => setConfirming(false)}
      >
        <p>
          You still have <span className="font-mono text-white">{formatClock(left)}</span>. Submissions
          still in the queue will count. You cannot submit after finishing.
        </p>
      </ConfirmDialog>
    </>
  );
}

function Results({ exam }: { exam: MockExam }) {
  const passed = exam.solved_count >= PASS_BAR;
  const missing = PASS_BAR - exam.solved_count;
  const ended = serverDate(exam.finished_at ?? exam.ends_at);
  const used = Math.round((ended.getTime() - serverDate(exam.started_at).getTime()) / 60000);

  return (
    <div className="mx-auto max-w-6xl py-12">
      <p className="font-mono text-sm text-neutral-500">
        {exam.paper_title} · {serverDate(exam.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {formatDuration(used)} used
      </p>
      <h1 className="text-hero mt-3 text-5xl font-semibold tracking-tight">
        Solved {exam.solved_count} of {exam.problem_count}
      </h1>
      <p className={`mt-4 text-2xl font-semibold ${passed ? "text-emerald-400" : "text-yzu-yellow"}`}>
        {passed
          ? "You would pass this CPE"
          : `Not yet. ${missing} more problem${missing === 1 ? "" : "s"} needed to pass.`}
      </p>
      <p className="mt-2 max-w-[680px] text-sm text-neutral-500">
        Most departments ask for {PASS_BAR} problems in one sitting. Check the rule for your department and
        enrollment year.
      </p>

      <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
        {exam.problems.map((problem) => (
          <li key={problem.position}>
            <Link
              to={`/problems/${problem.problem_id}`}
              className={`grid grid-cols-[32px_1fr_auto] items-center gap-4 rounded-lg px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 md:grid-cols-[32px_1fr_96px_200px] ${focusRing}`}
            >
              <span className="font-mono text-lg text-neutral-500">{letter(problem.position)}</span>
              <span className="min-w-0 truncate text-base text-white">
                {problem.uva_id ? `UVa ${problem.uva_id} · ` : ""}
                {problem.title}
              </span>
              <span className={`hidden text-sm md:block ${difficultyColor[problem.difficulty]}`}>
                {difficultyLabel[problem.difficulty]}
              </span>
              <span
                className={`text-right font-mono text-sm ${
                  problem.status === "solved"
                    ? "text-emerald-400"
                    : problem.status === "attempted"
                      ? "text-yzu-yellow"
                      : "text-neutral-500"
                }`}
              >
                {problem.status === "solved"
                  ? `Solved at ${formatClock((problem.solved_at_minutes ?? 0) * 60_000).slice(0, -3)}`
                  : problem.status === "attempted"
                    ? "Attempted"
                    : "Not attempted"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/mock" className={buttonPrimary}>
          Back to Mock CPE
        </Link>
        <Link to="/submissions" className={buttonSecondary}>
          Review submissions
        </Link>
      </div>
    </div>
  );
}

function MockExamView({ examId }: { examId: number }) {
  const [exam, setExam] = useState<MockExam | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    mockExamsApi.get(examId).then(
      (loaded) => {
        if (!cancelled) setExam(loaded);
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError(0, "The exam could not be loaded."));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [examId, version]);

  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  if (error && !exam) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
        <h1 className="text-3xl font-semibold text-white">
          {error.status === 403 ? "This exam is not yours" : error.status === 404 ? "No such exam" : "Exam could not be loaded"}
        </h1>
        <p className="mt-3 text-base text-neutral-400">{error.message}</p>
        <Link to="/mock" className={`${buttonPrimary} mt-8`}>
          Back to Mock CPE
        </Link>
      </div>
    );
  }

  if (!exam) {
    return (
      <div aria-busy="true" aria-label="Loading exam" className="mx-auto max-w-6xl animate-pulse py-12">
        <div className="h-4 w-64 rounded bg-ink-2" />
        <div className="mt-4 h-12 w-96 max-w-full rounded-lg bg-ink-2" />
        <div className="mt-12 h-64 rounded-lg bg-ink-1" />
      </div>
    );
  }

  return exam.is_active ? <ExamView exam={exam} onRefresh={refresh} /> : <Results exam={exam} />;
}

export default function MockExamPage() {
  const { id } = useParams();
  const examId = Number(id);

  return (
    <AppShell>
      {Number.isInteger(examId) && examId > 0 ? (
        <MockExamView key={examId} examId={examId} />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
          <h1 className="text-3xl font-semibold text-white">No such exam</h1>
          <Link to="/mock" className={`${buttonPrimary} mt-8`}>
            Back to Mock CPE
          </Link>
        </div>
      )}
    </AppShell>
  );
}
