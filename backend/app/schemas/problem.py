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
    sort_order: int = 0

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
    sort_order: int = 0
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
    # Left out means "keep the current value", so older scripts that PUT problems don't reset it.
    sort_order: Optional[int] = None


class ProblemStats(BaseModel):
    problem_id: int
    test_count: int
    sample_count: int
