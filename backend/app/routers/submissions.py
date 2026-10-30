from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 
from app.tasks import judge_submission_task

from ..database import get_db
from ..dependencies import get_current_user
from ..models.submission import Submission
from ..models.problem import Problem
from ..models.user import User
from ..models.submission_result import SubmissionResult
from ..models.mock_exam import MockExam
from ..models.cpe_paper import CpePaperProblem
from .mock_exams import is_active, utc_now

from ..schemas.submission import SubmissionCreate, SubmissionOut, SubmissionResultOut

import logging
logger = logging.getLogger(__name__)
router = APIRouter(prefix = "/submissions", tags = ["Submissions"])


def check_mock_exam_submission(db: Session, submission_data: SubmissionCreate, current_user: User):
    """The server owns the exam clock, so late or foreign submissions are rejected here."""
    exam = db.query(MockExam).filter(MockExam.id == submission_data.mock_exam_id).first()

    if exam is None or exam.user_id != current_user.id:
        raise HTTPException(status_code = 404, detail = "No such mock exam")

    if not is_active(exam, utc_now()):
        raise HTTPException(status_code = 409, detail = "This mock exam has ended")

    in_paper = db.query(CpePaperProblem).filter(
        CpePaperProblem.paper_id == exam.paper_id,
        CpePaperProblem.problem_id == submission_data.problem_id
    ).first()

    if in_paper is None:
        raise HTTPException(status_code = 400, detail = "This problem is not part of the mock exam")


@router.post("/", response_model = SubmissionOut)
def create_submission(submission_data: SubmissionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == submission_data.problem_id).first()

    if problem is None or (not problem.is_published and not current_user.is_admin):
        raise HTTPException(status_code = 404, detail = "Problem not found")

    if submission_data.mock_exam_id is not None:
        check_mock_exam_submission(db, submission_data, current_user)

    submission = Submission(
        user_id = current_user.id,
        problem_id = submission_data.problem_id,
        language = submission_data.language,
        code = submission_data.code,
        mock_exam_id = submission_data.mock_exam_id,
        status = "pending"
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    try: 
        judge_submission_task.delay(submission.id)

    except Exception:
        logger.exception(
            "Failed to enqueue judging task for submission %s",
            submission.id,
        )
        db.rollback()
        
        try:
            submission.status = "internal_error"
            db.commit()
        except Exception:
            db.rollback()
            raise    
        raise HTTPException(
            status_code = 503, 
            detail = f"Submission {submission.id} was created, but judge service is temporarily unavailable")
    
    return submission


@router.get("/{submission_id}/results", response_model=list[SubmissionResultOut])
def get_submission_results(submission_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    submission = db.query(Submission).filter(
        Submission.id == submission_id
    ).first()

    if submission is None:
        raise HTTPException(
            status_code=404,
            detail="No such submission"
        )

    if submission.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own submissions"
        )

    results = db.query(SubmissionResult).filter(
        SubmissionResult.submission_id == submission_id
    ).all()

    return results

@router.get("/{submission_id}", response_model = SubmissionOut)
def get_submission(submission_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    
    if submission is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such submission"
        )
    
    if submission.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own submissions"
        )
    
    return submission   

@router.get("/", response_model = list[SubmissionOut])
def get_submissions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    submissions = db.query(Submission).filter(
        Submission.user_id == current_user.id
    ).all()
    return submissions
