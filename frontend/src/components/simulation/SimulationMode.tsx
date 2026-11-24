import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  ApiError,
  mockExamsApi,
  problemsApi,
  runsApi,
  submissionsApi,
  type Problem,
  type Run,
  type RunCase,
  type Sample,
  type SubmissionResult,
} from "../../api/client";
import { useI18n, type Key } from "../../i18n";
import { tr } from "../../i18n/translate";
import { useDocumentTitle } from "../../lib/documentTitle";
import { loadDraft, saveDraft } from "../../lib/drafts";
import { formatTime } from "../../lib/format";
import { LANGUAGES, STARTER_CODE, loadPreferredLanguage, savePreferredLanguage, type Language } from "../../lib/languages";
import { letter, useCountdown } from "../../lib/mock";
import { serverDate } from "../../lib/progress";
import useJudge from "../../lib/useJudge";
import { isFinished, verdictLabel, type SubmissionStatus } from "../../lib/verdicts";
import SimulationCodeEditor from "./SimulationCodeEditor";
import SimulationStatement from "./SimulationStatement";
import "./simulation.css";

interface SimulationProblemInfo {
  position: number;
  problem_id: number;
  title: string;
  status?: "solved" | "attempted" | null;
  uva_id?: number | null;
}

interface SimulationExamInfo {
  id: number;
  paperTitle: string;
  startedAt: string;
  endsAt: string;
  serverTime: string;
  problemCount: number;
  username: string;
}

interface SimulationModeProps {
  problems: SimulationProblemInfo[];
  initialPosition: number;
  exam?: SimulationExamInfo;
  // Keeps mock exam drafts apart from practice drafts.
  scope?: string;
  onExit: () => void;
  onSelectProblem?: (position: number) => void;
  onSubmissionFinished?: () => void;
  onExamFinished?: () => void;
}

type Menu = "grade" | "file" | "edit" | "compiler" | "windows" | "test" | null;
type RunMode = "samples" | "custom";
type OutputTab = "actual" | "expected";
type Action = "run" | "submission" | null;

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; problem: Problem; samples: Sample[] };

const MAX_CUSTOM_INPUT_BYTES = 16_384;
const MAX_CODE_BYTES = 65_536;
const FAR_FUTURE = "9999-12-31T23:59:59Z";

const LANGUAGE_EXTENSION: Record<Language, string> = {
  python: "py",
  c_gcc: "cpp",
  c_msvc: "cpp",
  java8: "java",
  java11: "java",
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const CASE_LABEL: Record<string, string> = {
  accepted: "SAME",
  wrong_answer: "DIFF",
  presentation_error: "PRESENTATION",
  time_limit_exceeded: "TIME LIMIT",
  memory_limit_exceeded: "MEMORY LIMIT",
  output_limit_exceeded: "OUTPUT LIMIT",
  runtime_error: "RUNTIME",
  compilation_error: "COMPILE ERROR",
  internal_error: "JUDGE ERROR",
};

const COMPILER_SHORT: Record<Language, string> = {
  python: "PYTH-Python39",
  c_gcc: "MinGW-GCC63",
  c_msvc: "MSVC-v140",
  java8: "JDK8",
  java11: "JDK11",
};

function caseLabel(verdict: string, options: { custom: boolean; stdout?: string }) {
  if (options.custom && verdict === "accepted") {
    return options.stdout ? "FINISHED" : "NO-OUTPUT";
  }

  return CASE_LABEL[verdict] ?? verdict.toUpperCase();
}

function formatChineseClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return `${hours}小時${minutes}分${seconds}秒`;
}

function formatSeconds(ms: number) {
  return (ms / 1000).toFixed(6);
}

function verdictTone(verdict: string | null) {
  if (verdict == null || verdict === "pending" || verdict === "running") return "idle";
  if (verdict === "accepted") return "good";
  if (verdict === "time_limit_exceeded" || verdict === "memory_limit_exceeded" || verdict === "output_limit_exceeded") {
    return "warn";
  }
  return "bad";
}

function localizedVerdict(t: (key: Key) => string, verdict: string | null) {
  if (verdict == null) return undefined;
  const key = verdictLabel[verdict as SubmissionStatus];
  return key ? t(key) : undefined;
}

function OutputLines({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (lines.length === 0) return <div className="sim-out-empty">(沒有輸出)</div>;

  return (
    <>
      {lines.map((line, index) => (
        <div className="sim-out-line" key={index}>
          <span className="sim-out-num">{index + 1}</span>
          <span className="sim-out-text">{line || " "}</span>
        </div>
      ))}
    </>
  );
}

function IdentityPanel({ exam, solved }: { exam: SimulationExamInfo; solved: number }) {
  return (
    <div className="sim-identity">
      <div className="sim-identity-grid">
        <div className="sim-id-cell" title={exam.username}>
          (A) {exam.username || "SKIP"}
        </div>
        <div className="sim-id-cell">(B) 考生</div>
        <div className="sim-id-cell">(C) MOCK-{exam.id}</div>
        <div className="sim-id-cell">
          (D) {solved}/{exam.problemCount}
        </div>
      </div>
      <div className="sim-id-note">(A:帳號,B:模式,C:測驗編號,D:通過題數)</div>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  text,
  confirmLabel,
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="sim-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="sim-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sim-modal-title" id={titleId}>
          {title}
        </div>
        <div className="sim-modal-body">
          <p>{text}</p>
          {error && <p className="sim-modal-error">{error}</p>}
        </div>
        <div className="sim-modal-actions">
          <button type="button" className="sim-win-btn" onClick={onCancel} disabled={busy} ref={cancelRef}>
            {t("Cancel")}
          </button>
          <button type="button" className="sim-win-btn sim-win-default" onClick={onConfirm} disabled={busy}>
            {busy ? t("One moment…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimulationMode({
  problems,
  initialPosition,
  exam,
  scope,
  onExit,
  onSelectProblem,
  onSubmissionFinished,
  onExamFinished,
}: SimulationModeProps) {
  const { t, locale } = useI18n();
  const initialProblem = problems.find((problem) => problem.position === initialPosition) ?? problems[0];

  const [position, setPosition] = useState(initialProblem?.position ?? initialPosition);
  const current = problems.find((problem) => problem.position === position) ?? initialProblem;
  const problemId = current?.problem_id ?? 0;

  const [language, setLanguage] = useState<Language>(() => loadPreferredLanguage());
  const [code, setCode] = useState(() => loadDraft(initialProblem?.problem_id ?? 0, scope, loadPreferredLanguage()));
  const [load, setLoad] = useState<LoadState>(() =>
    initialProblem?.problem_id
      ? { kind: "loading" }
      : { kind: "error", message: tr("The problem could not be loaded.") },
  );
  const [attempt, setAttempt] = useState(0);

  const [menu, setMenu] = useState<Menu>(null);
  const [runMode, setRunMode] = useState<RunMode>("samples");
  const [customInput, setCustomInput] = useState("");
  const [startingRun, setStartingRun] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [selectedCase, setSelectedCase] = useState(0);
  const [outputTab, setOutputTab] = useState<OutputTab>("actual");

  const [action, setAction] = useState<Action>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [attemptedWith, setAttemptedWith] = useState<{ code: string; language: Language } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [finishOpen, setFinishOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);

  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [inputFontSize, setInputFontSize] = useState(11);
  const [codeFontSize, setCodeFontSize] = useState(16.2);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<() => void>(() => {});
  const rootRef = useRef<HTMLDivElement>(null);
  const lastFullscreenExit = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const problemRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<{
    pasteOriginal: () => void;
    pasteExample: () => void;
    saveFile: () => void;
    printCode: () => void;
    resetCodeFont: () => void;
    changeCodeFont: (delta: number) => void;
    focusPane: (pane: "problem" | "results" | "output", tab?: OutputTab) => void;
  }>({
    pasteOriginal: () => {},
    pasteExample: () => {},
    saveFile: () => {},
    printCode: () => {},
    resetCodeFont: () => {},
    changeCodeFont: () => {},
    focusPane: () => {},
  });

  useDocumentTitle(load.kind === "ready" ? `${load.problem.title} · YZU Judge` : null);

  const left = useCountdown(exam?.endsAt ?? FAR_FUTURE, exam?.serverTime ?? FAR_FUTURE);
  const timeUp = exam != null && left === 0;
  const totalMs = exam ? Math.max(1, serverDate(exam.endsAt).getTime() - serverDate(exam.startedAt).getTime()) : 1;
  const timerPercent = exam ? Math.min(100, Math.max(0, (left / totalMs) * 100)) : 0;

  const judge = useJudge(activeId, () => {
    onSubmissionFinished?.();
  });

  const submission = activeId != null && judge.submission?.id === activeId ? judge.submission : null;
  const submissionResults = activeId != null && judge.results
    ? judge.results.filter((result) => result.submission_id === activeId)
    : [];
  const submissionFinished = submission != null && isFinished(submission.status);

  const showRun = action === "run";
  const showSubmission = action === "submission";
  const runResults = showRun ? run?.results ?? [] : [];
  const visibleSubmissionResults = showSubmission ? submissionResults : [];
  const results: (RunCase | SubmissionResult)[] = showRun ? runResults : visibleSubmissionResults;

  const activeIndex = results.length > 0 ? Math.min(selectedCase, results.length - 1) : 0;
  const activeCase = results[activeIndex] ?? null;
  const runCase = showRun ? (activeCase as RunCase | null) : null;

  const runPending = showRun && (startingRun || run?.status === "pending" || run?.status === "running");
  const submissionPending = showSubmission && (submitting || (activeId != null && !submissionFinished));
  const pendingNow = runPending || submissionPending;

  const runVerdict = showRun
    ? run?.status === "error"
      ? "internal_error"
      : run?.verdict ?? null
    : null;
  const submissionVerdict = showSubmission ? submission?.status ?? null : null;
  const verdictRaw = showRun ? runVerdict : submissionVerdict;

  const tone = pendingNow ? "pending" : verdictTone(verdictRaw);

  let verdictText = "未評判";
  if (pendingNow) verdictText = "評判中…";
  else if (verdictRaw === "accepted") verdictText = "通過";
  else if (verdictRaw) verdictText = "不通過";

  const passed = results.filter((result) => result.verdict === "accepted").length;
  const words = code.trim() ? code.trim().split(/\s+/).length : 0;
  const codeStats = `${words}詞，${code.length}字元。`;

  let metaLine = codeStats;
  if (pendingNow) metaLine = `評判中… · ${codeStats}`;
  else if (results.length > 0) metaLine = `${passed}/${results.length} 正確 · ${codeStats}`;

  const compileOutput = showRun
    ? run?.compile_output ?? null
    : showSubmission
      ? submission?.compile_output ?? null
      : null;

  const actualOutput = runCase?.stdout ?? "";
  const expectedText = runCase?.expected_output ?? null;
  const stderrText = runCase?.stderr ?? "";
  const shownTab = outputTab === "expected" && expectedText != null ? "expected" : "actual";
  const outputText = shownTab === "expected" ? expectedText ?? "" : actualOutput;
  const timeMs = activeCase?.time_taken_ms ?? null;

  const resultChanged =
    attemptedWith != null &&
    (attemptedWith.code !== code || attemptedWith.language !== language) &&
    (showRun || showSubmission);

  const samples = load.kind === "ready" ? load.samples : [];
  const firstSampleInput = samples[0]?.input ?? "";
  const inputValue = runMode === "samples" ? runCase?.input ?? firstSampleInput : customInput;
  const inputReadOnly = runMode !== "custom" || timeUp;

  const title =
    exam != null
      ? `${exam.paperTitle} · ${letter(current?.position ?? 1)}. ${
          load.kind === "ready" ? load.problem.title : current?.title ?? ""
        }`
      : load.kind === "ready"
        ? `${load.problem.uva_id ? `UVA${load.problem.uva_id} ` : ""}練習:${load.problem.title}`
        : "練習";

  const startLabel = exam ? serverDate(exam.startedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";
  const endLabel = exam ? serverDate(exam.endsAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";
  const solved = problems.filter((problem) => problem.status === "solved").length;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function fit() {
      const sx = (window.innerWidth - 24) / 1280;
      const sy = (window.innerHeight - 24) / 800;
      setScale(Math.max(0.2, Math.min(sx, sy, 1.5)));
    }

    fit();
    window.addEventListener("resize", fit);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      const active = document.fullscreenElement != null;
      setFullscreen(active);
      if (!active) lastFullscreenExit.current = Date.now();
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!problemId) return;

    let cancelled = false;

    Promise.all([problemsApi.get(problemId), problemsApi.samples(problemId)]).then(
      ([problem, loadedSamples]) => {
        if (cancelled) return;
        setLoad({ kind: "ready", problem, samples: loadedSamples });
        setCustomInput(loadedSamples[0]?.input ?? "");
      },
      (error: unknown) => {
        if (cancelled) return;
        setLoad({
          kind: "error",
          message: error instanceof ApiError ? error.message : tr("The problem could not be loaded."),
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [problemId, attempt]);

  useEffect(() => {
    if (runId == null) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function tick(id: number) {
      try {
        const currentRun = await runsApi.get(id);
        if (cancelled) return;

        setRun(currentRun);
        setNotice(null);

        if (currentRun.status === "finished" || currentRun.status === "error") {
          if (currentRun.status === "finished" && currentRun.results && currentRun.results.length > 0) {
            const firstBad = currentRun.results.findIndex((result) => result.verdict !== "accepted");
            setSelectedCase(firstBad >= 0 ? firstBad : 0);
          }
          return;
        }

        const elapsed = Date.now() - startedAt;
        timer = setTimeout(() => tick(id), elapsed > 20_000 ? 2500 : 800);
      } catch (error) {
        if (cancelled) return;

        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          setNotice(error.message);
          return;
        }

        setNotice(error instanceof ApiError ? error.message : tr("Lost connection to the judge."));
        timer = setTimeout(() => tick(id), 2500);
      }
    }

    void tick(runId);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId]);

  useEffect(() => {
    if (menu == null) return;

    function closeMenu(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest(".sim-menubar")) return;
      setMenu(null);
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [menu]);

  function chooseProblem(nextPosition: number) {
    if (nextPosition === position) {
      setMenu(null);
      return;
    }

    const next = problems.find((problem) => problem.position === nextPosition);
    if (!next) return;

    setMenu(null);
    setPosition(nextPosition);
    setCode(loadDraft(next.problem_id, scope, language));
    setLoad({ kind: "loading" });
    setCustomInput("");
    setRunId(null);
    setRun(null);
    setStartingRun(false);
    setSelectedCase(0);
    setOutputTab("actual");
    setAction(null);
    setActiveId(null);
    setSubmitting(false);
    setAttemptedWith(null);
    setNotice(null);
    onSelectProblem?.(nextPosition);
  }

  function chooseLanguage(next: Language) {
    setMenu(null);
    if (next === language) return;

    savePreferredLanguage(next);
    setLanguage(next);
    setCode(loadDraft(problemId, scope, next));
    setOutputTab("actual");
  }

  function handleCodeChange(value: string) {
    setCode(value);
    saveDraft(problemId, value, scope, language);
  }

  async function startRun(mode: RunMode | "random", randomCount = 1) {
    if (startingRun || run?.status === "pending" || run?.status === "running" || timeUp) return;

    setMenu(null);

    if (!code.trim()) {
      setNotice(t("Write some code before running it."));
      return;
    }

    if (mode === "samples" && samples.length === 0) {
      setNotice(t("This problem has no sample tests yet."));
      return;
    }

    if (mode === "custom" && new TextEncoder().encode(customInput).length > MAX_CUSTOM_INPUT_BYTES) {
      setNotice(t("Custom input must be at most 16 KiB."));
      return;
    }

    setNotice(null);
    setAction("run");
    if (mode !== "random") setRunMode(mode);
    setSelectedCase(0);
    setOutputTab("actual");
    setAttemptedWith({ code, language });
    setStartingRun(true);
    setRun(null);
    setRunId(null);

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
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : t("Your code could not be sent. Try again."));
    } finally {
      setStartingRun(false);
    }
  }

  async function submit() {
    if (submitting || (activeId != null && !submissionFinished) || timeUp || load.kind !== "ready") return;

    setMenu(null);

    if (!code.trim()) {
      setNotice(t("Write some code before submitting."));
      return;
    }

    setNotice(null);
    setAction("submission");
    setSelectedCase(0);
    setOutputTab("actual");
    setAttemptedWith({ code, language });
    setSubmitting(true);
    setActiveId(null);
    setRun(null);
    setRunId(null);
    setStartingRun(false);

    try {
      const created = await submissionsApi.create({
        problem_id: problemId,
        language,
        code,
        mock_exam_id: exam?.id ?? null,
      });
      setActiveId(created.id);
      // Refresh the exam now so an attempt shows up while the judge runs.
      onSubmissionFinished?.();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && exam != null) {
        setNotice(t("Time is up. This submission was not sent."));
        onSubmissionFinished?.();
      } else if (error instanceof ApiError && error.status === 503) {
        setNotice(t("The judge is offline right now. Your code is saved here, try again in a minute."));
      } else {
        setNotice(error instanceof ApiError ? error.message : t("Your code could not be sent. Try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function chooseCustomInput() {
    setMenu(null);
    setRunMode("custom");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function finishExam() {
    if (!exam) return;

    setFinishing(true);
    setFinishError(null);

    try {
      await mockExamsApi.finish(exam.id);
      setFinishing(false);
      setFinishOpen(false);
      onExamFinished?.();
    } catch (error) {
      setFinishError(error instanceof ApiError ? error.message : t("The exam could not be finished. Try again."));
      setFinishing(false);
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement != null) {
        await document.exitFullscreen();
      } else {
        await (rootRef.current ?? document.documentElement).requestFullscreen();
      }
    } catch {
      // A browser can refuse fullscreen; the simulation still works.
    }
  }

  function changeCodeFont(delta: number) {
    setCodeFontSize((size) => Math.max(11, Math.min(28, Math.round((size + delta) * 10) / 10)));
  }

  function resetCodeFont() {
    setCodeFontSize(16.2);
  }

  function replaceWithStarter() {
    setReplaceOpen(false);
    handleCodeChange(STARTER_CODE[language]);
  }

  // Ctrl+O is easy to hit by accident, so the student's own code is never replaced unasked.
  function pasteOriginal() {
    setMenu(null);
    if (!code.trim() || code === STARTER_CODE[language]) replaceWithStarter();
    else setReplaceOpen(true);
  }

  function pasteExample() {
    setMenu(null);
    setNotice("模擬模式不提供範例程式碼。");
  }

  function defaultFileName() {
    const base =
      (load.kind === "ready" ? load.problem.title : "solution")
        .replace(/[\\/:*?"<>|]+/g, "_")
        .replace(/\s+/g, "_")
        .slice(0, 60) || "solution";

    return `${base}.${LANGUAGE_EXTENSION[language]}`;
  }

  function downloadCode(name: string) {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function saveFile() {
    setMenu(null);
    downloadCode(defaultFileName());
  }

  function saveFileAs() {
    setMenu(null);
    const name = window.prompt("另存新檔", defaultFileName());
    if (name) downloadCode(name);
  }

  async function handleFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_CODE_BYTES) {
      setNotice("檔案太大，程式碼上限為 64 KiB。");
      return;
    }

    try {
      const text = await file.text();
      setCode(text);
      saveDraft(problemId, text, scope, language);
      setMenu(null);
      setNotice(null);
    } catch {
      setNotice("無法讀取檔案。");
    }
  }

  function printCode() {
    setMenu(null);
    const title = load.kind === "ready" ? load.problem.title : "code";
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setNotice("瀏覽器阻擋了列印視窗。");
      return;
    }

    printWindow.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
        `<style>body{font:12px "Courier New",monospace;white-space:pre;}h1{font:700 16px sans-serif;}</style>` +
        `</head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(code)}</pre></body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function loadServerFile() {
    setMenu(null);
    setNotice("模擬模式不提供網路存檔。");
  }

  function focusPane(pane: "problem" | "results" | "output", tab?: OutputTab) {
    setMenu(null);
    if (tab) setOutputTab(tab);

    const target =
      pane === "problem" ? problemRef.current : pane === "results" ? resultsRef.current : outputRef.current;

    target?.scrollIntoView({ block: "nearest" });
    target?.focus({ preventScroll: true });
  }

  function showAllWindows() {
    setMenu(null);
    setOutputTab("actual");
    problemRef.current?.scrollTo({ top: 0 });
    problemRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    shortcutsRef.current = {
      pasteOriginal,
      pasteExample,
      saveFile,
      printCode,
      resetCodeFont,
      changeCodeFont,
      focusPane,
    };
  });

  // In the real exam Ctrl+W loads a file; here it closes the tab, and a page cannot take that
  // key over. Ask first while the clock runs.
  const guardTab = exam != null && !timeUp;

  useEffect(() => {
    if (!guardTab) return;

    function askBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", askBeforeLeaving);
    return () => window.removeEventListener("beforeunload", askBeforeLeaving);
  }, [guardTab]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // The editor already used this Escape (to close its autocomplete or search),
        // or it cancels Chinese input; neither should close the exam window.
        if (event.defaultPrevented || event.isComposing) return;
        if (replaceOpen) {
          setReplaceOpen(false);
          return;
        }
        if (finishOpen) {
          if (!finishing) setFinishOpen(false);
          return;
        }
        if (menu != null) {
          setMenu(null);
          return;
        }
        if (document.fullscreenElement != null) {
          void document.exitFullscreen();
          return;
        }
        // Escape is also the browser's own way out of fullscreen. If it just
        // left fullscreen, do not close the simulation as well.
        if (Date.now() - lastFullscreenExit.current < 500) return;
        onExit();
        return;
      }

      // Nothing behind an open dialog may react, least of all Submit.
      if (replaceOpen || finishOpen) return;

      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        submitRef.current();
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        const shortcuts = shortcutsRef.current;
        const key = event.key.toLowerCase();

        if (key === "o") {
          event.preventDefault();
          shortcuts.pasteOriginal();
        } else if (key === "h") {
          event.preventDefault();
          shortcuts.pasteExample();
        } else if (key === "s") {
          event.preventDefault();
          shortcuts.saveFile();
        } else if (key === "p") {
          event.preventDefault();
          shortcuts.printCode();
        } else if (key === "b" || key === "j") {
          event.preventDefault();
          shortcuts.focusPane("output", "actual");
        } else if (key === "k") {
          event.preventDefault();
          shortcuts.focusPane("output", "expected");
        } else if (key === "g") {
          event.preventDefault();
          shortcuts.focusPane("results");
        } else if (key === "0") {
          event.preventDefault();
          shortcuts.resetCodeFont();
        } else if (key === "=" || key === "+") {
          event.preventDefault();
          shortcuts.changeCodeFont(1);
        } else if (key === "-" || key === "_") {
          event.preventDefault();
          shortcuts.changeCodeFont(-1);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finishOpen, finishing, replaceOpen, menu, onExit]);

  const buttonClass = (name: Menu) => `sim-menu ${name === "grade" ? "sim-menu-hot" : ""} ${menu === name ? "is-open" : ""}`;

  const overviewText = exam
    ? t("Started at {start} · {n} problems · ends at {end}", {
        start: startLabel,
        n: exam.problemCount,
        end: endLabel,
      })
    : null;

  return createPortal(
    <div className="sim-root" ref={rootRef} role="dialog" aria-modal="true" aria-label={t("Simulation mode")}>
      <div className="sim-stage" style={{ transform: `scale(${scale})` }}>
        <div className="sim-app">
          <header className="sim-titlebar">
            <svg className="sim-title-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3.2 1.6L9.4 1l2.8 4.2-2 6.4-6.4 1L1 7.2z" fill="#e6b32a" stroke="#5c4a1e" />
              <path d="M1 7.2l3.2-1.6 2.8 2.4-1.4 4.6L2 11z" fill="#7f97c9" stroke="#3a4a70" />
            </svg>
            <span className="sim-title-text">{title}</span>

            <div className="sim-timer" title={exam ? t("{clock} left", { clock: formatChineseClock(left) }) : t("Practice")}>
              {exam ? (
                <>
                  <span className={`sim-timer-text ${timeUp ? "is-up" : ""}`}>{formatChineseClock(left)}</span>
                  <span className="sim-timer-dot" aria-hidden="true" />
                  <span className="sim-timer-track" aria-hidden="true">
                    <span
                      className={`sim-timer-fill ${left <= 5 * 60_000 ? "is-low" : ""}`}
                      style={{ width: `${timerPercent}%` }}
                    />
                  </span>
                  <span className="sim-timer-pause" aria-hidden="true" />
                </>
              ) : (
                <>
                  <span className="sim-timer-text sim-timer-practice">{t("Practice")}</span>
                  <span className="sim-timer-dot" aria-hidden="true" />
                </>
              )}
            </div>

            <span className="sim-tb-buttons">
              <span className="sim-tb-btn sim-tb-min" aria-hidden="true" />
              <button
                type="button"
                className="sim-tb-btn sim-tb-max"
                onClick={() => void toggleFullscreen()}
                aria-label={fullscreen ? t("Exit fullscreen") : t("Fullscreen")}
                title={fullscreen ? t("Exit fullscreen") : t("Fullscreen")}
              />
              <button
                type="button"
                className="sim-tb-btn sim-tb-close"
                onClick={onExit}
                aria-label={t("Exit simulation")}
                title={`${t("Exit simulation")} (Esc)`}
              />
            </span>
          </header>

          <nav className="sim-menubar" aria-label="主選單">
            <div className="sim-menu-wrap">
              <button
                type="button"
                className={buttonClass("grade")}
                aria-haspopup="menu"
                aria-expanded={menu === "grade"}
                title={t("Submit")}
                onClick={() => setMenu(menu === "grade" ? null : "grade")}
              >
                批改交卷(<u>C</u>)
              </button>
              {menu === "grade" && (
                <div className="sim-dropdown sim-dd-grade" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    disabled={load.kind !== "ready" || submitting || (activeId != null && !submissionFinished) || timeUp}
                    onClick={() => {
                      setMenu(null);
                      void submit();
                    }}
                  >
                    <span>送出評判</span>
                    <kbd>Ctrl+Enter</kbd>
                  </button>
                  {exam && (
                    <>
                      <div className="sim-dd-sep" />
                      <button
                        type="button"
                        role="menuitem"
                        className="sim-dd-item"
                        onClick={() => {
                          setMenu(null);
                          setFinishError(null);
                          setFinishOpen(true);
                        }}
                      >
                        <span>結束考試</span>
                      </button>
                    </>
                  )}
                  <div className="sim-dd-sep" />
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={onExit}>
                    <span>離開模擬模式</span>
                    <kbd>Esc</kbd>
                  </button>
                </div>
              )}
            </div>

            <div className="sim-menu-wrap">
              <button
                type="button"
                className={buttonClass("file")}
                aria-haspopup="menu"
                aria-expanded={menu === "file"}
                onClick={() => setMenu(menu === "file" ? null : "file")}
              >
                檔案(File)(<u>F</u>)
              </button>
              {menu === "file" && (
                <div className="sim-dropdown sim-dd-file" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    onClick={() => {
                      setMenu(null);
                      fileInputRef.current?.click();
                    }}
                  >
                    <span>提檔複答(W)(Load File)</span>
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={saveFile}>
                    <span>封卷存檔(S)(Save File)</span>
                    <kbd>Ctrl+S</kbd>
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={saveFileAs}>
                    <span>另存新檔(A)(Save As)</span>
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={loadServerFile}>
                    提取網路存檔(Load Server File)
                  </button>
                </div>
              )}
            </div>

            <div className="sim-menu-wrap">
              <button
                type="button"
                className={buttonClass("edit")}
                aria-haspopup="menu"
                aria-expanded={menu === "edit"}
                onClick={() => setMenu(menu === "edit" ? null : "edit")}
              >
                編輯(Edit)(<u>P</u>)
              </button>
              {menu === "edit" && (
                <div className="sim-dropdown sim-dd-edit" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    onClick={() => {
                      setMenu(null);
                      changeCodeFont(1);
                    }}
                  >
                    <span>放大字型(B)(Enlarge Font Size)</span>
                    <kbd>Ctrl +</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    onClick={() => {
                      setMenu(null);
                      changeCodeFont(-1);
                    }}
                  >
                    <span>縮小字型(S)(Minify Font Size)</span>
                    <kbd>Ctrl -</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    onClick={() => {
                      setMenu(null);
                      resetCodeFont();
                    }}
                  >
                    <span>預設字型(D)(Default Font Size)</span>
                    <kbd>Ctrl 0</kbd>
                  </button>
                  <div className="sim-dd-sep" />
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={pasteOriginal}>
                    <span>貼上原文(O)(Paste Original Code)</span>
                    <kbd>Ctrl+O</kbd>
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={pasteExample}>
                    <span>貼上範例(H)(Paste Example Code)</span>
                    <kbd>Ctrl+H</kbd>
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={printCode}>
                    <span>列印源碼(P)(Print Code)</span>
                    <kbd>Ctrl+P</kbd>
                  </button>
                </div>
              )}
            </div>

            <div className="sim-menu-wrap">
              <button
                type="button"
                className={buttonClass("windows")}
                aria-haspopup="menu"
                aria-expanded={menu === "windows"}
                onClick={() => setMenu(menu === "windows" ? null : "windows")}
              >
                視窗(Window)(<u>V</u>)
              </button>
              {menu === "windows" && (
                <div className="sim-dropdown sim-dd-windows" role="menu">
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={showAllWindows}>
                    顯示全部(A)(Show All Windows)
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={() => focusPane("problem")}>
                    <span>顯示題目(P)(Show Problem Window)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    onClick={() => focusPane("output", "actual")}
                  >
                    <span>您的小黑(B)(Show Cmd Window)</span>
                    <kbd>Ctrl+B</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    onClick={() => focusPane("output", "expected")}
                  >
                    <span>標準小黑(T)(Show Cmd Window)</span>
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" onClick={() => focusPane("results")}>
                    <span>顯示結果(G)(Show Result Window)</span>
                    <kbd>Ctrl+G</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    onClick={() => focusPane("output", "actual")}
                  >
                    <span>您的輸出(J)(Show Your Output)</span>
                    <kbd>Ctrl+J</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    disabled={expectedText == null}
                    onClick={() => focusPane("output", "expected")}
                  >
                    <span>正確輸出(K)(Show Correct Output)</span>
                    <kbd>Ctrl+K</kbd>
                  </button>
                  <div className="sim-dd-sep" />
                  <div className="sim-dd-heading">題目</div>
                  {problems.map((problem) => (
                    <button
                      key={problem.position}
                      type="button"
                      role="menuitemradio"
                      aria-checked={problem.position === position}
                      className={`sim-dd-item sim-dd-problem ${problem.position === position ? "is-checked" : ""}`}
                      onClick={() => chooseProblem(problem.position)}
                    >
                      <span className="sim-dd-letter">{letter(problem.position)}</span>
                      <span className="sim-dd-title">
                        {problem.problem_id === problemId && load.kind === "ready" ? load.problem.title : problem.title}
                      </span>
                      <span
                        className={`sim-dd-status ${
                          problem.status === "solved"
                            ? "is-solved"
                            : problem.status === "attempted"
                              ? "is-attempted"
                              : ""
                        }`}
                      >
                        {problem.status === "solved" ? "✓" : problem.status === "attempted" ? "◐" : "○"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="sim-menu-wrap">
              <button
                type="button"
                className={buttonClass("compiler")}
                aria-haspopup="menu"
                aria-expanded={menu === "compiler"}
                title={t("Language")}
                onClick={() => setMenu(menu === "compiler" ? null : "compiler")}
              >
                編譯器(<u>L</u>){COMPILER_SHORT[language]}
              </button>
              {menu === "compiler" && (
                <div className="sim-dropdown sim-dd-compiler" role="menu">
                  {LANGUAGES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={option.id === language}
                      className={`sim-dd-item ${option.id === language ? "is-checked" : ""}`}
                      onClick={() => chooseLanguage(option.id)}
                    >
                      <span className="sim-dd-check">{option.id === language ? "✓" : ""}</span>
                      <span className="sim-dd-main">{option.label}</span>
                      <span className="sim-dd-note">{option.version}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="sim-menu"
              title={t("Random tests")}
              onClick={() => {
                setMenu(null);
                void startRun("random", 1);
              }}
            >
              隨機測資(RandomTest)(<u>E</u>)
            </button>

            <button
              type="button"
              className="sim-menu"
              title={t("Run with this input")}
              onClick={() => {
                setMenu(null);
                setRunMode("custom");
                void startRun("custom");
              }}
            >
              自訂測資(Execute)(<u>D</u>)
            </button>

            <div className="sim-menu-wrap">
              <button
                type="button"
                className={buttonClass("test")}
                aria-haspopup="menu"
                aria-expanded={menu === "test"}
                title={t("Run")}
                onClick={() => setMenu(menu === "test" ? null : "test")}
              >
                編譯測試(Test)(<u>Q</u>)(Run)
              </button>
              {menu === "test" && (
                <div className="sim-dropdown sim-dd-test" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    disabled={load.kind !== "ready" || samples.length === 0 || startingRun || run?.status === "pending" || run?.status === "running" || timeUp}
                    title={t("Sample tests")}
                    onClick={() => {
                      setMenu(null);
                      void startRun("samples");
                    }}
                  >
                    題目預設測試資料(W)(Default Test Data)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    disabled={load.kind !== "ready" || startingRun || run?.status === "pending" || run?.status === "running" || timeUp}
                    title={t("Random tests")}
                    onClick={() => {
                      setMenu(null);
                      void startRun("random", 1);
                    }}
                  >
                    一組隨機測試資料(E)(Random Test Data)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    disabled={load.kind !== "ready" || startingRun || run?.status === "pending" || run?.status === "running" || timeUp}
                    title={t("Random tests")}
                    onClick={() => {
                      setMenu(null);
                      void startRun("random", 10);
                    }}
                  >
                    十組隨機測試資料(C)(10 Random Test Data)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sim-dd-item"
                    disabled={load.kind !== "ready" || startingRun || run?.status === "pending" || run?.status === "running" || timeUp}
                    title={t("Custom input")}
                    onClick={chooseCustomInput}
                  >
                    使用自訂測試資料(D)(Custom Test Data)
                  </button>
                  <button type="button" role="menuitem" className="sim-dd-item" aria-disabled="true" disabled>
                    人工公佈測試資料(S)(Public Test Data)
                  </button>
                </div>
              )}
            </div>
          </nav>

          <div className="sim-body">
            <div className="sim-left">
              <div className="sim-caption">
                <span className="sim-cap-title">題文</span>
                <span className="sim-cap-tools" aria-hidden="true">✕</span>
              </div>

              <section className="sim-problem" ref={problemRef} tabIndex={-1} aria-label={t("Problem statement")}>
                {load.kind === "ready" ? (
                  <>
                    <div className="sim-problem-head">
                      <span className="sim-problem-title">{load.problem.title}</span>
                    </div>
                    <div className="sim-problem-meta">
                      {load.problem.uva_id && <span>UVa {load.problem.uva_id}</span>}
                      <span>{formatTime(load.problem.time_limit_ms)}</span>
                      <span>{load.problem.memory_limit_mb} MB</span>
                      {current?.status && (
                        <span className={current.status === "solved" ? "is-solved" : ""}>
                          {current.status === "solved" ? "已解出" : "已嘗試"}
                        </span>
                      )}
                    </div>
                    <SimulationStatement markdown={load.problem.description} />
                    <div className="sim-samples">
                      <div className="sim-samples-title">範例測資</div>
                      {load.samples.length === 0 ? (
                        <div className="sim-sample-empty">{t("This problem has no sample tests yet.")}</div>
                      ) : (
                        load.samples.map((sample) => (
                          <div className="sim-sample" key={sample.order}>
                            <span className="sim-sample-label">#{sample.order} 輸入</span>
                            <pre>{sample.input}</pre>
                            <span className="sim-sample-label">輸出</span>
                            <pre>{sample.output}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : load.kind === "loading" ? (
                  <div className="sim-loading">{t("Loading problem")}…</div>
                ) : (
                  <div className="sim-load-error">
                    <p>{load.message}</p>
                    <button
                      type="button"
                      className="sim-win-btn"
                      onClick={() => {
                        setLoad({ kind: "loading" });
                        setAttempt((value) => value + 1);
                      }}
                    >
                      {t("Try again")}
                    </button>
                  </div>
                )}
              </section>

              <div className="sim-rule" />

              <section className="sim-editor" aria-label={t("Code editor")}>
                <SimulationCodeEditor
                  value={code}
                  onChange={handleCodeChange}
                  onSubmit={submit}
                  language={language}
                  ariaLabel={t("Code editor")}
                  fontSize={codeFontSize}
                />
              </section>

              <div className="sim-caption sim-out-caption">
                <span className="sim-cap-title">您的輸出</span>
                <span className="sim-out-case-tabs">
                  {showRun &&
                    runResults.map((result, index) => (
                      <button
                        key={`${result.index}-${index}`}
                        type="button"
                        className={index === activeIndex ? "is-active" : ""}
                        aria-pressed={index === activeIndex}
                        onClick={() => {
                          setSelectedCase(index);
                          setOutputTab("actual");
                        }}
                      >
                        {result.index}
                      </button>
                    ))}
                </span>
                <span className="sim-cap-tools" aria-hidden="true">✕</span>
              </div>

              <div className="sim-out-body" ref={outputRef} tabIndex={-1} role="status" aria-live="polite">
                {notice ? (
                  <p className="sim-out-notice">{notice}</p>
                ) : showSubmission && (judge.error || judge.fatal) ? (
                  <p className="sim-out-notice">{judge.fatal?.message ?? judge.error}</p>
                ) : compileOutput ? (
                  <pre className="sim-out-pre">{compileOutput}</pre>
                ) : showRun && run?.status === "error" ? (
                  <p className="sim-out-notice">{t("The judge could not run your code. Try again.")}</p>
                ) : pendingNow ? (
                  <p className="sim-out-wait">{showRun ? "執行中…" : "評判中…"}</p>
                ) : showRun && run?.mode === "random" ? (
                  <p className="sim-out-hidden">暗資測試，故不顯示。</p>
                ) : showRun && runCase ? (
                  <OutputLines text={outputText} />
                ) : showSubmission && submission ? (
                  <p className="sim-out-hidden">暗資測試，故不顯示。</p>
                ) : (
                  <p className="sim-out-idle">尚未執行</p>
                )}
              </div>

              <div className="sim-tabs" role="tablist" aria-label="輸出視窗">
                <button
                  type="button"
                  role="tab"
                  aria-selected={shownTab === "actual"}
                  className={`sim-tab ${shownTab === "actual" ? "is-active" : ""}`}
                  onClick={() => setOutputTab("actual")}
                >
                  <span className="sim-tab-icon" aria-hidden="true" />
                  您的輸出
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shownTab === "expected"}
                  className={`sim-tab ${shownTab === "expected" ? "is-active" : ""}`}
                  disabled={expectedText == null}
                  onClick={() => setOutputTab("expected")}
                >
                  <span className="sim-tab-icon" aria-hidden="true" />
                  正確輸出
                </button>
              </div>

              <div className="sim-memo">
                {exam ? (
                  <>
                    <div className="sim-memo-line">{overviewText}</div>
                    <div className="sim-memo-line">
                      {t("The clock runs on the server. Press Esc to return to the normal interface; the exam keeps running.")}
                    </div>
                    <div className="sim-memo-line">
                      {t("Use 編譯測試 to test with samples or your own input, and 批改交卷 to submit.")}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sim-memo-line">{t("Press Esc or the red close button to return to the normal interface.")}</div>
                    <div className="sim-memo-line">
                      {t("Use 編譯測試 to test with samples or your own input, and 批改交卷 to submit.")}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="sim-splitter" aria-hidden="true" />

            <div className="sim-right">
              <div className="sim-caption sim-caption-right">
                <span className="sim-cap-title">建置測試(G)</span>
                <span className="sim-cap-tools" aria-hidden="true">✕</span>
              </div>

              <section className="sim-results" ref={resultsRef} tabIndex={-1} aria-label={t("Judge output")} aria-live="polite">
                {exam && <IdentityPanel exam={exam} solved={solved} />}

                <div className="sim-verdict-row">
                  <div className={`sim-verdict is-${tone}`} title={localizedVerdict(t, verdictRaw)}>
                    {verdictText}
                  </div>
                  <div className="sim-verdict-meta">
                    <span>{metaLine}</span>
                    {resultChanged && (
                      <span className="sim-code-changed">{t("The code changed since this result.")}</span>
                    )}
                  </div>
                </div>

                {results.length > 0 && (
                  <div className="sim-test-list">
                    {results.map((result, index) => {
                      const label = caseLabel(result.verdict, {
                        custom: showRun && run?.mode === "custom",
                        stdout: showRun ? (result as RunCase).stdout : undefined,
                      });
                      const displayIndex = "index" in result ? result.index : index + 1;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`sim-test-box ${index === activeIndex ? "is-active" : ""} ${
                            result.verdict === "accepted" ? "is-good" : "is-bad"
                          }`}
                          aria-pressed={index === activeIndex}
                          title={localizedVerdict(t, result.verdict)}
                          onClick={() => setSelectedCase(index)}
                        >
                          <span className="sim-test-idx">{displayIndex}:</span>
                          <span className="sim-test-verdict">{label}</span>
                          <span className="sim-test-time">{formatTime(result.time_taken_ms)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="sim-pdata-row">
                  <span className="sim-gbtn-small">題目資料</span>
                  <span className="sim-ptitle">
                    {load.kind === "ready" && load.problem.uva_id ? `(UVA${load.problem.uva_id}) ` : ""}
                    {load.kind === "ready" ? load.problem.title : current?.title ?? ""}
                  </span>
                </div>

                <div className="sim-syntax">
                  <div className="sim-syntax-row">
                    <span className="sim-bluebtn">語法規則</span>
                    <p className="sim-syntax-note">
                      您編譯資訊是由向外呼叫編(直)譯器所產生，編(直)譯器廠商標歸屬於其合法擁有者，特此聲明。
                    </p>
                  </div>
                  <div className="sim-echo">ECHO is on.</div>
                </div>

                <div className="sim-bluebtns" aria-hidden="true">
                  <span className="sim-bluebtn">語法規範(0)</span>
                </div>

                <div className="sim-tools-row">
                  <span className="sim-gbtn-small">語意檢測</span>
                  <button
                    type="button"
                    className="sim-sbtn"
                    onClick={() => setInputFontSize((size) => Math.min(16, size + 1))}
                  >
                    輸入區放大
                  </button>
                  <button
                    type="button"
                    className="sim-sbtn"
                    onClick={() => setInputFontSize((size) => Math.max(9, size - 1))}
                  >
                    輸入區縮小
                  </button>
                </div>

                <div className={`sim-inputbox ${runMode === "custom" ? "is-custom" : ""}`}>
                  <div className="sim-input-label">
                    <span>標準輸入串</span>
                    <span className="sim-input-sub">(stdin)</span>
                    <span className="sim-input-mode">{runMode === "custom" ? "自訂" : "範例"}</span>
                  </div>
                  <div className="sim-input-area">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      readOnly={inputReadOnly}
                      maxLength={MAX_CUSTOM_INPUT_BYTES}
                      spellCheck={false}
                      aria-label={t("Standard input")}
                      style={{ fontSize: `${inputFontSize}px`, lineHeight: `${inputFontSize + 3}px` }}
                      onChange={(event) => setCustomInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                          event.preventDefault();
                          event.stopPropagation();
                          if (runMode === "custom") void startRun("custom");
                        }
                      }}
                    />
                    {runMode === "custom" && !timeUp && (
                      <button
                        type="button"
                        className="sim-input-run"
                        title={t("Run with this input")}
                        aria-label={t("Run with this input")}
                        disabled={startingRun || run?.status === "pending" || run?.status === "running"}
                        onClick={() => void startRun("custom")}
                      >
                        {startingRun || run?.status === "pending" || run?.status === "running" ? "…" : "▶"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="sim-table" aria-label={t("Result comparison")}>
                  <div className="sim-tbl-label">
                    <span>您的<br />輸出<br />串</span>
                    <span className="sim-tbl-sub">(stdout)</span>
                  </div>
                  <div className="sim-tbl-val">{actualOutput || "—"}</div>
                  <div className="sim-tbl-label">
                    <span>正確<br />輸出<br />串</span>
                    <span className="sim-tbl-sub">(stdout)<br />(epk)</span>
                  </div>
                  <div className={`sim-tbl-val ${expectedText != null ? "is-expected" : ""}`}>{expectedText ?? "—"}</div>

                  <div className="sim-tbl-label">
                    <span>您的<br />錯誤<br />串</span>
                    <span className="sim-tbl-sub">(stderr)</span>
                  </div>
                  <div className="sim-tbl-val">{stderrText || "—"}</div>
                  <div className="sim-tbl-label">
                    <span>正確<br />錯誤<br />串</span>
                    <span className="sim-tbl-sub">(stderr)</span>
                  </div>
                  <div className="sim-tbl-val">—</div>

                  <div className="sim-tbl-label"><span>您的<br />耗時<br />(GCS)</span></div>
                  <div className="sim-tbl-val sim-tbl-time">{timeMs != null ? formatSeconds(timeMs) : "—"}</div>
                  <div className="sim-tbl-label"><span>標準<br />耗時<br />(GCS)</span></div>
                  <div className="sim-tbl-val sim-tbl-time">—</div>
                </div>

                {(showSubmission && submissionFinished) || (showRun && run?.mode === "random") ? (
                  <p className="sim-hidden-note">{t("Hidden test data is not shown.")}</p>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="sim-file-input"
        accept=".py,.pyw,.c,.cc,.cpp,.cxx,.h,.hpp,.java,.txt"
        onChange={(event) => void handleFilePicked(event)}
      />

      <ConfirmModal
        open={finishOpen}
        title={t("Finish the exam now?")}
        text={t(
          "You still have {clock}. Submissions still in the queue will count. You cannot submit after finishing.",
          { clock: formatChineseClock(left) },
        )}
        confirmLabel={t("Finish exam")}
        busy={finishing}
        error={finishError}
        onCancel={() => {
          if (!finishing) setFinishOpen(false);
        }}
        onConfirm={() => void finishExam()}
      />

      <ConfirmModal
        open={replaceOpen}
        title={t("Replace your code?")}
        text={t("Your code for this problem will be replaced with the starter code.")}
        confirmLabel={t("Replace")}
        onCancel={() => setReplaceOpen(false)}
        onConfirm={replaceWithStarter}
      />
    </div>,
    document.body,
  );
}
