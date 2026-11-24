An array finds a value by its position. A **map** finds a value by a key you choose, such as a name or a word. A **set** only remembers whether something is there, and keeps each value once.

| | Python | C++ |
| --- | --- | --- |
| key to value | `dict` | `map` (sorted) or `unordered_map` |
| unique values | `set` | `set` (sorted) or `unordered_set` |

## Count words

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

Output, in alphabetical order: `and 2`, `bat 1`, `cat 1`, `hat 1`, `the 3`.

A C++ `map` creates a missing key with the value 0 the moment you use `counts[word]`, so `++` just works. It also keeps keys sorted, which is exactly what the output needs. A Python `dict` keeps the order you inserted, so sort the keys when the problem asks for order.

## Look something up

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

> In C++, check with `count` or `find` before reading `price[item]`. Reading a missing key with `[]` silently adds it with value 0.

## Remove duplicates

How many different numbers are in the input?

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

A C++ `set` is sorted too, so walking through it prints the distinct values in increasing order.

## Have I seen this before?

A set answers that instantly. Find the first repeated number:

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

## How fast is it?

A lookup in a Python `dict` or `set` takes about the same time no matter how many items it holds. A C++ `map` or `set` takes about log n steps, still fast for a million items. Searching a plain list with `in` checks every element, which becomes too slow inside a loop.
