from app.celery_app import celery_app
from app.database import SessionLocal

from app.models.submission import Submission 
from app.models.submission_result import SubmissionResult

from app.models.problem import Problem
from app.models.user import User
from app.services.judge_service import load_testcases, judge_submission
from app.services.docker_runner import run_code_in_docker

@celery_app.task
def add(a, b):
    db = SessionLocal()
    try:
        return a + b
    finally:
        db.close()

@celery_app.task
def judge_submission_task(submission_id):
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if submission is None:
            raise ValueError(
                f"Submission {submission_id} is not found!"
            )
        submission.status = "running"
        db.commit()

        problem = db.query(Problem).filter(Problem.id == submission.problem_id).first()
        if problem is None:
            raise ValueError(f"Problem {submission.problem_id} is not found!")


        testcases = load_testcases(db, problem.id)

        judge_result = judge_submission(
            run_code = run_code_in_docker,
            code = submission.code,
            testcases = testcases,
            time_limit_ms = problem.time_limit_ms,
            memory_limit_mb = problem.memory_limit_mb
        )

        for result in judge_result['results']:
            result_record = SubmissionResult(
                submission_id = submission.id,
                test_case_id = result["testcase_id"],
                verdict = result["verdict"],
                time_taken_ms = result["time_taken_ms"],
                memory_used_mb=result.get("memory_used_mb"),
            )
            db.add(result_record)

        submission.status = judge_result["verdict"]
        db.commit()
    finally:
        db.close()  

    


