Sorting puts values in order. Many problems become easy once the data is sorted: the median is the middle element, duplicates sit next to each other, and the closest pair is always neighbours.

## Sort numbers

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

Both sorts take about n·log n steps, so even a million numbers sort in well under a second in C++.

## Largest first

```python
a.sort(reverse=True)
```

```cpp
sort(a.begin(), a.end(), greater<int>());
```

## Strings sort alphabetically

`"apple" < "banana"`, and capital letters come before lowercase ones: `"Zoe" < "adam"`. Turn everything to one case first if the problem ignores case.

```python
names = ["mei", "Andy", "zoe", "Bo"]
names.sort(key=str.lower)
print(names)  # ['Andy', 'Bo', 'mei', 'zoe']
```

```cpp
vector<string> names = {"mei", "Andy", "zoe", "Bo"};
sort(names.begin(), names.end());   // Andy Bo mei zoe
```

## Sort by your own rule

Sort students by score, highest first, and by name when scores tie.

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

Output: `Chen 92`, `Lin 85`, `Wang 85`, `Ho 70`.

In Python, the `key` returns a tuple; tuples compare item by item, and the minus sign flips the score to descending. In C++, the comparison function answers "should `a` come before `b`?".

> In a C++ comparison, return `false` for equal elements. Writing `>=` instead of `>` can crash `sort` with a Runtime Error.

## Pairs

C++ `pair` and Python tuples already sort by the first value, then the second. That is often all you need.

```python
events = [(14, "lunch"), (9, "class"), (14, "call")]
events.sort()
```

```cpp
vector<pair<int, string>> events = {{14, "lunch"}, {9, "class"}, {14, "call"}};
sort(events.begin(), events.end());
```

## The median

```python
a.sort()
median = a[len(a) // 2]
```

```cpp
sort(a.begin(), a.end());
int median = a[a.size() / 2];
```

UVa 10041, Vito's Family, is solved exactly this way: the best house is at the median, then sum the distances.
