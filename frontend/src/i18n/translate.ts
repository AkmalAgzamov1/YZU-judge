import { apiMessages as zhApi, apiPatterns as zhPatterns, zh } from "./zh";
import { apiMessages as viApi, apiPatterns as viPatterns, vi } from "./vi";

export type Lang = "en" | "zh" | "vi";

// The English text is the key, so English needs no dictionary and a missing
// Chinese line is a compile error instead of a blank on the page.
export type Key = keyof typeof zh;

export type Vars = Record<string, string | number>;

const STORAGE_KEY = "yzu-judge:lang";

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh" || stored === "vi") return stored;
  } catch {
    // Storage can be blocked; fall back to the browser's language.
  }
  const preferred = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  if (preferred.startsWith("zh")) return "zh";
  if (preferred.startsWith("vi")) return "vi";
  return "en";
}

let current: Lang = detectLang();

export function currentLang(): Lang {
  return current;
}

export function storeLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // The choice still holds until the page is reloaded.
  }
}

// For dates: Chinese gets Taiwan formats, Vietnamese gets its own, English the browser's.
export function dateLocale(): string | undefined {
  if (current === "zh") return "zh-TW";
  if (current === "vi") return "vi";
  return undefined;
}

export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

// Usable outside React (formatters, the API client). Components use useI18n,
// which also re-renders them when the language changes.
export function tr(key: Key, vars?: Vars): string {
  if (current === "zh") return fill(zh[key], vars);
  if (current === "vi") return fill(vi[key] ?? key, vars);
  return key;
}

// English has a singular; Chinese and Vietnamese do not, so they only use the plural line.
export function trn(count: number, one: string, other: Key, vars?: Vars): string {
  const merged = { n: count, ...vars };
  if (current === "zh") return fill(zh[other], merged);
  if (current === "vi") return fill(vi[other] ?? other, merged);
  return fill(count === 1 ? one : other, merged);
}

// The server answers in English. Known messages get their translated line here;
// an unknown one is shown as it came.
export function localizeApiMessage(message: string): string {
  const map = current === "zh" ? zhApi : current === "vi" ? viApi : null;
  if (!map) return message;
  const exact = map[message];
  if (exact) return exact;
  const patterns = current === "zh" ? zhPatterns : viPatterns;
  for (const [pattern, build] of patterns) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
