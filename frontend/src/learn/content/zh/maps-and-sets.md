陣列依位置找值。**Map** 依你選的鍵找值，例如名字或單字。**Set** 只記得某個值在不在，而且每個值只存一次。

| | Python | C++ |
| --- | --- | --- |
| 鍵對應到值 | `dict` | `map`（有排序）或 `unordered_map` |
| 不重複的值 | `set` | `set`（有排序）或 `unordered_set` |

## 計算單字次數

```text
the cat and the hat and the bat
```

```python
counts = {}
for word in input().split():
    counts[word] = counts.get(word, 0) + 1

for word in sorted(counts):
    print(word, counts[word])
```

```cpp
#include <iostream>
#include <map>
#include <string>
using namespace std;

int main() {
    map<string, int> counts;
    string word;
    while (cin >> word) counts[word]++;
    for (auto &entry : counts) cout << entry.first << " " << entry.second << "\n";
    return 0;
}
```

輸出依字母順序：`and 2`、`bat 1`、`cat 1`、`hat 1`、`the 3`。

C++ 的 `map` 在你使用 `counts[word]` 的瞬間，就會用 0 建立不存在的鍵，所以 `++` 可以直接用。它也會讓鍵保持排序，正好符合輸出需求。Python 的 `dict` 保留插入順序，題目要求順序時記得先排序鍵。

## 查找

```python
price = {"tea": 30, "coffee": 55, "toast": 40}
item = input().strip()
if item in price:
    print(price[item])
else:
    print("not on the menu")
```

```cpp
map<string, int> price = {{"tea", 30}, {"coffee", 55}, {"toast", 40}};
string item;
cin >> item;
if (price.count(item)) {
    cout << price[item] << "\n";
} else {
    cout << "not on the menu\n";
}
```

> 在 C++ 裡，讀 `price[item]` 之前先用 `count` 或 `find` 檢查。用 `[]` 讀不存在的鍵，會悄悄把它以 0 加進去。

## 去除重複

輸入裡有幾個不同的數字？

```python
nums = list(map(int, input().split()))
print(len(set(nums)))
```

```cpp
#include <set>
set<int> seen;
int x;
while (cin >> x) seen.insert(x);
cout << seen.size() << "\n";
```

C++ 的 `set` 也是排序好的，所以走過一遍就會由小到大印出不同的值。

## 這個值出現過嗎？

Set 可以立刻回答。找出第一個重複的數字：

```python
seen = set()
for x in map(int, input().split()):
    if x in seen:
        print(x)
        break
    seen.add(x)
```

```cpp
set<int> seen;
int x;
while (cin >> x) {
    if (seen.count(x)) {
        cout << x << "\n";
        break;
    }
    seen.insert(x);
}
```

## 有多快？

Python 的 `dict` 或 `set` 查找時間幾乎不受元素數量影響。C++ 的 `map` 或 `set` 大約需要 log n 步，一百萬個元素也很快。在一般串列裡用 `in` 搜尋則要檢查每一個元素，放在迴圈裡就會太慢。
