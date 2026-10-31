from pydantic import BaseModel


class SolutionOut(BaseModel):
    explanation: str
    python: str
    cpp: str


class ProblemHelpOut(BaseModel):
    # False for medium and hard problems, and for easy ones without content yet.
    available: bool
    hint_count: int = 0

    # Hints this user already opened, in order. Visitors track theirs in the browser.
    hints: list[str] = []

    has_submitted: bool = False
    solution_unlocked: bool = False
    solution: SolutionOut | None = None


class HintOut(BaseModel):
    number: int
    text: str
