迴圈會重複執行一段程式。CPE 的解答大多是迴圈：外層一個走過所有測資，裡面再一兩個處理資料。

## for：重複固定次數

印出 1 到 5。

```python
for i in range(1, 6):
    print(i)
```

```cpp
for (int i = 1; i <= 5; i++) {
    cout << i << "\n";
}
```

`range(1, 6)` 會在 6 **之前**停下。C++ 的迴圈有三個部分：從哪裡開始（`int i = 1`）、什麼時候繼續（`i <= 5`）、每一步之後做什麼（`i++`）。

## 加總與計數

讀入 `n`，再讀 `n` 個數字，印出總和以及負數的個數。

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

計數器要在迴圈**之前**設為零。放在迴圈裡的話，每一步都會被重設。

## while：重複到某件事改變為止

事先不知道要做幾次時，用 `while`。計算一個數字有幾位：

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

輸入 `0` 時這段程式會印出 `0`。零、只有一個元素、最大值這類邊界情況，正是隱藏測資最常失敗的地方。

## break 與 continue

`break` 立刻離開迴圈，`continue` 跳到下一步。很多題目用一行 `0` 表示輸入結束：

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

## 迴圈裡的迴圈

內層迴圈在外層的每一步都會完整跑一遍。印出乘法表：

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

> 注意空格。兩個版本都只在數字**之間**印空格，行尾沒有，因為評測系統連行尾空格也會比對。

## 多少步算太多？

評測系統上的 C++ 每秒大約能跑一億個簡單步驟，Python 大約慢 10 到 30 倍。兩層迴圈各跑一萬次就是一億步：C++ 沒問題，Python 太慢。寫巢狀迴圈之前先看輸入範圍。
