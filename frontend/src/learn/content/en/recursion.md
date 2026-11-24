A recursive function calls itself on a smaller version of the same problem. Every recursive function needs two parts:

1. A **base case** small enough to answer directly.
2. A **recursive step** that makes the problem smaller and calls the function again.

Without the base case the calls never stop, and the program crashes with a Runtime Error.

## Factorial

5! = 5 × 4 × 3 × 2 × 1, and n! = n × (n − 1)!

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

20! still fits in a `long long`; 21! does not.

## Digit sum, again and again

Keep adding the digits of a number until one digit is left (UVa 11332, Summing Digits): 9875 → 29 → 11 → 2.

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

## Try every choice

Recursion shines when you build an answer step by step and try every option at each step. Print every subset of `{1, 2, 3}`:

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

Each item doubles the work: 20 items give about a million subsets, which is fine; 40 items is far too many. Check the limits before you brute force.

## When recursion gets too deep

Python stops after about 1000 nested calls with `RecursionError`. Raise the limit at the top of the file:

```python
import sys
sys.setrecursionlimit(10000)
```

```cpp
// C++ allows much deeper recursion, but a few hundred thousand levels can
// still overflow the stack. Rewrite very deep recursion as a loop.
```

## Remember answers you already know

The plain recursive Fibonacci recomputes the same values again and again. Store each answer the first time; this is called **memoization** and it is the first step toward dynamic programming.

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
