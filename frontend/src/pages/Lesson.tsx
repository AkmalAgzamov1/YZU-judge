import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import { Link, useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { ApiError, problemsApi, type Problem } from "../api/client";
import AppShell from "../components/AppShell";
import DifficultyLabel from "../components/DifficultyLabel";
import CodeEditor from "../components/problem/CodeEditor";
import { buttonSecondary, focusRing } from "../components/ui";
import { useI18n } from "../i18n";
import { tr } from "../i18n/translate";
import {
  findLesson,
  LESSONS,
  lessonLang,
  loadCodeLang,
  loadLesson,
  markLessonRead,
  saveCodeLang,
  type CodeLang,
  type Lesson as LessonInfo,
} from "../learn/lessons";
import { problemLabel } from "../lib/format";
import { sortByDifficulty } from "../lib/progress";
import { topicLabel } from "../lib/topics";
import NotFound from "./NotFound";

const CODE_LANGS: { id: CodeLang; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "cpp", label: "C++" },
];

// The little bit of the Markdown tree this page reads: a <pre> holding one <code>.
interface TreeNode {
  type: string;
  value?: string;
  properties?: { className?: unknown };
  children?: TreeNode[];
}

function textOf(node: TreeNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

function plainText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? plainText(child.props.children)
          : "",
    )
    .join("");
}

// Heading ids for the "On this page" list. Chinese headings keep their characters.
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

function headingsOf(markdown: string) {
  return [...markdown.matchAll(/^## (.+)$/gm)].map((match) => {
    const text = match[1].replace(/`/g, "").trim();
    return { text, id: slugify(text) };
  });
}

type Content = { kind: "loading" } | { kind: "error" } | { kind: "ready"; markdown: string };

function CodeToggle({ value, onChange }: { value: CodeLang; onChange: (lang: CodeLang) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("Show code in")} className="inline-flex rounded-lg border border-white/10 bg-ink-1 p-1">
      {CODE_LANGS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition duration-300 ease-soft active:scale-[0.98] ${focusRing} ${
            value === option.id ? "bg-white text-black" : "text-neutral-400 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Practice({ lesson }: { lesson: LessonInfo }) {
  const { t } = useI18n();
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; problems: Problem[] }
  >({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const topic = lesson.topic;

  useEffect(() => {
    let cancelled = false;
    problemsApi.list().then(
      (problems) => {
        if (!cancelled) setState({ kind: "ready", problems });
      },
      (error: unknown) => {
        if (!cancelled)
          setState({
            kind: "error",
            message: error instanceof ApiError ? error.message : tr("The practice problems could not be loaded."),
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (!topic) return null;

  // Lessons that share a topic each get their own slice, so they do not repeat the same problems.
  const sameTopic = LESSONS.filter((other) => other.topic === topic);
  const offset = sameTopic.indexOf(lesson) * 4;

  let body: ReactNode;
  if (state.kind === "loading") {
    body = (
      <ul aria-busy="true" aria-label={t("Loading problems")} className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="h-14 animate-pulse rounded-xl bg-ink-1" />
        ))}
      </ul>
    );
  } else if (state.kind === "error") {
    body = (
      <div className="rounded-xl border border-white/10 bg-ink-1 p-4 text-sm text-neutral-400">
        <p>{state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt((value) => value + 1);
          }}
          className={`${buttonSecondary} mt-3 text-sm`}
        >
          {t("Try again")}
        </button>
      </div>
    );
  } else {
    const matching = sortByDifficulty(state.problems.filter((problem) => problem.topics?.includes(topic)));
    const picked = matching.slice(offset, offset + 4).length > 0 ? matching.slice(offset, offset + 4) : matching.slice(0, 4);
    body =
      picked.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-ink-1 p-4 text-sm text-neutral-400">
          {t("No practice problems for this topic yet. Try any easy problem in the meantime.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {picked.map((problem) => (
            <li key={problem.id}>
              <Link
                to={`/problems/${problem.id}`}
                className={`group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-ink-1 px-4 py-3 transition duration-300 ease-soft hover:border-white/20 hover:bg-ink-2 ${focusRing}`}
              >
                <span className="min-w-0 truncate text-sm font-medium text-white">{problemLabel(problem, problem.id)}</span>
                <span className="flex shrink-0 items-center gap-3 text-sm">
                  <DifficultyLabel difficulty={problem.difficulty} />
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="text-neutral-500 transition duration-500 ease-soft group-hover:translate-x-1 group-hover:text-white"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <section aria-labelledby="practice" className="mt-16 border-t border-white/10 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="practice" className="text-2xl font-semibold tracking-tight text-white">
          {t("Practice")}
        </h2>
        <Link
          to={`/problems?topics=${topic}`}
          className={`rounded-sm text-sm text-neutral-400 underline underline-offset-2 hover:text-white ${focusRing}`}
        >
          {t("All {topic} problems", { topic: t(topicLabel[topic]) })}
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-500">{t("Easy problems first. Solve one before moving on.")}</p>
      <div className="mt-6">{body}</div>
    </section>
  );
}

export default function Lesson() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const found = findLesson(slug);
  const textLang = lessonLang(lang);
  const [codeLang, setCodeLang] = useState<CodeLang>(loadCodeLang);
  const [content, setContent] = useState<Content>({ kind: "loading" });
  const [loadedKey, setLoadedKey] = useState("");

  const key = `${slug}:${textLang}`;
  if (loadedKey !== key) {
    setLoadedKey(key);
    setContent({ kind: "loading" });
  }

  useEffect(() => {
    if (!found) return;
    let cancelled = false;
    markLessonRead(found.lesson.slug);
    loadLesson(found.lesson.slug, textLang).then(
      (markdown) => {
        if (!cancelled) setContent({ kind: "ready", markdown });
      },
      () => {
        if (!cancelled) setContent({ kind: "error" });
      },
    );
    window.scrollTo({ top: 0 });
    return () => {
      cancelled = true;
    };
    // found is derived from slug; slug and textLang are what change the file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, textLang]);

  function chooseCode(next: CodeLang) {
    setCodeLang(next);
    saveCodeLang(next);
  }

  const components = useMemo<Components>(
    () => ({
      h2: ({ children }) => (
        <h2 id={slugify(plainText(children))} className="mt-12 scroll-mt-24 text-2xl font-semibold tracking-tight text-white">
          {children}
        </h2>
      ),
      h3: ({ children }) => <h3 className="mt-8 text-lg font-semibold text-white">{children}</h3>,
      p: ({ children }) => <p className="mt-4 text-base text-pretty text-neutral-300">{children}</p>,
      ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-neutral-300">{children}</ul>,
      ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-neutral-300">{children}</ol>,
      a: ({ children, href }) =>
        href?.startsWith("/") ? (
          <Link to={href} className={`text-white underline underline-offset-2 ${focusRing}`}>
            {children}
          </Link>
        ) : (
          <a href={href} target="_blank" rel="noreferrer" className={`text-white underline underline-offset-2 ${focusRing}`}>
            {children}
          </a>
        ),
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      em: ({ children }) => <span className="text-white">{children}</span>,
      blockquote: ({ children }) => (
        <aside className="mt-6 rounded-xl border border-yzu-yellow/30 bg-yzu-yellow/5 px-4 py-1 text-neutral-300 [&_p]:mt-3 [&_p:last-child]:mb-3">
          {children}
        </aside>
      ),
      code: ({ children, className }) =>
        className ? (
          <code className={className}>{children}</code>
        ) : (
          <code className="rounded bg-ink-2 px-1 py-0.5 font-mono text-[0.875em] text-white">{children}</code>
        ),
      pre: ({ node, children }) => {
        const codeNode = (node as TreeNode | undefined)?.children?.[0];
        const classes = codeNode?.properties?.className;
        const fence = Array.isArray(classes) ? String(classes[0] ?? "").replace("language-", "") : "";
        if (fence === "python" || fence === "cpp") {
          // Each example is written twice; only the language the reader picked is shown.
          if (fence !== codeLang) return null;
          return (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-ink-1">
              <CodeEditor readOnly language={fence} value={textOf(codeNode).replace(/\n$/, "")} />
            </div>
          );
        }
        // Sample input and output stay plain text.
        return (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-ink-1 p-4 font-mono text-sm text-neutral-200">
            {children}
          </pre>
        );
      },
      table: ({ children }) => (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm text-neutral-300">{children}</table>
        </div>
      ),
      th: ({ children }) => <th className="border border-white/10 px-3 py-2 text-left font-semibold text-white">{children}</th>,
      td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
    }),
    [codeLang],
  );

  if (!found) return <NotFound />;
  const { lesson, index } = found;
  const previous = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  const headings = content.kind === "ready" ? headingsOf(content.markdown) : [];

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0 max-w-[720px]">
          <Link
            to="/learn"
            className={`inline-flex items-center gap-2 rounded-sm text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t("All lessons")}
          </Link>

          <p className="mt-8 font-mono text-sm text-neutral-500">
            {t("Lesson {n} of {total}", { n: index + 1, total: LESSONS.length })} · {t("{n} min", { n: lesson.minutes })}
          </p>
          <h1 className="text-hero mt-2 text-4xl font-semibold tracking-tight text-balance md:text-5xl">{lesson.title[textLang]}</h1>
          <p className="mt-4 text-lg text-pretty text-neutral-400">{lesson.summary[textLang]}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3 lg:hidden">
            <span className="text-sm text-neutral-500">{t("Show code in")}</span>
            <CodeToggle value={codeLang} onChange={chooseCode} />
          </div>

          {lang !== "en" && lang !== "zh" && (
            <p className="mt-6 rounded-xl border border-white/10 bg-ink-1 px-4 py-3 text-sm text-neutral-400">
              {t("This lesson is not translated into your language yet, so it is shown in English.")}
            </p>
          )}

          <div className="mt-8">
            {content.kind === "loading" && (
              <div aria-busy="true" aria-label={t("Loading lesson")} className="flex flex-col gap-3">
                {[100, 92, 96, 60].map((width, i) => (
                  <span key={i} className="h-4 animate-pulse rounded bg-ink-1" style={{ width: `${width}%` }} />
                ))}
                <span className="mt-4 h-32 animate-pulse rounded-xl bg-ink-1" />
              </div>
            )}
            {content.kind === "error" && (
              <p className="rounded-xl border border-white/10 bg-ink-1 p-4 text-sm text-neutral-400">
                {t("This lesson could not be loaded. Reload the page to try again.")}
              </p>
            )}
            {content.kind === "ready" && (
              <div className="[&>*:first-child]:mt-0">
                <Markdown remarkPlugins={[remarkGfm]} components={components}>
                  {content.markdown}
                </Markdown>
              </div>
            )}
          </div>

          <Practice key={lesson.slug} lesson={lesson} />

          <nav aria-label={t("More lessons")} className="mt-16 grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link
                to={`/learn/${previous.slug}`}
                className={`group rounded-xl border border-white/10 p-4 transition duration-300 ease-soft hover:border-white/20 hover:bg-ink-1 ${focusRing}`}
              >
                <span className="flex items-center gap-2 text-xs text-neutral-500">
                  <ArrowLeft size={14} aria-hidden="true" className="transition duration-500 ease-soft group-hover:-translate-x-1" />
                  {t("Previous lesson")}
                </span>
                <span className="mt-1 block font-semibold text-white">{previous.title[textLang]}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next && (
              <Link
                to={`/learn/${next.slug}`}
                className={`group rounded-xl border border-white/10 p-4 text-right transition duration-300 ease-soft hover:border-white/20 hover:bg-ink-1 ${focusRing}`}
              >
                <span className="flex items-center justify-end gap-2 text-xs text-neutral-500">
                  {t("Next lesson")}
                  <ArrowRight size={14} aria-hidden="true" className="transition duration-500 ease-soft group-hover:translate-x-1" />
                </span>
                <span className="mt-1 block font-semibold text-white">{next.title[textLang]}</span>
              </Link>
            )}
          </nav>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{t("Show code in")}</span>
              <CodeToggle value={codeLang} onChange={chooseCode} />
            </div>
            {headings.length > 0 && (
              <nav aria-label={t("On this page")} className="flex flex-col gap-1">
                <span className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">{t("On this page")}</span>
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`rounded-sm py-1 text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
                  >
                    {heading.text}
                  </a>
                ))}
                {lesson.topic && (
                  <a
                    href="#practice"
                    className={`rounded-sm py-1 text-sm text-neutral-400 transition duration-300 ease-soft hover:text-white ${focusRing}`}
                  >
                    {t("Practice")}
                  </a>
                )}
              </nav>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
