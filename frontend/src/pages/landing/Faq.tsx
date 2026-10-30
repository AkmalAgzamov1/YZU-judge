import { Plus } from "@phosphor-icons/react";
import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";
import { focusRing } from "../../components/ui";

const faqs = [
  {
    q: "What is the CPE?",
    a: "The Collegiate Programming Examination is a national programming test for university students in Taiwan. You get 3 hours and a set of problems in English, written in the style of the UVa Online Judge. A computer judges your code against hidden tests.",
  },
  {
    q: "Do I need to pass it to graduate?",
    a: "Several YZU engineering departments require it. A common rule is 2 problems solved in one sitting, or 3 solved in total across separate sittings. Rules differ by department and enrollment year, so confirm yours with your department office.",
  },
  {
    q: "Are these real CPE problems?",
    a: "Yes. The problem set is built from past CPE exam problems, so you practice on the same kind of questions you will see on exam day, with test data to judge your code.",
  },
  {
    q: "When should I start practicing?",
    a: "As early as your first year. The CPE runs about four times a year, and every sitting you take while still relaxed is a free attempt. Waiting until senior year leaves very few chances.",
  },
  {
    q: "Is YZU Judge free?",
    a: "Yes. There is no payment, no ads and nothing to install. You only need an account so your submissions are saved.",
  },
  {
    q: "Which programming languages can I use?",
    a: "Python is supported today. C++ and Java are the next languages planned, since they are the most common choices on the CPE.",
  },
  {
    q: "Is this the official CPE website?",
    a: "No. YZU Judge is a practice site made at Yuan Ze University. Registration for the real exam happens on the official CPE website, usually announced by your department.",
  },
  {
    q: "I am not a CS major. Is this still for me?",
    a: "Yes. If your department requires the CPE, the easy problems are a good place to start even if programming is not your main subject.",
  },
];

export default function Faq() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <section id="faq" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader index="04" label="FAQ" title="Questions students ask" />

        <Reveal className="mt-16 lg:ml-[33.333%]">
          <div className="divide-y divide-white/10 border-y border-white/10">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group">
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold text-white transition duration-300 ease-soft hover:text-neutral-300 [&::-webkit-details-marker]:hidden ${focusRing}`}
                >
                  {q}
                  <Plus
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-neutral-500 transition duration-500 ease-soft group-open:rotate-45"
                  />
                </summary>
                <p className="max-w-[680px] pb-6 text-base text-neutral-400">{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>

      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </section>
  );
}
