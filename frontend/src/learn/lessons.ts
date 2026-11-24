import type { Key, Lang } from "../i18n";
import type { Topic } from "../lib/topics";

// Lessons are Markdown files in ./content/<lang>/<slug>.md, written in English and
// Traditional Chinese. Vietnamese, Russian and Indonesian readers get the English text.
export type LessonLang = "en" | "zh";
export type CodeLang = "python" | "cpp";

export type LessonGroup = "start" | "blocks" | "toolkit";

export interface Lesson {
  slug: string;
  group: LessonGroup;
  minutes: number;
  // Practice problems come from this topic; none for lessons that are not about one.
  topic?: Topic;
  title: Record<LessonLang, string>;
  summary: Record<LessonLang, string>;
}

export const GROUPS: { id: LessonGroup; label: Key; blurb: Key }[] = [
  { id: "start", label: "Start here", blurb: "Read input, store it, decide and repeat. Enough to solve your first CPE problem." },
  { id: "blocks", label: "Building blocks", blurb: "Lists of values, text and your own functions." },
  { id: "toolkit", label: "CPE toolkit", blurb: "The tools behind most easy and medium CPE problems, and the mistakes that cost points." },
];

export const LESSONS: Lesson[] = [
  {
    slug: "input-output",
    group: "start",
    minutes: 8,
    topic: "implementation",
    title: { en: "Input and output", zh: "輸入與輸出" },
    summary: {
      en: "Read numbers and lines from standard input, loop until the input ends, and print exactly what the judge expects.",
      zh: "從標準輸入讀數字和整行、讀到輸入結束為止，並印出評測系統要的格式。",
    },
  },
  {
    slug: "variables-and-types",
    group: "start",
    minutes: 7,
    topic: "math",
    title: { en: "Variables and data types", zh: "變數與資料型態" },
    summary: {
      en: "int, long long, double, char, string and bool: what each one holds and when an int is too small.",
      zh: "int、long long、double、char、string 和 bool 各能存什麼，以及 int 什麼時候不夠大。",
    },
  },
  {
    slug: "conditions",
    group: "start",
    minutes: 6,
    topic: "implementation",
    title: { en: "Conditions", zh: "條件判斷" },
    summary: {
      en: "if, else if and else, comparing values, and combining tests with and, or and not.",
      zh: "if、else if、else，比較數值，以及用 and、or、not 組合條件。",
    },
  },
  {
    slug: "loops",
    group: "start",
    minutes: 8,
    topic: "implementation",
    title: { en: "Loops", zh: "迴圈" },
    summary: {
      en: "for and while loops, counting, summing, break and continue, and loops inside loops.",
      zh: "for 與 while 迴圈、計數與加總、break 和 continue，以及巢狀迴圈。",
    },
  },
  {
    slug: "arrays-and-lists",
    group: "blocks",
    minutes: 8,
    topic: "implementation",
    title: { en: "Arrays and lists", zh: "陣列與串列" },
    summary: {
      en: "Store many values in a vector or a list, index them, and count with an array.",
      zh: "用 vector 或 list 存很多值、用索引取值，以及用陣列計數。",
    },
  },
  {
    slug: "strings",
    group: "blocks",
    minutes: 8,
    topic: "strings",
    title: { en: "Strings", zh: "字串" },
    summary: {
      en: "Characters, length, slicing, comparing, reversing and turning digits into numbers.",
      zh: "字元、長度、切片、比較、反轉，以及把數字字元轉成數字。",
    },
  },
  {
    slug: "functions",
    group: "blocks",
    minutes: 6,
    topic: "number-theory",
    title: { en: "Functions", zh: "函式" },
    summary: {
      en: "Give a piece of logic a name, pass it values and return a result, so the main loop stays short.",
      zh: "替一段邏輯取名字、傳入參數並回傳結果，讓主迴圈保持簡短。",
    },
  },
  {
    slug: "sorting",
    group: "toolkit",
    minutes: 7,
    topic: "sorting",
    title: { en: "Sorting", zh: "排序" },
    summary: {
      en: "Sort numbers and strings, reverse the order, and sort by your own rule.",
      zh: "排序數字和字串、反向排序，以及依照自己的規則排序。",
    },
  },
  {
    slug: "maps-and-sets",
    group: "toolkit",
    minutes: 7,
    topic: "data-structures",
    title: { en: "Maps and sets", zh: "Map 與 Set" },
    summary: {
      en: "Count words, look things up by name and remove duplicates with map, set, dict and set.",
      zh: "用 map、set、dict 和 set 計算次數、依名稱查找，以及去除重複。",
    },
  },
  {
    slug: "recursion",
    group: "toolkit",
    minutes: 7,
    topic: "brute-force",
    title: { en: "Recursion", zh: "遞迴" },
    summary: {
      en: "A function that calls itself: base cases, factorials and trying every choice.",
      zh: "呼叫自己的函式：終止條件、階乘，以及嘗試所有選擇。",
    },
  },
  {
    slug: "common-mistakes",
    group: "toolkit",
    minutes: 6,
    title: { en: "Common mistakes", zh: "常見錯誤" },
    summary: {
      en: "The missing newline, cin and getline, bits/stdc++.h on MSVC, overflow and slow input: the errors that fail correct ideas.",
      zh: "少了換行、cin 與 getline、MSVC 沒有 bits/stdc++.h、溢位、輸入太慢：讓正確想法沒過的錯誤。",
    },
  },
];

export function lessonLang(lang: Lang): LessonLang {
  return lang === "zh" ? "zh" : "en";
}

export function findLesson(slug: string | undefined) {
  const index = LESSONS.findIndex((lesson) => lesson.slug === slug);
  return index === -1 ? null : { lesson: LESSONS[index], index };
}

const files = import.meta.glob<string>("./content/*/*.md", { query: "?raw", import: "default" });

export async function loadLesson(slug: string, lang: LessonLang): Promise<string> {
  const load = files[`./content/${lang}/${slug}.md`] ?? files[`./content/en/${slug}.md`];
  if (!load) throw new Error(`No lesson file for ${slug}`);
  return load();
}

// Per browser conveniences: which lessons were opened, and the code language picked.
const READ_KEY = "yzu-judge:learn-read";
const CODE_KEY = "yzu-judge:learn-code";

export function readLessons(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markLessonRead(slug: string) {
  try {
    const read = readLessons();
    read.add(slug);
    localStorage.setItem(READ_KEY, JSON.stringify([...read]));
  } catch {
    // Storage can be blocked; the lesson still shows.
  }
}

export function loadCodeLang(): CodeLang {
  try {
    return localStorage.getItem(CODE_KEY) === "cpp" ? "cpp" : "python";
  } catch {
    return "python";
  }
}

export function saveCodeLang(lang: CodeLang) {
  try {
    localStorage.setItem(CODE_KEY, lang);
  } catch {
    // The choice still holds until the page is reloaded.
  }
}
