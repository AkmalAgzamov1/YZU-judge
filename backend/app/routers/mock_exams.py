from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.cpe_paper import CpePaper
from ..models.mock_exam import MockExam
from ..models.submission import Submission
from ..models.user import User
from ..schemas.mock_exam import MockExamCreate, MockExamOut, MockExamProblemOut, MockExamSummary

router = APIRouter(prefix = "/mock-exams", tags = ["Mock exams"])


def utc_now() -> datetime:
    # Naive UTC, matching created_at everywhere else in the schema.
    return datetime.utcnow()


def ended_at(exam: MockExam) -> datetime:
    return exam.finished_at or exam.ends_at


def is_active(exam: MockExam, now: datetime) -> bool:
    return exam.finished_at is None and now < exam.ends_at


def get_active_exam(db: Session, user_id: int, now: datetime) -> MockExam | None:
    return db.query(MockExam).filter(
        MockExam.user_id == user_id,
        MockExam.finished_at.is_(None),
        MockExam.ends_at > now
    ).first()


def get_own_exam(db: Session, exam_id: int, user: User) -> MockExam:
    exam = db.query(MockExam).filter(MockExam.id == exam_id).first()

    if exam is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such mock exam"
        )

    if exam.user_id != user.id and not user.is_admin:
        raise HTTPException(
            status_code = 403,
            detail = "You can only access your own mock exams"
        )

    return exam


def build_problems(db: Session, exam: MockExam) -> list[MockExamProblemOut]:
    # Only submissions sent before the exam ended count. One that was sent in
    # time but judged later still counts, like on the real exam.
    submissions = db.query(Submission).filter(
        Submission.mock_exam_id == exam.id,
        Submission.created_at <= ended_at(exam)
    ).order_by(Submission.created_at).all()

    problems = []

    for item in exam.paper.problems:
        attempts = [s for s in submissions if s.problem_id == item.problem_id]
        first_accepted = next((s for s in attempts if s.status == "accepted"), None)

        if first_accepted is not None:
            status = "solved"
            solved_at = int((first_accepted.created_at - exam.started_at).total_seconds() // 60)
        else:
            status = "attempted" if attempts else None
            solved_at = None

        problems.append(MockExamProblemOut(
            position = item.position,
            problem_id = item.problem_id,
            title = item.problem.title,
            uva_id = item.problem.uva_id,
            difficulty = item.problem.difficulty,
            status = status,
            solved_at_minutes = solved_at,
        ))

    return problems


def build_summary(exam: MockExam, problems: list[MockExamProblemOut], now: datetime) -> dict:
    return dict(
        id = exam.id,
        paper_id = exam.paper_id,
        paper_title = exam.paper.title,
        started_at = exam.started_at,
        ends_at = exam.ends_at,
        finished_at = exam.finished_at,
        is_active = is_active(exam, now),
        solved_count = sum(1 for problem in problems if problem.status == "solved"),
        problem_count = len(problems),
    )


def exam_to_out(db: Session, exam: MockExam) -> MockExamOut:
    now = utc_now()
    problems = build_problems(db, exam)

    return MockExamOut(**build_summary(exam, problems, now), server_time = now, problems = problems)


@router.post("/", response_model = MockExamOut)
def start_mock_exam(exam_data: MockExamCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = utc_now()

    if get_active_exam(db, current_user.id, now) is not None:
        raise HTTPException(
            status_code = 409,
            detail = "You already have a mock exam in progress"
        )

    paper = db.query(CpePaper).filter(CpePaper.id == exam_data.paper_id).first()

    if paper is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such CPE paper"
        )

    if not paper.problems:
        raise HTTPException(
            status_code = 400,
            detail = "This CPE paper has no problems yet"
        )

    exam = MockExam(
        user_id = current_user.id,
        paper_id = paper.id,
        started_at = now,
        ends_at = now + timedelta(minutes = paper.duration_minutes),
    )

    db.add(exam)
    db.commit()
    db.refresh(exam)

    return exam_to_out(db, exam)


@router.get("/", response_model = list[MockExamSummary])
def get_mock_exams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = utc_now()
    exams = db.query(MockExam).filter(
        MockExam.user_id == current_user.id
    ).order_by(MockExam.started_at.desc()).all()

    return [MockExamSummary(**build_summary(exam, build_problems(db, exam), now)) for exam in exams]


@router.get("/active", response_model = MockExamOut | None)
def get_active_mock_exam(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exam = get_active_exam(db, current_user.id, utc_now())

    return exam_to_out(db, exam) if exam is not None else None


@router.get("/{exam_id}", response_model = MockExamOut)
def get_mock_exam(exam_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return exam_to_out(db, get_own_exam(db, exam_id, current_user))


@router.post("/{exam_id}/finish", response_model = MockExamOut)
def finish_mock_exam(exam_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exam = get_own_exam(db, exam_id, current_user)
    now = utc_now()

    if is_active(exam, now):
        exam.finished_at = now
        db.commit()
        db.refresh(exam)

    return exam_to_out(db, exam)
