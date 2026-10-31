import logging

from app.celery_app import celery_app
from app.database import SessionLocal

from app.models.submission import Submission 
from app.models.submission_result import SubmissionResult

from app.models.problem import Problem
# Not used directly, but the worker must load it so SQLAlchemy can resolve
# submissions.user_id -> users.id. Without it every task crashes before judging.
from app.models.user import User  # noqa: F401
from app.models.mock_exam import MockExam  # noqa: F401  # submissions.mock_exam_id
from app.models.cpe_paper import CpePaper  # noqa: F401  # mock_exams.paper_id
from app.services.judge_service import load_testcases, judge_submission


logger = logging.getLogger(__name__)


@celery_app.task
def judge_submission_task(submission_id):
    db = SessionLocal()

    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        
        if submission is None:
            raise ValueError(
                f"Submission {submission_id} is not found!"
            )

        try:
            submission.status = "running"
            db.commit()     

            problem = (
                db.query(Problem)
                .filter(Problem.id == submission.problem_id)
                .first()
            )

            if problem is None:
                raise ValueError(
                    f"Problem {submission.problem_id} is not found!"
                )

            testcases = load_testcases(db, problem.id)

            # Must stay lazy, do not delete please bro
            from app.services.docker_runner import compile_in_docker, run_code_in_docker

            judge_result = judge_submission(
                run_code=run_code_in_docker,
                code=submission.code,
                testcases=testcases,
                time_limit_ms=problem.time_limit_ms,
                memory_limit_mb=problem.memory_limit_mb,
                language=submission.language,
                compile_code=compile_in_docker,
            )

            for result in judge_result["results"]:
                result_record = SubmissionResult(
                    submission_id=submission.id,
                    test_case_id=result["testcase_id"],
                    verdict=result["verdict"],
                    time_taken_ms=result["time_taken_ms"],
                    memory_used_mb=result.get("memory_used_mb"),
                )
                db.add(result_record)

            submission.status = judge_result["verdict"]
            submission.compile_output = judge_result.get("compile_output")
            db.commit()

        except Exception:
            logger.exception(
                "Internal error while judging submission %s",
                submission_id,
            )
            db.rollback()

            try:
                submission = (
                    db.query(Submission)
                    .filter(Submission.id == submission_id)
                    .first()
                )

                if submission is not None:
                    submission.status = "internal_error"
                    db.commit()

            except Exception:
                db.rollback()
                logger.exception(
                    "Failed to save internal_error for submission %s",
                    submission_id,
                )

            raise

    finally:
        db.close()

