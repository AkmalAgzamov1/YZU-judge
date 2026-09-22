from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.problem import Problem
from ..models.user import User
from ..schemas.problem import ProblemCreate, ProblemOut, ProblemUpdate
from ..dependencies import get_current_admin_user

router = APIRouter(prefix = "/problems", tags = ["Problems"])


@router.post("/", response_model = ProblemOut)
def create_problem(problem: ProblemCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):

    new_problem = Problem(
        title = problem.title,
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

@router.get("/", response_model = list[ProblemOut])
def get_problems(db: Session = Depends(get_db)):
    problems = db.query(Problem).all()

    return problems

@router.get("/{problem_id}", response_model = ProblemOut)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "No such problem"
        )

    return problem


@router.delete("/{problem_id}")
def delete_problem(problem_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "No such problem"
        )

    db.delete(problem)
    db.commit()

    return {"Message": "Problem deleted"}


@router.put("/{problem_id}", response_model = ProblemOut)
def update_problem(problem_id: int, problem_data: ProblemUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    
    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "No such problem"
        )
 
    problem.title = problem_data.title
    problem.description = problem_data.description
    problem.difficulty = problem_data.difficulty
    problem.time_limit_ms = problem_data.time_limit_ms
    problem.memory_limit_mb = problem_data.memory_limit_mb
    problem.is_cpe = problem_data.is_cpe

    db.commit(problem)
    db.refresh()

    return problem
    
