import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageShell from "../components/PageShell";
import TaglineReveal from "../components/TaglineReveal";
import { useI18n } from "../i18n";
import Benefits from "./landing/Benefits";
import Faq from "./landing/Faq";
import FinalCta from "./landing/FinalCta";
import FounderNote from "./landing/FounderNote";
import HowToRegister from "./landing/HowToRegister";
import Hero from "./landing/Hero";
import HowItWorks from "./landing/HowItWorks";
import NextCpe from "./landing/NextCpe";
import WhyCpe from "./landing/WhyCpe";

export default function Landing() {
  const { hash } = useLocation();
  const { t } = useI18n();

  // Router links change the hash without scrolling, so scroll here.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <PageShell>
      <Hero />
      <WhyCpe />
      <HowToRegister />
      <NextCpe />
      <section aria-label={t("Our promise")} className="mx-auto max-w-6xl px-4 py-24 lg:pl-[33.333%]">
        <TaglineReveal
          lines={[
            t("Practice the format"),
            t("until it feels familiar,"),
            t("so the CPE costs you"),
            t("an afternoon, not a year."),
          ]}
        />
      </section>
      <Benefits />
      <HowItWorks />
      <FounderNote />
      <Faq />
      <FinalCta />
    </PageShell>
  );
}
