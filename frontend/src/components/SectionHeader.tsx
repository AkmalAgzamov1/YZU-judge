import type { ReactNode } from "react";
import Reveal from "./Reveal";

interface SectionHeaderProps {
  index: string;
  label: string;
  title: ReactNode;
  children?: ReactNode;
}

// Numbered, left aligned header that sits on a hairline, like a printed handout.
export default function SectionHeader({ index, label, title, children }: SectionHeaderProps) {
  return (
    <Reveal>
      <div className="grid gap-6 border-t border-white/10 pt-6 lg:grid-cols-[1fr_2fr]">
        <p className="font-mono text-sm text-neutral-500">
          {index} <span className="text-neutral-700">/</span> {label}
        </p>
        <div>
          <h2 className="max-w-[680px] text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {title}
          </h2>
          {children && (
            <div className="mt-6 max-w-[680px] text-lg text-neutral-400">{children}</div>
          )}
        </div>
      </div>
    </Reveal>
  );
}
