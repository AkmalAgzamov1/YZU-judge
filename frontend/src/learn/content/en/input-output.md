Every CPE problem works the same way: your program reads text from **standard input** and writes text to **standard output**. There are no files to open and nobody types at a keyboard. The judge pipes the test data in and compares what you print with the expected answer, character by character.

## Read two numbers, print their sum

The classic first problem. The input is one line with two integers, like `3 5`, and you print `8`.

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

In Python, `input()` returns the whole line as a string, `split()` cuts it at spaces and `map(int, ...)` turns each piece into a number. In C++, `cin >>` skips spaces and newlines by itself and reads one value at a time.

## Read until the input ends

Most UVa problems do not say how many test cases there are. You keep reading until there is nothing left. Input like this:

```text
3 5
10 20
7 0
```

should print `8`, `30` and `7`, one per line.

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

`while (cin >> a >> b)` stops when reading fails, which happens at the end of the input. In Python, a `for` loop over `sys.stdin` gives you one line at a time and stops at the end. Calling `input()` past the end crashes with `EOFError`, so prefer `sys.stdin` whenever the count is unknown.

## When the count comes first

Some problems start with the number of test cases:

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

## Reading a whole line

Names and sentences contain spaces, and `cin >>` stops at the first one. Read the full line with `getline`:

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

> After `cin >> n`, the newline at the end of that line is still waiting. The next `getline` returns an empty string. Call `cin.ignore()` once before the first `getline`, or read every line with `getline`.

## Print exactly what is asked

The judge compares bytes. These details decide between Accepted and Wrong Answer:

- End every line with a newline, the last line too. `print` does it for you; in C++ write `"\n"`.
- Copy the output words from the problem: `Case #1: 8` is not `Case 1: 8`.
- No extra spaces at the end of a line, and no prompts such as `Enter a number:`.

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

## Fast input for big tests

When a test has hundreds of thousands of numbers, slow input alone can exceed the time limit.

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
