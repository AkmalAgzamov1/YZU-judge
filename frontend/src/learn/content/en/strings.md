A string is a sequence of characters. Many CPE problems are pure string work: reverse a word, count letters, check a palindrome, decode a message.

## Characters and length

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

## Walk through every character

Count the vowels in a line.

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

## Pieces of a string

| Task | Python | C++ |
| --- | --- | --- |
| part from i, length k | `s[i:i+k]` | `s.substr(i, k)` |
| join two strings | `a + b` | `a + b` |
| find text | `s.find("ab")` (−1 if missing) | `s.find("ab")` (`string::npos` if missing) |
| upper and lower case | `s.upper()`, `s.lower()` | `toupper(c)`, `tolower(c)` per char |
| split at spaces | `s.split()` | read with `stringstream` |

## Reverse and palindromes

A palindrome reads the same in both directions, like `level`.

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

## Characters are numbers

Every character has a code: `'a'` is 97, `'b'` is 98, `'0'` is 48. That makes letter and digit math easy.

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

A Caesar cipher shifts every letter by k places, wrapping from `z` back to `a`:

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

## Splitting a line into words

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

> Strings in Python cannot be changed in place: build a new one, or turn it into a list with `list(s)`, change it, and join it back with `"".join(...)`. Building a long string with `+=` in a loop is slow in Python; collect the pieces in a list and join once.
