import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";
import { focusRing } from "../../components/ui";
import { useI18n, type Key } from "../../i18n";
import { CPE_OFFICIAL_URL } from "../../lib/links";

const spec: { term: Key; value: Key; note: Key }[] = [
  { term: "Duration", value: "3 hours", note: "One computer, no internet, no notes." },
  { term: "Problems", value: "7, in English", note: "UVa Online Judge style, from warmups to hard." },
  { term: "Sittings", value: "About 4 a year", note: "Roughly one per season. Each one you skip is one less chance." },
  { term: "To graduate", value: "2 in one sitting", note: "Or 3 solved in total across separate sittings." },
];

export default function WhyCpe() {
  const { t, tx } = useI18n();

  return (
    <section id="why" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader index="01" label={t("The exam")} title={t("Most students meet the CPE too late")}>
          <p>
            {t(
              "The Collegiate Programming Exam is a graduation requirement in several YZU engineering departments. Many freshmen have never heard of it. Some seniors see the format for the first time on exam day, and some of them stay an extra year because of it.",
            )}
          </p>
          <p className="mt-4 text-white">
            {t(
              "Some of those seniors are my close friends. YZU Judge is my attempt to fix this, so the next class meets the CPE early and walks in prepared.",
            )}
          </p>
        </SectionHeader>

        <Reveal className="mt-16 lg:ml-[33.333%]">
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {spec.map((row) => (
              <div key={row.term} className="grid gap-2 py-6 sm:grid-cols-[1fr_1fr_2fr] sm:gap-6">
                <dt className="font-mono text-sm text-neutral-500">{t(row.term)}</dt>
                <dd className="text-xl font-semibold text-white">{t(row.value)}</dd>
                <dd className="text-base text-neutral-400">{t(row.note)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-neutral-500">
            {tx(
              "Requirements differ by department and enrollment year. Confirm yours with your department office. Exam dates and registration are on the <a>official CPE website</a>.",
              {
                a: (text) => (
                  <a
                    href={CPE_OFFICIAL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-sm text-neutral-300 underline underline-offset-2 hover:text-white ${focusRing}`}
                  >
                    {text}
                  </a>
                ),
              },
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
