import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Reveal from "../../components/Reveal";
import { buttonPrimary, buttonSecondary } from "../../components/ui";
import { useI18n } from "../../i18n";

export default function Hero() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <section id="top" className="px-4 pt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 pt-16 lg:grid-cols-[3fr_2fr] lg:gap-16">
        <div className="pb-2">
          <Reveal>
            <p className="font-mono text-sm text-neutral-500">
              {t("CPE practice for Yuan Ze University")}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-hero mt-6 max-w-[680px] text-5xl font-semibold tracking-tight xl:text-6xl">
              {t("Pass the CPE")}
              <br />
              {t("and graduate on time")}
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-8 max-w-[680px] text-lg text-neutral-400">
              {t(
                "Practice on past CPE problems with a judge that grades your code the way the exam does. Built at Yuan Ze for the departments that require it.",
              )}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-3">
                <Link to={user ? "/problems" : "/register"} className={buttonPrimary}>
                  {user ? t("Continue practicing") : t("Create your free account")}
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </Link>
                {/* Visitors can read every problem before signing up. */}
                {!user && (
                  <Link to="/problems" className={buttonSecondary}>
                    {t("Browse problems")}
                  </Link>
                )}
              </div>
              <p className="font-mono text-sm text-neutral-500">
                {t("Free for YZU students")}
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <figure>
            <img
              src="/yzu-campus.jpg"
              alt={t(
                "The main gate of Yuan Ze University, with the tall 元智大學 sign tower and the stone name wall under a blue sky",
              )}
              width={1434}
              height={1142}
              className="aspect-[4/3] w-full rounded-lg object-cover object-[35%_center] lg:aspect-square"
            />
            <figcaption className="mt-3 flex justify-between font-mono text-xs text-neutral-500">
              <span>{t("Main gate, Yuan Ze University")}</span>
              <span>{t("Taoyuan")}</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
