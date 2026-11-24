import random

from sqlalchemy.orm import Session

from app.models.testcase import TestCase
from app.storage import read_file

from .languages import needs_compilation


def load_testcases(db: Session, problem_id: int):

    testcases = (
        db.query(TestCase)
        .filter(TestCase.problem_id == problem_id)
        # Samples first, so a wrong answer on the visible test is the one reported.
        .order_by(TestCase.is_sample.desc(), TestCase.sample_order.nulls_last(), TestCase.id)
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


def load_sample_testcases(db: Session, problem_id: int, limit: int | None = None):
    """Only the visible samples, for a test run. Never touches hidden test files."""

    query = (
        db.query(TestCase)
        .filter(TestCase.problem_id == problem_id, TestCase.is_sample.is_(True))
        .order_by(TestCase.sample_order.nulls_last(), TestCase.id)
    )

    if limit is not None:
        query = query.limit(limit)

    return [
        {
            "id": testcase.id,
            "input": read_file(testcase.input_path),
            "output": read_file(testcase.output_path),
        }
        for testcase in query.all()
    ]


def load_random_hidden_testcases(db: Session, problem_id: int, count: int = 1):
    """Pick hidden testcases at random for a test run.

    The caller must never send their inputs or expected outputs back to the
    browser; a run only reports verdicts for these cases.
    """

    testcases = (
        db.query(TestCase)
        .filter(TestCase.problem_id == problem_id, TestCase.is_sample.is_(False))
        .all()
    )

    if not testcases:
        return []

    picked = random.sample(testcases, min(count, len(testcases)))

    return [
        {
            "id": testcase.id,
            "input": read_file(testcase.input_path),
            "output": read_file(testcase.output_path),
        }
        for testcase in picked
    ]


def _normalize_newlines(text):
    return text.replace("\r\n", "\n")


def compare_output(actual_output, expected_output, strict=True):
    """Returns "accepted", "presentation_error" or "wrong_answer".

    Strict, like UVa and the CPE judge: identical output is accepted, the same words
    with other whitespace (a missing final newline, an extra blank line, trailing
    spaces) is a presentation error, anything else is a wrong answer.

    Not strict, for warm-ups that are not a UVa problem: whitespace at the very start
    and end of the output is ignored.
    """
    actual = _normalize_newlines(actual_output)
    expected = _normalize_newlines(expected_output)

    if not strict:
        return "accepted" if actual.strip() == expected.strip() else "wrong_answer"

    # A test file saved without its last newline must not fail every correct answer.
    if expected.strip() != "" and not expected.endswith("\n"):
        expected += "\n"

    if actual == expected:
        return "accepted"

    if actual.split() == expected.split():
        return "presentation_error"

    return "wrong_answer"


def judge_code(
    run_code,
    code,
    input_data,
    expected_output,
    time_limit_ms,
    memory_limit_mb,
    strict_output=True,
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

    elif result.get("output_limit_exceeded", False):
        verdict = "output_limit_exceeded"

    elif result.get("is_oom", False):
        verdict = "memory_limit_exceeded"

    elif _is_heap_out_of_memory(result.get("stderr", "")):
        # The JVM caps its heap and exits on an OutOfMemoryError before the
        # container itself is OOM-killed; report that as MLE, not a runtime error.
        verdict = "memory_limit_exceeded"

    elif result["exit_code"] != 0:
        verdict = "runtime_error"

    elif expected_output is None:
        # A custom input has no expected output: producing output and exiting
        # cleanly is all there is to check.
        verdict = "accepted"

    else:
        verdict = compare_output(result["stdout"], expected_output, strict_output)

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
    strict_output=True,
):

    results = []

    if not testcases:
        raise ValueError("Cannot judge a submission without testcases")

    # Compiled languages build once, then every test runs the same binary.
    run_options = {}
    if needs_compilation(language):
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
            strict_output=strict_output,
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
        # Only a lenient problem gets here with such an output: a strict one answered
        # presentation_error. UVa and the CPE would still reject it, so warn.
        "missing_final_newline": any(
            missing_final_newline(result["stdout"]) for result in results
        ),
    }


def run_tests(
    run_code,
    code,
    testcases,
    time_limit_ms,
    memory_limit_mb,
    language="python",
    compile_code=None,
    strict_output=True,
):
    """Runs every case and keeps going after a failure, unlike judge_submission.

    A test run shows the student all the sample results at once. The overall
    verdict is the first failed case's verdict, or accepted when all pass.

    A time limit is the exception: the remaining cases would most likely hang too,
    each holding a judge slot for the whole limit, so the run stops there.
    """

    if not testcases:
        raise ValueError("Cannot run a test without testcases")

    run_options = {}
    if needs_compilation(language):
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

    results = []
    verdict = "accepted"

    for testcase in testcases:
        result = judge_code(
            run_code=run_code,
            code=code,
            input_data=testcase["input"],
            expected_output=testcase["output"],
            time_limit_ms=time_limit_ms,
            memory_limit_mb=memory_limit_mb,
            strict_output=strict_output,
            **run_options,
        )
        result["testcase_id"] = testcase["id"]
        results.append(result)

        if verdict == "accepted" and result["verdict"] != "accepted":
            verdict = result["verdict"]

        if result["verdict"] == "time_limit_exceeded":
            break

    return {"verdict": verdict, "results": results}


def missing_final_newline(output):
    return output.strip() != "" and not output.endswith("\n")


def _is_heap_out_of_memory(stderr):
    return "OutOfMemoryError" in stderr
