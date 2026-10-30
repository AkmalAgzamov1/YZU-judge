import type { Submission } from "../../api/client";
import useJudge from "../../lib/useJudge";
import { isFinished } from "../../lib/verdicts";
import PendingMessage from "./PendingMessage";
import TestResults from "./TestResults";

interface JudgePanelProps {
  // Render with key={submissionId} so each submission starts fresh.
  submissionId: number | null;
  submitting: boolean;
  submitError: string | null;
  onFinished: (submission: Submission) => void;
}

export default function JudgePanel({ submissionId, submitting, submitError, onFinished }: JudgePanelProps) {
  const { submission, results, error, fatal, stale } = useJudge(submissionId, onFinished);

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
  } else if (fatal) {
    body = <p className="text-yzu-red">{fatal.message}</p>;
  } else if (!submission) {
    body = <p className="animate-pulse text-neutral-400">loading submission…</p>;
  } else if (!isFinished(submission.status)) {
    body = <PendingMessage status={submission.status} stale={stale} />;
  } else {
    body = <TestResults submission={submission} results={results} />;
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
