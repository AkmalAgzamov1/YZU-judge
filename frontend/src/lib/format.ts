import type { Problem, Submission } from "../api/client";
import { dateLocale, tr } from "../i18n/translate";

export function formatTime(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

export function formatMemory(mb: number | null | undefined) {
  return mb == null ? "n/a" : `${mb} MB`;
}

// The backend stores UTC without a zone marker.
function parseServerDate(iso: string) {
  return new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
}

export function formatRelative(iso: string) {
  const date = parseServerDate(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return tr("just now");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return tr("{n} min ago", { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return tr("{n} h ago", { n: hours });
  const days = Math.round(hours / 24);
  if (days === 1) return tr("yesterday");
  if (days < 7) return tr("{n} days ago", { n: days });
  return date.toLocaleDateString(dateLocale(), { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string) {
  return parseServerDate(iso).toLocaleString(dateLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function problemLabel(problem: Problem | undefined, problemId: number) {
  if (!problem) return tr("Problem #{id}", { id: problemId });
  return problem.uva_id ? `UVa ${problem.uva_id} · ${problem.title}` : problem.title;
}

export const languageLabel: Record<Submission["language"], string> = {
  python: "Python",
  cpp: "C++",
  java: "Java",
};
