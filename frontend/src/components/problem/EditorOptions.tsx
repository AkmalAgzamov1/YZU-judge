import {
  ArrowCounterClockwise,
  DownloadSimple,
  Minus,
  Plus,
  Printer,
  SlidersHorizontal,
  UploadSimple,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n";
import {
  CodeFileTooLargeError,
  codeFileName,
  downloadCodeFile,
  printCodeWindow,
  readCodeFile,
} from "../../lib/codeFile";
import {
  clampEditorFontSize,
  EDITOR_FONT_DEFAULT,
  EDITOR_FONT_MAX,
  EDITOR_FONT_MIN,
} from "../../lib/editorSettings";
import type { Language } from "../../lib/languages";
import { focusRing } from "../ui";

interface EditorOptionsProps {
  code: string;
  language: Language;
  title: string | null;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onCodeLoaded: (code: string) => void;
}

// A small, quiet settings button on the editor itself. Font size and file
// actions live here instead of another row of toolbar buttons.
export default function EditorOptions({
  code,
  language,
  title,
  fontSize,
  onFontSizeChange,
  onCodeLoaded,
}: EditorOptionsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  function closeMenu(refocusTrigger = true) {
    setOpen(false);
    setError(null);
    if (refocusTrigger) triggerRef.current?.focus();
  }

  function toggleMenu() {
    if (open) {
      closeMenu();
    } else {
      setError(null);
      setOpen(true);
    }
  }

  function changeFont(next: number) {
    onFontSizeChange(clampEditorFontSize(next));
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await readCodeFile(file);
      onCodeLoaded(text);
      closeMenu();
    } catch (loadError) {
      setError(loadError instanceof CodeFileTooLargeError ? t("The file is too large.") : t("The file could not be read."));
    }
  }

  function saveFile() {
    downloadCodeFile(code, codeFileName(title, language));
    closeMenu();
  }

  function printFile() {
    if (printCodeWindow(code, title ?? "code")) {
      closeMenu();
    } else {
      setError(t("The browser blocked the print window."));
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu();
    }
  }

  const iconButton =
    "flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition duration-200 ease-soft hover:bg-ink-3 hover:text-white disabled:pointer-events-none disabled:opacity-30";
  const actionItem = `flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-neutral-300 transition duration-200 ease-soft hover:bg-ink-3 hover:text-white ${focusRing}`;

  return (
    <div ref={rootRef} className="absolute top-2 right-3 z-10" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="editor-options-menu"
        aria-label={t("Editor options")}
        title={t("Editor options")}
        onClick={toggleMenu}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-ink-1/90 text-neutral-400 backdrop-blur transition duration-300 ease-soft hover:bg-ink-2 hover:text-white ${focusRing} ${
          open ? "bg-ink-2 text-white" : ""
        }`}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id="editor-options-menu"
          role="menu"
          aria-label={t("Editor options")}
          tabIndex={-1}
          className="absolute top-full right-0 z-30 mt-1 w-64 rounded-lg border border-white/10 bg-ink-2 p-1 shadow-2xl focus:outline-none"
        >
          <div role="group" aria-label={t("Font size")} className="px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-neutral-400">{t("Font size")}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t("Smaller font")}
                  title={t("Smaller font")}
                  disabled={fontSize <= EDITOR_FONT_MIN}
                  onClick={() => changeFont(fontSize - 1)}
                  className={`${iconButton} ${focusRing}`}
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="w-10 text-center font-mono text-xs text-white tabular-nums">{fontSize}px</span>
                <button
                  type="button"
                  aria-label={t("Larger font")}
                  title={t("Larger font")}
                  disabled={fontSize >= EDITOR_FONT_MAX}
                  onClick={() => changeFont(fontSize + 1)}
                  className={`${iconButton} ${focusRing}`}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={t("Reset font size")}
                  title={t("Reset font size")}
                  disabled={fontSize === EDITOR_FONT_DEFAULT}
                  onClick={() => changeFont(EDITOR_FONT_DEFAULT)}
                  className={`${iconButton} ${focusRing}`}
                >
                  <ArrowCounterClockwise size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="my-1 h-px bg-white/10" />

          <button type="button" role="menuitem" className={actionItem} onClick={() => fileInputRef.current?.click()}>
            <UploadSimple size={16} aria-hidden="true" className="text-neutral-500" />
            {t("Load code…")}
          </button>
          <button type="button" role="menuitem" className={actionItem} onClick={saveFile}>
            <DownloadSimple size={16} aria-hidden="true" className="text-neutral-500" />
            {t("Save code")}
          </button>
          <button type="button" role="menuitem" className={actionItem} onClick={printFile}>
            <Printer size={16} aria-hidden="true" className="text-neutral-500" />
            {t("Print code")}
          </button>

          {error && (
            <p role="alert" className="px-2 py-1.5 text-xs text-yzu-red">
              {error}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".py,.pyw,.c,.cc,.cpp,.cxx,.h,.hpp,.java,.txt"
            onChange={(event) => void loadFile(event)}
          />
        </div>
      )}
    </div>
  );
}
