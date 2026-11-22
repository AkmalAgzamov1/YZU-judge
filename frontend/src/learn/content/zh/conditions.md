程式用 `if` 做決定。條件成立時才會執行那個區塊；其他情況交給 `else`。

## if 與 else

讀一個數字，判斷它是偶數還是奇數。

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

在 Python 裡，縮排決定哪些程式屬於 `if`。在 C++ 裡由大括號 `{ }` 決定，而且條件要加小括號。

## 比較數值

| 意思 | 運算子 |
| --- | --- |
| 等於 | `==` |
| 不等於 | `!=` |
| 小於、小於等於 | `<`、`<=` |
| 大於、大於等於 | `>`、`>=` |

> `=` 是存值，`==` 才是比較。在 C++ 裡 `if (n = 0)` 可以編譯，但結果永遠是錯的。Python 會直接給你語法錯誤。

## 兩種以上的情況：else if

把 0 到 100 的分數換成等第。

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

條件由上往下檢查，第一個成立的就勝出。95 分雖然也 `>= 80`，但根本不會檢查到那裡。

## 組合條件

| 意思 | Python | C++ |
| --- | --- | --- |
| 兩個都成立 | `and` | `&&` |
| 至少一個成立 | `or` | `\|\|` |
| 相反 | `not` | `!` |

閏年：能被 4 整除，但能被 100 整除的不是，除非也能被 400 整除。

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

Python 的 `a if 條件 else b`，以及 C++ 的 `條件 ? a : b`，可以在一行內從兩個值中選一個。

## 比較小數

小數帶有微小的捨入誤差：`0.1 + 0.2 == 0.3` 在兩種語言裡都是假的。請改用一個很小的容許誤差來比較。

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
