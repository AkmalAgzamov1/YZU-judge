import json
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models.problem import Problem
from ..models.run import Run
from ..models.testcase import TestCase
from ..models.user import User
from ..schemas.run import RunCaseOut, RunCreate, RunOut
from ..tasks import run_code_task
from .mock_exams import utc_now

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["Runs"])

# Runs share one judge worker with submissions. Keep one student from filling it.
MAX_ACTIVE_RUNS = 2
MAX_RUNS_PER_MINUTE = 12


def _run_out(run: Run) -> RunOut:
    results = None
    if run.results_json:
        try:
            results = [RunCaseOut(**case) for case in json.loads(run.results_json)]
        except (ValueError, TypeError):
            # A corrupt row must not break the whole endpoint; the run still has
            # its status and compile output.
            logger.exception("Run %s has unreadable results_json", run.id)
            results = None

    return RunOut(
        id=run.id,
        problem_id=run.problem_id,
        language=run.language,
        mode=run.mode,
        status=run.status,
        verdict=run.verdict,
        compile_output=run.compile_output,
        results=results,
        created_at=run.created_at,
    )


def check_rate_limit(db: Session, user: User):
    """Serializes a user's run starts, like submissions do."""

    db.query(User).filter(User.id == user.id).with_for_update().one()

    active = db.query(Run).filter(
        Run.user_id == user.id,
        Run.status.in_(("pending", "running")),
    ).count()

    recent = db.query(Run).filter(
        Run.user_id == user.id,
        Run.created_at > utc_now() - timedelta(minutes=1),
    ).count()

    if active >= MAX_ACTIVE_RUNS or recent >= MAX_RUNS_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Too many test runs. Wait for the current one to finish, then try again.",
        )


@router.post("/", response_model=RunOut)
def create_run(
    run_data: RunCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    problem = db.query(Problem).filter(Problem.id == run_data.problem_id).first()

    if problem is None or (not problem.is_published and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Problem not found")

    if run_data.mode == "samples":
        has_sample = db.query(TestCase.id).filter(
            TestCase.problem_id == problem.id,
            TestCase.is_sample.is_(True),
        ).first()

        if has_sample is None:
            raise HTTPException(
                status_code=400,
                detail="This problem has no sample tests yet.",
            )

    if run_data.mode == "random":
        has_hidden = db.query(TestCase.id).filter(
            TestCase.problem_id == problem.id,
            TestCase.is_sample.is_(False),
        ).first()

        if has_hidden is None:
            raise HTTPException(
                status_code=400,
                detail="This problem has no hidden tests yet.",
            )

    check_rate_limit(db, current_user)

    run = Run(
        user_id=current_user.id,
        problem_id=problem.id,
        language=run_data.language,
        mode=run_data.mode,
        code=run_data.code,
        # A custom input is only meaningful for that mode, and samples never
        # take user text.
        custom_input=run_data.custom_input if run_data.mode == "custom" else None,
        random_count=run_data.random_count if run_data.mode == "random" else None,
        status="pending",
    )

    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        run_code_task.delay(run.id)
    except Exception:
        logger.exception("Failed to enqueue test run %s", run.id)
        db.rollback()

        try:
            run.status = "error"
            db.commit()
        except Exception:
            db.rollback()
            raise

        raise HTTPException(
            status_code=503,
            detail="The judge is offline right now. Try again in a minute.",
        )

    return _run_out(run)


@router.get("/{run_id}", response_model=RunOut)
def get_run(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id).first()

    if run is None:
        raise HTTPException(status_code=404, detail="No such test run")

    if run.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You can only access your own test runs")

    return _run_out(run)
