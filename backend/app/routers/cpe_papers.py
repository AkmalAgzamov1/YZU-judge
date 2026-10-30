from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_admin_user
from ..models.cpe_paper import CpePaper, CpePaperProblem
from ..models.mock_exam import MockExam
from ..models.problem import Problem
from ..models.user import User
from ..schemas.cpe_paper import CpePaperCreate, CpePaperOut, CpePaperProblemOut

router = APIRouter(prefix = "/cpe-papers", tags = ["CPE papers"])


def paper_to_out(paper: CpePaper) -> CpePaperOut:
    return CpePaperOut(
        id = paper.id,
        title = paper.title,
        held_on = paper.held_on,
        duration_minutes = paper.duration_minutes,
        problems = [
            CpePaperProblemOut(
                position = item.position,
                problem_id = item.problem_id,
                title = item.problem.title,
                uva_id = item.problem.uva_id,
                difficulty = item.problem.difficulty,
            )
            for item in paper.problems
        ],
    )


def set_paper_problems(db: Session, paper: CpePaper, problem_ids: list[int]):
    found = db.query(Problem.id).filter(Problem.id.in_(problem_ids)).all()
    missing = set(problem_ids) - {row.id for row in found}

    if missing:
        raise HTTPException(
            status_code = 404,
            detail = f"No such problems: {sorted(missing)}"
        )

    paper.problems.clear()
    db.flush()
    paper.problems.extend(
        CpePaperProblem(problem_id = problem_id, position = index + 1)
        for index, problem_id in enumerate(problem_ids)
    )


def get_paper_or_404(db: Session, paper_id: int) -> CpePaper:
    paper = db.query(CpePaper).filter(CpePaper.id == paper_id).first()

    if paper is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such CPE paper"
        )

    return paper


@router.get("/", response_model = list[CpePaperOut])
def get_papers(db: Session = Depends(get_db)):
    papers = db.query(CpePaper).order_by(CpePaper.held_on.desc(), CpePaper.id.desc()).all()

    return [paper_to_out(paper) for paper in papers]


@router.get("/{paper_id}", response_model = CpePaperOut)
def get_paper(paper_id: int, db: Session = Depends(get_db)):
    return paper_to_out(get_paper_or_404(db, paper_id))


@router.post("/", response_model = CpePaperOut)
def create_paper(paper_data: CpePaperCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    paper = CpePaper(
        title = paper_data.title,
        held_on = paper_data.held_on,
        duration_minutes = paper_data.duration_minutes,
    )

    db.add(paper)
    set_paper_problems(db, paper, paper_data.problem_ids)
    db.commit()
    db.refresh(paper)

    return paper_to_out(paper)


@router.put("/{paper_id}", response_model = CpePaperOut)
def update_paper(paper_id: int, paper_data: CpePaperCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    paper = get_paper_or_404(db, paper_id)

    paper.title = paper_data.title
    paper.held_on = paper_data.held_on
    paper.duration_minutes = paper_data.duration_minutes
    set_paper_problems(db, paper, paper_data.problem_ids)

    db.commit()
    db.refresh(paper)

    return paper_to_out(paper)


@router.delete("/{paper_id}")
def delete_paper(paper_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    paper = get_paper_or_404(db, paper_id)

    if db.query(MockExam).filter(MockExam.paper_id == paper_id).first() is not None:
        raise HTTPException(
            status_code = 409,
            detail = "Students already took this paper as a mock exam, so it cannot be deleted"
        )

    db.delete(paper)
    db.commit()

    return {"message": "CPE paper deleted"}
