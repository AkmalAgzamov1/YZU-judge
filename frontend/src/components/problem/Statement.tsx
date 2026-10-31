import { ArrowSquareOut, FilePdf } from "@phosphor-icons/react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { buttonSecondary } from "../ui";

// Problem statements are Markdown. Raw HTML is not rendered.
const components: Components = {
  h1: ({ children }) => <h2 className="mt-8 text-2xl font-semibold text-white">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-8 text-xl font-semibold text-white">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold text-white">{children}</h3>,
  p: ({ children }) => <p className="mt-4 text-base text-neutral-300">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-neutral-300">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-neutral-300">{children}</ol>,
  a: ({ children, href }) =>
    // Official statements are PDFs on the CPE site; make that link a clear button.
    href?.toLowerCase().endsWith(".pdf") ? (
      <a href={href} target="_blank" rel="noreferrer" className={`${buttonSecondary} my-2 no-underline`}>
        <FilePdf size={18} aria-hidden="true" />
        {children}
        <ArrowSquareOut size={14} className="text-neutral-500" aria-hidden="true" />
      </a>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" className="text-white underline underline-offset-2">
        {children}
      </a>
    ),
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <span className="text-white">{children}</span>,
  code: ({ children, className }) =>
    className ? (
      <code className={`${className} font-mono text-sm`}>{children}</code>
    ) : (
      <code className="rounded bg-ink-2 px-1 py-0.5 font-mono text-sm text-white">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-ink-1 p-4 text-neutral-200">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm text-neutral-300">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-white/10 px-3 py-2 text-left text-white">{children}</th>,
  td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
};

export default function Statement({ markdown }: { markdown: string }) {
  return (
    <div className="[&>*:first-child]:mt-0">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
