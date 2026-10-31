"""Hints and reference solutions for easy problems.

Hints open one at a time, for everyone. The solution needs an account: it unlocks
once the user has opened every hint and has at least one judged submission.
None of it is handed out while the problem is part of the user's running mock exam.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_optional_user
from ..models.cpe_paper import CpePaperProblem
from ..models.hint_reveal import HintReveal
from ..models.problem import Problem
from ..models.submission import Submission
from ..models.user import User
from ..schemas.problem_help import HintOut, ProblemHelpOut, SolutionOut
from .mock_exams import get_active_exam, utc_now
from .problems import get_visible_problem

router = APIRouter(prefix = "/problems", tags = ["Problem help"])

# Still waiting for the judge, or the judge itself broke: not an attempt yet.
NOT_AN_ATTEMPT = ("pending", "running", "internal_error")


def has_help(problem: Problem) -> bool:
    return problem.difficulty == "easy" and bool(problem.solution_python)


def check_not_in_mock_exam(db: Session, problem: Problem, user: User | None):
    if user is None:
        return

    exam = get_active_exam(db, user.id, utc_now())
    if exam is None:
        return

    in_exam = db.query(CpePaperProblem).filter(
        CpePaperProblem.paper_id == exam.paper_id,
        CpePaperProblem.problem_id == problem.id
    ).first()

    if in_exam is not None:
        raise HTTPException(
            status_code = 403,
            detail = "Hints and solutions are hidden during a Mock CPE."
        )


def revealed_count(db: Session, user: User, problem: Problem) -> int:
    reveal = db.query(HintReveal).filter(
        HintReveal.user_id == user.id,
        HintReveal.problem_id == problem.id
    ).first()

    return reveal.revealed_count if reveal else 0


def has_attempt(db: Session, user: User, problem: Problem) -> bool:
    return db.query(Submission).filter(
        Submission.user_id == user.id,
        Submission.problem_id == problem.id,
        Submission.status.notin_(NOT_AN_ATTEMPT)
    ).first() is not None


@router.get("/{problem_id}/help", response_model = ProblemHelpOut)
def get_problem_help(problem_id: int, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    problem = get_visible_problem(db, problem_id, current_user)

    if not has_help(problem):
        return ProblemHelpOut(available = False)

    check_not_in_mock_exam(db, problem, current_user)

    hints = list(problem.hints or [])
    help_out = ProblemHelpOut(available = True, hint_count = len(hints))

    if current_user is None:
        return help_out

    opened = min(revealed_count(db, current_user, problem), len(hints))
    help_out.hints = hints[:opened]
    help_out.has_submitted = has_attempt(db, current_user, problem)
    help_out.solution_unlocked = help_out.has_submitted and opened == len(hints)

    if help_out.solution_unlocked:
        help_out.solution = SolutionOut(
            explanation = problem.solution_explanation or "",
            python = problem.solution_python or "",
            cpp = problem.solution_cpp or ""
        )

    return help_out


@router.post("/{problem_id}/hints/{number}", response_model = HintOut)
def reveal_hint(problem_id: int, number: int, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    """Opens hint `number` (1 based). Signed in users must open them in order."""
    problem = get_visible_problem(db, problem_id, current_user)
    hints = list(problem.hints or []) if has_help(problem) else []

    if not 1 <= number <= len(hints):
        raise HTTPException(
            status_code = 404,
            detail = "No such hint"
        )

    check_not_in_mock_exam(db, problem, current_user)

    if current_user is not None:
        reveal = db.query(HintReveal).filter(
            HintReveal.user_id == current_user.id,
            HintReveal.problem_id == problem.id
        ).first()
        opened = reveal.revealed_count if reveal else 0

        if number > opened + 1:
            raise HTTPException(
                status_code = 400,
                detail = f"Open hint {opened + 1} first."
            )

        if reveal is None:
            db.add(HintReveal(user_id = current_user.id, problem_id = problem.id, revealed_count = number))
        elif number > opened:
            reveal.revealed_count = number
        db.commit()

    return HintOut(number = number, text = hints[number - 1])
