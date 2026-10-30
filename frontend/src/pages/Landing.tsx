import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageShell from "../components/PageShell";
import TaglineReveal from "../components/TaglineReveal";
import Benefits from "./landing/Benefits";
import Faq from "./landing/Faq";
import FinalCta from "./landing/FinalCta";
import FounderNote from "./landing/FounderNote";
import Hero from "./landing/Hero";
import HowItWorks from "./landing/HowItWorks";
import WhyCpe from "./landing/WhyCpe";

export default function Landing() {
  const { hash } = useLocation();

  // Router links change the hash without scrolling, so scroll here.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <PageShell>
      <Hero />
      <WhyCpe />
      <section aria-label="Our promise" className="mx-auto max-w-6xl px-4 py-24 lg:pl-[33.333%]">
        <TaglineReveal
          lines={[
            "Practice the format",
            "until it feels familiar,",
            "so the CPE costs you",
            "an afternoon, not a year.",
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
