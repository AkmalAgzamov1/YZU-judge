import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState, type InputHTMLAttributes } from "react";
import { focusRing } from "./ui";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export default function Field({ id, label, error, hint, type, ...inputProps }: FieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-neutral-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-ink-1 px-3 py-2 text-base text-white placeholder:text-neutral-600 transition duration-300 ease-soft focus:bg-ink-2 focus:outline-2 focus:outline-offset-2 ${
            isPassword ? "pr-12" : ""
          } ${
            error
              ? "border-yzu-red/60 focus:outline-yzu-red"
              : "border-white/10 hover:border-white/20 focus:outline-white"
          }`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className={`absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-2 text-neutral-500 transition duration-300 ease-soft hover:text-white ${focusRing}`}
          >
            {revealed ? (
              <EyeSlash size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
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
