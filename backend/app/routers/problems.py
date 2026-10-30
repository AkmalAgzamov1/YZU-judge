from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.problem import Problem
from ..models.user import User
from ..schemas.problem import ProblemCreate, ProblemOut, ProblemUpdate, ProblemStats
from ..dependencies import get_current_admin_user, get_optional_user, is_admin
from ..models.submission import Submission
from ..models.cpe_paper import CpePaperProblem

from ..models.testcase import TestCase
from ..schemas.testcase import TestCaseCreate, TestCaseOut, SampleOut
from ..storage import save_file, read_file

router = APIRouter(prefix = "/problems", tags = ["Problems"])


def check_uva_id_free(db: Session, uva_id: int | None, problem_id: int | None = None):
    if uva_id is None:
        return

    taken = db.query(Problem).filter(Problem.uva_id == uva_id, Problem.id != problem_id).first()

    if taken is not None:
        raise HTTPException(
            status_code = 409,
            detail = f"UVa {uva_id} is already used by problem {taken.id}"
        )


@router.post("/", response_model = ProblemOut)
def create_problem(problem: ProblemCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    check_uva_id_free(db, problem.uva_id)

    new_problem = Problem(
        title = problem.title,
        uva_id = problem.uva_id,
        difficulty = problem.difficulty,

        description = problem.description,

        time_limit_ms = problem.time_limit_ms,
        memory_limit_mb = problem.memory_limit_mb,

        created_by = current_user.id,

        is_cpe = problem.is_cpe
    )

    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)

    return new_problem

def get_visible_problem(db: Session, problem_id: int, user: User | None) -> Problem:
    """Drafts look missing to everyone except admins."""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if problem is None or (not problem.is_published and not is_admin(user)):
        raise HTTPException(
            status_code = 404,
            detail = "No such problem"
        )

    return problem


@router.get("/", response_model = list[ProblemOut])
def get_problems(current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    query = db.query(Problem)

    if not is_admin(current_user):
        query = query.filter(Problem.is_published == True)

    return query.order_by(Problem.id).all()


@router.get("/admin/stats", response_model = list[ProblemStats])
def get_problem_stats(current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    rows = db.query(
        TestCase.problem_id,
        func.count(TestCase.id),
        func.count(TestCase.id).filter(TestCase.is_sample == True)
    ).group_by(TestCase.problem_id).all()

    return [
        ProblemStats(problem_id = problem_id, test_count = tests, sample_count = samples)
        for problem_id, tests, samples in rows
    ]


@router.get("/{problem_id}", response_model = ProblemOut)
def get_problem(problem_id: int, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    return get_visible_problem(db, problem_id, current_user)


@router.get("/{problem_id}/samples", response_model = list[SampleOut])
def get_samples(problem_id: int, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    """Public sample tests shown under the statement. Hidden tests stay private."""
    get_visible_problem(db, problem_id, current_user)

    samples = db.query(TestCase).filter(
        TestCase.problem_id == problem_id,
        TestCase.is_sample == True
    ).order_by(TestCase.sample_order, TestCase.id).all()

    return [
        SampleOut(
            order = index + 1,
            input = read_file(sample.input_path),
            output = read_file(sample.output_path)
        )
        for index, sample in enumerate(samples)
    ]


@router.delete("/{problem_id}")
def delete_problem(problem_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "No such problem"
        )

    if db.query(Submission).filter(Submission.problem_id == problem_id).first() is not None:
        raise HTTPException(
            status_code = 409,
            detail = "Students already submitted to this problem. Unpublish it instead."
        )

    if db.query(CpePaperProblem).filter(CpePaperProblem.problem_id == problem_id).first() is not None:
        raise HTTPException(
            status_code = 409,
            detail = "This problem is part of a CPE paper. Remove it from the paper first."
        )

    for testcase in db.query(TestCase).filter(TestCase.problem_id == problem_id).all():
        Path(testcase.input_path).unlink(missing_ok = True)
        Path(testcase.output_path).unlink(missing_ok = True)
        db.delete(testcase)

    db.delete(problem)
    db.commit()

    return {"message": "problem deleted"}


@router.post("/{problem_id}/publish", response_model = ProblemOut)
def publish_problem(problem_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = get_visible_problem(db, problem_id, current_user)

    tests = db.query(TestCase).filter(TestCase.problem_id == problem_id).all()
    missing = []

    if not problem.description.strip():
        missing.append("a statement")
    if not tests:
        missing.append("at least one test")
    if not any(test.is_sample for test in tests):
        missing.append("at least one sample test")

    if missing:
        raise HTTPException(
            status_code = 400,
            detail = "Before publishing, add " + ", ".join(missing) + "."
        )

    problem.is_published = True
    db.commit()
    db.refresh(problem)

    return problem


@router.post("/{problem_id}/unpublish", response_model = ProblemOut)
def unpublish_problem(problem_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = get_visible_problem(db, problem_id, current_user)

    problem.is_published = False
    db.commit()
    db.refresh(problem)

    return problem


@router.put("/{problem_id}", response_model = ProblemOut)
def update_problem(problem_id: int, problem_data: ProblemUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    
    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "No such problem"
        )

    check_uva_id_free(db, problem_data.uva_id, problem_id)
 
    problem.title = problem_data.title
    problem.uva_id = problem_data.uva_id
    problem.description = problem_data.description
    problem.difficulty = problem_data.difficulty
    problem.time_limit_ms = problem_data.time_limit_ms
    problem.memory_limit_mb = problem_data.memory_limit_mb
    problem.is_cpe = problem_data.is_cpe

    db.commit()
    db.refresh(problem)

    return problem
    
