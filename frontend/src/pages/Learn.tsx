import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { focusRing } from "../components/ui";
import { useI18n } from "../i18n";
import { GROUPS, LESSONS, lessonLang, readLessons } from "../learn/lessons";

export default function Learn() {
  const { t, lang } = useI18n();
  const textLang = lessonLang(lang);
  const [read] = useState(readLessons);

  // The first lesson not opened yet, so a returning student can pick up where they stopped.
  const next = LESSONS.find((lesson) => !read.has(lesson.slug)) ?? LESSONS[0];
  const nextNumber = LESSONS.indexOf(next) + 1;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl py-12 md:py-16">
        <header className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[680px]">
            <h1 className="text-hero text-5xl font-semibold tracking-tight text-balance">{t("Learn")}</h1>
            <p className="mt-4 text-lg text-pretty text-neutral-400">
              {t("Short lessons on the Python and C++ you need for the CPE. Every lesson has code to read and easy problems to try right after.")}
            </p>
          </div>
          <Link
            to={`/learn/${next.slug}`}
            className={`group flex shrink-0 items-center gap-4 rounded-xl border border-white/10 bg-ink-1 p-4 transition duration-300 ease-soft hover:border-white/20 hover:bg-ink-2 active:scale-[0.98] ${focusRing}`}
          >
            <span className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                {read.size === 0 ? t("Start with lesson {n}", { n: nextNumber }) : t("Continue with lesson {n}", { n: nextNumber })}
              </span>
              <span className="mt-1 text-base font-semibold text-white">{next.title[textLang]}</span>
            </span>
            <ArrowRight
              size={20}
              aria-hidden="true"
              className="text-neutral-400 transition duration-500 ease-soft group-hover:translate-x-1 group-hover:text-white"
            />
          </Link>
        </header>

        <div className="mt-16 flex flex-col gap-16">
          {GROUPS.map((group) => {
            const lessons = LESSONS.filter((lesson) => lesson.group === group.id);
            return (
              <section
                key={group.id}
                aria-labelledby={`group-${group.id}`}
                className="grid gap-6 border-t border-white/10 pt-8 md:grid-cols-[1fr_2fr] md:gap-12"
              >
                <div>
                  <h2 id={`group-${group.id}`} className="text-2xl font-semibold tracking-tight text-white">
                    {t(group.label)}
                  </h2>
                  <p className="mt-2 max-w-xs text-sm text-pretty text-neutral-500">{t(group.blurb)}</p>
                </div>

                <ol className="flex flex-col">
                  {lessons.map((lesson) => {
                    const number = LESSONS.indexOf(lesson) + 1;
                    const isRead = read.has(lesson.slug);
                    return (
                      <li key={lesson.slug}>
                        <Link
                          to={`/learn/${lesson.slug}`}
                          className={`group grid grid-cols-[2rem_1fr] items-start gap-x-4 gap-y-2 rounded-xl px-3 py-4 transition duration-300 ease-soft hover:bg-ink-1 sm:grid-cols-[3rem_1fr_auto] ${focusRing}`}
                        >
                          <span className="pt-0.5 font-mono text-sm text-neutral-600 tabular-nums">
                            {String(number).padStart(2, "0")}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-lg font-semibold text-white">{lesson.title[textLang]}</span>
                            <span className="mt-1 block text-sm text-pretty text-neutral-400">{lesson.summary[textLang]}</span>
                          </span>
                          <span className="col-start-2 flex items-center gap-2 text-xs whitespace-nowrap text-neutral-500 sm:col-start-3 sm:pt-1">
                            {isRead && (
                              <CheckCircle size={16} weight="fill" className="text-emerald-400" aria-label={t("Opened")} />
                            )}
                            {t("{n} min", { n: lesson.minutes })}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
