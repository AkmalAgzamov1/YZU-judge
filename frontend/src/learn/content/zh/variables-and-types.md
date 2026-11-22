變數是一個有名字、用來裝值的盒子。在 C++ 裡，建立變數時要選好盒子的種類，也就是**型態**。Python 會依照值自動決定型態，但兩種語言裡的值種類其實是一樣的。

## 常用的型態

| 值的種類 | C++ | Python | 例子 |
| --- | --- | --- | --- |
| 整數 | `int`、`long long` | `int` | `42`、`-7` |
| 小數 | `double` | `float` | `3.14` |
| 單一字元 | `char` | 長度為 1 的字串 | `'A'` |
| 文字 | `string` | `str` | `"hello"` |
| 真或假 | `bool` | `bool` | `true` / `True` |

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

C++ 會把 `true` 印成 `1`。在 C++ 裡，單引號是 `char`，雙引號是 `string`；Python 兩者都當成字串。

## int 能裝多大？

C++ 的 `int` 最大只到 **2,147,483,647**，大約 21 億。超過之後數字會悄悄繞回負數，這叫做**溢位**，會讓正確的想法變成 Wrong Answer。

`long long` 最大約 9.2 × 10¹⁸。Python 的整數沒有上限，所以這一節只會在 C++ 出問題。

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

> CPE 的經驗法則：只要數值可能超過十億（很多數字的總和、乘積、階乘、配對數量），就用 `long long`。這不需要任何代價，卻能避免很難發現的錯誤。

## 整數與小數運算

C++ 兩個整數相除會直接捨去小數部分。Python 則有兩種除法運算子。

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

取餘數的 `%` 在 CPE 題目裡到處都是：判斷奇偶（`n % 2`）、取最後一位數（`n % 10`）、時鐘繞一圈（`(h + 5) % 24`）。

## 印出小數

題目常要求固定位數的小數，例如兩位。

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

## 型態轉換

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
