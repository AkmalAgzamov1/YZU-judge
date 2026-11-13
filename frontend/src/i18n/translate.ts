import { apiMessages, apiPatterns, zh } from "./zh";

export type Lang = "en" | "zh";

// The English text is the key, so English needs no dictionary and a missing
// Chinese line is a compile error instead of a blank on the page.
export type Key = keyof typeof zh;

export type Vars = Record<string, string | number>;

const STORAGE_KEY = "yzu-judge:lang";

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh") return stored;
  } catch {
    // Storage can be blocked; fall back to the browser's language.
  }
  const preferred = navigator.languages?.[0] ?? navigator.language ?? "";
  return preferred.toLowerCase().startsWith("zh") ? "zh" : "en";
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

// For dates: Chinese gets Taiwan formats, English keeps the browser's own.
export function dateLocale(): string | undefined {
  return current === "zh" ? "zh-TW" : undefined;
}

export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

// Usable outside React (formatters, the API client). Components use useI18n,
// which also re-renders them when the language changes.
export function tr(key: Key, vars?: Vars): string {
  return fill(current === "zh" ? zh[key] : key, vars);
}

// English has a singular; Chinese does not, so it only needs the plural line.
export function trn(count: number, one: string, other: Key, vars?: Vars): string {
  const text = current === "zh" ? zh[other] : count === 1 ? one : other;
  return fill(text, { n: count, ...vars });
}

// The server answers in English. Known messages get their Chinese line here;
// an unknown one is shown as it came.
export function localizeApiMessage(message: string): string {
  if (current !== "zh") return message;
  const exact = apiMessages[message];
  if (exact) return exact;
  for (const [pattern, build] of apiPatterns) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
