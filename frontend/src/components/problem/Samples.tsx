import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import type { Sample } from "../../api/client";
import { focusRing } from "../ui";

function SampleBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-neutral-500">{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className={`flex items-center gap-1 rounded px-2 py-1 font-mono text-xs text-neutral-500 transition duration-300 ease-soft hover:text-white ${focusRing}`}
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-ink-1 p-3 font-mono text-sm text-neutral-200">
        {text}
      </pre>
    </div>
  );
}

export default function Samples({ samples }: { samples: Sample[] }) {
  if (samples.length === 0) return null;

  return (
    <section aria-label="Samples" className="mt-12 flex flex-col gap-6">
      {samples.map((sample) => (
        <div key={sample.order}>
          <h2 className="text-lg font-semibold text-white">Sample {sample.order}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <SampleBlock label="Input" text={sample.input} />
            <SampleBlock label="Output" text={sample.output} />
          </div>
        </div>
      ))}
    </section>
  );
}
