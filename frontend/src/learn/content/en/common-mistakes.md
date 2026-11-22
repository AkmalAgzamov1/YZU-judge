Most failed CPE submissions are not a wrong idea. They are one missing newline, the wrong way to read a line, or a header the compiler does not have. Check this list before you submit, and again after a verdict you do not understand.

## The last line needs a newline

UVa and the CPE compare your output byte for byte. If the last line has no `\n`, the answer fails even when every number is right.

```python
print(answer)                # print adds the newline
# not: print(answer, end="")
```

```cpp
cout << answer << "\n";      // not: cout << answer;
```

## Copy the output text exactly

`Case #1: 5` is not `Case 1: 5` and not `case #1:5`. Copy words, capital letters, spaces and punctuation from the sample output, not from memory.

## Blank lines between cases, or after each one?

"Print a blank line between test cases" means **no** blank line after the last case. Extra or missing blank lines, and spaces at the end of a line, give a Presentation Error.

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

## Print only the answer

No `Enter n:` prompts and no debug prints. The judge reads everything you print as the answer.

## Read until the input ends

If the problem does not say how many cases there are, keep reading until the end of the file. Reading only one case leaves the rest of the tests without an answer. See [Input and output](/learn/input-output).

## getline when the line has spaces

`cin >> s` stops at the first space, so `Ada Lovelace` becomes `Ada`. Read the whole line with `getline(cin, s)`.

## cin >> followed by getline reads an empty line

After `cin >> n`, the newline is still waiting, so the next `getline` returns `""`.

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

## input() crashes at the end of the input

`input()` raises `EOFError` when nothing is left, which shows up as a Runtime Error. Loop over `sys.stdin` instead:

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

## bits/stdc++.h only works with MinGW GCC

The CPE offers two C/C++ compilers. `#include <bits/stdc++.h>` compiles with MinGW GCC, but MSVC does not have it, so the same code fails to compile there. Include what you use and your code works with both.

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

## int overflows past about 2.1 billion

`int` holds up to 2,147,483,647. Use `long long`, and make sure the math itself is in `long long`: `a * b` with two `int`s overflows before it is stored. See [Variables and data types](/learn/variables-and-types).

## Reset your variables for every test case

Counters, arrays and maps declared outside the loop keep the previous case's values. The first sample passes, the second fails.

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

## Slow input and output cause Time Limit Exceeded

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

After `sync_with_stdio(false)`, do not mix `cin`/`cout` with `scanf`/`printf`.

## / always gives a float in Python

`7 / 2` is `3.5`; use `//` for integer division. For two decimals print `f"{x:.2f}"`, not `round(x, 2)`, which drops the trailing zero and prints `2.5` instead of `2.50`.
