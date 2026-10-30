import { useEffect, useRef, type ReactNode } from "react";
import { buttonPrimary, buttonSecondary } from "./ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Native <dialog>: focus trapping, Escape and the backdrop come for free.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-ink-1 p-6 text-left text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-base text-neutral-300">{children}</div>
      {error && <p className="mt-4 text-sm text-yzu-red">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className={buttonSecondary} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={buttonPrimary} onClick={onConfirm} disabled={busy}>
          {busy ? "One moment…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
