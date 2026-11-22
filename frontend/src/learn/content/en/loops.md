A loop repeats a block of code. CPE solutions are mostly loops: one over the test cases, and one or two inside it over the data.

## for: repeat a known number of times

Print the numbers from 1 to 5.

```python
for i in range(1, 6):
    print(i)
```

```cpp
for (int i = 1; i <= 5; i++) {
    cout << i << "\n";
}
```

`range(1, 6)` stops **before** 6. The C++ loop has three parts: where to start (`int i = 1`), when to keep going (`i <= 5`) and what to do after each step (`i++`).

## Summing and counting

Read `n`, then `n` numbers, and print their sum and how many are negative.

```text
5
4 -2 7 -1 3
```

```python
n = int(input())
nums = list(map(int, input().split()))
total = 0
negatives = 0
for x in nums:
    total += x
    if x < 0:
        negatives += 1
print(total, negatives)
```

```cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    long long total = 0;
    int negatives = 0;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        total += x;
        if (x < 0) negatives++;
    }
    cout << total << " " << negatives << "\n";
    return 0;
}
```

Set the counters to zero **before** the loop. Starting them inside would reset them on every step.

## while: repeat until something changes

Use `while` when you do not know the number of steps in advance. Count the digits of a number:

```python
n = int(input())
digits = 0
while n > 0:
    n //= 10
    digits += 1
print(digits)
```

```cpp
long long n;
cin >> n;
int digits = 0;
while (n > 0) {
    n /= 10;
    digits++;
}
cout << digits << "\n";
```

This prints `0` for the input `0`. Edge cases like zero, one element or the largest value are where hidden tests usually fail.

## break and continue

`break` leaves the loop right away. `continue` skips to the next step. Many problems end with a sentinel line such as `0`:

```python
import sys

for line in sys.stdin:
    n = int(line)
    if n == 0:
        break
    if n < 0:
        continue
    print(n * n)
```

```cpp
int n;
while (cin >> n) {
    if (n == 0) break;
    if (n < 0) continue;
    cout << n * n << "\n";
}
```

## Loops inside loops

A loop inside another runs completely for every step of the outer one. Print a multiplication table:

```python
n = int(input())
for i in range(1, n + 1):
    row = []
    for j in range(1, n + 1):
        row.append(str(i * j))
    print(" ".join(row))
```

```cpp
int n;
cin >> n;
for (int i = 1; i <= n; i++) {
    for (int j = 1; j <= n; j++) {
        if (j > 1) cout << " ";
        cout << i * j;
    }
    cout << "\n";
}
```

> Watch the spaces. Both versions print a space **between** numbers and none at the end of the line, because the judge counts trailing spaces too.

## How many steps is too many?

A judge runs roughly 100 million simple steps per second in C++, and about 10 to 30 times fewer in Python. Two nested loops over 10,000 items is 100 million steps: fine in C++, too slow in Python. Check the input limits before you nest loops.
