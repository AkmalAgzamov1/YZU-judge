題目給你很多值，而且你需要看不只一次時，就把它們存起來。C++ 用 `vector`，Python 用 `list`。兩者都依序保存數值，並可以用**索引**（從 0 開始）取出任何一個。

## 存起來再讀回來

讀入 `n` 個數字，反向印出。

```python
n = int(input())
a = list(map(int, input().split()))
for i in range(n - 1, -1, -1):
    print(a[i])
```

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    for (int i = n - 1; i >= 0; i--) cout << a[i] << "\n";
    return 0;
}
```

第一個元素是 `a[0]`，最後一個是 `a[n - 1]`。讀 `a[n]` 是錯的：Python 會丟出 `IndexError`，C++ 會讀到垃圾值或當掉，最後都變成 Runtime Error 或 Wrong Answer。

## 常用操作

| 要做的事 | Python | C++ |
| --- | --- | --- |
| 長度 | `len(a)` | `a.size()` |
| 加到最後 | `a.append(x)` | `a.push_back(x)` |
| 移除最後一個 | `a.pop()` | `a.pop_back()` |
| 最大、最小 | `max(a)`、`min(a)` | `*max_element(a.begin(), a.end())` |
| 總和 | `sum(a)` | `accumulate(a.begin(), a.end(), 0LL)` |
| 清空 | `a.clear()` | `a.clear()` |

在 C++ 裡，`max_element` 需要 `<algorithm>`，`accumulate` 需要 `<numeric>`。寫 `0LL` 讓總和是 `long long`。

## 用陣列計數

想知道每個小數值出現幾次，就直接把數值當成索引。統計 1 到 5 號候選人的票數：

```text
8
3 1 3 5 3 2 1 3
```

```python
n = int(input())
votes = list(map(int, input().split()))
count = [0] * 6
for v in votes:
    count[v] += 1
for c in range(1, 6):
    print(c, count[c])
```

```cpp
int n;
cin >> n;
vector<int> count(6, 0);
for (int i = 0; i < n; i++) {
    int v;
    cin >> v;
    count[v]++;
}
for (int c = 1; c <= 5; c++) cout << c << " " << count[c] << "\n";
```

陣列開 6 格，索引 5 才存在；第 0 格就是不用。

## 前綴和

常見技巧：先算好一次累積總和，之後「從位置 l 到 r 的總和」就能立刻回答。

```python
pre = [0] * (n + 1)
for i in range(n):
    pre[i + 1] = pre[i] + a[i]
# sum of a[l..r], both included:
print(pre[r + 1] - pre[l])
```

```cpp
vector<long long> pre(n + 1, 0);
for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];
// sum of a[l..r], both included:
cout << pre[r + 1] - pre[l] << "\n";
```

## 二維：網格

CPE 題目裡的地圖和棋盤都是字元網格，存成一串字串就好。

```text
3 4
#..#
....
.##.
```

```python
rows, cols = map(int, input().split())
grid = [input() for _ in range(rows)]
walls = sum(row.count("#") for row in grid)
print(walls)
```

```cpp
int rows, cols;
cin >> rows >> cols;
vector<string> grid(rows);
for (int r = 0; r < rows; r++) cin >> grid[r];
int walls = 0;
for (int r = 0; r < rows; r++)
    for (int c = 0; c < cols; c++)
        if (grid[r][c] == '#') walls++;
cout << walls << "\n";
```

> 一個測資檔有多筆測資時，請在測資迴圈**裡面**建立陣列，或在開頭清空。上一筆留下來的值，是「第一個範例過了、第二個錯了」的典型原因。
