import { Fragment, useEffect, useRef } from "react";

interface TaglineRevealProps {
  // Each entry is one line; lines break where the thought breaks.
  lines: string[];
}

// Each word starts muted and lights up as it crosses a line 40% above the
// bottom of the viewport. Words light up once and stay lit.
export default function TaglineReveal({ lines }: TaglineRevealProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const words = node.querySelectorAll<HTMLElement>("[data-word]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-on", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 1 },
    );

    words.forEach((word) => observer.observe(word));
    return () => observer.disconnect();
  }, []);

  return (
    <p
      ref={ref}
      className="max-w-[680px] text-4xl font-semibold tracking-tight text-white md:text-5xl"
    >
      {lines.map((line, lineIndex) => (
        <Fragment key={line}>
          {line.split(" ").map((word, wordIndex) => (
            <Fragment key={`${word}-${wordIndex}`}>
              <span
                data-word
                className="inline-block opacity-30 transition-opacity duration-500 ease-soft data-[on=true]:opacity-100"
              >
                {word}
              </span>{" "}
            </Fragment>
          ))}
          {lineIndex < lines.length - 1 && <br className="hidden md:block" />}
        </Fragment>
      ))}
    </p>
  );
}
