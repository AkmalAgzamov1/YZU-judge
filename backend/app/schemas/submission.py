from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class SubmissionCreate(BaseModel):
    problem_id: int
    language: Literal["python", "java", "cpp"]
    code: str


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    problem_id: int
    language: Literal["python", "java", "cpp"]
    code: str
    verdict: Literal[
        "pending",
        "running",
        "memory_limit_exceeded",
        "accepted",
        "wrong_answer",
        "time_limit_exceeded",
        "compilation_error",
        "runtime_error"
    ]
    created_at: datetime

class SubmissionResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: int
    test_case_id: int
    verdict: Literal[
        "accepted",
        "wrong_answer",
        "time_limit_exceeded",
        "memory_limit_exceeded",
        "runtime_error"
    ]
    time_taken_ms: int
    memory_used_mb: int