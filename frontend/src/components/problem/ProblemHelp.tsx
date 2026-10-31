import { CheckCircle, Circle, Lightbulb, Lock, LockOpen } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, problemsApi, type ProblemHelp as Help } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { LANGUAGES, loadPreferredLanguage, type Language } from "../../lib/languages";
import { buttonSecondary, focusRing } from "../ui";
import CodeEditor from "./CodeEditor";
import Statement from "./Statement";

// Visitors have no account to remember opened hints, so the browser does.
const openedKey = (problemId: number) => `yzu-judge:hints:${problemId}`;

function loadOpened(problemId: number) {
  try {
    return Number(localStorage.getItem(openedKey(problemId))) || 0;
  } catch {
    return 0;
  }
}

function saveOpened(problemId: number, count: number) {
  try {
    localStorage.setItem(openedKey(problemId), String(count));
  } catch {
    // Private windows can block storage; hints just close again on reload.
  }
}

function Requirement({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2 ${done ? "text-neutral-300" : "text-neutral-500"}`}>
      {done ? (
        <CheckCircle size={16} weight="fill" className="text-green-400" aria-label="Done" />
      ) : (
        <Circle size={16} aria-label="Not yet" />
      )}
      {children}
    </li>
  );
}

interface ProblemHelpProps {
  problemId: number;
  // Opened from the "Stuck?" link under the title; closed it renders nothing.
  open: boolean;
  // Changes after each submission, so the solution can unlock without a reload.
  refreshKey: number;
  // Tells the workspace whether to show the "Stuck?" link next to the title.
  onAvailableChange?: (available: boolean) => void;
}

// Hints and the reference solution for easy problems. Never rendered in a mock exam,
// and the server refuses them there too.
export default function ProblemHelp({ problemId, open, refreshKey, onAvailableChange }: ProblemHelpProps) {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();

  const [help, setHelp] = useState<Help | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [visitorHints, setVisitorHints] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solutionShown, setSolutionShown] = useState(false);
  const [solutionLanguage, setSolutionLanguage] = useState<Language>(() => loadPreferredLanguage());

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await problemsApi.help(problemId);
        if (cancelled) return;
        setHelp(data);
        onAvailableChange?.(Boolean(data.available));

        if (!user && data.available) {
          const opened = Math.min(loadOpened(problemId), data.hint_count);
          const texts: string[] = [];
          for (let number = 1; number <= opened; number++) {
            texts.push((await problemsApi.revealHint(problemId, number)).text);
          }
          if (!cancelled) setVisitorHints(texts);
        }
      } catch (loadError) {
        if (!cancelled && loadError instanceof ApiError && loadError.status === 403) {
          setBlocked(true);
          onAvailableChange?.(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [problemId, user, authLoading, refreshKey, version, onAvailableChange]);

  // Blocked means the problem is in the user's running mock exam: show nothing, like topics.
  if (!open || blocked || !help || !help.available) return null;

  const hints = user ? help.hints ?? [] : visitorHints;
  const hintCount = help.hint_count ?? 0;
  const allHintsOpen = hints.length >= hintCount;

  async function openNextHint() {
    if (opening) return;
    setOpening(true);
    setError(null);

    try {
      const hint = await problemsApi.revealHint(problemId, hints.length + 1);
      if (user) {
        setHelp((current) => current && { ...current, hints: [...(current.hints ?? []), hint.text] });
        // Opening the last hint may unlock the solution.
        setVersion((value) => value + 1);
      } else {
        setVisitorHints((current) => [...current, hint.text]);
        saveOpened(problemId, hint.number);
      }
    } catch (openError) {
      setError(openError instanceof ApiError ? openError.message : "The hint could not be loaded. Try again.");
    } finally {
      setOpening(false);
    }
  }

  const solution = help.solution_unlocked ? help.solution : null;

  return (
    <section id="problem-help" aria-label="Hints and solution" className="mt-4 rounded-lg border border-white/10 p-4">
      <p className="text-sm text-neutral-400">
        {hintCount > 0
          ? "Give it a real try first. Hints open one at a time, and each one gives away a bit more."
          : "Give it a real try first. This one is simple enough that it has no hints, just a reference solution."}
      </p>

      {hints.length > 0 && (
        <ol className="mt-4 flex flex-col gap-3">
          {hints.map((hint, index) => (
            <li key={index} className="rounded-lg border border-white/10 bg-ink-1 p-4">
              <span className="font-mono text-xs text-neutral-500">Hint {index + 1}</span>
              <p className="mt-1 text-base text-neutral-200">{hint}</p>
            </li>
          ))}
        </ol>
      )}

      {!allHintsOpen && (
        <button type="button" onClick={openNextHint} disabled={opening} className={`${buttonSecondary} mt-4`}>
          <Lightbulb size={18} aria-hidden="true" />
          {opening ? "Opening…" : `Show hint ${hints.length + 1} of ${hintCount}`}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-6 rounded-lg border border-white/10 bg-ink-1 p-4">
        <div className="flex items-center gap-2 text-base font-semibold text-white">
          {solution ? <LockOpen size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
          Reference solution
        </div>

        {!solution && (
          <>
            <p className="mt-1 text-sm text-neutral-400">Unlocks when you have:</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {hintCount > 0 && (
                <Requirement done={allHintsOpen}>
                  Opened every hint ({Math.min(hints.length, hintCount)} of {hintCount})
                </Requirement>
              )}
              {user ? (
                <Requirement done={Boolean(help.has_submitted)}>Submitted at least one attempt</Requirement>
              ) : (
                <Requirement done={false}>
                  <span>
                    <Link
                      to="/login"
                      state={{ from: location }}
                      className={`rounded text-white underline underline-offset-2 ${focusRing}`}
                    >
                      Signed in
                    </Link>{" "}
                    and submitted at least one attempt
                  </span>
                </Requirement>
              )}
            </ul>
          </>
        )}

        {solution && !solutionShown && (
          <button type="button" onClick={() => setSolutionShown(true)} className={`${buttonSecondary} mt-4`}>
            Show solution
          </button>
        )}

        {solution && solutionShown && (
          <div className="mt-4">
            <Statement markdown={solution.explanation} />
            <div role="group" aria-label="Solution language" className="mt-4 inline-flex rounded-lg border border-white/10 bg-ink-2 p-1">
              {LANGUAGES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={solutionLanguage === option.id}
                  onClick={() => setSolutionLanguage(option.id)}
                  className={`whitespace-nowrap rounded px-3 py-1 text-sm font-medium transition duration-300 ease-soft ${focusRing} ${
                    solutionLanguage === option.id ? "bg-ink-3 text-white" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
              <CodeEditor
                key={solutionLanguage}
                value={solutionLanguage === "cpp" ? solution.cpp : solution.python}
                language={solutionLanguage}
                readOnly
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
