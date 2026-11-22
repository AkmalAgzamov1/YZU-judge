大部分沒過的 CPE 提交，問題不在想法錯誤，而是少了一個換行、讀取一行的方式不對，或用了編譯器沒有的標頭檔。提交前先對照這份清單；看到不懂的評測結果時，再回來看一次。

## 最後一行也要換行

UVa 和 CPE 會逐位元組比對你的輸出。最後一行沒有 `\n` 的話，即使每個數字都對也會失敗。

```python
print(answer)                # print adds the newline
# not: print(answer, end="")
```

```cpp
cout << answer << "\n";      // not: cout << answer;
```

## 輸出文字要一模一樣

`Case #1: 5` 不等於 `Case 1: 5`，也不等於 `case #1:5`。字詞、大小寫、空格和標點都照範例輸出複製，不要憑記憶打。

## 空行是在測資之間，還是每筆之後？

「在測資之間印一個空行」代表最後一筆後面**不要**空行。多了或少了空行、行尾多了空格，都會得到 Presentation Error。

```python
for c in range(1, t + 1):
    if c > 1:
        print()
    solve()
```

```cpp
for (int c = 1; c <= t; c++) {
    if (c > 1) cout << "\n";   // only between cases
    solve();
}
```

## 只印出答案

不要印 `Enter n:` 這類提示，也不要留除錯輸出。評測系統會把你印出的所有內容都當成答案。

## 讀到輸入結束為止

題目沒說有幾筆測資時，就一直讀到檔案結尾。只讀一筆的話，其他測資就沒有答案。請看[輸入與輸出](/learn/input-output)。

## 一行有空格時用 getline

`cin >> s` 遇到第一個空格就停，`Ada Lovelace` 會變成 `Ada`。用 `getline(cin, s)` 讀整行。

## cin >> 之後的 getline 會讀到空行

`cin >> n` 之後換行字元還留在輸入裡，所以下一個 `getline` 回傳 `""`。

```cpp
int n;
cin >> n;
cin.ignore(numeric_limits<streamsize>::max(), '\n');   // needs <limits>
getline(cin, line);                                    // now the next line
```

```python
# Python's input() always reads a whole line, so this problem does not exist.
n = int(input())
line = input()
```

## input() 在輸入結束時會出錯

沒有輸入可讀時，`input()` 會丟出 `EOFError`，結果就是 Runtime Error。改用迴圈走過 `sys.stdin`：

```python
import sys
for line in sys.stdin:
    line = line.rstrip("\n")
```

```cpp
string line;
while (getline(cin, line)) {
    // one line at a time
}
```

## bits/stdc++.h 只有 MinGW GCC 能用

CPE 提供兩種 C/C++ 編譯器。`#include <bits/stdc++.h>` 在 MinGW GCC 可以編譯，但 MSVC 沒有這個標頭檔，同樣的程式在那裡會編譯失敗。用到什麼就引入什麼，兩種編譯器都能過。

```cpp
#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <vector>
using namespace std;
```

```python
# Python has no headers; import only what you need.
import sys
from collections import Counter
```

## int 超過約 21 億就會溢位

`int` 最大是 2,147,483,647。請用 `long long`，而且運算本身也要用 `long long`：兩個 `int` 相乘的 `a * b` 在存進去之前就已經溢位了。請看[變數與資料型態](/learn/variables-and-types)。

## 每筆測資都要重設變數

宣告在迴圈外面的計數器、陣列和 map 會留著上一筆的值。第一個範例過了，第二個就錯。

```cpp
while (cin >> s) {
    int count[26] = {};   // fresh for every case
    // ...
}
```

```python
for line in sys.stdin:
    count = [0] * 26      # fresh for every case
```

## 輸入輸出太慢會 Time Limit Exceeded

```cpp
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // print "\n", not endl: endl flushes the output every line
    return 0;
}
```

```python
import sys
data = sys.stdin.read().split()   # read everything at once
```

關掉 `sync_with_stdio` 之後，不要再把 `cin`/`cout` 和 `scanf`/`printf` 混用。

## Python 的 / 一定得到浮點數

`7 / 2` 是 `3.5`，整數除法要用 `//`。要印兩位小數請用 `f"{x:.2f}"`，不要用 `round(x, 2)`，它會去掉結尾的 0，印出 `2.5` 而不是 `2.50`。
