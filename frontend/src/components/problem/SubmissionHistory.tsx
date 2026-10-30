import type { Submission } from "../../api/client";
import { formatRelative } from "../../lib/format";
import { verdictColor, verdictLabel } from "../../lib/verdicts";
import { focusRing } from "../ui";

interface SubmissionHistoryProps {
  submissions: Submission[];
  activeId: number | null;
  onSelect: (submission: Submission) => void;
}

export default function SubmissionHistory({ submissions, activeId, onSelect }: SubmissionHistoryProps) {
  if (submissions.length === 0) return null;

  return (
    <section aria-label="Your submissions">
      <h2 className="font-mono text-xs text-neutral-500">Your last submissions</h2>
      <ul className="mt-2 divide-y divide-white/10 border-y border-white/10">
        {submissions.slice(0, 5).map((submission) => (
          <li key={submission.id}>
            <button
              type="button"
              onClick={() => onSelect(submission)}
              aria-current={submission.id === activeId ? "true" : undefined}
              title="Show this verdict and load its code"
              className={`grid w-full grid-cols-[64px_1fr_auto] items-center gap-4 rounded px-2 py-2 text-left font-mono text-sm transition duration-300 ease-soft hover:bg-ink-1 ${focusRing} ${
                submission.id === activeId ? "bg-ink-1" : ""
              }`}
            >
              <span className="text-neutral-500">#{submission.id}</span>
              <span className={verdictColor[submission.status]}>{verdictLabel[submission.status]}</span>
              <span className="text-xs text-neutral-500">{formatRelative(submission.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
