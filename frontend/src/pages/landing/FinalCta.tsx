import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Reveal from "../../components/Reveal";
import { buttonPrimary } from "../../components/ui";

export default function FinalCta() {
  const { user } = useAuth();

  return (
    <section className="px-4 pt-24 pb-24">
      <Reveal className="mx-auto max-w-6xl">
        <div className="grid items-end gap-12 border-t border-white/10 pt-16 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-hero max-w-[680px] text-5xl font-semibold tracking-tight md:text-6xl">
              Your next CPE sitting
              <br />
              is closer than it looks
            </h2>
            <p className="mt-6 max-w-[680px] text-lg text-neutral-400">
              Solve your first past CPE problem tonight.
              <br className="hidden md:block" /> Free for every YZU student,
              nothing to install.
            </p>
            <Link to={user ? "/problems" : "/register"} className={`${buttonPrimary} mt-8`}>
              {user ? "Continue practicing" : "Create your free account"}
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <img
            src="/yzu-logo.png"
            alt=""
            width={316}
            height={316}
            className="hidden h-48 w-48 justify-self-end rounded-full bg-white p-1 lg:block"
          />
        </div>
      </Reveal>
    </section>
  );
}
