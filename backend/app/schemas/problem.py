from pydantic import BaseModel, ConfigDict
from typing import Literal, Optional

from ..topics import Topic

class ProblemCreate(BaseModel):
    title: str
    uva_id: Optional[int] = None
    description: str
    difficulty: Literal["easy", "medium", "hard"]

    time_limit_ms: int
    memory_limit_mb: int

    is_cpe: bool
    topics: list[Topic] = []

class ProblemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    uva_id: Optional[int] = None
    description: str
    difficulty: Literal["easy", "medium", "hard"]

    time_limit_ms: int
    memory_limit_mb: int

    is_cpe: bool
    topics: list[Topic] = []
    is_published: bool = True
    created_by: int

class ProblemUpdate(BaseModel):
    title: str
    uva_id: Optional[int] = None
    description: str
    difficulty: Literal["easy", "medium", "hard"]
    time_limit_ms: int
    memory_limit_mb: int
    is_cpe: bool
    topics: list[Topic] = []


class ProblemStats(BaseModel):
    problem_id: int
    test_count: int
    sample_count: int
