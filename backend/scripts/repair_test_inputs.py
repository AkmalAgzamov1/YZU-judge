"""Removes the empty first line that older imports put into the CPE tests (safe to run again).

The CPE site wraps older test files in <pre>, and HTML ignores the newline right
after <pre>. scripts/import_cpe.py used to keep it, so tests A and B started with an
empty line and their expected outputs held an answer for that empty "case".

For every test whose input is an official test with one extra newline in front,
this writes the official input back and runs the official solution on it again
for the expected output. Tests that are already right are left alone.

Run from backend/ where Docker is available (the worker container on the server):

    venv/Scripts/python.exe -m scripts.repair_test_inputs --dry-run
    venv/Scripts/python.exe -m scripts.repair_test_inputs
"""

import argparse
import sys
import urllib.error

from app.database import SessionLocal
from app.models.cpe_paper import CpePaper  # noqa: F401  # mapper registry
from app.models.mock_exam import MockExam  # noqa: F401  # mapper registry
from app.models.problem import Problem
from app.models.submission import Submission  # noqa: F401  # mapper registry
from app.models.testcase import TestCase
from app.models.user import User  # noqa: F401  # mapper registry
from app.storage import read_file, resolve, write_file
from scripts.import_cpe import SITE, compile_official, fetch_text_file, run_official


def official_inputs(uva_id: int) -> list[str]:
    return [fetch_text_file(f"{SITE}/cpe/problemPdf/testData/uva{uva_id}{name}.php") for name in "ab"]


def broken_tests(db, problem: Problem) -> list[tuple[TestCase, str]]:
    """Tests whose input is an official input with a newline in front, paired with that input."""
    tests = db.query(TestCase).filter(TestCase.problem_id == problem.id).order_by(TestCase.id).all()
    candidates = [(test, read_file(test.input_path)) for test in tests]
    candidates = [(test, text) for test, text in candidates if text.startswith("\n")]
    if not candidates:
        return []

    sources = official_inputs(problem.uva_id)
    return [(test, text[1:]) for test, text in candidates if text[1:] in sources]


def repair(db, problem: Problem, broken: list[tuple[TestCase, str]], dry_run: bool) -> str:
    code, compiled = compile_official(fetch_text_file(f"{SITE}/cpe/problemPdf/{problem.uva_id}.php"))
    if not compiled["ok"]:
        return "official solution did not compile, left alone"

    outputs = []
    for test, fixed_input in broken:
        result = run_official(code, compiled, fixed_input)
        if result["timed_out"] or result["is_oom"] or result["exit_code"] != 0 or not result["stdout"].strip():
            return f"official solution failed on test {test.id} (exit {result['exit_code']}), left alone"
        outputs.append(result["stdout"].strip() + "\n")

    changed = sum(output != read_file(test.output_path) for (test, _), output in zip(broken, outputs))
    if not dry_run:
        for (test, fixed_input), output in zip(broken, outputs):
            write_file(str(resolve(test.input_path)), fixed_input)
            write_file(str(resolve(test.output_path)), output)
    return f"{len(broken)} tests fixed, {changed} expected outputs changed"


def main():
    parser = argparse.ArgumentParser(description = "Remove the empty first line from imported CPE tests")
    parser.add_argument("--dry-run", action = "store_true", help = "report what would change, write nothing")
    parser.add_argument("uva", nargs = "*", type = int, help = "only these UVa ids")
    args = parser.parse_args()

    db = SessionLocal()
    fixed, failed = 0, []
    try:
        query = db.query(Problem).filter(Problem.uva_id.isnot(None)).order_by(Problem.uva_id)
        if args.uva:
            query = query.filter(Problem.uva_id.in_(args.uva))
        for problem in query:
            try:
                broken = broken_tests(db, problem)
                if not broken:
                    continue
                note = repair(db, problem, broken, args.dry_run)
            except urllib.error.URLError as error:
                note = f"download failed: {error}, left alone"
            print(f"UVa {problem.uva_id:<6} {note}", flush = True)
            if note.endswith("left alone"):
                failed.append(problem.uva_id)
            else:
                fixed += 1
    finally:
        db.close()

    print(("Would fix" if args.dry_run else "Fixed") + f" {fixed} problems." + (f" Left alone: {failed}" if failed else ""))
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
