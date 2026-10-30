import Reveal from "../../components/Reveal";

export default function FounderNote() {
  return (
    <section className="px-4 py-24">
      <Reveal className="mx-auto max-w-6xl">
        <figure className="grid gap-6 border-t border-white/10 pt-6 lg:grid-cols-[1fr_2fr]">
          <figcaption className="font-mono text-sm text-neutral-500">
            Why this exists
          </figcaption>
          <div>
            <blockquote className="max-w-[680px] text-3xl font-medium tracking-tight text-white md:text-4xl">
              “I watched some of my seniors stay an extra year because exam day
              was the first time they saw the format. YZU Judge is the practice
              I wish they had from their first semester.”
            </blockquote>
            <p className="mt-8 text-base text-neutral-400">
              <span className="font-semibold text-white">Akmal</span>
              <span className="text-neutral-600"> · </span>
              Yuan Ze University student, builder of YZU Judge
            </p>
          </div>
        </figure>
      </Reveal>
    </section>
  );
}
