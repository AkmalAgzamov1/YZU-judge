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
            title: "bits/stdc++.h only works with MinGW GCC",
            body: "The CPE offers two C/C++ compilers. `#include <bits/stdc++.h>` compiles with MinGW GCC, but MSVC does not have it, so the same code fails to compile there. Include the headers you need (`iostream`, `string`, `vector`, `algorithm`, `cmath`, `map`, `set`) and your code compiles with both.",
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
            title: "bits/stdc++.h 只有 MinGW GCC 能用",
            body: "CPE 提供兩種 C/C++ 編譯器。`#include <bits/stdc++.h>` 在 MinGW GCC 可以編譯，但 MSVC 沒有這個標頭檔，同樣的程式在那裡會編譯失敗。只引入需要的標頭檔（`iostream`、`string`、`vector`、`algorithm`、`cmath`、`map`、`set`），兩種編譯器就都能編譯。",
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
  vi: {
    title: "Lỗi thường gặp",
    intro:
      "Phần lớn bài nộp bị sai không phải vì ý tưởng sai. Lý do thường chỉ là thiếu một dấu xuống dòng, đọc một dòng sai cách, hoặc dùng một header mà môi trường thi không có. Hãy xem danh sách này trước khi nộp, và xem lại khi gặp một kết quả bạn không hiểu.",
    wrong: "Sai",
    right: "Đúng",
    sections: [
      {
        id: "output",
        title: "Định dạng output",
        tips: [
          {
            id: "final-newline",
            title: "Dòng cuối cũng phải xuống dòng",
            body: "UVa và CPE so sánh output của bạn từng byte. Nếu dòng cuối không có `\\n`, bài sẽ bị từ chối dù mọi con số đều đúng. Trong Python, `print` tự thêm dấu xuống dòng, nên đừng truyền `end=\"\"` ở dòng cuối.",
          },
          {
            id: "exact-text",
            title: "Chép đúng y nguyên chữ trong output",
            body: "`Case #1: 5` không phải `Case 1: 5` và cũng không phải `case #1:5`. Hãy chép từ, chữ hoa, khoảng trắng và dấu câu từ output mẫu, đừng gõ theo trí nhớ.",
          },
          {
            id: "blank-lines",
            title: "Dòng trống giữa các test, hay sau mỗi test?",
            body: "\"In một dòng trống giữa các test\" nghĩa là không có dòng trống sau test cuối cùng. Thừa hoặc thiếu dòng trống, hay có khoảng trắng ở cuối dòng, đều cho kết quả Lỗi trình bày.",
          },
          {
            id: "no-prompts",
            title: "Chỉ in ra đáp án",
            body: "Không in lời nhắc kiểu `Enter n:` và không để lại dòng in để debug. Hệ thống chấm coi mọi thứ bạn in ra là đáp án. Hãy xóa hoặc comment các dòng debug trước khi nộp.",
          },
        ],
      },
      {
        id: "input",
        title: "Đọc input",
        tips: [
          {
            id: "until-eof",
            title: "Đọc cho đến khi hết input",
            body: "Nhiều bài UVa không cho biết có bao nhiêu test: bạn phải đọc cho đến hết file. Nếu chỉ đọc một test, các test còn lại sẽ không có đáp án.",
          },
          {
            id: "getline",
            title: "Dùng getline khi dòng có khoảng trắng",
            body: "`cin >> s` dừng ở khoảng trắng đầu tiên. Với tên, câu, hay bất kỳ dòng nào có thể chứa khoảng trắng, hãy đọc cả dòng bằng `getline(cin, s)`.",
          },
          {
            id: "cin-then-getline",
            title: "cin >> rồi getline sẽ đọc ra dòng rỗng",
            body: "Sau `cin >> n`, ký tự xuống dòng vẫn còn trong input, nên `getline` tiếp theo trả về chuỗi rỗng. Hãy bỏ qua phần còn lại của dòng bằng `cin.ignore(...)` trước, hoặc đọc mọi dòng bằng `getline` rồi tự tách số.",
          },
          {
            id: "python-eof",
            title: "input() bị lỗi khi hết input",
            body: "Khi không còn gì để đọc, `input()` ném ra `EOFError`, và bạn nhận Lỗi lúc chạy. Hãy lặp qua `sys.stdin`: vòng lặp sẽ tự dừng khi hết input.",
          },
        ],
      },
      {
        id: "cpp",
        title: "C++",
        tips: [
          {
            id: "bits-stdc",
            title: "bits/stdc++.h chỉ dùng được với MinGW GCC",
            body: "CPE có hai trình biên dịch C/C++. `#include <bits/stdc++.h>` biên dịch được với MinGW GCC, nhưng MSVC không có header này, nên cùng đoạn code đó sẽ không biên dịch được ở đó. Hãy include đúng các header bạn cần (`iostream`, `string`, `vector`, `algorithm`, `cmath`, `map`, `set`) và code sẽ chạy được với cả hai.",
          },
          {
            id: "overflow",
            title: "int bị tràn khi vượt quá khoảng 2,1 tỷ",
            body: "`int` chứa tối đa 2,147,483,647. Tổng, tích và giai thừa vượt qua con số đó rất nhanh. Hãy dùng `long long`, và nhớ tính toán bằng `long long`: `a * b` với hai biến `int` đã tràn trước khi được gán.",
          },
          {
            id: "reset",
            title: "Đặt lại biến cho mỗi test",
            body: "Biến đếm, mảng và vector khai báo ngoài vòng lặp vẫn giữ giá trị của test trước. Kết quả là test mẫu đầu tiên đúng còn test thứ hai sai. Hãy khai báo chúng bên trong vòng lặp hoặc xóa chúng ở đầu vòng lặp.",
          },
          {
            id: "fast-io-cpp",
            title: "Nhập xuất chậm gây Vượt quá giới hạn thời gian",
            body: "Khi input lớn, `cin` thông thường và `endl` có thể quá chậm: `endl` đẩy output ra sau mỗi dòng. Hãy tắt đồng bộ với C I/O ở đầu `main` và in `\"\\n\"`. Sau đó đừng trộn `cin`/`cout` với `scanf`/`printf`.",
          },
        ],
      },
      {
        id: "python",
        title: "Python",
        tips: [
          {
            id: "fast-io-python",
            title: "input() chậm khi input lớn",
            body: "Gọi `input()` hàng trăm nghìn lần có thể tự nó đã vượt giới hạn thời gian. Hãy đọc tất cả một lần bằng `sys.stdin.read().split()` rồi duyệt qua danh sách.",
          },
          {
            id: "recursion-limit",
            title: "Đệ quy sâu dừng ở khoảng 1000 lần gọi",
            body: "Python ném ra `RecursionError` sau khoảng 1000 lần gọi lồng nhau, và bạn nhận Lỗi lúc chạy. Hãy tăng giới hạn ở đầu file, hoặc viết lại đệ quy thành vòng lặp.",
          },
          {
            id: "division",
            title: "/ luôn cho ra số thực",
            body: "`7 / 2` là `3.5`. Dùng `//` để chia lấy phần nguyên. Khi đề yêu cầu hai chữ số thập phân, hãy in bằng `f\"{x:.2f}\"`, đừng dùng `round(x, 2)`: `round` bỏ các số 0 ở cuối, nên `2.5` in ra là `2.5` thay vì `2.50`.",
          },
        ],
      },
    ],
  },
  ru: {
    title: "Частые ошибки",
    intro:
      "Чаще всего решение не проходит не из-за неверной идеи. Обычно дело в одном пропущенном переводе строки, неправильном чтении строки или заголовке, которого нет на экзамене. Пройдитесь по этому списку перед отправкой и ещё раз, если получили непонятный вердикт.",
    wrong: "Неправильно",
    right: "Правильно",
    sections: [
      {
        id: "output",
        title: "Формат вывода",
        tips: [
          {
            id: "final-newline",
            title: "Последняя строка тоже заканчивается переводом строки",
            body: "UVa и CPE сравнивают вывод байт в байт. Если последняя строка выведена без `\\n`, ответ не засчитают, даже если все числа верны. В Python `print` сам добавляет перевод строки, поэтому не передавайте `end=\"\"` в последней строке.",
          },
          {
            id: "exact-text",
            title: "Выводите текст ровно как в условии",
            body: "`Case #1: 5` это не `Case 1: 5` и не `case #1:5`. Копируйте слова, заглавные буквы, пробелы и знаки препинания из примера вывода, а не пишите по памяти.",
          },
          {
            id: "blank-lines",
            title: "Пустая строка между тестами или после каждого?",
            body: "«Выводите пустую строку между тестами» значит, что после последнего теста пустой строки нет. Лишние или пропущенные пустые строки и пробелы в конце строки дают Ошибку формата.",
          },
          {
            id: "no-prompts",
            title: "Выводите только ответ",
            body: "Никаких подсказок вроде `Enter n:` и отладочного вывода. Проверяющая система считает ответом всё, что вы вывели. Удалите или закомментируйте отладку перед отправкой.",
          },
        ],
      },
      {
        id: "input",
        title: "Чтение ввода",
        tips: [
          {
            id: "until-eof",
            title: "Читайте до конца ввода",
            body: "Во многих задачах UVa не сказано, сколько будет тестов: читать нужно до конца файла. Если прочитать только один тест, остальные останутся без ответа.",
          },
          {
            id: "getline",
            title: "getline, если в строке есть пробелы",
            body: "`cin >> s` останавливается на первом пробеле. Имена, предложения и любые строки, где могут быть пробелы, читайте целиком через `getline(cin, s)`.",
          },
          {
            id: "cin-then-getline",
            title: "После cin >> getline читает пустую строку",
            body: "После `cin >> n` перевод строки остаётся во вводе, и следующий `getline` возвращает пустую строку. Сначала пропустите остаток строки через `cin.ignore(...)` или читайте все строки через `getline` и разбирайте числа сами.",
          },
          {
            id: "python-eof",
            title: "input() падает в конце ввода",
            body: "Когда читать больше нечего, `input()` бросает `EOFError`, и вы получаете Ошибку выполнения. Вместо этого перебирайте `sys.stdin` в цикле: он сам закончится в конце ввода.",
          },
        ],
      },
      {
        id: "cpp",
        title: "C++",
        tips: [
          {
            id: "bits-stdc",
            title: "bits/stdc++.h работает только с MinGW GCC",
            body: "На CPE два компилятора C/C++. `#include <bits/stdc++.h>` компилируется в MinGW GCC, но в MSVC этого заголовка нет, и там тот же код не скомпилируется. Подключайте нужные заголовки сами (`iostream`, `string`, `vector`, `algorithm`, `cmath`, `map`, `set`), тогда код соберётся в обоих.",
          },
          {
            id: "overflow",
            title: "int переполняется после примерно 2,1 миллиарда",
            body: "`int` вмещает до 2 147 483 647. Суммы, произведения и факториалы быстро выходят за этот предел. Используйте `long long`, причём и в самих вычислениях: `a * b` для двух `int` переполняется ещё до присваивания.",
          },
          {
            id: "reset",
            title: "Сбрасывайте переменные для каждого теста",
            body: "Счётчики, массивы и векторы, объявленные вне цикла, хранят значения прошлого теста. Первый пример проходит, второй уже нет. Объявляйте их внутри цикла или очищайте в его начале.",
          },
          {
            id: "fast-io-cpp",
            title: "Медленный ввод-вывод даёт превышение времени",
            body: "На большом вводе обычные `cin` и `endl` могут не успеть: `endl` сбрасывает буфер на каждой строке. Отключите синхронизацию с C I/O в начале `main` и выводите `\"\\n\"`. После этого не смешивайте `cin`/`cout` со `scanf`/`printf`.",
          },
        ],
      },
      {
        id: "python",
        title: "Python",
        tips: [
          {
            id: "fast-io-python",
            title: "input() медленный на большом вводе",
            body: "Сотни тысяч вызовов `input()` сами по себе могут не уложиться в лимит времени. Прочитайте всё сразу через `sys.stdin.read().split()` и идите по списку.",
          },
          {
            id: "recursion-limit",
            title: "Глубокая рекурсия обрывается на 1000 вызовов",
            body: "Python бросает `RecursionError` примерно после 1000 вложенных вызовов, и вы получаете Ошибку выполнения. Поднимите лимит в начале файла или перепишите рекурсию циклом.",
          },
          {
            id: "division",
            title: "/ всегда даёт дробное число",
            body: "`7 / 2` это `3.5`. Для целочисленного деления используйте `//`. Если нужно вывести два знака после запятой, пишите `f\"{x:.2f}\"`, а не `round(x, 2)`: `round` отбрасывает нули в конце, и `2.5` выводится как `2.5`, а не `2.50`.",
          },
        ],
      },
    ],
  },
  id: {
    title: "Kesalahan umum",
    intro:
      "Kebanyakan kiriman yang gagal bukan karena idenya salah. Biasanya hanya kurang satu baris baru, cara membaca satu baris yang keliru, atau header yang tidak ada di ujian. Cek daftar ini sebelum mengirim, dan baca lagi saat mendapat hasil yang tidak kamu pahami.",
    wrong: "Salah",
    right: "Benar",
    sections: [
      {
        id: "output",
        title: "Format output",
        tips: [
          {
            id: "final-newline",
            title: "Baris terakhir juga harus diakhiri baris baru",
            body: "UVa dan CPE membandingkan output-mu byte demi byte. Kalau baris terakhir dicetak tanpa `\\n`, jawabanmu ditolak meskipun semua angkanya benar. Di Python, `print` sudah menambahkan baris baru, jadi jangan pakai `end=\"\"` di baris terakhir.",
          },
          {
            id: "exact-text",
            title: "Salin teks output persis sama",
            body: "`Case #1: 5` tidak sama dengan `Case 1: 5` atau `case #1:5`. Salin kata, huruf kapital, spasi, dan tanda baca dari contoh output, jangan dari ingatan.",
          },
          {
            id: "blank-lines",
            title: "Baris kosong di antara kasus, atau setelah tiap kasus?",
            body: "\"Cetak baris kosong di antara kasus uji\" berarti tidak ada baris kosong setelah kasus terakhir. Baris kosong yang berlebih atau kurang, dan spasi di akhir baris, menghasilkan Kesalahan format.",
          },
          {
            id: "no-prompts",
            title: "Cetak jawabannya saja",
            body: "Jangan cetak `Enter n:` atau output debug. Sistem penilai menganggap semua yang kamu cetak sebagai jawaban. Hapus atau jadikan komentar baris debug sebelum mengirim.",
          },
        ],
      },
      {
        id: "input",
        title: "Membaca input",
        tips: [
          {
            id: "until-eof",
            title: "Baca sampai input habis",
            body: "Banyak soal UVa tidak menyebut ada berapa kasus uji: kamu harus terus membaca sampai akhir file. Kalau hanya membaca satu kasus, kasus lainnya tidak mendapat jawaban.",
          },
          {
            id: "getline",
            title: "Pakai getline kalau barisnya berisi spasi",
            body: "`cin >> s` berhenti di spasi pertama. Untuk nama, kalimat, atau baris apa pun yang bisa berisi spasi, baca seluruh baris dengan `getline(cin, s)`.",
          },
          {
            id: "cin-then-getline",
            title: "cin >> lalu getline membaca baris kosong",
            body: "Setelah `cin >> n`, karakter baris baru masih tersisa di input, jadi `getline` berikutnya mengembalikan string kosong. Lewati dulu sisa baris itu dengan `cin.ignore(...)`, atau baca semua baris dengan `getline` lalu urai angkanya sendiri.",
          },
          {
            id: "python-eof",
            title: "input() error di akhir input",
            body: "Saat tidak ada lagi yang bisa dibaca, `input()` melempar `EOFError`, dan hasilnya Kesalahan saat berjalan. Gunakan perulangan atas `sys.stdin`: perulangan berhenti sendiri di akhir input.",
          },
        ],
      },
      {
        id: "cpp",
        title: "C++",
        tips: [
          {
            id: "bits-stdc",
            title: "bits/stdc++.h hanya bisa dipakai dengan MinGW GCC",
            body: "CPE menyediakan dua kompiler C/C++. `#include <bits/stdc++.h>` bisa dikompilasi dengan MinGW GCC, tetapi MSVC tidak punya header ini, jadi kode yang sama gagal dikompilasi di sana. Include header yang kamu butuhkan (`iostream`, `string`, `vector`, `algorithm`, `cmath`, `map`, `set`) dan kodemu bisa dikompilasi di keduanya.",
          },
          {
            id: "overflow",
            title: "int overflow setelah sekitar 2,1 miliar",
            body: "`int` hanya menampung sampai 2.147.483.647. Jumlah, hasil kali, dan faktorial cepat melewati batas itu. Pakai `long long`, dan pastikan perhitungannya juga memakai `long long`: `a * b` dengan dua `int` sudah overflow sebelum disimpan.",
          },
          {
            id: "reset",
            title: "Reset variabel untuk setiap kasus uji",
            body: "Counter, array, dan vector yang dideklarasikan di luar perulangan masih menyimpan nilai dari kasus sebelumnya. Contoh pertama lolos, contoh kedua salah. Deklarasikan di dalam perulangan atau kosongkan di awalnya.",
          },
          {
            id: "fast-io-cpp",
            title: "Input dan output yang lambat menyebabkan Melebihi batas waktu",
            body: "Dengan input besar, `cin` biasa dan `endl` bisa terlalu lambat: `endl` mengosongkan buffer output di setiap baris. Matikan sinkronisasi dengan C I/O di awal `main` dan cetak `\"\\n\"`. Setelah itu, jangan campur `cin`/`cout` dengan `scanf`/`printf`.",
          },
        ],
      },
      {
        id: "python",
        title: "Python",
        tips: [
          {
            id: "fast-io-python",
            title: "input() lambat untuk input besar",
            body: "Memanggil `input()` ratusan ribu kali saja bisa melewati batas waktu. Baca semuanya sekaligus dengan `sys.stdin.read().split()` lalu telusuri list-nya.",
          },
          {
            id: "recursion-limit",
            title: "Rekursi dalam berhenti di sekitar 1000 panggilan",
            body: "Python melempar `RecursionError` setelah sekitar 1000 panggilan bersarang, dan hasilnya Kesalahan saat berjalan. Naikkan batasnya di awal file, atau ubah rekursi menjadi perulangan.",
          },
          {
            id: "division",
            title: "/ selalu menghasilkan float",
            body: "`7 / 2` hasilnya `3.5`. Pakai `//` untuk pembagian bilangan bulat. Kalau soal meminta dua angka desimal, cetak dengan `f\"{x:.2f}\"`, bukan `round(x, 2)`: `round` membuang nol di belakang, jadi `2.5` tercetak `2.5`, bukan `2.50`.",
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
