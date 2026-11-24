字串是一串字元。很多 CPE 題目完全是在處理字串：反轉單字、數字母、判斷迴文、解碼訊息。

## 字元與長度

```python
s = "Taoyuan"
print(len(s))   # 7
print(s[0])     # T
print(s[-1])    # n, the last character
```

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s = "Taoyuan";
    cout << s.size() << "\n";            // 7
    cout << s[0] << "\n";                // T
    cout << s[s.size() - 1] << "\n";     // n
    return 0;
}
```

## 走過每一個字元

計算一行裡有幾個母音。

```python
line = input()
vowels = 0
for ch in line.lower():
    if ch in "aeiou":
        vowels += 1
print(vowels)
```

```cpp
#include <cctype>
string line;
getline(cin, line);
int vowels = 0;
for (char ch : line) {
    char c = tolower(ch);
    if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') vowels++;
}
cout << vowels << "\n";
```

## 字串的一部分

| 要做的事 | Python | C++ |
| --- | --- | --- |
| 從 i 開始取 k 個 | `s[i:i+k]` | `s.substr(i, k)` |
| 接起兩個字串 | `a + b` | `a + b` |
| 找文字 | `s.find("ab")`（找不到為 −1） | `s.find("ab")`（找不到為 `string::npos`） |
| 大小寫 | `s.upper()`、`s.lower()` | 逐字元 `toupper(c)`、`tolower(c)` |
| 依空白切開 | `s.split()` | 用 `stringstream` 讀 |

## 反轉與迴文

迴文是正著讀、反著讀都一樣的字，例如 `level`。

```python
s = input().strip()
if s == s[::-1]:
    print("yes")
else:
    print("no")
```

```cpp
#include <algorithm>
string s;
cin >> s;
string r = s;
reverse(r.begin(), r.end());
cout << (s == r ? "yes" : "no") << "\n";
```

## 字元其實是數字

每個字元都有編碼：`'a'` 是 97、`'b'` 是 98、`'0'` 是 48。字母和數字的運算因此變得很簡單。

```python
ch = "c"
print(ord(ch) - ord("a"))   # 2, its position in the alphabet
d = "7"
print(int(d) * 2)           # 14
print(chr(ord("a") + 3))    # d
```

```cpp
char ch = 'c';
cout << ch - 'a' << "\n";          // 2
char d = '7';
cout << (d - '0') * 2 << "\n";     // 14
cout << char('a' + 3) << "\n";     // d
```

凱薩密碼把每個字母往後移 k 位，`z` 之後繞回 `a`：

```python
def shift(ch, k):
    if ch.islower():
        return chr((ord(ch) - ord("a") + k) % 26 + ord("a"))
    return ch

print("".join(shift(c, 3) for c in input()))
```

```cpp
string line;
getline(cin, line);
for (char &ch : line) {
    if (ch >= 'a' && ch <= 'z') ch = char((ch - 'a' + 3) % 26 + 'a');
}
cout << line << "\n";
```

## 把一行切成單字

```python
words = input().split()
print(len(words))
```

```cpp
#include <sstream>
string line, word;
getline(cin, line);
stringstream ss(line);
int count = 0;
while (ss >> word) count++;
cout << count << "\n";
```

> Python 的字串不能直接修改：要建立新的字串，或用 `list(s)` 轉成串列、修改後再用 `"".join(...)` 接回去。在迴圈裡用 `+=` 組長字串在 Python 很慢；先把片段收進串列，最後一次 join。
