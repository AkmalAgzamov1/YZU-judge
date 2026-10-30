import { ArrowLeft, PaperPlaneRight } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ApiError,
  problemsApi,
  submissionsApi,
  type Problem,
  type Sample,
  type Submission,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AppShell from "../components/AppShell";
import DifficultyLabel from "../components/DifficultyLabel";
import CodeEditor from "../components/problem/CodeEditor";
import JudgePanel from "../components/problem/JudgePanel";
import Samples from "../components/problem/Samples";
import Statement from "../components/problem/Statement";
import SubmissionHistory from "../components/problem/SubmissionHistory";
import { buttonPrimary, buttonSecondary, focusRing } from "../components/ui";
import { loadDraft, saveDraft } from "../lib/drafts";
import { formatTime } from "../lib/format";

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; problem: Problem; samples: Sample[] };

const languages = [
  { label: "Python", version: "3.11", enabled: true },
  { label: "C++", enabled: false },
  { label: "Java", enabled: false },
];

function StatementSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading problem" className="animate-pulse">
      <div className="h-4 w-48 rounded bg-ink-2" />
      <div className="mt-4 h-8 w-80 max-w-full rounded-lg bg-ink-2" />
      <div className="mt-8 flex flex-col gap-3">
        <div className="h-4 rounded bg-ink-2" />
        <div className="h-4 rounded bg-ink-2" />
        <div className="h-4 w-2/3 rounded bg-ink-2" />
      </div>
    </div>
  );
}

function ProblemView({ problemId }: { problemId: number }) {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [code, setCode] = useState(() => loadDraft(problemId));
  const [tab, setTab] = useState<"problem" | "code">("problem");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [history, setHistory] = useState<Submission[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([problemsApi.get(problemId), problemsApi.samples(problemId)]).then(
      ([problem, samples]) => {
        if (!cancelled) setState({ kind: "ready", problem, samples });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ kind: "missing" });
        } else {
          setState({
            kind: "error",
            message: error instanceof ApiError ? error.message : "The problem could not be loaded.",
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [problemId, attempt]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    submissionsApi.list().then(
      (submissions) => {
        if (cancelled) return;
        setHistory(
          submissions
            .filter((submission) => submission.problem_id === problemId)
            .sort((a, b) => b.id - a.id),
        );
      },
      () => {},
    );

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, problemId, historyVersion]);

  function handleCodeChange(value: string) {
    setCode(value);
    saveDraft(problemId, value);
  }

  async function submit() {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }
    if (submitting) return;
    if (!code.trim()) {
      setSubmitError("Write some code before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const submission = await submissionsApi.create({
        problem_id: problemId,
        language: "python",
        code,
      });
      setActiveId(submission.id);
      setHistoryVersion((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        setSubmitError("The judge is offline right now. Your code is saved here, try again in a minute.");
        setHistoryVersion((value) => value + 1);
      } else {
        setSubmitError(error instanceof ApiError ? error.message : "Your code could not be sent. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const handleFinished = useCallback(() => setHistoryVersion((value) => value + 1), []);

  function selectSubmission(submission: Submission) {
    setSubmitError(null);
    setActiveId(submission.id);
    handleCodeChange(submission.code);
  }

  if (state.kind === "missing" || state.kind === "error") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
        <h1 className="text-3xl font-semibold text-white">
          {state.kind === "missing" ? "No such problem" : "Problem could not be loaded"}
        </h1>
        <p className="mt-3 text-base text-neutral-400">
          {state.kind === "missing"
            ? "It may have been removed, or the link is wrong."
            : state.message}
        </p>
        <div className="mt-8 flex gap-3">
          {state.kind === "error" && (
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
          )}
          <Link to="/problems" className={buttonPrimary}>
            Back to problems
          </Link>
        </div>
      </div>
    );
  }

  const tabClass = (value: "problem" | "code") =>
    `flex-1 rounded px-3 py-2 text-sm font-medium transition duration-300 ease-soft ${focusRing} ${
      tab === value ? "bg-ink-3 text-white" : "text-neutral-400"
    }`;

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:h-[calc(100svh-4rem)] lg:grid-cols-2 lg:divide-x lg:divide-white/10">
      <div className="sticky top-16 z-10 -mx-4 bg-ink-0 px-4 py-3 lg:hidden">
        <div role="tablist" aria-label="View" className="flex rounded-lg border border-white/10 bg-ink-1 p-1">
          <button type="button" role="tab" aria-selected={tab === "problem"} className={tabClass("problem")} onClick={() => setTab("problem")}>
            Problem
          </button>
          <button type="button" role="tab" aria-selected={tab === "code"} className={tabClass("code")} onClick={() => setTab("code")}>
            Code
          </button>
        </div>
      </div>

      <section
        aria-label="Problem statement"
        className={`${tab === "problem" ? "block" : "hidden"} py-8 lg:block lg:overflow-y-auto lg:pr-8`}
      >
        <Link
          to="/problems"
          className={`inline-flex items-center gap-2 rounded-lg text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Problems
        </Link>

        {state.kind === "loading" ? (
          <div className="mt-8">
            <StatementSkeleton />
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-sm text-neutral-500">
              {state.problem.uva_id && <span>UVa {state.problem.uva_id}</span>}
              <DifficultyLabel difficulty={state.problem.difficulty} />
              <span>{formatTime(state.problem.time_limit_ms)}</span>
              <span>{state.problem.memory_limit_mb} MB</span>
              {state.problem.is_cpe && (
                <span className="rounded border border-white/10 px-1 text-xs text-neutral-400">Past CPE</span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{state.problem.title}</h1>
            <div className="mt-8">
              <Statement markdown={state.problem.description} />
            </div>
            <Samples samples={state.samples} />
          </>
        )}
      </section>

      <section
        aria-label="Code"
        className={`${tab === "code" ? "flex" : "hidden"} flex-col gap-4 py-8 lg:flex lg:overflow-y-auto lg:pl-8`}
      >
        <div className="flex items-center justify-between gap-3">
          <div role="group" aria-label="Language" className="flex rounded-lg border border-white/10 bg-ink-1 p-1">
            {languages.map((language) => (
              <button
                key={language.label}
                type="button"
                disabled={!language.enabled}
                aria-pressed={language.enabled}
                title={language.enabled ? undefined : "Coming soon"}
                className={`whitespace-nowrap rounded px-3 py-1 text-sm font-medium ${
                  language.enabled ? "bg-ink-3 text-white" : "hidden cursor-not-allowed text-neutral-600 sm:block"
                }`}
              >
                {language.label}
                {"version" in language && <span className="hidden sm:inline"> {language.version}</span>}
                {!language.enabled && <span className="ml-1 font-mono text-xs">soon</span>}
              </button>
            ))}
          </div>

          <button type="button" onClick={submit} disabled={submitting} className={buttonPrimary}>
            {user ? (submitting ? "Sending…" : "Submit") : "Sign in to submit"}
            {user && <PaperPlaneRight size={16} weight="bold" aria-hidden="true" />}
          </button>
        </div>

        <div className="h-96 overflow-hidden rounded-lg border border-white/10 lg:h-auto lg:min-h-80 lg:flex-1">
          <CodeEditor value={code} onChange={handleCodeChange} onSubmit={submit} />
        </div>

        <JudgePanel
          key={activeId ?? "idle"}
          submissionId={activeId}
          submitting={submitting}
          submitError={submitError}
          onFinished={handleFinished}
        />

        <SubmissionHistory submissions={history} activeId={activeId} onSelect={selectSubmission} />
      </section>
    </div>
  );
}

export default function ProblemPage() {
  const { id } = useParams();
  const problemId = Number(id);

  return (
    <AppShell>
      {Number.isInteger(problemId) && problemId > 0 ? (
        // A new key resets drafts and judge state when moving between problems.
        <ProblemView key={problemId} problemId={problemId} />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
          <h1 className="text-3xl font-semibold text-white">No such problem</h1>
          <Link to="/problems" className={`${buttonPrimary} mt-8`}>
            Back to problems
          </Link>
        </div>
      )}
    </AppShell>
  );
}
