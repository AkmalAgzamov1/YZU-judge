from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MockExamCreate(BaseModel):
    paper_id: int


class MockExamProblemOut(BaseModel):
    position: int
    problem_id: int
    title: str
    uva_id: int | None
    difficulty: Literal["easy", "medium", "hard"]

    status: Literal["solved", "attempted"] | None
    # Minutes from the start of the exam to the first accepted submission.
    solved_at_minutes: int | None


class MockExamSummary(BaseModel):
    id: int
    paper_id: int
    paper_title: str
    started_at: datetime
    ends_at: datetime
    finished_at: datetime | None
    is_active: bool
    solved_count: int
    problem_count: int


class MockExamOut(MockExamSummary):
    # Lets the client correct its countdown for clock differences.
    server_time: datetime
    problems: list[MockExamProblemOut]
