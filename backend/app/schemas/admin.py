from datetime import datetime

from pydantic import BaseModel

from .submission import SubmissionOut


class AdminUserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    email_verified: bool
    created_at: datetime | None
    submissions: int
    accepted: int
    # Distinct problems with at least one accepted submission.
    solved: int
    last_submission_at: datetime | None


class AdminSubmissionOut(BaseModel):
    id: int
    user_id: int
    username: str
    problem_id: int
    uva_id: int | None
    problem_title: str
    language: SubmissionOut.model_fields["language"].annotation
    status: SubmissionOut.model_fields["status"].annotation
    mock_exam_id: int | None
    created_at: datetime
