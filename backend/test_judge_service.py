from app.database import SessionLocal
from app.models.problem import Problem
from app.models.testcase import TestCase

from app.services.judge_service import (
    load_testcases,
    judge_submission,
)

from app.services.docker_runner import run_code_in_docker


db = SessionLocal()

testcases = load_testcases(
    db=db,
    problem_id=1,
)

result = judge_submission(
    run_code=run_code_in_docker,
    code="""
print(1 / 0)
""",
    testcases=testcases,
    time_limit_ms=3000,
    memory_limit_mb=128,
)

print(result)
print(testcases)

db.close()
