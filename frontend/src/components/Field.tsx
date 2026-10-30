import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export default function Field({ id, label, error, hint, ...inputProps }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-neutral-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`rounded-lg border bg-ink-1 px-3 py-2 text-base text-white placeholder:text-neutral-600 transition duration-300 ease-soft focus:bg-ink-2 focus:outline-2 focus:outline-offset-2 ${
          error
            ? "border-yzu-red/60 focus:outline-yzu-red"
            : "border-white/10 hover:border-white/20 focus:outline-white"
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-yzu-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
