Programs make decisions with `if`. The block runs only when the condition is true; `else` covers everything else.

## if and else

Read a number and say whether it is even or odd.

```python
n = int(input())
if n % 2 == 0:
    print("even")
else:
    print("odd")
```

```cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    if (n % 2 == 0) {
        cout << "even\n";
    } else {
        cout << "odd\n";
    }
    return 0;
}
```

In Python, the indentation decides what belongs to the `if`. In C++, the braces `{ }` do, and the condition needs parentheses.

## Comparing values

| Meaning | Operator |
| --- | --- |
| equal | `==` |
| not equal | `!=` |
| less, less or equal | `<`, `<=` |
| greater, greater or equal | `>`, `>=` |

> `=` stores a value, `==` compares. In C++, `if (n = 0)` compiles but always does the wrong thing. Python refuses it with a syntax error.

## More than two cases: else if

Turn a score from 0 to 100 into a grade.

```python
score = int(input())
if score >= 90:
    print("A")
elif score >= 80:
    print("B")
elif score >= 70:
    print("C")
else:
    print("F")
```

```cpp
int score;
cin >> score;
if (score >= 90) {
    cout << "A\n";
} else if (score >= 80) {
    cout << "B\n";
} else if (score >= 70) {
    cout << "C\n";
} else {
    cout << "F\n";
}
```

The tests run from top to bottom and the first true one wins. A score of 95 is also `>= 80`, but it never gets there.

## Combining conditions

| Meaning | Python | C++ |
| --- | --- | --- |
| both are true | `and` | `&&` |
| at least one is true | `or` | `\|\|` |
| the opposite | `not` | `!` |

A leap year is divisible by 4, except years divisible by 100, unless they are also divisible by 400.

```python
year = int(input())
leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
print("leap" if leap else "common")
```

```cpp
int year;
cin >> year;
bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
cout << (leap ? "leap" : "common") << "\n";
```

The short form `a if condition else b` in Python, and `condition ? a : b` in C++, picks one of two values in a single line.

## Comparing decimals

Decimal numbers carry tiny rounding errors: `0.1 + 0.2 == 0.3` is false in both languages. Compare with a small tolerance instead.

```python
EPS = 1e-9
if abs(a - b) < EPS:
    print("equal")
```

```cpp
#include <cmath>
const double EPS = 1e-9;
if (fabs(a - b) < EPS) {
    cout << "equal\n";
}
```
