A function is a named piece of code. You give it values (**parameters**), it does its work and hands back a result (**return value**). Functions keep the main loop short and let you test one idea at a time.

## Write and call a function

Check whether a number is prime.

```python
def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

n = int(input())
print("prime" if is_prime(n) else "not prime")
```

```cpp
#include <iostream>
using namespace std;

bool is_prime(long long n) {
    if (n < 2) return false;
    for (long long d = 2; d * d <= n; d++) {
        if (n % d == 0) return false;
    }
    return true;
}

int main() {
    long long n;
    cin >> n;
    cout << (is_prime(n) ? "prime" : "not prime") << "\n";
    return 0;
}
```

In C++ you write the return type before the name (`bool`) and the type of every parameter. A function that returns nothing uses `void`. Define it **above** `main` so the compiler knows it before it is used.

Checking divisors only up to √n (`d * d <= n`) is what makes this fast enough for large n.

## Several values in, one value out

The greatest common divisor, with Euclid's algorithm, is one of the most used functions in CPE math problems.

```python
def gcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a

def lcm(a, b):
    return a // gcd(a, b) * b

print(gcd(12, 18), lcm(4, 6))  # 6 12
```

```cpp
long long gcd(long long a, long long b) {
    while (b != 0) {
        long long t = a % b;
        a = b;
        b = t;
    }
    return a;
}

long long lcm(long long a, long long b) {
    return a / gcd(a, b) * b;
}
```

Python also has `math.gcd`, and C++17 has `std::gcd`, but the CPE's C++14 compilers do not, so knowing the loop pays off.

## Changing a value inside a function

In C++, parameters are **copies**. To let a function change the caller's variable, pass it by reference with `&`. Large vectors should also be passed by reference, so they are not copied on every call.

```cpp
void add_one(int &x) {
    x++;
}

long long total(const vector<int> &a) {
    long long s = 0;
    for (int x : a) s += x;
    return s;
}
```

```python
# Python passes the list itself, so changes to it are seen by the caller.
def add_one_to_all(a):
    for i in range(len(a)):
        a[i] += 1
```

## A solve function per test case

A clean way to structure any multi case problem: one function solves one case.

```python
import sys

def solve(line):
    a, b = map(int, line.split())
    return a + b

for line in sys.stdin:
    if line.strip():
        print(solve(line))
```

```cpp
#include <iostream>
using namespace std;

long long solve(long long a, long long b) {
    return a + b;
}

int main() {
    long long a, b;
    while (cin >> a >> b) cout << solve(a, b) << "\n";
    return 0;
}
```

> Keep reading and printing in one place, and put the thinking in functions. When a case fails, you can call `solve` by hand with that input and look at the result.
