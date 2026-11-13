import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";
import { useI18n, type Key } from "../../i18n";

const steps: { title: Key; body: Key }[] = [
  {
    title: "Create an account",
    body: "A username, your email and a password. Under a minute, and every submission you make is saved.",
  },
  {
    title: "Pick a past CPE problem",
    body: "Start with the easy ones. Read the statement, check the sample, write your solution.",
  },
  {
    title: "Submit and read the verdict",
    body: "The judge runs your code against hidden tests and tells you exactly where it passed and where it failed.",
  },
];

export default function HowItWorks() {
  const { t } = useI18n();

  return (
    <section id="how" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader index="05" label={t("How it works")} title={t("Three steps to your first verdict")} />

        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 80}>
                <p className="font-mono text-6xl font-medium text-neutral-800">
                  {index + 1}
                </p>
                <h3 className="mt-6 text-xl font-semibold text-white">{t(step.title)}</h3>
                <p className="mt-2 text-base text-neutral-400">{t(step.body)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
