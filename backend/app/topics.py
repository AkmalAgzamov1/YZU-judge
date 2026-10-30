from typing import Literal, get_args

# The fixed topic list. Keeping it closed avoids "dp", "DP" and
# "Dynamic programming" all meaning the same thing.
Topic = Literal[
    "implementation",
    "math",
    "number-theory",
    "strings",
    "sorting",
    "greedy",
    "brute-force",
    "dp",
    "graphs",
    "data-structures",
    "geometry",
    "simulation",
]

TOPICS: tuple[str, ...] = get_args(Topic)


def normalize_topics(topics: list[str]) -> list[str]:
    """Drops duplicates and keeps the canonical order."""
    chosen = set(topics)
    return [topic for topic in TOPICS if topic in chosen]
