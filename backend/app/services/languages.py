"""Everything that differs between languages lives here, so the runner stays generic.

The student-facing language names mirror the official CPE exam environment
(https://cpe.mcu.edu.tw/environment.php) so practising feels like the real test:

    C/C++ (MinGW GCC 6.3.0)   C/C++ (MSVC v140)   Java (AdoptOpenJDK 8)
    Java (AdoptOpenJDK 11)    Python (Python 3.9.6)

The judge runs only on Linux/Docker, so a few toolchains are the closest thing
that actually runs here:

* MinGW 6.3.0 and MSVC v140 are Windows toolchains. The CPE MinGW is plain GCC
  6.3.0, so it stands in with the same GCC 6 line (`gcc:6`, C++14 semantics).
  MSVC is Microsoft's compiler and cannot run on Linux at all, so that option
  compiles with clang in MSVC-compatibility mode instead (a distinct compiler
  from the GCC option). A student who relies on `bits/stdc++.h` (absent from the
  real MSVC) may compile here yet fail on the exam - see the starter code.
* Java 8 / Java 11 are the real AdoptOpenJDK binaries (now published as the
  "debianslim" images by the same AdoptOpenJDK/Eclipse Temurin project).
"""

from dataclasses import dataclass, field


@dataclass(frozen = True)
class Language:
    image: str
    # interpreted: run the source directly. binary: one compiled executable.
    # java: javac produces .class files that the JVM runs.
    kind: str
    # None means the code runs directly, without a separate compile step.
    source_name: str | None = None
    compile_command: tuple[str, ...] | None = None
    # binary kind: the single output file the compile step writes.
    binary_name: str | None = None
    # java kind: the class the JVM runs; javac compiles source_name.
    main_class: str | None = None


# The "cpp" and "java" keys are kept for stored solutions and any old submission
# rows. Only the five keys listed in SubmissionCreate are offered to students.
LANGUAGES: dict[str, Language] = {
    # Python (Python 3.9.6) - the same interpreter the CPE exam ships.
    "python": Language(image = "python:3.9.6-slim", kind = "interpreted"),

    # C/C++ (MinGW GCC 6.3.0) - the same C++14 semantics as the exam's GCC 6.x.
    "c_gcc": Language(
        image = "gcc:6",
        kind = "binary",
        source_name = "main.cpp",
        compile_command = ("g++", "-std=gnu++14", "-O2", "-pipe", "-o", "main", "main.cpp"),
        binary_name = "main",
    ),

    # C/C++ (MSVC v140) - MSVC cannot run on Linux, so clang emulates its mode.
    "c_msvc": Language(
        image = "silkeh/clang:14-bullseye",
        kind = "binary",
        source_name = "main.cpp",
        compile_command = (
            "clang++", "-std=c++14", "-fms-compatibility", "-fms-extensions",
            "-O2", "-pipe", "-o", "main", "main.cpp",
        ),
        binary_name = "main",
    ),

    # Java (AdoptOpenJDK 8) and Java (AdoptOpenJDK 11). The CPE judge runs
    # `java Main`, so the source must be Main.java with a class named Main.
    "java8": Language(
        image = "adoptopenjdk/openjdk8:debianslim",
        kind = "java",
        source_name = "Main.java",
        compile_command = ("javac", "Main.java"),
        main_class = "Main",
    ),
    "java11": Language(
        image = "adoptopenjdk/openjdk11:debianslim",
        kind = "java",
        source_name = "Main.java",
        compile_command = ("javac", "Main.java"),
        main_class = "Main",
    ),

    # Kept for reference solutions and the CPE importer: modern GCC, C++17.
    "cpp": Language(
        image = "gcc:13",
        kind = "binary",
        source_name = "main.cpp",
        compile_command = ("g++", "-std=c++17", "-O2", "-pipe", "-o", "main", "main.cpp"),
        binary_name = "main",
    ),
}


def get_language(name: str) -> Language:
    try:
        return LANGUAGES[name]
    except KeyError:
        raise ValueError(f"Unsupported language: {name}") from None


def needs_compilation(name: str) -> bool:
    """True when this language has a compile step, so the judge must build first."""
    return get_language(name).compile_command is not None
