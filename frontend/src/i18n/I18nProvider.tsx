import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, type I18n, type RichParts } from "./context";
import { currentLang, dateLocale, storeLang, tr, trn, type Lang } from "./translate";

function renderRich(text: string, parts: RichParts): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(/<(\w+)>(.*?)<\/\1>|\{(\w+)\}/g)) {
    const [whole, tag, inner, name] = match;
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));

    const part = parts[tag ?? name];
    const node = typeof part === "function" ? part(inner ?? "") : part;
    nodes.push(node === undefined ? whole : <Fragment key={nodes.length}>{node}</Fragment>);
    last = start + whole.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang);

  const setLang = useCallback((next: Lang) => {
    storeLang(next);
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant-TW" : "en";
    document.title = tr("YZU Judge · Practice the CPE before it counts");
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: tr,
      tn: trn,
      tx: (key, parts) => renderRich(tr(key), parts),
      locale: dateLocale(),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
