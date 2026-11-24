import { CircleNotch, Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  runsApi,
  type Run,
  type RunCase,
  type Sample,
} from "../../api/client";
import { useI18n } from "../../i18n";
import { tr } from "../../i18n/translate";
import { formatMemory, formatTime } from "../../lib/format";
import type { Language } from "../../lib/languages";
import { verdictColor, verdictLabel } from "../../lib/verdicts";
import { buttonPrimarySmall, focusRing } from "../ui";

type RunMode = "samples" | "random" | "custom";

interface RunPanelProps {
  problemId: number;
  samples: Sample[];
  language: Language;
  code: string;
  className?: string;
  // Set when the visitor is not signed in: the Run button asks them to sign in.
  onRequireAuth?: () => void;
}

const MAX_CUSTOM_INPUT_BYTES = 16_384;

function OutputBlock({ label, text, bad = false }: { label: string; text: string; bad?: boolean }) {
  return (
    <div className="min-w-0">
      <span className={`font-mono text-xs ${bad ? "text-yzu-red" : "text-neutral-500"}`}>{label}</span>
      <pre
        className={`mt-1 max-h-56 overflow-auto rounded-md border p-3 font-mono text-sm whitespace-pre-wrap break-words ${
          bad
            ? "border-yzu-red/30 bg-yzu-red/5 text-red-200"
            : "border-white/10 bg-ink-0 text-neutral-200"
        }`}
      >
        {text}
      </pre>
    </div>
  );
}

function ResultCard({ result, mode }: { result: RunCase; mode: RunMode }) {
  const { t } = useI18n();
  const accepted = result.verdict === "accepted";
  const custom = mode === "custom";

  return (
    <div
      className={`rounded-md border bg-ink-1 ${
        accepted ? "border-emerald-400/25" : "border-yzu-red/40"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/10 px-3 py-2 font-mono text-xs">
        <span className="text-neutral-300">
          {custom ? t("Output") : t("Sample {n}", { n: result.index })}
        </span>
        <span className="flex flex-wrap items-center gap-3 text-neutral-500">
          <span>{formatTime(result.time_taken_ms)}</span>
          <span>{formatMemory(result.memory_used_mb)}</span>
          <span className={verdictColor[result.verdict]}>
            {custom && accepted ? t("Finished") : t(verdictLabel[result.verdict]).toLowerCase()}
          </span>
        </span>
      </div>
      <div className={`grid gap-3 p-3 ${result.expected_output != null ? "sm:grid-cols-2" : ""}`}>
        <OutputBlock
          label={t("Your output")}
          text={result.stdout || t("(no output)")}
          bad={!accepted}
        />
        {result.expected_output != null && (
          <OutputBlock label={t("Expected")} text={result.expected_output} />
        )}
        {result.stderr && (
          <div className="sm:col-span-2">
            <OutputBlock label="stderr" text={result.stderr} bad />
          </div>
        )}
      </div>
    </div>
  );
}

// The editor's Run button: try the visible samples, or one custom input,
// without creating a submission.
export default function RunPanel({
  problemId,
  samples,
  language,
  code,
  className = "",
  onRequireAuth,
}: RunPanelProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<RunMode>("samples");
  const [selected, setSelected] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [randomCount, setRandomCount] = useState(1);
  const [starting, setStarting] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  // Remember what was run, so a later edit can warn that the result is old.
  const [ranWith, setRanWith] = useState<{ code: string; language: Language } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pending = run?.status === "pending" || run?.status === "running";
  const busy = starting || pending;

  useEffect(() => {
    if (runId == null) return;

    let cancelled = false;
    const startedAt = Date.now();

    async function tick(id: number) {
      try {
        const current = await runsApi.get(id);
        if (cancelled) return;

        setRun(current);
        setError(null);

        if (current.status === "finished" || current.status === "error") return;

        // A run is quick; back off slowly if the queue is busy.
        const elapsed = Date.now() - startedAt;
        setSlow(elapsed > 45_000);
        pollTimer.current = setTimeout(() => tick(id), elapsed > 20_000 ? 2500 : 800);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setError(err.message);
          return;
        }

        setError(err instanceof ApiError ? err.message : tr("Lost connection to the judge."));
        pollTimer.current = setTimeout(() => tick(id), 2500);
      }
    }

    void tick(runId);

    return () => {
      cancelled = true;
      clearTimeout(pollTimer.current);
    };
  }, [runId]);

  function selectMode(next: RunMode) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    // The visible results belong to the other tab, so clear them rather than
    // showing sample output under Custom input.
    setRunId(null);
    setRun(null);
    setSlow(false);

    if (next === "custom" && !customInput && samples[0]) {
      setCustomInput(samples[0].input);
    }
  }

  async function runCode() {
    if (busy) return;

    if (onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (!code.trim()) {
      setError(t("Write some code before running it."));
      return;
    }

    if (mode === "custom" && new TextEncoder().encode(customInput).length > MAX_CUSTOM_INPUT_BYTES) {
      setError(t("Custom input must be at most 16 KiB."));
      return;
    }

    setStarting(true);
    setError(null);
    setRun(null);
    setRunId(null);
    setSlow(false);
    setRanWith({ code, language });

    try {
      const created = await runsApi.create({
        problem_id: problemId,
        language,
        mode,
        code,
        custom_input: mode === "custom" ? customInput : null,
        random_count: mode === "random" ? randomCount : undefined,
      });
      setRun(created);
      setRunId(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Your code could not be sent. Try again."));
    } finally {
      setStarting(false);
    }
  }

  const sample = samples[selected] ?? samples[0];
  const results = run?.results ?? null;
  const passed = results?.filter((result) => result.verdict === "accepted").length ?? 0;
  const codeChanged = run != null && ranWith != null && (ranWith.code !== code || ranWith.language !== language);

  const tabClass = (value: RunMode) =>
    `shrink-0 whitespace-nowrap rounded px-2 py-1 font-mono text-xs transition duration-300 ease-soft disabled:pointer-events-none disabled:opacity-50 ${focusRing} ${
      mode === value ? "bg-ink-3 text-white" : "text-neutral-500 hover:text-white"
    }`;

  return (
    <section
      id="run-panel"
      aria-label={t("Test your code")}
      aria-live="polite"
      className={`${className} flex flex-col rounded-lg border border-white/10 bg-ink-0`}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
        <div
          role="tablist"
          aria-label={t("Test your code")}
          className="flex min-w-0 flex-1 overflow-x-auto rounded-md border border-white/10 bg-ink-1 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "samples"}
            className={tabClass("samples")}
            onClick={() => selectMode("samples")}
            disabled={busy}
          >
            {t("Samples")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "random"}
            className={tabClass("random")}
            onClick={() => selectMode("random")}
            disabled={busy}
          >
            {t("Random")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "custom"}
            className={tabClass("custom")}
            onClick={() => selectMode("custom")}
            disabled={busy}
          >
            {t("Custom")}
          </button>
        </div>
      </div>

      <div className="p-3">
        {mode === "samples" ? (
          samples.length === 0 ? (
            <p className="font-mono text-sm text-neutral-500">{t("This problem has no sample tests yet.")}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {samples.map((item, index) => (
                  <button
                    key={item.order}
                    type="button"
                    aria-pressed={selected === index}
                    onClick={() => setSelected(index)}
                    className={`rounded border px-2 py-1 font-mono text-xs transition duration-300 ease-soft ${focusRing} ${
                      selected === index
                        ? "border-white/30 bg-ink-3 text-white"
                        : "border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {t("Sample {n}", { n: item.order })}
                  </button>
                ))}
              </div>
              {sample && (
                <div className="mt-3">
                  <span className="font-mono text-xs text-neutral-500">{t("Input")}</span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-white/10 bg-ink-1 p-3 font-mono text-sm whitespace-pre-wrap break-words text-neutral-200">
                    {sample.input}
                  </pre>
                </div>
              )}
            </>
          )
        ) : mode === "random" ? (
          <div>
            <p className="font-mono text-sm text-neutral-400">
              {t("Runs hidden tests at random. Inputs and expected outputs are not shown.")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-neutral-500">{t("Tests")}</span>
              {[1, 10].map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={randomCount === count}
                  onClick={() => setRandomCount(count)}
                  className={`rounded border px-2 py-1 font-mono text-xs transition duration-300 ease-soft ${focusRing} ${
                    randomCount === count
                      ? "border-white/30 bg-ink-3 text-white"
                      : "border-white/10 text-neutral-400 hover:text-white"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="run-custom-input" className="font-mono text-xs text-neutral-500">
              {t("Input")}
            </label>
            <textarea
              id="run-custom-input"
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              rows={5}
              maxLength={MAX_CUSTOM_INPUT_BYTES}
              placeholder={t("Type or paste the input your program should read.")}
              spellCheck={false}
              className={`mt-1 w-full resize-y rounded-md border border-white/10 bg-ink-1 p-3 font-mono text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-white/30 focus:outline-none ${focusRing}`}
            />
          </div>
        )}

        {error && <p className="mt-3 font-mono text-sm text-yzu-red">{error}</p>}

        {slow && pending && (
          <p className="mt-3 font-mono text-xs text-amber-400">
            {t("The judge is taking longer than usual. Your run is still queued.")}
          </p>
        )}

        {codeChanged && !busy && (
          <p className="mt-3 font-mono text-xs text-amber-400">
            {t("The code changed. Run it again to test the new code.")}
          </p>
        )}

        {run?.status === "error" && (
          <p className="mt-3 font-mono text-sm text-yzu-red">
            {t("The judge could not run your code. Try again.")}
          </p>
        )}

        {run?.verdict === "compilation_error" && run.compile_output && (
          <div className="mt-3">
            <p className="font-mono text-xs text-orange-400">{t(verdictLabel.compilation_error)}</p>
            <pre className="mt-1 max-h-56 overflow-auto rounded-md border border-orange-400/30 bg-ink-1 p-3 font-mono text-xs whitespace-pre text-orange-200">
              {run.compile_output}
            </pre>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            <p
              className={`font-mono text-xs ${
                run?.verdict === "accepted" ? "text-emerald-400" : "text-yzu-red"
              }`}
            >
              {run?.mode === "random"
                ? t("{passed} of {total} hidden tests passed", { passed, total: results.length })
                : run?.mode === "samples"
                  ? t("{passed} of {total} samples passed", { passed, total: results.length })
                  : run?.verdict === "accepted"
                    ? t("Finished")
                    : t(verdictLabel[run?.verdict ?? "wrong_answer"]).toLowerCase()}
            </p>
            {run?.mode === "random" ? (
              <div className="rounded-md border border-white/10 bg-ink-1">
                <p className="border-b border-white/10 px-3 py-2 font-mono text-xs text-neutral-500">
                  {t("Hidden test data is not shown.")}
                </p>
                <ul className="divide-y divide-white/10">
                  {results.map((result) => (
                    <li
                      key={result.index}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 font-mono text-xs"
                    >
                      <span className="text-neutral-300">{t("test {n}", { n: result.index })}</span>
                      <span className="flex items-center gap-3 text-neutral-500">
                        <span>{formatTime(result.time_taken_ms)}</span>
                        <span>{formatMemory(result.memory_used_mb)}</span>
                        <span className={verdictColor[result.verdict]}>
                          {t(verdictLabel[result.verdict]).toLowerCase()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              results.map((result) => <ResultCard key={result.index} result={result} mode={mode} />)
            )}
          </div>
        )}

        {!busy && !error && run == null && (
          <p className="mt-3 font-mono text-sm text-neutral-500">
            {t("Run your code to see the result here.")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={runCode}
          disabled={busy || (mode === "samples" && samples.length === 0)}
          className={buttonPrimarySmall}
        >
          {busy ? (
            <CircleNotch size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Play size={16} weight="fill" aria-hidden="true" />
          )}
          {busy ? t("Running…") : onRequireAuth ? t("Sign in to run") : t("Run code")}
        </button>
      </div>
    </section>
  );
}
