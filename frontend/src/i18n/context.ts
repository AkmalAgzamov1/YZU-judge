import { createContext, type ReactNode } from "react";
import type { Key, Lang, Vars } from "./translate";

// A <tag>…</tag> in a line becomes whatever the function returns for its text;
// a {name} becomes the node itself. That keeps links inside translated sentences.
export type RichParts = Record<string, ReactNode | ((text: string) => ReactNode)>;

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  tn: (count: number, one: string, other: Key, vars?: Vars) => string;
  tx: (key: Key, parts: RichParts) => ReactNode;
  locale: string | undefined;
}

export const I18nContext = createContext<I18n | null>(null);
