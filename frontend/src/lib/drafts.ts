import { STARTER_CODE, type Language } from "./languages";

// scope keeps mock exam drafts apart from everyday practice drafts. Python
// keeps the original key, so drafts saved before C++ existed still load.
const draftKey = (problemId: number, scope: string | undefined, language: Language) => {
  const base = scope ? `yzu-judge:draft:${scope}:` : "yzu-judge:draft:";
  return language === "python" ? `${base}${problemId}` : `${base}${language}:${problemId}`;
};

export function loadDraft(problemId: number, scope?: string, language: Language = "python") {
  try {
    return localStorage.getItem(draftKey(problemId, scope, language)) ?? STARTER_CODE[language];
  } catch {
    return STARTER_CODE[language];
  }
}

export function saveDraft(problemId: number, code: string, scope?: string, language: Language = "python") {
  try {
    localStorage.setItem(draftKey(problemId, scope, language), code);
  } catch {
    // Storage can be unavailable in private windows; the editor still works.
  }
}
