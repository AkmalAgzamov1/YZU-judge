import { Info } from "@phosphor-icons/react";
import { useState } from "react";
import type { Submission, SubmissionResult } from "../../api/client";
import { formatMemory, formatTime } from "../../lib/format";
import { verdictColor, verdictLabel } from "../../lib/verdicts";
import { focusRing } from "../ui";

interface TestResultsProps {
  submission: Submission;
  results: SubmissionResult[] | null;
}

// Per test rows plus the final verdict line, in the terminal style.
export default function TestResults({ submission, results }: TestResultsProps) {
  const passed = results?.filter((result) => result.verdict === "accepted").length ?? 0;
  const total = results?.length ?? 0;
  const newlineWarning = submission.status === "accepted" && submission.missing_final_newline;
  const [showNewlineHelp, setShowNewlineHelp] = useState(false);

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
        <span className="flex items-center gap-2">
          <span className={`font-sans text-base font-semibold ${verdictColor[submission.status]}`}>
            {verdictLabel[submission.status]}
            {total > 0 && ` · ${passed}/${total}`}
          </span>
          {newlineWarning && (
            <button
              type="button"
              onClick={() => setShowNewlineHelp((open) => !open)}
              aria-expanded={showNewlineHelp}
              aria-controls="newline-help"
              aria-label="Why UVa and the CPE may reject this"
              title="UVa and the CPE may reject this"
              className={`self-center rounded-full text-amber-400 hover:text-amber-300 ${focusRing}`}
            >
              <Info size={18} weight="bold" aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
      {newlineWarning && showNewlineHelp && (
        <div
          id="newline-help"
          className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/5 p-3 font-sans text-sm leading-relaxed text-neutral-300"
        >
          <p className="font-semibold text-amber-300">UVa and the CPE would mark this Wrong Answer</p>
          <p className="mt-2">
            Your output does not end with a newline: the last line is printed without{" "}
            <code className="font-mono text-amber-200">{"\\n"}</code>. YZU Judge ignores whitespace at the very end of
            the output, but UVa and the CPE compare it byte for byte, so the missing newline alone fails the
            problem there.
          </p>
          <p className="mt-2">
            End every line with a newline, the last one too:{" "}
            <code className="font-mono text-amber-200">
              {submission.language === "python" ? 'print("END OF OUTPUT")' : 'cout << "END OF OUTPUT\\n";'}
            </code>
            {submission.language === "python" && " (print adds the newline, avoid end=\"\")"}
          </p>
        </div>
      )}
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
