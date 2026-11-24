每一題 CPE 的運作方式都一樣：你的程式從**標準輸入**讀文字，再把結果寫到**標準輸出**。不用開檔案，也不會有人在鍵盤上打字。評測系統把測資送進你的程式，再把你印出的內容和正確答案逐字比對。

## 讀兩個數字，印出總和

經典的第一題。輸入是一行兩個整數，例如 `3 5`，你要印出 `8`。

```python
a, b = map(int, input().split())
print(a + b)
```

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << "\n";
    return 0;
}
```

在 Python 裡，`input()` 會把整行當成字串回傳，`split()` 依空白切開，`map(int, ...)` 再把每一段轉成數字。在 C++ 裡，`cin >>` 會自動跳過空白和換行，一次讀一個值。

## 讀到輸入結束為止

大部分 UVa 題目不會告訴你有幾筆測資，你要一直讀到沒有輸入為止。例如這樣的輸入：

```text
3 5
10 20
7 0
```

應該印出 `8`、`30`、`7`，每行一個。

```python
import sys

for line in sys.stdin:
    a, b = map(int, line.split())
    print(a + b)
```

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    while (cin >> a >> b) {
        cout << a + b << "\n";
    }
    return 0;
}
```

`while (cin >> a >> b)` 在讀取失敗時停止，也就是讀到輸入結尾的時候。Python 用 `for` 迴圈走過 `sys.stdin`，一次拿一行，讀完就停。輸入結束後還呼叫 `input()` 會出現 `EOFError`，所以不知道筆數時請用 `sys.stdin`。

## 先給筆數的情況

有些題目第一行就是測資筆數：

```text
2
3 5
10 20
```

```python
t = int(input())
for _ in range(t):
    a, b = map(int, input().split())
    print(a + b)
```

```cpp
#include <iostream>
using namespace std;

int main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        int a, b;
        cin >> a >> b;
        cout << a + b << "\n";
    }
    return 0;
}
```

## 讀取一整行

姓名和句子裡有空格，而 `cin >>` 遇到第一個空格就停了。用 `getline` 讀整行：

```python
name = input()
print("Hello, " + name + "!")
```

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    getline(cin, name);
    cout << "Hello, " << name << "!\n";
    return 0;
}
```

> `cin >> n` 之後，那一行結尾的換行字元還留在輸入裡，下一個 `getline` 會回傳空字串。在第一個 `getline` 之前先呼叫一次 `cin.ignore()`，或是每一行都用 `getline` 讀。

## 輸出要完全符合題目

評測系統逐位元組比對。以下細節決定你是 Accepted 還是 Wrong Answer：

- 每一行結尾都要換行，最後一行也是。`print` 會自動換行；C++ 請寫 `"\n"`。
- 輸出的文字照題目抄：`Case #1: 8` 不等於 `Case 1: 8`。
- 行尾不要有多餘的空格，也不要印 `Enter a number:` 這類提示。

```python
import sys

case = 1
for line in sys.stdin:
    a, b = map(int, line.split())
    print(f"Case #{case}: {a + b}")
    case += 1
```

```cpp
int a, b, c = 1;
while (cin >> a >> b) {
    cout << "Case #" << c << ": " << a + b << "\n";
    c++;
}
```

## 大量輸入時要讀得快

測資有幾十萬個數字時，光是讀取太慢就可能超時。

```python
import sys

data = sys.stdin.read().split()
numbers = list(map(int, data))
```

```cpp
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // read with cin as usual, print "\n" instead of endl
    return 0;
}
```
