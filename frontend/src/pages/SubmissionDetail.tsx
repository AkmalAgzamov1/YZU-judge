import { ArrowLeft, Check, Copy, PencilSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { problemsApi, type Problem } from "../api/client";
import AppShell from "../components/AppShell";
import CodeEditor from "../components/problem/CodeEditor";
import PendingMessage from "../components/problem/PendingMessage";
import TestResults from "../components/problem/TestResults";
import { buttonPrimary, buttonSecondary, focusRing } from "../components/ui";
import { saveDraft } from "../lib/drafts";
import { isLanguage, savePreferredLanguage } from "../lib/languages";
import { formatDateTime, languageLabel, problemLabel } from "../lib/format";
import useJudge from "../lib/useJudge";
import { isFinished, verdictColor, verdictLabel } from "../lib/verdicts";

function SubmissionView({ submissionId }: { submissionId: number }) {
  const navigate = useNavigate();
  const { submission, results, error, fatal, stale } = useJudge(submissionId);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [copied, setCopied] = useState(false);

  const problemId = submission?.problem_id;

  useEffect(() => {
    if (problemId == null) return;
    let cancelled = false;

    problemsApi.get(problemId).then(
      (loaded) => {
        if (!cancelled) setProblem(loaded);
      },
      () => {},
    );

    return () => {
      cancelled = true;
    };
  }, [problemId]);

  async function copyCode() {
    if (!submission) return;
    try {
      await navigator.clipboard.writeText(submission.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the code is still selectable.
    }
  }

  function openInEditor() {
    if (!submission) return;
    // Open the problem in the language this code was written in.
    const language = isLanguage(submission.language) ? submission.language : "python";
    saveDraft(submission.problem_id, submission.code, undefined, language);
    savePreferredLanguage(language);
    navigate(`/problems/${submission.problem_id}`);
  }

  if (fatal) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
        <h1 className="text-3xl font-semibold text-white">
          {fatal.status === 403 ? "This submission is not yours" : "No such submission"}
        </h1>
        <p className="mt-3 text-base text-neutral-400">
          {fatal.status === 403
            ? "You can only view your own submissions."
            : "It may have been removed, or the link is wrong."}
        </p>
        <Link to="/submissions" className={`${buttonPrimary} mt-8`}>
          Back to submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl py-8">
      <Link
        to="/submissions"
        className={`inline-flex items-center gap-2 rounded-lg text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Submissions
      </Link>

      {!submission ? (
        <div aria-busy="true" aria-label="Loading submission" className="mt-8 animate-pulse">
          <div className="h-4 w-64 rounded bg-ink-2" />
          <div className="mt-4 h-8 w-96 max-w-full rounded-lg bg-ink-2" />
          <div className="mt-8 h-64 rounded-lg bg-ink-1" />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-sm text-neutral-500">
                #{submission.id} · {languageLabel[submission.language]} · {formatDateTime(submission.created_at)}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                <Link
                  to={`/problems/${submission.problem_id}`}
                  className={`rounded-sm hover:underline hover:underline-offset-4 ${focusRing}`}
                >
                  {problemLabel(problem ?? undefined, submission.problem_id)}
                </Link>
              </h1>
              <p
                className={`mt-2 text-xl font-semibold ${verdictColor[submission.status]} ${
                  isFinished(submission.status) ? "" : "animate-pulse"
                }`}
              >
                {verdictLabel[submission.status]}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={copyCode} className={buttonSecondary}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Copied" : "Copy code"}
              </button>
              <button type="button" onClick={openInEditor} className={buttonPrimary}>
                <PencilSimple size={16} aria-hidden="true" />
                Open in editor
              </button>
            </div>
          </div>

          <div className="mt-8 grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
            <section aria-label="Submitted code" className="overflow-hidden rounded-lg border border-white/10">
              <CodeEditor
                value={submission.code}
                readOnly
                language={isLanguage(submission.language) ? submission.language : "python"}
              />
            </section>

            <section
              aria-label="Judge output"
              aria-live="polite"
              className="rounded-lg border border-white/10 bg-ink-0 p-4 font-mono text-sm"
            >
              <p className="mb-3 text-neutral-600">$ submission #{submission.id}</p>
              {isFinished(submission.status) ? (
                <TestResults submission={submission} results={results} />
              ) : (
                <PendingMessage status={submission.status} stale={stale} />
              )}
              {error && <p className="mt-3 text-yzu-red">{error} Retrying…</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const submissionId = Number(id);

  return (
    <AppShell>
      {Number.isInteger(submissionId) && submissionId > 0 ? (
        <SubmissionView key={submissionId} submissionId={submissionId} />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
          <h1 className="text-3xl font-semibold text-white">No such submission</h1>
          <Link to="/submissions" className={`${buttonPrimary} mt-8`}>
            Back to submissions
          </Link>
        </div>
      )}
    </AppShell>
  );
}
