from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.submission import Submission
from ..models.problem import Problem
from ..models.user import User
from ..models.submission_result import SubmissionResult

from ..schemas.submission import SubmissionCreate, SubmissionOut, SubmissionResultOut

router = APIRouter(prefix = "/submissions", tags = ["Submissions"])

@router.post("/", response_model = SubmissionOut)
def create_submission(submission_data: SubmissionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == submission_data.problem_id).first()

    if problem is None:
        raise HTTPException(status_code = 404, detail = "Problem not found")

    submission = Submission(
        user_id = current_user.id,
        problem_id = submission_data.problem_id,
        language = submission_data.language,
        code = submission_data.code,
        status = "pending"
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

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
