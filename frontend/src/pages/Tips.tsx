import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import { focusRing } from "../components/ui";
import { useI18n, type Lang } from "../i18n";

// Anchors other pages link to (the verdict panel sends students straight to the fix).
export type TipId =
  | "final-newline"
  | "exact-text"
  | "blank-lines"
  | "no-prompts"
  | "until-eof"
  | "getline"
  | "cin-then-getline"
  | "python-eof"
  | "bits-stdc"
  | "overflow"
  | "reset"
  | "fast-io-cpp"
  | "fast-io-python"
  | "recursion-limit"
  | "division";

interface Tip {
  id: TipId;
  title: string;
  // `backticks` become inline code.
  body: string;
}

type SectionId = "output" | "input" | "cpp" | "python";

export type TipAnchor = TipId | SectionId;

interface Section {
  id: SectionId;
  title: string;
  tips: Tip[];
}

interface Page {
  title: string;
  intro: string;
  wrong: string;
  right: string;
  sections: Section[];
}

// Code is the same in every language, so it lives apart from the text.
const code: Partial<Record<TipId, { wrong?: string; right: string }>> = {
  "final-newline": {
    wrong: `cout << answer;    // no "\\n" at the end
print(answer, end="")`,
    right: `cout << answer << "\\n";
print(answer)`,
  },
  "blank-lines": {
    wrong: `for (int c = 1; c <= t; c++) {
    solve();
    cout << "\\n";  // after the last too
}`,
    right: `for (int c = 1; c <= t; c++) {
    if (c > 1) cout << "\\n";  // between
    solve();
}`,
  },
  "until-eof": {
    right: `// C++
int n;
while (cin >> n) {
    // one test case
}

# Python
import sys
for line in sys.stdin:
    n = int(line)`,
  },
  getline: {
    wrong: `string name;
cin >> name;  // "Ada Lovelace" -> "Ada"`,
    right: `string name;
getline(cin, name);  // the whole line`,
  },
  "cin-then-getline": {
    wrong: `int n;
cin >> n;
getline(cin, line);  // reads ""`,
    right: `int n;
cin >> n;
cin.ignore(numeric_limits<streamsize>::max(), '\\n');
getline(cin, line);  // the next line`,
  },
  "python-eof": {
    wrong: `while True:
    line = input()  # EOFError at the end`,
    right: `import sys
for line in sys.stdin:
    line = line.rstrip("\\n")`,
  },
  "bits-stdc": {
    wrong: `#include <bits/stdc++.h>`,
    right: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;`,
  },
  overflow: {
    wrong: `int a = 100000, b = 100000;
long long x = a * b;  // overflows first`,
    right: `long long a = 100000, b = 100000;
long long x = a * b;  // 10000000000`,
  },
  reset: {
    wrong: `int cnt[26];  // filled by case 1
while (cin >> s) {
    for (char c : s) cnt[c - 'a']++;
}`,
    right: `while (cin >> s) {
    int cnt[26] = {};  // fresh each case
    for (char c : s) cnt[c - 'a']++;
}`,
  },
  "fast-io-cpp": {
    right: `int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // ...
    cout << x << "\\n";  // not endl
}`,
  },
  "fast-io-python": {
    wrong: `n = int(input())
nums = [int(input()) for _ in range(n)]`,
    right: `import sys
data = sys.stdin.read().split()
n = int(data[0])
nums = list(map(int, data[1:n + 1]))`,
  },
  "recursion-limit": {
    right: `import sys
sys.setrecursionlimit(1_000_000)`,
  },
  division: {
    wrong: `print(7 / 2)          # 3.5
print(round(2.5, 2))  # 2.5`,
    right: `print(7 // 2)         # 3
print(f"{2.5:.2f}")   # 2.50`,
  },
};

// Whole pages rather than single lines, so each language is kept together here.
const content: Record<Lang, Page> = {
  en: {
    title: "Common mistakes",
    intro:
      "Most failed submissions are not a wrong idea. They are one missing newline, the wrong way to read a line, or a header the exam does not have. Check this list before you submit, and again after a verdict you do not understand.",
    wrong: "Wrong",
    right: "Right",
    sections: [
      {
        id: "output",
        title: "Output format",
        tips: [
          {
            id: "final-newline",
            title: "End the last line with a newline",
            body: "UVa and the CPE compare your output byte for byte. If the last line is printed without `\\n`, the answer is rejected even when every number is right. In Python, `print` adds the newline for you, so do not pass `end=\"\"` on the last line.",
          },
          {
            id: "exact-text",
            title: "Copy the output text exactly",
            body: "`Case #1: 5` is not `Case 1: 5` and not `case #1:5`. Copy words, capital letters, spaces and punctuation from the sample output, not from memory.",
          },
          {
            id: "blank-lines",
            title: "Blank line between cases, or after each one?",
            body: "\"Print a blank line between test cases\" means no blank line after the last case. Extra or missing blank lines and spaces at the end of a line give a Presentation error.",
          },
          {
            id: "no-prompts",
            title: "Print only the answer",
            body: "No `Enter n:` prompts and no debug prints. The judge reads everything you print as the answer. Remove or comment out debugging lines before you submit.",
          },
        ],
      },
      {
        id: "input",
        title: "Reading input",
        tips: [
          {
            id: "until-eof",
            title: "Read until the input ends",
            body: "Many UVa problems do not tell you how many test cases there are: you keep reading until the end of the file. If you read only one case, the rest of the tests get no answer.",
          },
          {
            id: "getline",
            title: "Use getline when the line has spaces",
            body: "`cin >> s` stops at the first space. For names, sentences or any line that can contain spaces, read the whole line with `getline(cin, s)`.",
          },
          {
            id: "cin-then-getline",
            title: "cin >> then getline reads an empty line",
            body: "After `cin >> n` the newline is still waiting in the input, so the next `getline` returns an empty string. Skip the rest of the line with `cin.ignore(...)` first, or read every line with `getline` and parse the numbers yourself.",
          },
          {
            id: "python-eof",
            title: "input() crashes at the end of the input",
            body: "`input()` raises `EOFError` when there is nothing left, which shows up as a Runtime error. Loop over `sys.stdin` instead: the loop simply stops at the end.",
          },
        ],
      },
      {
        id: "cpp",
        title: "C++",
        tips: [
          {
            id: "bits-stdc",
            title: "No bits/stdc++.h on the exam",
            body: "YZU Judge compiles `#include <bits/stdc++.h>`, but the CPE does not accept it, so the same code fails to compile on exam day. Get used to including the headers you need: `iostream`, `string`, `vector`, `algorithm`, `cmath`, `map`, `set`.",
          },
          {
            id: "overflow",
            title: "int overflows past about 2.1 billion",
            body: "`int` holds up to 2,147,483,647. Sums, products and factorials go past that quickly. Use `long long`, and make sure the math is done in `long long` too: `a * b` with two `int`s overflows before it is stored.",
          },
          {
            id: "reset",
            title: "Reset your variables for every test case",
            body: "Counters, arrays and vectors declared outside the loop keep the values from the previous case. The first sample passes and the second one is wrong. Declare them inside the loop or clear them at its start.",
          },
          {
            id: "fast-io-cpp",
            title: "Slow input and output cause Time limit exceeded",
            body: "With large input, plain `cin` and `endl` can be too slow: `endl` flushes the output every line. Turn off the sync with C I/O at the start of `main` and print `\"\\n\"`. After that, do not mix `cin`/`cout` with `scanf`/`printf`.",
          },
        ],
      },
      {
        id: "python",
        title: "Python",
        tips: [
          {
            id: "fast-io-python",
            title: "input() is slow for big input",
            body: "Calling `input()` hundreds of thousands of times can hit the time limit on its own. Read everything at once with `sys.stdin.read().split()` and walk through the list.",
          },
          {
            id: "recursion-limit",
            title: "Deep recursion stops at 1000 calls",
            body: "Python raises `RecursionError` after about 1000 nested calls, which shows up as a Runtime error. Raise the limit at the top of the file, or rewrite the recursion as a loop.",
          },
          {
            id: "division",
            title: "/ always gives a float",
            body: "`7 / 2` is `3.5`. Use `//` for integer division. When the problem asks for two decimals, print them with `f\"{x:.2f}\"`, not `round(x, 2)`: `round` drops trailing zeros, so `2.5` comes out as `2.5` instead of `2.50`.",
          },
        ],
      },
    ],
  },
  zh: {
    title: "常見錯誤",
    intro:
      "大部分沒過的提交，問題不在想法錯誤，而是少了一個換行、讀取一行的方式不對，或用了考試環境沒有的標頭檔。提交前先對照這份清單；看到不懂的評測結果時，再回來看一次。",
    wrong: "錯誤",
    right: "正確",
    sections: [
      {
        id: "output",
        title: "輸出格式",
        tips: [
          {
            id: "final-newline",
            title: "最後一行也要換行",
            body: "UVa 和 CPE 會逐字元比對你的輸出。如果最後一行沒有印出 `\\n`，即使每個數字都對也會被判錯。Python 的 `print` 會自動換行，所以最後一行不要加 `end=\"\"`。",
          },
          {
            id: "exact-text",
            title: "輸出文字要一模一樣",
            body: "`Case #1: 5` 不等於 `Case 1: 5`，也不等於 `case #1:5`。字詞、大小寫、空格和標點都要照範例輸出複製，不要憑記憶打。",
          },
          {
            id: "blank-lines",
            title: "空行是在測資之間，還是每筆之後？",
            body: "「在測資之間印一個空行」代表最後一筆後面不要空行。多了或少了空行、行尾多了空格，都會得到 Presentation error。",
          },
          {
            id: "no-prompts",
            title: "只印出答案",
            body: "不要印 `Enter n:` 這類提示，也不要留除錯輸出。評測系統會把你印出的所有內容都當成答案。提交前把除錯用的程式碼刪掉或註解掉。",
          },
        ],
      },
      {
        id: "input",
        title: "讀取輸入",
        tips: [
          {
            id: "until-eof",
            title: "讀到輸入結束為止",
            body: "很多 UVa 題目不會告訴你有幾筆測資，你要一直讀到檔案結尾。如果只讀一筆，其他測資就沒有答案。",
          },
          {
            id: "getline",
            title: "一行有空格時用 getline",
            body: "`cin >> s` 遇到第一個空格就停了。姓名、句子或任何可能含空格的一行，要用 `getline(cin, s)` 讀整行。",
          },
          {
            id: "cin-then-getline",
            title: "cin >> 之後的 getline 會讀到空字串",
            body: "`cin >> n` 之後，那一行的換行字元還留在輸入裡，所以下一個 `getline` 會回傳空字串。先用 `cin.ignore(...)` 跳過該行剩下的部分，或是每一行都用 `getline` 讀，再自己解析數字。",
          },
          {
            id: "python-eof",
            title: "input() 在輸入結束時會出錯",
            body: "沒有輸入可讀時，`input()` 會丟出 `EOFError`，結果就是 Runtime error。改用迴圈走過 `sys.stdin`，讀完就會自然結束。",
          },
        ],
      },
      {
        id: "cpp",
        title: "C++",
        tips: [
          {
            id: "bits-stdc",
            title: "考試不能用 bits/stdc++.h",
            body: "YZU Judge 可以編譯 `#include <bits/stdc++.h>`，但 CPE 不接受，同樣的程式在考試當天會編譯失敗。養成只引入需要的標頭檔的習慣：`iostream`、`string`、`vector`、`algorithm`、`cmath`、`map`、`set`。",
          },
          {
            id: "overflow",
            title: "int 超過約 21 億就會溢位",
            body: "`int` 最大是 2,147,483,647。加總、乘積和階乘很快就會超過。請用 `long long`，而且運算本身也要用 `long long`：兩個 `int` 相乘的 `a * b` 在存進去之前就已經溢位了。",
          },
          {
            id: "reset",
            title: "每筆測資都要重設變數",
            body: "宣告在迴圈外面的計數器、陣列和 vector 會留著上一筆測資的值。結果第一個範例過了，第二個就錯。把它們宣告在迴圈裡，或在迴圈開頭清空。",
          },
          {
            id: "fast-io-cpp",
            title: "輸入輸出太慢會 Time limit exceeded",
            body: "輸入很大時，一般的 `cin` 和 `endl` 可能太慢：`endl` 每一行都會清空輸出緩衝區。在 `main` 開頭關掉和 C I/O 的同步，並改印 `\"\\n\"`。關掉之後，不要再把 `cin`/`cout` 和 `scanf`/`printf` 混用。",
          },
        ],
      },
      {
        id: "python",
        title: "Python",
        tips: [
          {
            id: "fast-io-python",
            title: "輸入很大時 input() 很慢",
            body: "呼叫幾十萬次 `input()` 光是讀輸入就可能超時。用 `sys.stdin.read().split()` 一次讀完，再逐一處理這個串列。",
          },
          {
            id: "recursion-limit",
            title: "遞迴深度上限約 1000 層",
            body: "Python 遞迴超過大約 1000 層會丟出 `RecursionError`，結果就是 Runtime error。在檔案開頭提高上限，或把遞迴改寫成迴圈。",
          },
          {
            id: "division",
            title: "/ 一定會得到浮點數",
            body: "`7 / 2` 是 `3.5`。整數除法要用 `//`。題目要求印出兩位小數時，用 `f\"{x:.2f}\"`，不要用 `round(x, 2)`：`round` 不會補零，`2.5` 會印成 `2.5` 而不是 `2.50`。",
          },
        ],
      },
    ],
  },
};

function withInlineCode(text: string): ReactNode[] {
  return text.split("`").map((part, index) =>
    index % 2 === 1 ? (
      <code key={index} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-neutral-200">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

function CodeBlock({ label, tone, text }: { label: string; tone: "wrong" | "right"; text: string }) {
  const border = tone === "wrong" ? "border-yzu-red/40" : "border-emerald-400/30";
  const labelColor = tone === "wrong" ? "text-yzu-red" : "text-emerald-400";

  return (
    <div className={`min-w-0 rounded-md border ${border} bg-ink-1`}>
      <p className={`border-b border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
        {label}
      </p>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-neutral-300">{text}</pre>
    </div>
  );
}

export default function Tips() {
  const { lang } = useI18n();
  const page = content[lang];
  const { hash } = useLocation();

  // Router links change the hash without scrolling, so scroll here.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl py-12">
        <h1 className="text-4xl font-semibold tracking-tight text-white">{page.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-400">{page.intro}</p>

        <nav aria-label={page.title} className="mt-8 flex flex-wrap gap-2">
          {page.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`rounded-full border border-white/10 px-3 py-1.5 text-sm text-neutral-300 transition duration-300 ease-soft hover:border-white/30 hover:text-white ${focusRing}`}
            >
              {section.title}
            </a>
          ))}
        </nav>

        <div className="mt-12 flex flex-col gap-16">
          {page.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="text-2xl font-semibold tracking-tight text-white">
                {section.title}
              </h2>
              <div className="mt-6 flex flex-col gap-4">
                {section.tips.map((tip) => {
                  const snippet = code[tip.id];
                  return (
                    <article key={tip.id} id={tip.id} className="rounded-xl border border-white/10 bg-ink-1/60 p-5">
                      <h3 className="text-lg font-semibold text-white">
                        <a href={`#${tip.id}`} className={`rounded-sm hover:underline ${focusRing}`}>
                          {tip.title}
                        </a>
                      </h3>
                      <p className="mt-2 text-base leading-relaxed text-neutral-400">{withInlineCode(tip.body)}</p>
                      {snippet && (
                        <div className={`mt-4 grid gap-3 ${snippet.wrong ? "sm:grid-cols-2" : ""}`}>
                          {snippet.wrong && <CodeBlock label={page.wrong} tone="wrong" text={snippet.wrong} />}
                          <CodeBlock label={page.right} tone="right" text={snippet.right} />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
