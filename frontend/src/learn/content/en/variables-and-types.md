A variable is a named box that holds a value. In C++ you choose the kind of box, its **type**, when you create it. Python works the type out from the value, but the same kinds of values exist in both languages.

## The types you will use

| Kind of value | C++ | Python | Example |
| --- | --- | --- | --- |
| Whole number | `int`, `long long` | `int` | `42`, `-7` |
| Decimal number | `double` | `float` | `3.14` |
| One character | `char` | a string of length 1 | `'A'` |
| Text | `string` | `str` | `"hello"` |
| True or false | `bool` | `bool` | `true` / `True` |

```python
age = 19
height = 1.72
grade = "A"
name = "Mei Lin"
passed = True
print(name, age, height, grade, passed)
```

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    int age = 19;
    double height = 1.72;
    char grade = 'A';
    string name = "Mei Lin";
    bool passed = true;
    cout << name << " " << age << " " << height << " " << grade << " " << passed << "\n";
    return 0;
}
```

C++ prints `true` as `1`. In C++, single quotes make a `char` and double quotes make a `string`; Python treats both the same.

## How big can an int get?

A C++ `int` holds values up to **2,147,483,647**, about 2.1 billion. Go past that and the number silently wraps around to a negative value. That is called **overflow**, and it turns a correct idea into a Wrong Answer.

`long long` holds up to about 9.2 × 10¹⁸. Python integers have no limit at all, so this section only bites in C++.

```python
a = 100000
b = 100000
print(a * b)  # 10000000000, Python never overflows
```

```cpp
#include <iostream>
using namespace std;

int main() {
    int a = 100000, b = 100000;
    cout << a * b << "\n";            // wrong: 1410065408

    long long x = 100000, y = 100000;
    cout << x * y << "\n";            // right: 10000000000
    return 0;
}
```

> A rule of thumb for the CPE: if a value can pass one billion (sums of many numbers, products, factorials, counts of pairs), use `long long`. The cost is nothing; the bug it prevents is hard to spot.

## Integer and decimal math

Dividing two integers in C++ drops the decimal part. Python has two operators instead.

```python
print(7 / 2)   # 3.5
print(7 // 2)  # 3, integer division
print(7 % 2)   # 1, the remainder
```

```cpp
cout << 7 / 2 << "\n";      // 3
cout << 7.0 / 2 << "\n";    // 3.5
cout << 7 % 2 << "\n";      // 1
```

The remainder operator `%` is everywhere in CPE problems: even or odd (`n % 2`), the last digit (`n % 10`), wrapping around a clock (`(h + 5) % 24`).

## Printing decimals

Problems often ask for an exact number of decimal places, such as two.

```python
x = 2.5
print(f"{x:.2f}")  # 2.50
```

```cpp
#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    double x = 2.5;
    cout << fixed << setprecision(2) << x << "\n";  // 2.50
    return 0;
}
```

## Converting between types

```python
n = int("42")      # text to number
s = str(42)        # number to text
d = float("3.5")
```

```cpp
#include <string>
int n = stoi("42");          // text to int
long long big = stoll("9000000000");
string s = to_string(42);    // number to text
double d = stod("3.5");
```
