import { apiMessages as zhApi, apiPatterns as zhPatterns, zh } from "./zh";
import { apiMessages as viApi, apiPatterns as viPatterns, vi } from "./vi";
import { apiMessages as ruApi, apiPatterns as ruPatterns, ru } from "./ru";
import { apiMessages as idApi, apiPatterns as idPatterns, id } from "./id";

export type Lang = "en" | "zh" | "vi" | "ru" | "id";

// The English text is the key, so English needs no dictionary and a missing
// translated line is a compile error against zh, while the runtime falls back to English.
export type Key = keyof typeof zh;

export type Vars = Record<string, string | number>;

const STORAGE_KEY = "yzu-judge:lang";

// Everything a non-English language needs, keyed by its code. Adding a language means
// adding one dictionary file and one line to each of these maps (and to LanguageSwitch).
type TranslatedLang = Exclude<Lang, "en">;

const DICTS: Record<TranslatedLang, Record<Key, string>> = { zh, vi, ru, id };
const API_MESSAGES: Record<TranslatedLang, Record<string, string>> = { zh: zhApi, vi: viApi, ru: ruApi, id: idApi };
const API_PATTERNS: Record<TranslatedLang, [RegExp, (match: RegExpMatchArray) => string][]> = {
  zh: zhPatterns,
  vi: viPatterns,
  ru: ruPatterns,
  id: idPatterns,
};

// Browser language prefixes that map straight onto our codes. zh catches zh-Hant/zh-CN too.
const NAVIGATOR_LANGS: [string, TranslatedLang][] = [["zh", "zh"], ["vi", "vi"], ["ru", "ru"], ["id", "id"]];

function detectLang(): Lang {
  // An explicit ?lang= in the address wins, so language links and hreflang alternates work.
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (fromUrl === "en" || fromUrl === "zh" || fromUrl === "vi" || fromUrl === "ru" || fromUrl === "id") return fromUrl;
  } catch {
    // No URL to read (should not happen in a browser); fall through.
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh" || stored === "vi" || stored === "ru" || stored === "id") return stored;
  } catch {
    // Storage can be blocked; fall back to the browser's language.
  }
  const preferred = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  for (const [prefix, lang] of NAVIGATOR_LANGS) {
    if (preferred.startsWith(prefix)) return lang;
  }
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

// For dates: each language gets its own formatting; English keeps the browser's own.
export function dateLocale(): string | undefined {
  if (current === "zh") return "zh-TW";
  if (current === "vi") return "vi";
  if (current === "ru") return "ru";
  if (current === "id") return "id";
  return undefined;
}

export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

// Usable outside React (formatters, the API client). Components use useI18n,
// which also re-renders them when the language changes.
export function tr(key: Key, vars?: Vars): string {
  if (current === "en") return key;
  return fill(DICTS[current][key] ?? key, vars);
}

// English has a singular; the other languages do not, so they only use the plural line.
export function trn(count: number, one: string, other: Key, vars?: Vars): string {
  const merged = { n: count, ...vars };
  if (current === "en") return fill(count === 1 ? one : other, merged);
  return fill(DICTS[current][other] ?? other, merged);
}

// The server answers in English. Known messages get their translated line here;
// an unknown one is shown as it came.
export function localizeApiMessage(message: string): string {
  if (current === "en") return message;
  const exact = API_MESSAGES[current][message];
  if (exact) return exact;
  for (const [pattern, build] of API_PATTERNS[current]) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
