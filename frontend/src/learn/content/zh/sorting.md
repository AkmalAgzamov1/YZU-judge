排序就是把值依順序排好。資料排好之後，很多題目就變簡單了：中位數就是中間那個、重複的值會相鄰、距離最近的兩個值一定是鄰居。

## 排序數字

```python
a = list(map(int, input().split()))
a.sort()
print(" ".join(map(str, a)))
```

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    sort(a.begin(), a.end());
    for (int i = 0; i < n; i++) {
        if (i > 0) cout << " ";
        cout << a[i];
    }
    cout << "\n";
    return 0;
}
```

兩種排序都大約需要 n·log n 步，所以 C++ 排一百萬個數字也不到一秒。

## 由大到小

```python
a.sort(reverse=True)
```

```cpp
sort(a.begin(), a.end(), greater<int>());
```

## 字串依字母順序排序

`"apple" < "banana"`，而且大寫字母排在小寫前面：`"Zoe" < "adam"`。題目不分大小寫時，先統一轉成同一種。

```python
names = ["mei", "Andy", "zoe", "Bo"]
names.sort(key=str.lower)
print(names)  # ['Andy', 'Bo', 'mei', 'zoe']
```

```cpp
vector<string> names = {"mei", "Andy", "zoe", "Bo"};
sort(names.begin(), names.end());   // Andy Bo mei zoe
```

## 依照自己的規則排序

學生依分數由高到低排序，分數相同時依姓名排序。

```text
4
Lin 85
Chen 92
Wang 85
Ho 70
```

```python
n = int(input())
students = []
for _ in range(n):
    name, score = input().split()
    students.append((name, int(score)))

students.sort(key=lambda s: (-s[1], s[0]))
for name, score in students:
    print(name, score)
```

```cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Student {
    string name;
    int score;
};

bool before(const Student &a, const Student &b) {
    if (a.score != b.score) return a.score > b.score;
    return a.name < b.name;
}

int main() {
    int n;
    cin >> n;
    vector<Student> s(n);
    for (auto &st : s) cin >> st.name >> st.score;
    sort(s.begin(), s.end(), before);
    for (auto &st : s) cout << st.name << " " << st.score << "\n";
    return 0;
}
```

輸出：`Chen 92`、`Lin 85`、`Wang 85`、`Ho 70`。

在 Python 裡，`key` 回傳一個 tuple；tuple 會逐項比較，負號讓分數變成由大到小。在 C++ 裡，比較函式回答的是「`a` 是否應該排在 `b` 前面？」。

> C++ 的比較函式遇到相等的元素要回傳 `false`。把 `>` 寫成 `>=` 可能讓 `sort` 當掉，得到 Runtime Error。

## Pair

C++ 的 `pair` 和 Python 的 tuple 本來就會先比第一個值、再比第二個值，通常這樣就夠了。

```python
events = [(14, "lunch"), (9, "class"), (14, "call")]
events.sort()
```

```cpp
vector<pair<int, string>> events = {{14, "lunch"}, {9, "class"}, {14, "call"}};
sort(events.begin(), events.end());
```

## 中位數

```python
a.sort()
median = a[len(a) // 2]
```

```cpp
sort(a.begin(), a.end());
int median = a[a.size() / 2];
```

UVa 10041（Vito's Family）就是這樣解的：最好的位置在中位數，再加總距離即可。
