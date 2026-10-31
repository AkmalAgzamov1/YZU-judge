import Reveal from "../../components/Reveal";
import SectionHeader from "../../components/SectionHeader";

const samples = [
  { input: "10 12", output: "2" },
  { input: "10 14", output: "4" },
  { input: "100 200", output: "100" },
];

const tests = [
  { id: 1, time: "0.04 s" },
  { id: 2, time: "0.05 s" },
  { id: 3, time: "0.31 s" },
  { id: 4, time: "0.87 s" },
];

const points = [
  {
    title: "Exam conditions",
    body: "Read from standard input, print to standard output, beat a strict time limit. Your code runs in an isolated container, like on the real judge.",
  },
  {
    title: "Verdicts you can read",
    body: "Each test case reports its runtime and memory, so you can tell a wrong answer from a slow one before you try again.",
  },
  {
    title: "Easy to hard",
    body: "Problems are tagged easy, medium and hard. Start with the warmups that open every CPE and move up when they pass on the first try.",
  },
];

function ProblemSheet() {
  return (
    <article className="rounded-lg border border-white/10 bg-ink-1 p-6 md:p-8">
      <p className="font-mono text-xs text-neutral-500">UVa 10055 · Past CPE problem · Easy</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">Hashmat the brave warrior</h3>
      <p className="mt-4 text-base text-neutral-400">
        Each line of input holds two integers: the size of Hashmat&apos;s army
        and the size of the opposing army. Neither is larger than 2³². For every
        line, print the difference between the two.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 font-mono text-sm">
        <div>
          <p className="text-xs text-neutral-500">Sample input</p>
          <pre className="mt-2 rounded-md bg-ink-0 p-3 text-neutral-300">
            {samples.map((s) => s.input).join("\n")}
          </pre>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Sample output</p>
          <pre className="mt-2 rounded-md bg-ink-0 p-3 text-neutral-300">
            {samples.map((s) => s.output).join("\n")}
          </pre>
        </div>
      </div>
    </article>
  );
}

function JudgeOutput() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-white/10 bg-ink-0 p-6 font-mono text-sm md:p-8">
      <p className="text-neutral-500">
        <span className="text-neutral-600">$</span> submit 10055.py
      </p>
      <p className="mt-2 text-neutral-500">judging against 4 hidden tests</p>

      <ul className="mt-6 flex flex-col gap-2">
        {tests.map((test) => (
          <li key={test.id} className="grid grid-cols-3 text-neutral-300">
            <span>test {test.id}</span>
            <span className="text-neutral-500">{test.time}</span>
            <span className="text-right text-emerald-400">accepted</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
          <span className="text-neutral-500">verdict</span>
          <span className="text-base font-semibold text-emerald-400">Accepted · 4/4</span>
        </div>
      </div>
    </div>
  );
}

export default function Benefits() {
  return (
    <section id="features" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          index="03"
          label="Practice"
          title="Real CPE problems, judged like the real exam"
        />

        <div className="mt-16 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Reveal>
            <ProblemSheet />
          </Reveal>
          <Reveal delay={80} className="h-full">
            <JudgeOutput />
          </Reveal>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {points.map((point, index) => (
            <Reveal key={point.title} delay={index * 80}>
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white">{point.title}</h3>
                <p className="mt-2 text-base text-neutral-400">{point.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
