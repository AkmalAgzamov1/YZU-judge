遞迴函式會用同一個問題的較小版本呼叫自己。每個遞迴函式都需要兩個部分：

1. 一個**終止條件**，小到可以直接回答。
2. 一個**遞迴步驟**，把問題縮小後再呼叫函式一次。

少了終止條件，呼叫就永遠停不下來，程式會以 Runtime Error 當掉。

## 階乘

5! = 5 × 4 × 3 × 2 × 1，而 n! = n × (n − 1)!

```python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
```

```cpp
long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

20! 還裝得進 `long long`，21! 就不行了。

## 反覆計算位數和

一直把數字的各位數相加，直到只剩一位（UVa 11332, Summing Digits）：9875 → 29 → 11 → 2。

```python
def g(n):
    if n < 10:
        return n
    return g(sum(int(d) for d in str(n)))

print(g(9875))  # 2
```

```cpp
long long digit_sum(long long n) {
    long long s = 0;
    while (n > 0) {
        s += n % 10;
        n /= 10;
    }
    return s;
}

long long g(long long n) {
    if (n < 10) return n;
    return g(digit_sum(n));
}
```

## 嘗試每一種選擇

當你一步一步建立答案、每一步都要試所有選項時，遞迴特別好用。印出 `{1, 2, 3}` 的所有子集合：

```python
def subsets(items, i, chosen):
    if i == len(items):
        print(chosen)
        return
    subsets(items, i + 1, chosen)                  # skip items[i]
    subsets(items, i + 1, chosen + [items[i]])     # take items[i]

subsets([1, 2, 3], 0, [])
```

```cpp
#include <iostream>
#include <vector>
using namespace std;

vector<int> items = {1, 2, 3};
vector<int> chosen;

void subsets(int i) {
    if (i == (int)items.size()) {
        for (int x : chosen) cout << x << " ";
        cout << "\n";
        return;
    }
    subsets(i + 1);              // skip items[i]
    chosen.push_back(items[i]);
    subsets(i + 1);              // take items[i]
    chosen.pop_back();           // undo before going back
}

int main() {
    subsets(0);
    return 0;
}
```

每多一個元素，工作量就加倍：20 個元素大約一百萬個子集合，沒問題；40 個就太多了。暴力搜尋之前先看輸入範圍。

## 遞迴太深的時候

Python 大約在 1000 層巢狀呼叫後丟出 `RecursionError`。在檔案開頭提高上限：

```python
import sys
sys.setrecursionlimit(10000)
```

```cpp
// C++ allows much deeper recursion, but a few hundred thousand levels can
// still overflow the stack. Rewrite very deep recursion as a loop.
```

## 記住已經算過的答案

單純的遞迴費氏數列會一再重算相同的值。第一次算出答案時就存起來，這叫做**記憶化**，也是邁向動態規劃的第一步。

```python
memo = {}

def fib(n):
    if n <= 1:
        return n
    if n not in memo:
        memo[n] = fib(n - 1) + fib(n - 2)
    return memo[n]

print(fib(80))
```

```cpp
#include <map>
map<int, long long> memo;

long long fib(int n) {
    if (n <= 1) return n;
    if (memo.count(n)) return memo[n];
    return memo[n] = fib(n - 1) + fib(n - 2);
}
```
