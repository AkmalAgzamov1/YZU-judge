函式是一段有名字的程式。你給它一些值（**參數**），它做完工作後交回一個結果（**回傳值**）。函式讓主迴圈保持簡短，也讓你可以一次只測試一個想法。

## 寫一個函式並呼叫它

判斷一個數是不是質數。

```python
def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

n = int(input())
print("prime" if is_prime(n) else "not prime")
```

```cpp
#include <iostream>
using namespace std;

bool is_prime(long long n) {
    if (n < 2) return false;
    for (long long d = 2; d * d <= n; d++) {
        if (n % d == 0) return false;
    }
    return true;
}

int main() {
    long long n;
    cin >> n;
    cout << (is_prime(n) ? "prime" : "not prime") << "\n";
    return 0;
}
```

在 C++ 裡，名字前面要寫回傳型態（`bool`），每個參數也要寫型態。沒有回傳值的函式用 `void`。函式要定義在 `main` **上方**，編譯器才會在使用前認識它。

只檢查到 √n 為止的因數（`d * d <= n`），是讓大數也夠快的關鍵。

## 多個值進，一個值出

用輾轉相除法求最大公因數，是 CPE 數學題最常用的函式之一。

```python
def gcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a

def lcm(a, b):
    return a // gcd(a, b) * b

print(gcd(12, 18), lcm(4, 6))  # 6 12
```

```cpp
long long gcd(long long a, long long b) {
    while (b != 0) {
        long long t = a % b;
        a = b;
        b = t;
    }
    return a;
}

long long lcm(long long a, long long b) {
    return a / gcd(a, b) * b;
}
```

Python 有 `math.gcd`，C++17 也有 `std::gcd`，但 CPE 的 C++14 編譯器沒有，所以會寫這個迴圈很值得。

## 在函式裡修改值

C++ 的參數是**複本**。想讓函式修改呼叫者的變數，就用 `&` 以參考傳遞。很大的 vector 也應該用參考傳遞，避免每次呼叫都複製一份。

```cpp
void add_one(int &x) {
    x++;
}

long long total(const vector<int> &a) {
    long long s = 0;
    for (int x : a) s += x;
    return s;
}
```

```python
# Python passes the list itself, so changes to it are seen by the caller.
def add_one_to_all(a):
    for i in range(len(a)):
        a[i] += 1
```

## 每筆測資一個 solve 函式

整理多筆測資題目的好方法：一個函式解一筆測資。

```python
import sys

def solve(line):
    a, b = map(int, line.split())
    return a + b

for line in sys.stdin:
    if line.strip():
        print(solve(line))
```

```cpp
#include <iostream>
using namespace std;

long long solve(long long a, long long b) {
    return a + b;
}

int main() {
    long long a, b;
    while (cin >> a >> b) cout << solve(a, b) << "\n";
    return 0;
}
```

> 讀取和輸出集中在一個地方，思考的部分放進函式。某筆測資錯了，你就能用那筆輸入手動呼叫 `solve`，看看結果。
