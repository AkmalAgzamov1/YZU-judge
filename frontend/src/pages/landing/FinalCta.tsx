import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Reveal from "../../components/Reveal";
import { buttonPrimary } from "../../components/ui";
import { useI18n } from "../../i18n";

export default function FinalCta() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <section className="px-4 pt-24 pb-24">
      <Reveal className="mx-auto max-w-6xl">
        <div className="grid items-end gap-12 border-t border-white/10 pt-16 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-hero max-w-[680px] text-5xl font-semibold tracking-tight md:text-6xl">
              {t("Your next CPE sitting")}
              <br />
              {t("is closer than it looks")}
            </h2>
            <p className="mt-6 max-w-[680px] text-lg text-neutral-400">
              {t("Solve your first past CPE problem tonight.")}
              <br className="hidden md:block" /> {t("Free for every YZU student, nothing to install.")}
            </p>
            <Link to={user ? "/problems" : "/register"} className={`${buttonPrimary} mt-8`}>
              {user ? t("Continue practicing") : t("Create your free account")}
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <img
            src="/ibpi-emblem.svg"
            alt=""
            width={551}
            height={560}
            className="hidden h-48 w-auto justify-self-end lg:block"
          />
        </div>
      </Reveal>
    </section>
  );
}
