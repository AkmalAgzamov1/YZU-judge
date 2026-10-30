import { ArrowDown, ArrowUp, MagnifyingGlass, Plus, Trash, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi, ApiError, cpePapersApi, problemsApi, type CpePaper, type Problem } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";
import DifficultyLabel from "../../components/DifficultyLabel";
import Field from "../../components/Field";
import { buttonPrimary, buttonSecondary, focusRing } from "../../components/ui";
import { letter } from "../../lib/mock";
import AdminLayout from "./AdminLayout";

interface FormErrors {
  title?: string;
  heldOn?: string;
  duration?: string;
  problems?: string;
}

const MAX_PROBLEMS = 12;

function problemName(problem: Problem) {
  return problem.uva_id ? `UVa ${problem.uva_id} · ${problem.title}` : problem.title;
}

function PaperForm({ paper, problems }: { paper: CpePaper | null; problems: Problem[] }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(paper?.title ?? "");
  const [heldOn, setHeldOn] = useState(paper?.held_on ?? "");
  const [duration, setDuration] = useState(String(paper?.duration_minutes ?? 180));
  const [selected, setSelected] = useState<number[]>(paper?.problems.map((item) => item.problem_id) ?? []);
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(problems.map((problem) => [problem.id, problem])), [problems]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return problems
      .filter((problem) => !selected.includes(problem.id))
      .filter((problem) => !needle || problemName(problem).toLowerCase().includes(needle))
      .slice(0, 8);
  }, [problems, selected, query]);

  const drafts = selected.filter((id) => byId.get(id) && !byId.get(id)!.is_published);

  function move(index: number, delta: number) {
    const next = [...selected];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setSelected(next);
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!title.trim()) nextErrors.title = "Name the paper, for example CPE 2025/10/21.";
    if (!heldOn) nextErrors.heldOn = "Pick the exam date.";
    if (!/^\d+$/.test(duration) || Number(duration) < 1 || Number(duration) > 600) {
      nextErrors.duration = "Between 1 and 600 minutes.";
    }
    if (selected.length === 0) nextErrors.problems = "Add at least one problem.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input = { title: title.trim(), held_on: heldOn, duration_minutes: Number(duration), problem_ids: selected };
    setSaving(true);
    setMessage(null);
    try {
      if (paper) {
        await adminApi.updatePaper(paper.id, input);
        setMessage({ ok: true, text: "Saved." });
      } else {
        const created = await adminApi.createPaper(input);
        navigate(`/admin/papers/${created.id}`, { replace: true });
      }
    } catch (error) {
      setMessage({ ok: false, text: error instanceof ApiError ? error.message : "Could not save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!paper) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminApi.deletePaper(paper.id);
      navigate("/admin/papers", { replace: true });
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : "Could not delete the paper.");
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
          <Field
            id="title"
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={errors.title}
            placeholder="CPE 2025/10/21"
          />
          <Field
            id="held-on"
            label="Exam date"
            type="date"
            value={heldOn}
            onChange={(event) => setHeldOn(event.target.value)}
            error={errors.heldOn}
          />
          <Field
            id="duration"
            label="Duration, minutes"
            inputMode="numeric"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            error={errors.duration}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-label="Problems in this paper">
            <h2 className="text-sm font-medium text-neutral-300">
              Problems in exam order <span className="font-mono text-neutral-500">{selected.length} / {MAX_PROBLEMS}</span>
            </h2>
            {selected.length === 0 ? (
              <p className={`mt-3 rounded-lg border border-dashed px-4 py-8 text-center text-sm ${errors.problems ? "border-yzu-red/60 text-yzu-red" : "border-white/20 text-neutral-500"}`}>
                {errors.problems ?? "Pick problems on the right. The first one becomes problem A."}
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-white/10 border-y border-white/10">
                {selected.map((id, index) => {
                  const problem = byId.get(id);
                  return (
                    <li key={id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 py-2">
                      <span className="font-mono text-lg text-neutral-500">{letter(index + 1)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-white">{problem ? problemName(problem) : `Problem #${id}`}</span>
                        {problem && !problem.is_published && <span className="font-mono text-xs text-yzu-yellow">draft</span>}
                      </span>
                      <span className="flex gap-1">
                        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className={`rounded p-1 text-neutral-400 hover:text-white disabled:opacity-30 ${focusRing}`}>
                          <ArrowUp size={16} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label="Move down" disabled={index === selected.length - 1} onClick={() => move(index, 1)} className={`rounded p-1 text-neutral-400 hover:text-white disabled:opacity-30 ${focusRing}`}>
                          <ArrowDown size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove from paper"
                          onClick={() => {
                            setSelected(selected.filter((item) => item !== id));
                            setMessage(null);
                          }}
                          className={`rounded p-1 text-neutral-400 hover:text-yzu-red ${focusRing}`}
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {drafts.length > 0 && (
              <p className="mt-3 text-sm text-yzu-yellow">
                {drafts.length} {drafts.length === 1 ? "problem is" : "problems are"} still a draft. Publish them before
                students take this paper.
              </p>
            )}
          </section>

          <section aria-label="Add problems">
            <label className="relative block">
              <span className="sr-only">Search problems to add</span>
              <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or UVa number"
                className="w-full rounded-lg border border-white/10 bg-ink-1 py-2 pr-3 pl-10 text-base text-white placeholder:text-neutral-600 hover:border-white/20 focus:outline-2 focus:outline-offset-2 focus:outline-white"
              />
            </label>
            <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
              {matches.map((problem) => (
                <li key={problem.id}>
                  <button
                    type="button"
                    disabled={selected.length >= MAX_PROBLEMS}
                    onClick={() => {
                      setSelected([...selected, problem.id]);
                      setErrors((previous) => ({ ...previous, problems: undefined }));
                      setMessage(null);
                    }}
                    className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded px-2 py-2 text-left transition duration-300 ease-soft hover:bg-ink-1 disabled:opacity-40 ${focusRing}`}
                  >
                    <span className="truncate text-sm text-white">{problemName(problem)}</span>
                    <DifficultyLabel difficulty={problem.difficulty} />
                    <Plus size={16} className="text-neutral-400" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-2 py-4 text-sm text-neutral-500">No problems match.</li>}
            </ul>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className={buttonPrimary} disabled={saving}>
            {saving ? "Saving…" : paper ? "Save changes" : "Create paper"}
          </button>
          {paper && (
            <button
              type="button"
              className={`${buttonSecondary} text-yzu-red`}
              onClick={() => {
                setDeleteError(null);
                setDeleting(true);
              }}
            >
              <Trash size={16} aria-hidden="true" />
              Delete paper
            </button>
          )}
          {message && (
            <p role="status" className={`text-sm ${message.ok ? "text-emerald-400" : "text-yzu-red"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={deleting}
        title={`Delete ${paper?.title ?? "this paper"}?`}
        confirmLabel="Delete paper"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      >
        <p>The problems stay. Only this grouping is removed. Papers that students already took cannot be deleted.</p>
      </ConfirmDialog>
    </>
  );
}

export default function AdminPaperEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const paperId = Number(id);
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [paper, setPaper] = useState<CpePaper | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([problemsApi.list(), isNew ? Promise.resolve(null) : cpePapersApi.list()]).then(
      ([allProblems, papers]) => {
        if (cancelled) return;
        if (papers) {
          const found = papers.find((item) => item.id === paperId);
          if (!found) {
            setError("No such paper.");
            return;
          }
          setPaper(found);
        }
        setProblems(allProblems);
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load this page.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isNew, paperId]);

  if (error) {
    return (
      <AdminLayout title="Paper not found" description={error}>
        <Link to="/admin/papers" className={buttonPrimary}>
          Back to papers
        </Link>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isNew ? "New CPE paper" : paper?.title ?? "Loading…"}
      description="Pick the problems of one past CPE sitting and put them in exam order."
    >
      {problems ? (
        <PaperForm key={paper?.id ?? "new"} paper={paper} problems={problems} />
      ) : (
        <div aria-busy="true" className="h-96 animate-pulse rounded-2xl bg-ink-1" />
      )}
    </AdminLayout>
  );
}
