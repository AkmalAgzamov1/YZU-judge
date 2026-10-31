"""Everything that differs between languages lives here, so the runner stays generic."""

from dataclasses import dataclass


@dataclass(frozen = True)
class Language:
    image: str
    # None means the code runs directly, without a separate compile step.
    source_name: str | None = None
    compile_command: tuple[str, ...] | None = None
    binary_name: str | None = None


LANGUAGES: dict[str, Language] = {
    "python": Language(image = "python:3.11-slim"),
    "cpp": Language(
        image = "gcc:13",
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
