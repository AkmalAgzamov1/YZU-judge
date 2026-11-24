import type { Language } from "./languages";

export const MAX_CODE_FILE_BYTES = 65_536;

const CODE_FILE_EXTENSION: Record<Language, string> = {
  python: "py",
  c_gcc: "cpp",
  c_msvc: "cpp",
  java8: "java",
  java11: "java",
};

export class CodeFileTooLargeError extends Error {
  constructor() {
    super("The code file is too large.");
    this.name = "CodeFileTooLargeError";
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function codeFileName(title: string | null | undefined, language: Language) {
  const base =
    (title ?? "code")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "code";

  return `${base}.${CODE_FILE_EXTENSION[language]}`;
}

export function downloadCodeFile(code: string, name: string) {
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Returns false when the browser blocked the popup, so the caller can explain.
export function printCodeWindow(code: string, title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
      `<style>body{font:12px "Courier New",monospace;white-space:pre;}h1{font:700 16px sans-serif;}</style>` +
      `</head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(code)}</pre></body></html>`,
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}

export async function readCodeFile(file: File) {
  if (file.size > MAX_CODE_FILE_BYTES) throw new CodeFileTooLargeError();
  return file.text();
}
