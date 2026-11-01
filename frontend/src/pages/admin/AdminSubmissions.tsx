import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi, ApiError, type AdminSubmission } from "../../api/client";
import Message from "../../components/Message";
import { buttonSecondary, focusRing } from "../../components/ui";
import { formatDateTime, formatRelative, languageLabel } from "../../lib/format";
import { verdictColor, verdictLabel } from "../../lib/verdicts";
import AdminLayout from "./AdminLayout";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; submissions: AdminSubmission[] };

const columns = "md:grid-cols-[64px_140px_1fr_72px_176px_96px]";

// Keyed by the filter, so switching users starts over from the loading state.
export default function AdminSubmissions() {
  const [params] = useSearchParams();
  const userParam = Number(params.get("user"));
  const userId = Number.isInteger(userParam) && userParam > 0 ? userParam : undefined;

  return <SubmissionList key={userId ?? "all"} userId={userId} />;
}

function SubmissionList({ userId }: { userId?: number }) {
  const [, setParams] = useSearchParams();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    adminApi.submissions(userId).then(
      (submissions) => {
        if (!cancelled) setState({ kind: "ready", submissions });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: error instanceof ApiError ? error.message : "Submissions could not be loaded.",
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  // The username comes with every row, so the filter needs no extra request.
  const filteredName = userId != null && state.kind === "ready" ? state.submissions[0]?.username : undefined;

  return (
    <AdminLayout
      title="Submissions"
      description={
        userId != null
          ? `Everything ${filteredName ?? `user #${userId}`} submitted, newest first. Open one to see the code and the verdict per test.`
          : "The latest 100 submissions from everyone, newest first. Open one to see the code and the verdict per test."
      }
      actions={
        userId != null && (
          <button type="button" className={buttonSecondary} onClick={() => setParams({})}>
            Show everyone
          </button>
        )
      }
    >
      {state.kind === "loading" && (
        <div aria-busy="true" aria-label="Loading submissions" className="flex animate-pulse flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-12 rounded-lg bg-ink-1" />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <Message
          title="Submissions could not be loaded"
          body={state.message}
          action={
            <button type="button" className={buttonSecondary} onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          }
        />
      )}

      {state.kind === "ready" && state.submissions.length === 0 && (
        <Message
          title="No submissions yet"
          body={userId != null ? "This user has not submitted anything." : "Submissions show up here as soon as someone presses Submit."}
        />
      )}

      {state.kind === "ready" && state.submissions.length > 0 && (
        <>
          <div aria-hidden="true" className={`hidden gap-4 px-3 pb-3 font-mono text-xs text-neutral-500 md:grid ${columns}`}>
            <span>#</span>
            <span>User</span>
            <span>Problem</span>
            <span>Language</span>
            <span>Verdict</span>
            <span className="text-right">When</span>
          </div>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {state.submissions.map((submission) => (
              <li key={submission.id}>
                <Link
                  to={`/submissions/${submission.id}`}
                  className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-3 py-3 font-mono text-sm transition duration-300 ease-soft hover:bg-ink-1 ${columns} ${focusRing}`}
                >
                  <span className="hidden text-neutral-500 md:block">#{submission.id}</span>
                  <span className="truncate text-white">{submission.username}</span>
                  <span className="col-span-2 min-w-0 truncate font-sans text-neutral-300 md:col-span-1">
                    {submission.uva_id && <span className="font-mono text-neutral-500">UVa {submission.uva_id} · </span>}
                    {submission.problem_title}
                    {submission.mock_exam_id != null && (
                      <span className="ml-2 rounded border border-white/10 px-1 font-mono text-xs text-neutral-400">mock</span>
                    )}
                  </span>
                  <span className="hidden text-neutral-400 md:block">{languageLabel[submission.language]}</span>
                  <span className={verdictColor[submission.status]}>{verdictLabel[submission.status]}</span>
                  <span className="text-right text-xs text-neutral-500 md:text-sm" title={formatDateTime(submission.created_at)}>
                    {formatRelative(submission.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminLayout>
  );
}
