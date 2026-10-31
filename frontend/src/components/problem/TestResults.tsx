import type { Submission, SubmissionResult } from "../../api/client";
import { formatMemory, formatTime } from "../../lib/format";
import { verdictColor, verdictLabel } from "../../lib/verdicts";

interface TestResultsProps {
  submission: Submission;
  results: SubmissionResult[] | null;
}

// Per test rows plus the final verdict line, in the terminal style.
export default function TestResults({ submission, results }: TestResultsProps) {
  const passed = results?.filter((result) => result.verdict === "accepted").length ?? 0;
  const total = results?.length ?? 0;

  return (
    <>
      {results && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((result, index) => (
            <li
              key={result.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 whitespace-nowrap text-neutral-300 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <span>test {index + 1}</span>
              <span className="text-right text-neutral-500">{formatTime(result.time_taken_ms)}</span>
              <span className="hidden w-16 text-right text-neutral-500 sm:block">
                {formatMemory(result.memory_used_mb)}
              </span>
              <span className={`text-right sm:w-40 ${verdictColor[result.verdict]}`}>
                {verdictLabel[result.verdict].toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div
        className={`flex items-baseline justify-between ${
          total > 0 ? "mt-4 border-t border-white/10 pt-4" : ""
        }`}
      >
        <span className="text-neutral-500">verdict</span>
        <span className={`font-sans text-base font-semibold ${verdictColor[submission.status]}`}>
          {verdictLabel[submission.status]}
          {total > 0 && ` · ${passed}/${total}`}
        </span>
      </div>
      {submission.status === "compilation_error" && submission.compile_output && (
        <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-orange-400/30 bg-ink-1 p-3 text-xs whitespace-pre text-orange-200">
          {submission.compile_output}
        </pre>
      )}
      {submission.status === "internal_error" && (
        <p className="mt-3 font-sans text-sm text-neutral-500">
          Something went wrong on our side, not in your code. Try submitting again.
        </p>
      )}
    </>
  );
}
