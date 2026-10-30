import { useEffect, useRef, useState } from "react";
import { ApiError, submissionsApi, type Submission, type SubmissionResult } from "../../api/client";
import { formatMemory, formatTime } from "../../lib/format";
import { isFinished, verdictColor, verdictLabel } from "../../lib/verdicts";

interface JudgePanelProps {
  // Render with key={submissionId} so each submission starts fresh.
  submissionId: number | null;
  submitting: boolean;
  submitError: string | null;
  onFinished: (submission: Submission) => void;
}

const STALE_AFTER_MS = 60_000;

// Polls the submission until the judge finishes, then loads per test results.
function useJudge(submissionId: number | null, onFinished: (submission: Submission) => void) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [results, setResults] = useState<SubmissionResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const finishedRef = useRef(onFinished);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (submissionId == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function tick(id: number) {
      try {
        const current = await submissionsApi.get(id);
        if (cancelled) return;
        setSubmission(current);
        setError(null);

        if (isFinished(current.status)) {
          const testResults = await submissionsApi.results(id).catch(() => []);
          if (cancelled) return;
          setResults([...testResults].sort((a, b) => a.test_case_id - b.test_case_id));
          finishedRef.current(current);
          return;
        }

        const elapsed = Date.now() - startedAt;
        setStale(elapsed > STALE_AFTER_MS);
        timer = setTimeout(() => tick(id), elapsed > 20_000 ? 3000 : 1000);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Lost connection to the judge.");
        timer = setTimeout(() => tick(id), 3000);
      }
    }

    void tick(submissionId);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [submissionId]);

  return { submission, results, error, stale };
}

export default function JudgePanel({ submissionId, submitting, submitError, onFinished }: JudgePanelProps) {
  const { submission, results, error, stale } = useJudge(submissionId, onFinished);

  let body;

  if (submitError) {
    body = <p className="text-yzu-red">{submitError}</p>;
  } else if (submitting) {
    body = <p className="animate-pulse text-neutral-400">sending your code…</p>;
  } else if (submissionId == null) {
    body = (
      <p className="text-neutral-500">
        Submit your code to see the verdict here.{" "}
        <span className="text-neutral-600">Ctrl + Enter also works.</span>
      </p>
    );
  } else if (!submission) {
    body = <p className="animate-pulse text-neutral-400">loading submission…</p>;
  } else if (!isFinished(submission.status)) {
    body = (
      <>
        <p className="animate-pulse text-neutral-300">
          {submission.status === "running" ? "running against hidden tests…" : "waiting in the judge queue…"}
        </p>
        {stale && (
          <p className="mt-3 font-sans text-sm text-neutral-500">
            This is taking longer than usual. The judge may be offline. Your
            submission is saved and will be judged when it is back.
          </p>
        )}
      </>
    );
  } else {
    const passed = results?.filter((result) => result.verdict === "accepted").length ?? 0;
    const total = results?.length ?? 0;

    body = (
      <>
        {results && results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map((result, index) => (
              <li key={result.id} className="grid grid-cols-[1fr_auto_auto] gap-4 whitespace-nowrap text-neutral-300 sm:grid-cols-[1fr_auto_auto_auto]">
                <span>test {index + 1}</span>
                <span className="text-right text-neutral-500">{formatTime(result.time_taken_ms)}</span>
                <span className="hidden w-16 text-right text-neutral-500 sm:block">{formatMemory(result.memory_used_mb)}</span>
                <span className={`text-right sm:w-40 ${verdictColor[result.verdict]}`}>
                  {verdictLabel[result.verdict].toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div
          className={`flex items-baseline justify-between ${
            results && results.length > 0 ? "mt-4 border-t border-white/10 pt-4" : ""
          }`}
        >
          <span className="text-neutral-500">verdict</span>
          <span className={`font-sans text-base font-semibold ${verdictColor[submission.status]}`}>
            {verdictLabel[submission.status]}
            {total > 0 && ` · ${passed}/${total}`}
          </span>
        </div>
        {submission.status === "internal_error" && (
          <p className="mt-3 font-sans text-sm text-neutral-500">
            Something went wrong on our side, not in your code. Try submitting again.
          </p>
        )}
      </>
    );
  }

  return (
    <section
      aria-label="Judge output"
      aria-live="polite"
      className="rounded-lg border border-white/10 bg-ink-0 p-4 font-mono text-sm"
    >
      {submissionId != null && !submitting && !submitError && (
        <p className="mb-3 text-neutral-600">$ submission #{submissionId}</p>
      )}
      {body}
      {error && <p className="mt-3 text-yzu-red">{error} Retrying…</p>}
    </section>
  );
}
