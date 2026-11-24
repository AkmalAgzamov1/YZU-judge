import json
import logging
from datetime import datetime, timedelta

from app.celery_app import celery_app
from app.database import SessionLocal

from app.models.submission import Submission 
from app.models.submission_result import SubmissionResult
from app.models.run import Run

from app.models.problem import Problem
# Not used directly, but the worker must load it so SQLAlchemy can resolve
# submissions.user_id -> users.id. Without it every task crashes before judging.
from app.models.user import User  # noqa: F401
from app.models.mock_exam import MockExam  # noqa: F401  # submissions.mock_exam_id
from app.models.cpe_paper import CpePaper  # noqa: F401  # mock_exams.paper_id
from app.models.email_code import EmailCode
from app.services.judge_service import (
    load_random_hidden_testcases,
    load_sample_testcases,
    load_testcases,
    judge_submission,
    run_tests,
)


logger = logging.getLogger(__name__)

# Far longer than a real judgment. If a slow queue trips this, the verdict still
# replaces the error once the job runs.
STUCK_SUBMISSION_AGE = timedelta(minutes=15)

# An account nobody verified in a day is most likely a typo or a fake address.
UNVERIFIED_ACCOUNT_AGE = timedelta(days=1)

# Test runs are throwaway; keep the row for a day so a closed tab can be reopened.
RUN_RETENTION = timedelta(days=1)

# A test run only needs the visible samples, and only a handful of them.
MAX_SAMPLE_CASES = 5

# A random run samples hidden cases; ten is enough to check a solution without
# turning every click into a full judgment.
MAX_RANDOM_CASES = 10

# Enough for a comparison in the editor. The sandbox itself allows much more,
# but a run result is stored in the database and sent to the browser.
RUN_CASE_OUTPUT_LIMIT = 32_000


@celery_app.task(ignore_result=True)
def delete_unverified_accounts():
    """Frees the usernames and emails of sign ups that were never verified.

    Unverified accounts cannot sign in, so they have no submissions to lose.
    Their codes go with them through ON DELETE CASCADE.
    """
    db = SessionLocal()
    cutoff = datetime.utcnow() - UNVERIFIED_ACCOUNT_AGE

    try:
        deleted = (
            db.query(User)
            .filter(User.email_verified.is_(False), User.created_at < cutoff)
            .delete(synchronize_session=False)
        )
        # Old codes are useless after 10 minutes; keep a day for the hourly limits.
        db.query(EmailCode).filter(EmailCode.created_at < cutoff).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

    if deleted:
        logger.info("Deleted %s accounts that never verified their email", deleted)


@celery_app.task(ignore_result=True)
def reap_stuck_submissions():
    """Cleans up after a worker that died mid-judgment.

    Such a job is not retried: code that kills the worker would kill it again.
    Students get a judge error and can submit again.
    """
    db = SessionLocal()

    try:
        reaped = (
            db.query(Submission)
            .filter(
                Submission.status.in_(("pending", "running")),
                Submission.created_at < datetime.utcnow() - STUCK_SUBMISSION_AGE,
            )
            .update({Submission.status: "internal_error"}, synchronize_session=False)
        )
        reaped_runs = (
            db.query(Run)
            .filter(
                Run.status.in_(("pending", "running")),
                Run.created_at < datetime.utcnow() - STUCK_SUBMISSION_AGE,
            )
            .update({Run.status: "error"}, synchronize_session=False)
        )
        db.commit()
    finally:
        db.close()

    if reaped:
        logger.warning("Marked %s stuck submissions as internal_error", reaped)
    if reaped_runs:
        logger.warning("Marked %s stuck test runs as error", reaped_runs)

    # Must stay lazy, for the same reason as in judge_submission_task.
    from app.services.docker_runner import remove_stale_sandboxes

    removed = remove_stale_sandboxes()
    if removed:
        logger.warning("Removed %s sandbox containers left by a dead worker", removed)


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
                strict_output=problem.strict_output,
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
            submission.missing_final_newline = judge_result.get("missing_final_newline", False)
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


def _clip_case_text(text):
    if text is None:
        return None
    if len(text) <= RUN_CASE_OUTPUT_LIMIT:
        return text
    return text[:RUN_CASE_OUTPUT_LIMIT] + "\n... (truncated)"


# On Redis 0 is the most urgent priority (the default, so submissions) and 9 the least:
# a waiting submission is always picked before a waiting test run.
@celery_app.task(ignore_result=True, priority=9)
def run_code_task(run_id):
    """Runs a student's code once against samples, hidden tests or a custom input.

    This does not create a submission. The row is a short lived scratch pad; the
    worker marks it finished with every case's output, or error if the sandbox
    itself broke. Compilation errors are a normal finished result.

    Random runs use hidden testcases. Their inputs, expected outputs and the
    program's raw output stay in the worker; only verdicts and timings are saved.
    """
    db = SessionLocal()

    try:
        run = db.query(Run).filter(Run.id == run_id).first()

        if run is None:
            raise ValueError(f"Run {run_id} is not found!")

        try:
            run.status = "running"
            db.commit()

            problem = db.query(Problem).filter(Problem.id == run.problem_id).first()

            if problem is None:
                raise ValueError(f"Problem {run.problem_id} is not found!")

            hidden = run.mode == "random"

            if run.mode == "samples":
                testcases = load_sample_testcases(db, problem.id, limit = MAX_SAMPLE_CASES)

                if not testcases:
                    raise ValueError(f"Problem {problem.id} has no sample tests")
            elif hidden:
                testcases = load_random_hidden_testcases(
                    db,
                    problem.id,
                    count = min(run.random_count or 1, MAX_RANDOM_CASES),
                )

                if not testcases:
                    raise ValueError(f"Problem {problem.id} has no hidden tests")
            else:
                testcases = [{
                    "id": None,
                    "input": run.custom_input or "",
                    "output": None,
                }]

            # Must stay lazy, like in judge_submission_task.
            from app.services.docker_runner import compile_in_docker, run_code_in_docker

            judge_result = run_tests(
                run_code=run_code_in_docker,
                code=run.code,
                testcases=testcases,
                time_limit_ms=problem.time_limit_ms,
                memory_limit_mb=problem.memory_limit_mb,
                language=run.language,
                compile_code=compile_in_docker,
                strict_output=problem.strict_output,
            )

            results = []

            for index, result in enumerate(judge_result["results"]):
                testcase = testcases[index] if index < len(testcases) else {}

                results.append({
                    "index": index + 1,
                    # Hidden inputs and outputs must never reach the browser.
                    "input": None if hidden else _clip_case_text(testcase.get("input")),
                    "expected_output": None if hidden else _clip_case_text(testcase.get("output")),
                    "stdout": "" if hidden else (_clip_case_text(result["stdout"]) or ""),
                    "stderr": "" if hidden else (_clip_case_text(result["stderr"]) or ""),
                    # The exit code is a side channel for hidden inputs; the
                    # verdict already tells the student whether the run failed.
                    "exit_code": None if hidden else result["exit_code"],
                    "verdict": result["verdict"],
                    "time_taken_ms": result["time_taken_ms"],
                    "memory_used_mb": result.get("memory_used_mb"),
                })

            run.results_json = json.dumps(results)
            run.verdict = judge_result["verdict"]
            run.compile_output = judge_result.get("compile_output")
            run.status = "finished"
            db.commit()

        except Exception:
            logger.exception("Internal error while running test run %s", run_id)
            db.rollback()

            try:
                run = db.query(Run).filter(Run.id == run_id).first()

                if run is not None:
                    run.status = "error"
                    run.verdict = None
                    db.commit()

            except Exception:
                db.rollback()
                logger.exception("Failed to save error for test run %s", run_id)

            raise

    finally:
        db.close()


@celery_app.task(ignore_result=True)
def delete_old_runs():
    """Test runs are scratch data; nobody needs yesterday's output."""
    db = SessionLocal()

    try:
        deleted = (
            db.query(Run)
            .filter(Run.created_at < datetime.utcnow() - RUN_RETENTION)
            .delete(synchronize_session=False)
        )
        db.commit()
    finally:
        db.close()

    if deleted:
        logger.info("Deleted %s old test runs", deleted)

