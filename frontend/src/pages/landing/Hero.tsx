import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import Reveal from "../../components/Reveal";
import { buttonPrimary } from "../../components/ui";

export default function Hero() {
  return (
    <section id="top" className="px-4 pt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 pt-16 lg:grid-cols-[3fr_2fr] lg:gap-16">
        <div className="pb-2">
          <Reveal>
            <p className="font-mono text-sm text-neutral-500">
              CPE practice for Yuan Ze University
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-hero mt-6 max-w-[680px] text-5xl font-semibold tracking-tight xl:text-6xl">
              Pass the CPE
              <br />
              and graduate on time
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-8 max-w-[680px] text-lg text-neutral-400">
              Practice on past CPE problems with a judge that grades your code
              the way the exam does. Built at Yuan Ze for the departments that
              require it.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
              <Link to="/register" className={`${buttonPrimary} self-start`}>
                Create your free account
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <p className="font-mono text-sm text-neutral-500">
                Free for YZU students
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <figure>
            <img
              src="/yzu-campus.jpg"
              alt="The main gate of Yuan Ze University, with the tall 元智大學 sign tower and the stone name wall under a blue sky"
              width={1434}
              height={1142}
              className="aspect-[4/3] w-full rounded-lg object-cover object-[35%_center] lg:aspect-square"
            />
            <figcaption className="mt-3 flex justify-between font-mono text-xs text-neutral-500">
              <span>Main gate, Yuan Ze University</span>
              <span>Taoyuan</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
