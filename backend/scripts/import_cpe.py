"""Import past CPE exams from cpe.mcu.edu.tw into YZU Judge.

For every exam it reads the 7 problems in order, downloads the official C++
solution and the two test inputs (A and B), runs the official solution in the
judge sandbox to produce the expected outputs, and stores:

  * one problem per UVa number, linking to the official statement PDF,
  * test A as the visible sample, tests A and B both used for judging,
  * one Mock CPE paper per exam whose problems all verified.

Problems whose official solution failed stay drafts for an admin to check.
Running it again is safe: existing problems and papers are left alone.

Run from backend/ with the Celery worker's Docker available:

    venv/Scripts/python.exe -m scripts.import_cpe            # every exam
    venv/Scripts/python.exe -m scripts.import_cpe --dates 2025-12-09 2025-09-30
    venv/Scripts/python.exe -m scripts.import_cpe --latest 5
"""

import argparse
import html
import math
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from app.database import SessionLocal
from app.models.cpe_paper import CpePaper, CpePaperProblem
from app.models.mock_exam import MockExam  # noqa: F401  # mapper registry
from app.models.problem import Problem
from app.models.submission import Submission  # noqa: F401  # mapper registry
from app.models.submission_result import SubmissionResult  # noqa: F401  # mapper registry
from app.models.testcase import TestCase
from app.models.user import User
from app.services.docker_runner import compile_in_docker, run_code_in_docker
from app.storage import save_file

SITE = "https://cpe.mcu.edu.tw"
INDEX_URL = f"{SITE}/cpe/test_data/"
CACHE_DIR = Path(__file__).resolve().parent.parent / "import_cache" / "cpe"
REQUEST_PAUSE_SECONDS = 0.3

# Generous limits for the official solution; students get the problem limits.
REFERENCE_TIME_LIMIT_MS = 10_000
REFERENCE_MEMORY_LIMIT_MB = 512
DEFAULT_TIME_LIMIT_MS = 3000
MAX_TIME_LIMIT_MS = 10_000
DEFAULT_MEMORY_LIMIT_MB = 256

# Share of all examinees who solved the problem during the real exam.
EASY_FROM_PERCENT = 30.0
MEDIUM_FROM_PERCENT = 3.0

ROW_PATTERN = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.I)
# Older exam pages leave attributes unquoted: href=/cpe/problemPdf/11934.pdf
HREF_PATTERN = re.compile(r"""<a[^>]*?href=["']?([^"'\s>]+)["']?[^>]*>(.*?)</a>""", re.S | re.I)
TITLE_PATTERN = re.compile(r"P(\d+)\s*-\s*uva\s*(\d+)\s*[:：]\s*(.+)", re.I)
PERCENT_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*%")
PRE_PATTERN = re.compile(r"<pre[^>]*>(.*?)</pre>", re.S | re.I)
COMMENT_PATTERN = re.compile(r"<!--.*?-->", re.S)


@dataclass
class ExamProblem:
    position: int
    uva_id: int
    title: str
    pdf_url: str
    code_url: str
    test_urls: list[str]
    solved_percent: float | None


@dataclass
class Exam:
    held_on: date
    problems: list[ExamProblem] = field(default_factory = list)


# ---------------------------------------------------------------- downloading

def fetch(url: str) -> str:
    """Downloads once and keeps a copy, so reruns do not hit the CPE site again."""
    cache_file = CACHE_DIR / re.sub(r"[^A-Za-z0-9._-]+", "_", url.removeprefix(SITE))
    if cache_file.exists():
        # Bytes, not text: text mode on Windows would turn \n into \r\n and back
        # into blank lines.
        return cache_file.read_bytes().decode("utf-8", errors = "replace")

    request = urllib.request.Request(url, headers = {"User-Agent": "YZU-Judge-import/1.0 (Yuan Ze University CPE practice)"})
    with urllib.request.urlopen(request, timeout = 60) as response:
        raw = response.read()

    CACHE_DIR.mkdir(parents = True, exist_ok = True)
    cache_file.write_bytes(raw)
    body = raw.decode("utf-8", errors = "replace")
    time.sleep(REQUEST_PAUSE_SECONDS)
    return body


def fetch_text_file(url: str) -> str:
    """Newer exams serve plain .txt files; older ones wrap the text in an HTML <pre>."""
    body = fetch(url)
    if "<pre" in body.lower():
        match = PRE_PATTERN.search(body)
        body = html.unescape(match.group(1)) if match else ""
    # Some files end lines with \r\r\n; dropping every \r leaves one newline per line.
    return body.replace("\r", "")


def absolute(url: str) -> str:
    if url.startswith("http"):
        return url.replace("http://", "https://", 1)
    return SITE + url


# -------------------------------------------------------------------- parsing

def list_exam_dates() -> list[date]:
    page = fetch(INDEX_URL)
    found = sorted(set(re.findall(r"/cpe/test_data/(\d{4}-\d{2}-\d{2})", page)))
    return [date.fromisoformat(value) for value in found]


def parse_exam(held_on: date) -> Exam:
    page = COMMENT_PATTERN.sub("", fetch(f"{INDEX_URL}{held_on.isoformat()}"))
    exam = Exam(held_on = held_on)

    for row in ROW_PATTERN.findall(page):
        links = [(href, re.sub(r"<[^>]+>", "", text).strip()) for href, text in HREF_PATTERN.findall(row)]
        title_link = next(((href, text) for href, text in links if TITLE_PATTERN.match(text)), None)
        if title_link is None:
            continue

        match = TITLE_PATTERN.match(title_link[1])
        code = next((href for href, text in links if text.lower() == "code"), None)
        tests = [href for href, text in links if text.startswith("測資")]
        percents = PERCENT_PATTERN.findall(row)

        if code is None or len(tests) == 0:
            print(f"  ! {held_on} P{match.group(1)}: no code or test links, skipped")
            continue

        exam.problems.append(ExamProblem(
            position = int(match.group(1)),
            uva_id = int(match.group(2)),
            title = html.unescape(match.group(3)).strip(),
            pdf_url = absolute(title_link[0]),
            code_url = absolute(code),
            test_urls = [absolute(href) for href in tests],
            # The last column is solved / all examinees.
            solved_percent = float(percents[-1]) if percents else None,
        ))

    exam.problems.sort(key = lambda problem: problem.position)
    return exam


def difficulty_for(solved_percent: float | None, position: int) -> str:
    if solved_percent is None:
        return "easy" if position <= 2 else "medium" if position <= 5 else "hard"
    if solved_percent >= EASY_FROM_PERCENT:
        return "easy"
    if solved_percent >= MEDIUM_FROM_PERCENT:
        return "medium"
    return "hard"


def time_limit_for(slowest_ms: int) -> int:
    """3 seconds, or more when even the official C++ is slow, in half seconds up to 10."""
    room_for_python = math.ceil(slowest_ms * 3 / 500) * 500
    return min(MAX_TIME_LIMIT_MS, max(DEFAULT_TIME_LIMIT_MS, room_for_python))


def statement_for(problem: ExamProblem, held_on: date) -> str:
    return (
        f"This is UVa {problem.uva_id}, problem {chr(64 + problem.position)} of the CPE held on "
        f"{held_on:%Y/%m/%d}.\n\n"
        f"**[Read the official statement (PDF)]({problem.pdf_url})**\n\n"
        "The statement belongs to UVa Online Judge and the CPE. Your program reads standard input "
        "and writes standard output exactly as it describes. Test A below is one of the two tests "
        "used to judge your code."
    )


# ----------------------------------------------------------------- generating

def generate_outputs(problem: ExamProblem) -> tuple[list[tuple[str, str]] | None, str, int]:
    """Runs the official solution on every test input. Returns (tests, note, slowest ms)."""
    try:
        code = fetch_text_file(problem.code_url)
        inputs = [fetch_text_file(url) for url in problem.test_urls]
    except urllib.error.URLError as error:
        # The CPE site misses a few files; the problem becomes a draft instead.
        return None, f"download failed: {error}", 0

    compiled = compile_in_docker("cpp", code)
    if not compiled["ok"]:
        # Older solutions lean on headers that old compilers included implicitly,
        # like std::find without <algorithm>. Give them every standard header.
        code = "#include <bits/stdc++.h>\n" + code
        compiled = compile_in_docker("cpp", code)
    if not compiled["ok"]:
        return None, "official solution did not compile: " + compiled["output"][:200], 0

    tests = []
    slowest = 0
    for name, test_input in zip("AB", inputs):
        result = run_code_in_docker(
            code, test_input, REFERENCE_TIME_LIMIT_MS, REFERENCE_MEMORY_LIMIT_MB,
            language = "cpp", binary = compiled["binary"],
        )
        if result["timed_out"] or result["is_oom"] or result["exit_code"] != 0:
            return None, f"official solution failed on test {name} (exit {result['exit_code']})", 0
        if not result["stdout"]:
            return None, f"official solution printed nothing on test {name}", 0
        tests.append((test_input, result["stdout"] + "\n"))
        slowest = max(slowest, result["time_taken_ms"])

    return tests, "verified", slowest


# -------------------------------------------------------------------- storing

def import_problem(db, problem: ExamProblem, held_on: date, admin_id: int) -> tuple[Problem, str]:
    existing = db.query(Problem).filter(Problem.uva_id == problem.uva_id).first()
    if existing is not None:
        has_tests = db.query(TestCase).filter(TestCase.problem_id == existing.id).first() is not None
        if existing.is_published or has_tests:
            return existing, "exists"
        # A draft left by a missing file: this sitting may have complete files.
        return fill_draft(db, existing, problem, held_on)

    tests, note, slowest = generate_outputs(problem)
    verified = tests is not None

    record = Problem(
        title = problem.title,
        uva_id = problem.uva_id,
        description = statement_for(problem, held_on),
        difficulty = difficulty_for(problem.solved_percent, problem.position),
        time_limit_ms = time_limit_for(slowest),
        memory_limit_mb = DEFAULT_MEMORY_LIMIT_MB,
        is_cpe = True,
        is_published = verified,
        topics = [],
        created_by = admin_id,
    )
    db.add(record)
    db.flush()
    save_tests(db, record, tests or [])
    db.commit()
    return record, note


def fill_draft(db, record: Problem, problem: ExamProblem, held_on: date) -> tuple[Problem, str]:
    tests, note, slowest = generate_outputs(problem)
    if tests is None:
        return record, note

    record.description = statement_for(problem, held_on)
    record.time_limit_ms = time_limit_for(slowest)
    record.is_published = True
    save_tests(db, record, tests)
    db.commit()
    return record, "verified (filled draft)"


def save_tests(db, record: Problem, tests: list[tuple[str, str]]):
    for index, (test_input, test_output) in enumerate(tests):
        is_sample = index == 0
        testcase = TestCase(
            problem_id = record.id,
            input_path = "",
            output_path = "",
            is_sample = is_sample,
            sample_order = 1 if is_sample else None,
        )
        db.add(testcase)
        db.flush()
        testcase.input_path = save_file(record.id, f"{testcase.id}_input.txt", test_input)
        testcase.output_path = save_file(record.id, f"{testcase.id}_output.txt", test_output)


def import_paper(db, exam: Exam, problem_ids: list[int]) -> str:
    if db.query(CpePaper).filter(CpePaper.held_on == exam.held_on).first() is not None:
        return "paper exists"

    paper = CpePaper(title = f"CPE {exam.held_on:%Y/%m/%d}", held_on = exam.held_on, duration_minutes = 180)
    db.add(paper)
    db.flush()
    paper.problems.extend(
        CpePaperProblem(problem_id = problem_id, position = index + 1)
        for index, problem_id in enumerate(problem_ids)
    )
    db.commit()
    return "paper created"


def main():
    parser = argparse.ArgumentParser(description = "Import past CPE exams")
    parser.add_argument("--dates", nargs = "*", help = "only these exam dates, YYYY-MM-DD")
    parser.add_argument("--latest", type = int, help = "only the N most recent exams")
    args = parser.parse_args()

    dates = list_exam_dates()
    if args.dates:
        wanted = {date.fromisoformat(value) for value in args.dates}
        dates = [value for value in dates if value in wanted]
    if args.latest:
        dates = dates[-args.latest:]

    db = SessionLocal()
    admin = db.query(User).filter(User.is_admin == True).order_by(User.id).first()
    if admin is None:
        sys.exit("No admin user found. Make one admin first; imported problems need an author.")

    totals = {"verified": 0, "exists": 0, "draft": 0, "papers": 0, "papers_skipped": 0}
    print(f"Importing {len(dates)} CPE exams")

    try:
        # Newest first, so a problem's link and difficulty come from its latest sitting.
        for held_on in reversed(dates):
            exam = parse_exam(held_on)
            print(f"\n{held_on}: {len(exam.problems)} problems")
            problem_ids, all_published = [], True

            for problem in exam.problems:
                record, note = import_problem(db, problem, held_on, admin.id)
                problem_ids.append(record.id)
                all_published &= record.is_published
                key = "exists" if note == "exists" else "verified" if note.startswith("verified") else "draft"
                totals[key] += 1
                print(f"  P{problem.position} UVa {problem.uva_id:<6} {record.difficulty:<6} {note}")

            if len(problem_ids) == len(exam.problems) and exam.problems and all_published:
                outcome = import_paper(db, exam, problem_ids)
                totals["papers" if outcome == "paper created" else "papers_skipped"] += 1
                print(f"  -> {outcome}")
            else:
                totals["papers_skipped"] += 1
                print("  -> no paper: some problems are drafts")
    finally:
        db.close()

    print(
        f"\nDone. New verified problems: {totals['verified']}, new drafts: {totals['draft']}, "
        f"already there: {totals['exists']}, papers created: {totals['papers']}, "
        f"papers skipped: {totals['papers_skipped']}"
    )


if __name__ == "__main__":
    main()
