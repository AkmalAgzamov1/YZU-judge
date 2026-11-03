"""Hints and reference solutions for easy and medium CPE problems.

cpe_help.json maps a UVa id to its hints (0 to 2), a short explanation and a
solution in Python and C++. Nothing gets into it without passing our own judge:
`verify` runs both solutions on every real test and merges only Accepted entries,
and stores a hash of the code it judged so `apply` can refuse anything edited later.

    # Judge a draft file and merge what is Accepted into cpe_help.json
    venv/Scripts/python.exe -m scripts.cpe_help verify path/to/drafts.json [UVA ...]

    # Judge everything already in cpe_help.json again (after tests change)
    venv/Scripts/python.exe -m scripts.cpe_help check [UVA ...]

    # Write cpe_help.json into the problems (safe to run again)
    venv/Scripts/python.exe -m scripts.cpe_help apply
"""

import hashlib
import json
import sys
from pathlib import Path

from app.database import SessionLocal
from app.models.cpe_paper import CpePaper  # noqa: F401  # mapper registry
from app.models.mock_exam import MockExam  # noqa: F401  # mapper registry
from app.models.problem import Problem
from app.models.testcase import TestCase  # noqa: F401  # mapper registry
from app.models.submission import Submission  # noqa: F401  # mapper registry
from app.models.user import User  # noqa: F401  # mapper registry
from app.routers.problem_help import HELP_DIFFICULTIES
from app.services.judge_service import load_testcases, judge_submission

HELP_FILE = Path(__file__).resolve().parent / "cpe_help.json"
LANGUAGES = ("python", "cpp")
MAX_HINTS = 2


def code_hash(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def load_help() -> dict:
    if not HELP_FILE.exists():
        return {}
    return json.loads(HELP_FILE.read_text(encoding = "utf-8"))


def save_help(content: dict):
    ordered = dict(sorted(content.items(), key = lambda item: int(item[0])))
    HELP_FILE.write_text(json.dumps(ordered, indent = 2, ensure_ascii = False) + "\n", encoding = "utf-8")


def find_problem(db, key: str) -> Problem | None:
    return db.query(Problem).filter(Problem.uva_id == int(key)).first()


def entry_problems(entry: dict) -> list[str]:
    """What is wrong with an entry's shape, before spending time on the judge."""
    problems = []
    hints = entry.get("hints")
    if not isinstance(hints, list) or len(hints) > MAX_HINTS or not all(isinstance(h, str) and h.strip() for h in hints):
        problems.append(f"hints must be a list of 0 to {MAX_HINTS} non-empty strings")
    for field in ("explanation", *LANGUAGES):
        if not isinstance(entry.get(field), str) or not entry[field].strip():
            problems.append(f"{field} is missing")
    return problems


def judge_entry(db, key: str, entry: dict) -> dict[str, str]:
    """Verdict per language on the problem's real tests, e.g. {"python": "accepted", ...}."""
    # Lazy like in tasks.py: importing it connects to Docker.
    from app.services.docker_runner import compile_in_docker, run_code_in_docker

    problem = find_problem(db, key)
    testcases = load_testcases(db, problem.id)
    verdicts = {}

    for language in LANGUAGES:
        result = judge_submission(
            run_code = run_code_in_docker,
            code = entry[language],
            testcases = testcases,
            time_limit_ms = problem.time_limit_ms,
            memory_limit_mb = problem.memory_limit_mb,
            language = language,
            compile_code = compile_in_docker,
        )
        verdict = result["verdict"]
        if verdict == "compilation_error":
            first_line = ((result.get("compile_output") or "").strip().splitlines() or [""])[0]
            verdict += f": {first_line}"
        elif verdict != "accepted":
            verdict += f" on test {len(result['results'])} of {len(testcases)}"
        verdicts[language] = verdict

    return verdicts


def judge_all(db, entries: dict) -> dict[str, dict[str, str] | list[str]]:
    """Judges every entry; returns the accepted verdicts or the reasons an entry failed."""
    outcome = {}
    for key, entry in entries.items():
        problem = find_problem(db, key)
        if problem is None:
            reasons = ["not in the database"]
        elif problem.difficulty not in HELP_DIFFICULTIES:
            reasons = [f"is {problem.difficulty}, only easy and medium problems get help"]
        else:
            reasons = entry_problems(entry)
        if not reasons:
            verdicts = judge_entry(db, key, entry)
            reasons = [f"{language}: {verdict}" for language, verdict in verdicts.items() if verdict != "accepted"]
        print(f"UVa {key}: " + ("Accepted" if not reasons else "; ".join(reasons)), flush = True)
        outcome[key] = reasons
    return outcome


def pick(entries: dict, uva_ids: list[str]) -> dict:
    return {key: entries[key] for key in entries if not uva_ids or key in uva_ids}


def verify(draft_path: str, uva_ids: list[str]):
    drafts = pick(json.loads(Path(draft_path).read_text(encoding = "utf-8")), uva_ids)
    content = load_help()
    db = SessionLocal()
    try:
        outcome = judge_all(db, drafts)
    finally:
        db.close()

    accepted = [key for key, reasons in outcome.items() if not reasons]
    for key in accepted:
        entry = drafts[key]
        content[key] = {
            "hints": [hint.strip() for hint in entry["hints"]],
            "explanation": entry["explanation"].strip(),
            "python": entry["python"],
            "cpp": entry["cpp"],
            "verified": {language: code_hash(entry[language]) for language in LANGUAGES},
        }
    save_help(content)

    failed = len(outcome) - len(accepted)
    print(f"Merged {len(accepted)} into {HELP_FILE.name}." + (f" {failed} not Accepted, left out." if failed else ""))
    if failed:
        sys.exit(1)


def check(uva_ids: list[str]):
    db = SessionLocal()
    try:
        outcome = judge_all(db, pick(load_help(), uva_ids))
    finally:
        db.close()
    failed = [key for key, reasons in outcome.items() if reasons]
    print(f"{len(outcome) - len(failed)} of {len(outcome)} Accepted." + (f" Failing: {', '.join(failed)}" if failed else ""))
    if failed:
        sys.exit(1)


def apply():
    content = load_help()

    # Refuse the whole file if any code differs from what the judge accepted.
    for key, entry in content.items():
        verified = entry.get("verified", {})
        stale = [language for language in LANGUAGES if verified.get(language) != code_hash(entry.get(language, ""))]
        if stale or entry_problems(entry):
            sys.exit(f"UVa {key}: {', '.join(stale) or 'entry'} changed since it was verified. Run verify again.")

    db = SessionLocal()
    updated, missing = 0, []
    try:
        for key, entry in content.items():
            problem = find_problem(db, key)
            if problem is None:
                missing.append(key)
                continue
            if problem.difficulty not in HELP_DIFFICULTIES:
                sys.exit(f"UVa {key} is {problem.difficulty}; only easy and medium problems get help.")
            problem.hints = entry["hints"]
            problem.solution_explanation = entry["explanation"]
            problem.solution_python = entry["python"]
            problem.solution_cpp = entry["cpp"]
            updated += 1

        # The file is the source of truth: help removed from it disappears from the site.
        listed = [int(key) for key in content]
        for problem in db.query(Problem).filter(Problem.solution_python.isnot(None), Problem.uva_id.notin_(listed or [-1])):
            problem.hints = []
            problem.solution_explanation = problem.solution_python = problem.solution_cpp = None
        db.commit()
    finally:
        db.close()
    print(f"Updated {updated} problems." + (f" Not in the database: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "verify" and len(sys.argv) > 2:
        verify(sys.argv[2], sys.argv[3:])
    elif command == "check":
        check(sys.argv[2:])
    elif command == "apply":
        apply()
    else:
        sys.exit(__doc__)
