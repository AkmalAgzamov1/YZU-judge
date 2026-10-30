import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";

const steps = [
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
  return (
    <section id="how" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader index="03" label="How it works" title="Three steps to your first verdict" />

        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 80}>
                <p className="font-mono text-6xl font-medium text-neutral-800">
                  {index + 1}
                </p>
                <h3 className="mt-6 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-base text-neutral-400">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
