"""Views of users and their submissions for the admin panel."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_admin_user
from ..models.problem import Problem
from ..models.submission import Submission
from ..models.user import User
from ..schemas.admin import AdminSubmissionOut, AdminUserOut

router = APIRouter(prefix = "/admin", tags = ["Admin"])


@router.get("/users", response_model = list[AdminUserOut])
def get_users(current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    accepted = Submission.status == "accepted"
    rows = db.query(
        User,
        func.count(Submission.id),
        func.count(Submission.id).filter(accepted),
        func.count(func.distinct(Submission.problem_id)).filter(accepted),
        func.max(Submission.created_at),
    ).outerjoin(Submission, Submission.user_id == User.id).group_by(User.id).order_by(User.id).all()

    return [
        AdminUserOut(
            id = user.id,
            username = user.username,
            email = user.email,
            is_admin = user.is_admin,
            email_verified = user.email_verified,
            created_at = user.created_at,
            submissions = total,
            accepted = accepted_count,
            solved = solved,
            last_submission_at = last,
        )
        for user, total, accepted_count, solved, last in rows
    ]


@router.post("/users/{user_id}/verify", status_code = 204)
def verify_user(user_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """For a student whose code emails never arrive: the admin vouches for the address."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code = 404, detail = "User not found")

    user.email_verified = True
    db.commit()


@router.get("/submissions", response_model = list[AdminSubmissionOut])
def get_submissions(
    user_id: int | None = None,
    limit: int = Query(100, ge = 1, le = 500),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Newest first, without the code; the submission page shows the code."""
    query = db.query(Submission, User.username, Problem.uva_id, Problem.title) \
        .join(User, User.id == Submission.user_id) \
        .join(Problem, Problem.id == Submission.problem_id)

    if user_id is not None:
        query = query.filter(Submission.user_id == user_id)

    return [
        AdminSubmissionOut(
            id = submission.id,
            user_id = submission.user_id,
            username = username,
            problem_id = submission.problem_id,
            uva_id = uva_id,
            problem_title = title,
            language = submission.language,
            status = submission.status,
            mock_exam_id = submission.mock_exam_id,
            created_at = submission.created_at,
        )
        for submission, username, uva_id, title in query.order_by(Submission.id.desc()).limit(limit)
    ]
