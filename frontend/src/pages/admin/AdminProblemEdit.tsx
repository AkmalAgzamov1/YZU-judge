import { CheckCircle, Eye, FileArrowUp, Trash, XCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  adminApi,
  ApiError,
  problemsApi,
  type Problem,
  type ProblemInput,
  type TestCaseAdmin,
} from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";
import Field from "../../components/Field";
import Statement from "../../components/problem/Statement";
import { buttonPrimary, buttonSecondary, focusRing } from "../../components/ui";
import { formatBytes, pairTestFiles, type TestPair } from "../../lib/testFiles";
import AdminLayout from "./AdminLayout";

const STATEMENT_TEMPLATE = `Describe the story and the task here.

## Input

What each line of input contains, with limits.

## Output

What to print for each case.
`;

const UPLOAD_CHUNK = 200;

type Difficulty = Problem["difficulty"];

interface FormState {
  title: string;
  uva: string;
  difficulty: Difficulty;
  timeMs: string;
  memoryMb: string;
  isCpe: boolean;
  description: string;
}

type FormErrors = Partial<Record<"title" | "uva" | "timeMs" | "memoryMb", string>>;

const emptyForm: FormState = {
  title: "",
  uva: "",
  difficulty: "easy",
  timeMs: "1000",
  memoryMb: "256",
  isCpe: true,
  description: STATEMENT_TEMPLATE,
};

function toForm(problem: Problem): FormState {
  return {
    title: problem.title,
    uva: problem.uva_id?.toString() ?? "",
    difficulty: problem.difficulty,
    timeMs: String(problem.time_limit_ms),
    memoryMb: String(problem.memory_limit_mb),
    isCpe: problem.is_cpe,
    description: problem.description,
  };
}

function validate(form: FormState): { errors: FormErrors; input?: ProblemInput } {
  const errors: FormErrors = {};
  const isWhole = (value: string) => /^\d+$/.test(value.trim());

  if (!form.title.trim()) errors.title = "Give the problem a title.";
  if (form.uva.trim() && !isWhole(form.uva)) errors.uva = "Use the number only, like 10055.";
  if (!isWhole(form.timeMs) || Number(form.timeMs) < 100 || Number(form.timeMs) > 60000) {
    errors.timeMs = "Between 100 and 60000 ms.";
  }
  if (!isWhole(form.memoryMb) || Number(form.memoryMb) < 16 || Number(form.memoryMb) > 2048) {
    errors.memoryMb = "Between 16 and 2048 MB.";
  }
  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    input: {
      title: form.title.trim(),
      uva_id: form.uva.trim() ? Number(form.uva) : null,
      difficulty: form.difficulty,
      time_limit_ms: Number(form.timeMs),
      memory_limit_mb: Number(form.memoryMb),
      is_cpe: form.isCpe,
      description: form.description,
    },
  };
}

function ProblemForm({
  initial,
  saveLabel,
  onSave,
}: {
  initial: FormState;
  saveLabel: string;
  onSave: (input: ProblemInput) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [view, setView] = useState<"write" | "preview">("write");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setMessage(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { errors: nextErrors, input } = validate(form);
    setErrors(nextErrors);
    if (!input) return;

    setSaving(true);
    try {
      await onSave(input);
      setMessage({ ok: true, text: "Saved." });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof ApiError ? error.message : "Could not save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const viewTab = (value: "write" | "preview", label: string) => (
    <button
      type="button"
      onClick={() => setView(value)}
      aria-pressed={view === value}
      className={`rounded px-3 py-1 text-sm font-medium lg:hidden ${focusRing} ${
        view === value ? "bg-ink-3 text-white" : "text-neutral-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <Field
          id="title"
          label="Title"
          value={form.title}
          onChange={(event) => set("title", event.target.value)}
          error={errors.title}
          placeholder="Hashmat the brave warrior"
        />
        <Field
          id="uva"
          label="UVa number"
          inputMode="numeric"
          value={form.uva}
          onChange={(event) => set("uva", event.target.value)}
          error={errors.uva}
          hint="Optional."
          placeholder="10055"
        />
        <Field
          id="time"
          label="Time limit, ms"
          inputMode="numeric"
          value={form.timeMs}
          onChange={(event) => set("timeMs", event.target.value)}
          error={errors.timeMs}
        />
        <Field
          id="memory"
          label="Memory limit, MB"
          inputMode="numeric"
          value={form.memoryMb}
          onChange={(event) => set("memoryMb", event.target.value)}
          error={errors.memoryMb}
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div role="group" aria-label="Difficulty" className="flex rounded-lg border border-white/10 bg-ink-1 p-1">
          {(["easy", "medium", "hard"] as Difficulty[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={form.difficulty === value}
              onClick={() => set("difficulty", value)}
              className={`rounded px-3 py-1 text-sm font-medium capitalize ${focusRing} ${
                form.difficulty === value ? "bg-ink-3 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={form.isCpe}
            onChange={(event) => set("isCpe", event.target.checked)}
            className="h-4 w-4 accent-white"
          />
          Past CPE problem
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="description" className="text-sm font-medium text-neutral-300">
            Statement <span className="text-neutral-500">in Markdown</span>
          </label>
          <div className="flex rounded-lg border border-white/10 bg-ink-1 p-1 lg:hidden">
            {viewTab("write", "Write")}
            {viewTab("preview", "Preview")}
          </div>
        </div>
        <div className="mt-2 grid gap-4 lg:grid-cols-2">
          <textarea
            id="description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            spellCheck={false}
            className={`${view === "write" ? "block" : "hidden"} min-h-96 w-full resize-y rounded-lg border border-white/10 bg-ink-1 p-4 font-mono text-sm text-neutral-200 transition duration-300 ease-soft hover:border-white/20 focus:outline-2 focus:outline-offset-2 focus:outline-white lg:block`}
          />
          <div
            aria-label="Statement preview"
            className={`${view === "preview" ? "block" : "hidden"} min-h-96 overflow-y-auto rounded-lg border border-white/10 bg-ink-0 p-4 lg:block`}
          >
            {form.description.trim() ? (
              <Statement markdown={form.description} />
            ) : (
              <p className="text-sm text-neutral-500">The preview shows up here as you type.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" className={buttonPrimary} disabled={saving}>
          {saving ? "Saving…" : saveLabel}
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-emerald-400" : "text-yzu-red"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function TestsPanel({
  problemId,
  tests,
  onChanged,
}: {
  problemId: number;
  tests: TestCaseAdmin[];
  onChanged: () => void;
}) {
  const [pending, setPending] = useState<TestPair[]>([]);
  const [pendingSamples, setPendingSamples] = useState<Set<string>>(new Set());
  const [leftovers, setLeftovers] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TestCaseAdmin | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const sampleCount = tests.filter((test) => test.is_sample).length;

  function accept(files: File[]) {
    const { pairs, leftovers: unmatched } = pairTestFiles(files);
    setPending(pairs);
    setLeftovers(unmatched);
    setError(pairs.length === 0 && files.length > 0 ? "No input and output pairs found in these files." : null);
    // With no samples yet, show the first test to students by default.
    setPendingSamples(new Set(sampleCount === 0 && pairs.length > 0 ? [pairs[0].name] : []));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    accept([...event.dataTransfer.files]);
  }

  async function upload() {
    setUploading(true);
    setError(null);
    try {
      let order = Math.max(0, ...tests.map((test) => test.sample_order ?? 0));
      const payload = await Promise.all(
        pending.map(async (pair) => {
          const isSample = pendingSamples.has(pair.name);
          return {
            input_content: await pair.input.text(),
            output_content: await pair.output.text(),
            is_sample: isSample,
            sample_order: isSample ? ++order : null,
          };
        }),
      );
      for (let start = 0; start < payload.length; start += UPLOAD_CHUNK) {
        await adminApi.addTests(problemId, payload.slice(start, start + UPLOAD_CHUNK));
      }
      setPending([]);
      setLeftovers([]);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Nothing was saved from the failed batch.");
    } finally {
      setUploading(false);
    }
  }

  async function toggleSample(test: TestCaseAdmin) {
    setBusyId(test.id);
    setError(null);
    try {
      const nextOrder = test.is_sample ? null : Math.max(0, ...tests.map((item) => item.sample_order ?? 0)) + 1;
      await adminApi.setSample(problemId, test.id, !test.is_sample, nextOrder);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the sample flag.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await adminApi.deleteTest(problemId, toDelete.id);
      setToDelete(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the test.");
      setToDelete(null);
    } finally {
      setBusyId(null);
    }
  }

  const pendingBytes = pending.reduce((sum, pair) => sum + pair.input.size + pair.output.size, 0);

  return (
    <section aria-label="Tests">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold text-white">Tests</h2>
        <p className="font-mono text-sm text-neutral-500">
          {tests.length} {tests.length === 1 ? "test" : "tests"} · {sampleCount} shown as {sampleCount === 1 ? "sample" : "samples"}
        </p>
      </div>
      <p className="mt-2 text-sm text-neutral-400">
        Samples appear under the statement. All tests, samples included, are used to judge.
      </p>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center transition duration-300 ease-soft ${
          dragging ? "border-white bg-ink-2" : "border-white/20 bg-ink-1 hover:border-white/40"
        }`}
      >
        <FileArrowUp size={32} className="text-neutral-400" aria-hidden="true" />
        <span className="mt-3 text-base font-medium text-white">Drop test files here, or click to choose</span>
        <span className="mt-1 font-mono text-xs text-neutral-500">1.in + 1.out · 1_input.txt + 1_output.txt · input1.txt + output1.txt</span>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            accept([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </label>

      {leftovers.length > 0 && (
        <p className="mt-4 text-sm text-yzu-yellow">
          Skipped {leftovers.length} {leftovers.length === 1 ? "file" : "files"} without a partner or a known name:{" "}
          <span className="font-mono">{leftovers.slice(0, 6).join(", ")}{leftovers.length > 6 ? "…" : ""}</span>
        </p>
      )}

      {pending.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-ink-1 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-base text-white">
              Ready to add {pending.length} {pending.length === 1 ? "test" : "tests"}{" "}
              <span className="font-mono text-sm text-neutral-500">({formatBytes(pendingBytes)})</span>
            </p>
            <div className="flex gap-3">
              <button type="button" className={buttonSecondary} onClick={() => setPending([])} disabled={uploading}>
                Cancel
              </button>
              <button type="button" className={buttonPrimary} onClick={upload} disabled={uploading}>
                {uploading ? "Uploading…" : `Add ${pending.length} ${pending.length === 1 ? "test" : "tests"}`}
              </button>
            </div>
          </div>
          <ul className="mt-4 max-h-72 divide-y divide-white/10 overflow-y-auto border-y border-white/10">
            {pending.map((pair) => (
              <li key={pair.name} className="grid grid-cols-[1fr_auto] items-center gap-4 py-2 font-mono text-sm md:grid-cols-[1fr_1fr_auto]">
                <span className="truncate text-neutral-300">
                  {pair.input.name} <span className="text-neutral-600">+</span> {pair.output.name}
                </span>
                <span className="hidden text-neutral-500 md:block">{formatBytes(pair.input.size + pair.output.size)}</span>
                <label className="inline-flex cursor-pointer items-center gap-2 text-neutral-400">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-white"
                    checked={pendingSamples.has(pair.name)}
                    onChange={(event) => {
                      const next = new Set(pendingSamples);
                      if (event.target.checked) next.add(pair.name);
                      else next.delete(pair.name);
                      setPendingSamples(next);
                    }}
                  />
                  sample
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-yzu-red">{error}</p>}

      {tests.length > 0 && (
        <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {tests.map((test, index) => (
            <li key={test.id} className="grid grid-cols-[40px_1fr_auto] items-start gap-4 py-3 md:grid-cols-[40px_1fr_1fr_120px_auto]">
              <span className="pt-1 font-mono text-sm text-neutral-500">{index + 1}</span>
              <pre className="min-w-0 truncate rounded bg-ink-1 px-2 py-1 font-mono text-xs text-neutral-300" title="Input">
                {test.input_preview.split("\n").slice(0, 2).join(" ⏎ ") || "(empty)"}
              </pre>
              <pre className="hidden min-w-0 truncate rounded bg-ink-1 px-2 py-1 font-mono text-xs text-neutral-300 md:block" title="Output">
                {test.output_preview.split("\n").slice(0, 2).join(" ⏎ ") || "(empty)"}
              </pre>
              <span className="hidden pt-1 text-right font-mono text-xs text-neutral-500 md:block">
                {formatBytes(test.input_size)} / {formatBytes(test.output_size)}
              </span>
              <span className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-white"
                    checked={test.is_sample}
                    disabled={busyId === test.id}
                    onChange={() => toggleSample(test)}
                  />
                  sample
                </label>
                <button
                  type="button"
                  aria-label={`Delete test ${index + 1}`}
                  onClick={() => setToDelete(test)}
                  className={`rounded p-1 text-neutral-500 transition duration-300 ease-soft hover:text-yzu-red ${focusRing}`}
                >
                  <Trash size={16} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete != null}
        title="Delete this test?"
        confirmLabel="Delete test"
        busy={busyId === toDelete?.id}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>The input and output files are removed. Old submissions keep their results.</p>
      </ConfirmDialog>
    </section>
  );
}

function PublishPanel({
  problem,
  tests,
  onChanged,
}: {
  problem: Problem;
  tests: TestCaseAdmin[];
  onChanged: (problem: Problem) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = [
    { label: "Statement written", ok: problem.description.trim().length > 0 },
    { label: "At least one test", ok: tests.length > 0 },
    { label: "At least one sample", ok: tests.some((test) => test.is_sample) },
  ];
  const ready = checks.every((check) => check.ok);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      onChanged(problem.is_published ? await adminApi.unpublish(problem.id) : await adminApi.publish(problem.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Publishing" className="rounded-2xl border border-white/10 bg-ink-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-neutral-500">Status</p>
          <p className={`mt-1 text-xl font-semibold ${problem.is_published ? "text-emerald-400" : "text-yzu-yellow"}`}>
            {problem.is_published ? "Published, students can see it" : "Draft, only admins can see it"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={`/problems/${problem.id}`} className={buttonSecondary}>
            <Eye size={16} aria-hidden="true" />
            View as student
          </Link>
          <button
            type="button"
            className={problem.is_published ? buttonSecondary : buttonPrimary}
            onClick={toggle}
            disabled={busy || (!problem.is_published && !ready)}
          >
            {busy ? "One moment…" : problem.is_published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>
      {!problem.is_published && (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {checks.map((check) => (
            <li key={check.label} className={`flex items-center gap-2 ${check.ok ? "text-neutral-300" : "text-neutral-500"}`}>
              {check.ok ? (
                <CheckCircle size={16} weight="fill" className="text-emerald-400" aria-hidden="true" />
              ) : (
                <XCircle size={16} className="text-neutral-600" aria-hidden="true" />
              )}
              {check.label}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-yzu-red">{error}</p>}
    </section>
  );
}

function ExistingProblem({ problemId }: { problemId: number }) {
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [tests, setTests] = useState<TestCaseAdmin[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testsVersion, setTestsVersion] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    problemsApi.get(problemId).then(
      (loaded) => {
        if (!cancelled) setProblem(loaded);
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(error instanceof ApiError ? error.message : "The problem could not be loaded.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [problemId]);

  useEffect(() => {
    let cancelled = false;
    adminApi.tests(problemId).then(
      (loaded) => {
        if (!cancelled) setTests(loaded);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [problemId, testsVersion]);

  const refreshTests = useCallback(() => setTestsVersion((value) => value + 1), []);

  async function confirmDelete() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminApi.deleteProblem(problemId);
      navigate("/admin/problems", { replace: true });
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : "Could not delete the problem.");
      setDeleteBusy(false);
    }
  }

  if (loadError) {
    return (
      <AdminLayout title="Problem not found" description={loadError}>
        <Link to="/admin/problems" className={buttonPrimary}>
          Back to problems
        </Link>
      </AdminLayout>
    );
  }

  if (!problem) {
    return (
      <AdminLayout title="Loading…">
        <div aria-busy="true" className="h-96 animate-pulse rounded-2xl bg-ink-1" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={problem.title} description={problem.uva_id ? `UVa ${problem.uva_id}` : "No UVa number"}>
      <div className="flex flex-col gap-12">
        <PublishPanel problem={problem} tests={tests} onChanged={setProblem} />
        <ProblemForm
          initial={toForm(problem)}
          saveLabel="Save changes"
          onSave={async (input) => setProblem(await adminApi.updateProblem(problemId, input))}
        />
        <TestsPanel problemId={problemId} tests={tests} onChanged={refreshTests} />

        <section aria-label="Danger zone" className="rounded-2xl border border-yzu-red/30 p-6">
          <h2 className="text-lg font-semibold text-white">Delete problem</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Only possible while nobody has submitted to it and it is in no CPE paper. Otherwise unpublish it.
          </p>
          <button
            type="button"
            className={`${buttonSecondary} mt-4 text-yzu-red`}
            onClick={() => {
              setDeleteError(null);
              setDeleting(true);
            }}
          >
            <Trash size={16} aria-hidden="true" />
            Delete problem
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={deleting}
        title={`Delete ${problem.title}?`}
        confirmLabel="Delete for good"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      >
        <p>The statement and all {tests.length} tests are removed. This cannot be undone.</p>
      </ConfirmDialog>
    </AdminLayout>
  );
}

function NewProblem() {
  const navigate = useNavigate();

  return (
    <AdminLayout title="New problem" description="Save it first, then add tests. It stays a draft until you publish it.">
      <ProblemForm
        initial={emptyForm}
        saveLabel="Create draft"
        onSave={async (input) => {
          const created = await adminApi.createProblem(input);
          navigate(`/admin/problems/${created.id}`, { replace: true });
        }}
      />
    </AdminLayout>
  );
}

export default function AdminProblemEdit() {
  const { id } = useParams();

  if (id === "new") return <NewProblem />;

  const problemId = Number(id);
  return <ExistingProblem key={problemId} problemId={problemId} />;
}
