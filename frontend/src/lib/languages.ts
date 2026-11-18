import type { components } from "../api/schema";

// Languages a student can submit in; matches SubmissionCreate on the backend.
// The labels mirror the official CPE exam's language list.
export type Language = components["schemas"]["SubmissionCreate"]["language"];

// Reference solutions are only ever stored in Python and C++.
export type SolutionLanguage = "python" | "cpp";

// Everything the code editor is ever asked to show.
export type EditorLanguage = Language | SolutionLanguage;

export const LANGUAGES: { id: Language; label: string; version: string }[] = [
  { id: "python", label: "Python", version: "3.9.6" },
  { id: "c_gcc", label: "C/C++", version: "MinGW GCC 6.3.0" },
  { id: "c_msvc", label: "C/C++", version: "MSVC v140" },
  { id: "java8", label: "Java", version: "AdoptOpenJDK 8" },
  { id: "java11", label: "Java", version: "AdoptOpenJDK 11" },
];

// The solution viewer only offers the two languages solutions are written in.
export const SOLUTION_LANGUAGES: { id: SolutionLanguage; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "cpp", label: "C++" },
];

export const STARTER_CODE: Record<Language, string> = {
  python: `# Read from standard input, print to standard output.
import sys

for line in sys.stdin:
    pass
`,
  c_gcc: `// C/C++ (MinGW GCC 6.3.0): C++14, and bits/stdc++.h is available.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`,
  c_msvc: `// C/C++ (MSVC v140): C++14. MSVC has no bits/stdc++.h, so include each header.
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`,
  java8: `// Java (AdoptOpenJDK 8): the class must be named Main.
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        String line;
        while ((line = in.readLine()) != null) {
            // Read from standard input, print to standard output.
        }
    }
}
`,
  java11: `// Java (AdoptOpenJDK 11): the class must be named Main.
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        String line;
        while ((line = in.readLine()) != null) {
            // Read from standard input, print to standard output.
        }
    }
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
