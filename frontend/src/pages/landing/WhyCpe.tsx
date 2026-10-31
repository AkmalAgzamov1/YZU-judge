import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";
import { focusRing } from "../../components/ui";
import { CPE_OFFICIAL_URL } from "../../lib/links";

const spec = [
  { term: "Duration", value: "3 hours", note: "One computer, no internet, no notes." },
  { term: "Problems", value: "7, in English", note: "UVa Online Judge style, from warmups to hard." },
  { term: "Sittings", value: "About 4 a year", note: "Roughly one per season. Each one you skip is one less chance." },
  { term: "To graduate", value: "2 in one sitting", note: "Or 3 solved in total across separate sittings." },
];

export default function WhyCpe() {
  return (
    <section id="why" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader index="01" label="The exam" title="Most students meet the CPE too late">
          <p>
            The Collegiate Programming Exam is a graduation requirement in
            several YZU engineering departments. Many freshmen have never heard
            of it. Some seniors see the format for the first time on exam day,
            and some of them stay an extra year because of it.
          </p>
          <p className="mt-4 text-white">
            Some of those seniors are my close friends. YZU Judge is my attempt
            to fix this, so the next class meets the CPE early and walks in
            prepared.
          </p>
        </SectionHeader>

        <Reveal className="mt-16 lg:ml-[33.333%]">
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {spec.map((row) => (
              <div key={row.term} className="grid gap-2 py-6 sm:grid-cols-[1fr_1fr_2fr] sm:gap-6">
                <dt className="font-mono text-sm text-neutral-500">{row.term}</dt>
                <dd className="text-xl font-semibold text-white">{row.value}</dd>
                <dd className="text-base text-neutral-400">{row.note}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-neutral-500">
            Requirements differ by department and enrollment year. Confirm yours
            with your department office. Exam dates and registration are on the{" "}
            <a
              href={CPE_OFFICIAL_URL}
              target="_blank"
              rel="noreferrer"
              className={`rounded-sm text-neutral-300 underline underline-offset-2 hover:text-white ${focusRing}`}
            >
              official CPE website
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
