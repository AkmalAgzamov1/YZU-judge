from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator


class CpePaperCreate(BaseModel):
    title: str
    held_on: date
    duration_minutes: Annotated[int, Field(gt = 0, le = 600)] = 180

    # Problem ids in exam order: the first one is problem A.
    problem_ids: Annotated[list[int], Field(min_length = 1, max_length = 12)]

    @field_validator("problem_ids")
    @classmethod
    def problems_must_be_unique(cls, problem_ids: list[int]) -> list[int]:
        if len(set(problem_ids)) != len(problem_ids):
            raise ValueError("a problem can appear only once in a paper")
        return problem_ids


class CpePaperProblemOut(BaseModel):
    position: int
    problem_id: int
    title: str
    uva_id: int | None
    difficulty: Literal["easy", "medium", "hard"]


class CpePaperOut(BaseModel):
    id: int
    title: str
    held_on: date
    duration_minutes: int
    problems: list[CpePaperProblemOut]
