import type { components } from "../api/schema";

// Languages a student can submit in; matches SubmissionCreate on the backend.
export type Language = components["schemas"]["SubmissionCreate"]["language"];

export const LANGUAGES: { id: Language; label: string; version: string }[] = [
  { id: "python", label: "Python", version: "3.11" },
  { id: "cpp", label: "C++", version: "17" },
];

export const STARTER_CODE: Record<Language, string> = {
  python: `# Read from standard input, print to standard output.
import sys

for line in sys.stdin:
    pass
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`,
};

const PREFERRED_KEY = "yzu-judge:language";

export function isLanguage(value: string): value is Language {
  return LANGUAGES.some((language) => language.id === value);
}

// The last language a student used, so the editor opens in it next time.
export function loadPreferredLanguage(): Language {
  try {
    const stored = localStorage.getItem(PREFERRED_KEY);
    return stored && isLanguage(stored) ? stored : "python";
  } catch {
    return "python";
  }
}

export function savePreferredLanguage(language: Language) {
  try {
    localStorage.setItem(PREFERRED_KEY, language);
  } catch {
    // Storage can be unavailable; the editor still works.
  }
}
