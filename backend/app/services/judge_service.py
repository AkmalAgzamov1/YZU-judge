from sqlalchemy.orm import Session

from app.models.testcase import TestCase
from app.storage import read_file


def load_testcases(db: Session, problem_id: int):

    testcases = (
        db.query(TestCase)
        .filter(TestCase.problem_id == problem_id)
        .order_by(TestCase.id)
        .all()
    )

    return [
        {
            "id": testcase.id,
            "input": read_file(testcase.input_path),
            "output": read_file(testcase.output_path),
        }
        for testcase in testcases
    ]


def compare_output(actual_output, expected_output):
    return actual_output.strip() == expected_output.strip()


def judge_code(
    run_code,
    code,
    input_data,
    expected_output,
    time_limit_ms,
    memory_limit_mb,
    **run_options,
):

    result = run_code(
        code=code,
        input_data=input_data,
        time_limit_ms=time_limit_ms,
        memory_limit_mb=memory_limit_mb,
        **run_options,
    )

    if result["timed_out"]:
        verdict = "time_limit_exceeded"

    elif result.get("is_oom", False):
        verdict = "memory_limit_exceeded"

    elif result["exit_code"] != 0:
        verdict = "runtime_error"

    elif not compare_output(
        result["stdout"],
        expected_output,
    ):
        verdict = "wrong_answer"

    else:
        verdict = "accepted"

    return {
        **result,
        "verdict": verdict,
    }


def judge_submission(
    run_code,
    code,
    testcases,
    time_limit_ms,
    memory_limit_mb,
    language="python",
    compile_code=None,
):

    results = []

    if not testcases:
        raise ValueError("Cannot judge a submission without testcases")

    # Compiled languages build once, then every test runs the same binary.
    run_options = {}
    if language != "python":
        if compile_code is None:
            raise ValueError(f"{language} needs compile_code")

        compiled = compile_code(language, code)
        if not compiled["ok"]:
            return {
                "verdict": "compilation_error",
                "results": [],
                "compile_output": compiled["output"],
            }

        run_options = {"language": language, "binary": compiled["binary"]}

    for testcase in testcases:

        result = judge_code(
            run_code=run_code,
            code=code,
            input_data=testcase["input"],
            expected_output=testcase["output"],
            time_limit_ms=time_limit_ms,
            memory_limit_mb=memory_limit_mb,
            **run_options,
        )
        result["testcase_id"] = testcase["id"]

        results.append(result)

        if result["verdict"] != "accepted":
            return {
                "verdict": result["verdict"],
                "results": results,
            }

    return {
        "verdict": "accepted",
        "results": results,
    }
