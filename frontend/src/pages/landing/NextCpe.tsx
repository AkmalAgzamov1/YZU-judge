import { ArrowSquareOut } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { problemsApi } from "../../api/client";
import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";
import { focusRing } from "../../components/ui";
import { useI18n, type Key, type Lang } from "../../i18n";
import { CPE_OFFICIAL_URL } from "../../lib/links";
import { NEXT_CPE, PAST_EXAM_COUNT, STAR_PROBLEMS, type StarProblem } from "../../lib/nextCpe";

const DAY_MS = 24 * 60 * 60 * 1000;

const examDay = new Date(NEXT_CPE.examDay);
const registrationOpens = new Date(NEXT_CPE.registrationOpens);
const registrationCloses = new Date(NEXT_CPE.registrationCloses);

const lastAsked = (problem: StarProblem) => problem.asked.at(-1);

// The shortest time any star problem took to come back. Nothing asked more
// recently than this has ever been repeated, so those are the least likely picks.
const shortestRepeatMs = Math.min(
  ...STAR_PROBLEMS.flatMap((problem) =>
    problem.asked.slice(1).map((date, index) => Date.parse(date) - Date.parse(problem.asked[index])),
  ),
);
const shortestRepeatYears = Math.floor((shortestRepeatMs / (365.25 * DAY_MS)) * 2) / 2;

function groupStarProblems(): { title: Key; note: Key; problems: StarProblem[]; muted: boolean }[] {
  const cutoff = examDay.getTime() - shortestRepeatMs;
  const byOldest = (a: StarProblem, b: StarProblem) => (lastAsked(a) ?? "").localeCompare(lastAsked(b) ?? "");

  return [
    {
      title: "Never asked yet",
      note: "On the list since the start, never picked.",
      problems: STAR_PROBLEMS.filter((problem) => problem.asked.length === 0),
      muted: false,
    },
    {
      title: "Due again",
      note: "Last asked more than {years} years before this exam.",
      problems: STAR_PROBLEMS.filter((problem) => {
        const last = lastAsked(problem);
        return last !== undefined && Date.parse(last) < cutoff;
      }).sort(byOldest),
      muted: false,
    },
    {
      title: "Asked recently",
      note: "None of the list has come back within {years} years, so these are unlikely.",
      problems: STAR_PROBLEMS.filter((problem) => {
        const last = lastAsked(problem);
        return last !== undefined && Date.parse(last) >= cutoff;
      }).sort(byOldest),
      muted: true,
    },
  ];
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function formatExamDay(lang: Lang) {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(examDay);
}

function registrationText(now: number, lang: Lang, t: (key: Key, vars?: Record<string, string>) => string) {
  const format = new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", {
    timeZone: "Asia/Taipei",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const opens = format.format(registrationOpens);
  const closes = format.format(registrationCloses);

  if (now < registrationOpens.getTime()) {
    return t("Registration opens {opens} and closes {closes} (Taipei time).", { opens, closes });
  }
  if (now < registrationCloses.getTime()) {
    return t("Registration is open until {closes} (Taipei time).", { closes });
  }
  return t("Registration for this sitting is closed.");
}

function Countdown({ now }: { now: number }) {
  const { t } = useI18n();
  const left = Math.max(0, examDay.getTime() - now);
  const parts: { value: number; unit: Key }[] = [
    { value: Math.floor(left / DAY_MS), unit: "days" },
    { value: Math.floor((left % DAY_MS) / (60 * 60 * 1000)), unit: "hours" },
    { value: Math.floor((left % (60 * 60 * 1000)) / (60 * 1000)), unit: "minutes" },
  ];

  return (
    <div className="flex gap-8" role="timer" aria-label={t("Time until the exam")}>
      {parts.map((part) => (
        <div key={part.unit}>
          <p className="font-mono text-5xl font-semibold tabular-nums text-white md:text-6xl">
            {String(part.value).padStart(2, "0")}
          </p>
          <p className="mt-1 text-sm text-neutral-500">{t(part.unit)}</p>
        </div>
      ))}
    </div>
  );
}

function StarChip({ problem, problemId, muted }: { problem: StarProblem; problemId?: number; muted: boolean }) {
  const { t } = useI18n();
  const label = (
    <>
      <span className="font-mono text-xs text-neutral-500">{problem.uva}</span>
      <span className={muted ? "text-neutral-400" : "text-white"}>{problem.title}</span>
    </>
  );
  const chip = `flex items-baseline gap-2 rounded-md border border-white/10 px-3 py-2 text-sm transition duration-300 ease-soft ${focusRing}`;

  if (problemId !== undefined) {
    return (
      <Link to={`/problems/${problemId}`} className={`${chip} bg-ink-1 hover:bg-ink-2`}>
        {label}
      </Link>
    );
  }
  // Not on YZU Judge yet: the statement is still on UVa.
  return (
    <a
      href={`https://onlinejudge.org/external/${Math.floor(problem.uva / 100)}/${problem.uva}.pdf`}
      target="_blank"
      rel="noreferrer"
      title={t("Not on YZU Judge yet. Opens the UVa statement.")}
      className={`${chip} border-dashed hover:bg-ink-1`}
    >
      {label}
      <span className="flex items-center gap-1 self-center font-mono text-xs text-neutral-500">
        UVa PDF
        <ArrowSquareOut aria-hidden="true" className="h-3 w-3" />
      </span>
    </a>
  );
}

export default function NextCpe() {
  const { t, tx, lang } = useI18n();
  const now = useNow(30_000);
  const groups = useMemo(groupStarProblems, []);
  const [problemIds, setProblemIds] = useState(new Map<number, number>());

  useEffect(() => {
    let cancelled = false;
    // Without the list the chips still work, they just link to UVa.
    problemsApi.list().then(
      (problems) => {
        if (cancelled) return;
        setProblemIds(
          new Map(problems.flatMap((problem) => (problem.uva_id ? [[problem.uva_id, problem.id]] : []))),
        );
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const examOver = now >= examDay.getTime() + DAY_MS;
  const years = shortestRepeatYears;
  const officialSite = (text: string) => (
    <a href={CPE_OFFICIAL_URL} target="_blank" rel="noreferrer" className={`rounded-sm text-neutral-300 underline underline-offset-2 hover:text-white ${focusRing}`}>
      {text}
    </a>
  );

  return (
    <section id="next-cpe" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          index="03"
          label={t("Next CPE")}
          title={examOver ? t("The next date is on its way") : t("The next CPE is {date}", { date: formatExamDay(lang) })}
        >
          <p>
            {t(
              "Every one of the last {count} CPE exams had exactly one problem from the official one star list, always as problem A, B or C. That one is meant to be solvable by anyone who passed an intro programming course, so it is the problem you cannot afford to miss.",
              { count: PAST_EXAM_COUNT },
            )}
          </p>
        </SectionHeader>

        <Reveal className="mt-16 lg:ml-[33.333%]">
          {examOver ? (
            <p className="text-lg text-neutral-400">
              {tx("Check the <a>official CPE website</a> for the next sitting.", { a: officialSite })}
            </p>
          ) : (
            <>
              <Countdown now={now} />
              <p className="mt-6 text-base text-neutral-400">
                {registrationText(now, lang, t)}{" "}
                {tx(
                  "Sign up on the <a>official CPE website</a>. International student? <b>Get your account first</b>, it takes one to two weeks.",
                  {
                    a: officialSite,
                    b: (text) => (
                      <Link to={{ pathname: "/", hash: "#register" }} className={`rounded-sm text-neutral-300 underline underline-offset-2 hover:text-white ${focusRing}`}>
                        {text}
                      </Link>
                    ),
                  },
                )}
              </p>
            </>
          )}
        </Reveal>

        <Reveal className="mt-16 lg:ml-[33.333%]">
          <h3 className="text-2xl font-semibold text-white">{t("Which star problem will it be?")}</h3>
          <div className="mt-3 max-w-[680px] space-y-3 text-base text-neutral-400">
            <p>
              {t(
                "The CPE keeps an official list of {n} \"one star\" problems, the easiest level it has. Here is the trick: every CPE takes exactly one of its seven problems from this list. We checked all {count} past exams, and not a single one broke this rule.",
                { n: STAR_PROBLEMS.length, count: PAST_EXAM_COUNT },
              )}
            </p>
            <p>
              {t(
                "So the list is your free point. Practice all {n} and you walk into the exam already knowing one of the problems. You still need a second one to pass in a single sitting, but you start from 1, not from 0.",
                { n: STAR_PROBLEMS.length },
              )}
            </p>
            <p>
              {t(
                "We can't know which one comes next, but the past exams show a pattern: a problem from the list has never come back within {years} years. Below is the whole list, grouped by when each problem was last asked. Start from the top. Dashed ones are not on YZU Judge, because the CPE never published test data for them, so they open the UVa statement instead.",
                { years },
              )}
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {groups.map((group) => (
              <div key={group.title}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-white/10 pt-4">
                  <h4 className="font-semibold text-white">{t(group.title)}</h4>
                  <span className="font-mono text-sm text-neutral-500">{group.problems.length}</span>
                  <p className="w-full text-sm text-neutral-500 sm:w-auto">{t(group.note, { years })}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.problems.map((problem) => (
                    <StarChip
                      key={problem.uva}
                      problem={problem}
                      problemId={problemIds.get(problem.uva)}
                      muted={group.muted}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
