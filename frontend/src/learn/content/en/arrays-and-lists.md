When a problem gives you many values and you need to look at them more than once, store them. C++ uses a `vector`, Python a `list`. Both keep values in order and let you reach any of them by its **index**, starting from 0.

## Store and read back

Read `n` numbers and print them in reverse order.

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

The first element is `a[0]` and the last is `a[n - 1]`. Reading `a[n]` is a bug: Python raises `IndexError`, C++ reads garbage or crashes, and both end as Runtime Error or Wrong Answer.

## Useful operations

| Task | Python | C++ |
| --- | --- | --- |
| size | `len(a)` | `a.size()` |
| add at the end | `a.append(x)` | `a.push_back(x)` |
| remove the last | `a.pop()` | `a.pop_back()` |
| largest, smallest | `max(a)`, `min(a)` | `*max_element(a.begin(), a.end())` |
| sum | `sum(a)` | `accumulate(a.begin(), a.end(), 0LL)` |
| empty it | `a.clear()` | `a.clear()` |

In C++, `max_element` needs `<algorithm>` and `accumulate` needs `<numeric>`. Write `0LL` so the sum is a `long long`.

## Counting with an array

To count how often each small value appears, use the value itself as the index. Count the votes for candidates 1 to 5:

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

The array has 6 slots so that index 5 exists; slot 0 is simply unused.

## Prefix sums

A common trick: precompute running totals once, then answer "sum from position l to r" instantly.

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

## Two dimensions: grids

Maps and boards in CPE problems are grids of characters. Store them as a list of strings.

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

> When a test file has several test cases, create the array **inside** the loop over cases, or clear it at the start. Values left over from the previous case are a classic reason the first sample passes and the second fails.
