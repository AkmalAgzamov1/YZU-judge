from pydantic import BaseModel, ConfigDict
from typing import Literal

class ProblemCreate(BaseModel):
    title: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]

    time_limit_ms: int
    memory_limit_mb: int

    is_cpe: bool

class ProblemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]

    time_limit_ms: int
    memory_limit_mb: int

    is_cpe: bool
    created_by: int

class ProblemUpdate(BaseModel):
    title: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]
    time_limit_ms: int
    memory_limit_mb: int
    is_cpe: bool