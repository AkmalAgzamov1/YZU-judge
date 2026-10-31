"""Statements and topics for imported CPE problems.

The statements in cpe_content.json are written for YZU Judge in our own words;
the official PDF stays linked on every problem for the original text.

    # Pull PDF text into import_cache/cpe/text/ so statements can be written
    venv/Scripts/python.exe -m scripts.cpe_content extract [UVA ...]

    # Take each statement's sample from the PDF text, run the official solution
    # on it, and store the ones whose output agrees with the PDF
    venv/Scripts/python.exe -m scripts.cpe_content samples [UVA ...]

    # Write cpe_content.json into the problems (safe to run again)
    venv/Scripts/python.exe -m scripts.cpe_content apply
"""

import json
import re
import sys
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path

from app.database import SessionLocal
from app.models.cpe_paper import CpePaper  # noqa: F401  # mapper registry
from app.models.mock_exam import MockExam  # noqa: F401  # mapper registry
from app.models.problem import Problem
from app.models.testcase import TestCase
from app.models.submission import Submission  # noqa: F401  # mapper registry
from app.models.user import User  # noqa: F401  # mapper registry
from app.storage import read_file, save_file, write_file
from app.topics import TOPICS, normalize_topics

CONTENT_FILE = Path(__file__).resolve().parent / "cpe_content.json"
TEXT_DIR = Path(__file__).resolve().parent.parent / "import_cache" / "cpe" / "text"
SAMPLE_REVIEW_FILE = TEXT_DIR.parent / "sample_review.json"
PDF_LINK = re.compile(r"\]\((https://cpe\.mcu\.edu\.tw/[^)]+\.pdf)\)")

SAMPLE_INPUT_HEADING = re.compile(r"^[ \t]*sample[ \t]+input[ \t]*:?[ \t]*$", re.I | re.M)
SAMPLE_OUTPUT_HEADING = re.compile(r"^[ \t]*sample[ \t]+output[ \t]*:?[ \t]*$", re.I | re.M)
# Page furniture pypdf leaves between the lines of a sample; the footer is
# sometimes broken over two lines ("Univ" / "ersidad de Valladolid OJ: ...").
PAGE_FOOTER = re.compile(r"^[ \t]*" + r"\s*".join("UniversidaddeValladolidOJ:") + r".*\n?", re.M)
# The CPE's own note under a sample it changed.
MODIFIED_NOTE = re.compile(r"^Modified from UVA")
# A remark printed after the sample output ("Note: use scanf ...").
TRAILING_REMARK = re.compile(r"^(Note|Hint)s?\s*:", re.I | re.M)
# Typography the PDF adds to plain ASCII.
PDF_CHARACTERS = str.maketrans({
    "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl",
    "‘": "'", "’": "'", "“": '"', "”": '"',
})
# Test files written by the samples step, so a rerun finds and updates them.
STATEMENT_SAMPLE_SUFFIX = "_statement"


def pdf_url_of(problem: Problem) -> str | None:
    match = PDF_LINK.search(problem.description or "")
    return match.group(1) if match else None


def extract(uva_ids: list[int]):
    from pypdf import PdfReader

    TEXT_DIR.mkdir(parents = True, exist_ok = True)
    db = SessionLocal()
    try:
        query = db.query(Problem).filter(Problem.is_cpe == True, Problem.uva_id.isnot(None))
        if uva_ids:
            query = query.filter(Problem.uva_id.in_(uva_ids))
        for problem in query.order_by(Problem.uva_id):
            target = TEXT_DIR / f"{problem.uva_id}.txt"
            url = pdf_url_of(problem)
            if target.exists() or url is None:
                continue
            request = urllib.request.Request(url, headers = {"User-Agent": "YZU-Judge-import/1.0"})
            try:
                with urllib.request.urlopen(request, timeout = 60) as response:
                    reader = PdfReader(BytesIO(response.read()))
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception as error:  # a broken PDF should not stop the rest
                print(f"UVa {problem.uva_id}: {error}")
                continue
            target.write_bytes(text.encode("utf-8"))
            print(f"UVa {problem.uva_id}: {len(text)} characters")
            time.sleep(0.3)
    finally:
        db.close()


def clean_sample(text: str) -> str:
    lines = [
        line.rstrip() for line in PAGE_FOOTER.sub("", text.translate(PDF_CHARACTERS)).split("\n")
        if not MODIFIED_NOTE.match(line.strip())
    ]
    return "\n".join(lines).strip("\n") + "\n"


def statement_sample(text: str) -> tuple[str, str] | None:
    """The sample input and output printed in a statement, or None when they can't be told apart."""
    inputs = list(SAMPLE_INPUT_HEADING.finditer(text))
    outputs = list(SAMPLE_OUTPUT_HEADING.finditer(text))
    if len(inputs) != 1 or len(outputs) != 1 or outputs[0].start() < inputs[0].end():
        return None
    sample_input = clean_sample(text[inputs[0].end():outputs[0].start()])
    printed = text[outputs[0].end():]
    remark = TRAILING_REMARK.search(printed)
    sample_output = clean_sample(printed[:remark.start()] if remark else printed)
    if not sample_input.strip() or not sample_output.strip():
        return None
    return sample_input, sample_output


def plain_text(text: str) -> bool:
    # pypdf turns some minus signs into NUL, so control characters mean a garbled sample.
    return all(" " <= char <= "~" or char in "\t\n" for char in text)


def compare_samples(official: str, printed: str) -> str:
    def lines(text):
        return [line.rstrip() for line in text.rstrip().split("\n")]

    if lines(official) == lines(printed):
        return "same"
    # pypdf often drops or adds spaces, so the PDF's spacing can't be trusted.
    if official.split() == printed.split():
        return "spacing"
    return "different"


def official_sittings() -> dict[int, list]:
    """Every exam sitting of each UVa problem, newest first, from the cached CPE pages."""
    from scripts.import_cpe import list_exam_dates, parse_exam

    sittings = {}
    for held_on in reversed(list_exam_dates()):
        for problem in parse_exam(held_on).problems:
            sittings.setdefault(problem.uva_id, []).append(problem)
    return sittings


def official_output(sittings: list, sample_input: str) -> tuple[str | None, str]:
    """Runs the newest official solution that works. Returns (output, note)."""
    from scripts.import_cpe import compile_official, fetch_text_file, run_official

    note = "no official solution"
    for sitting in sittings:
        try:
            code, compiled = compile_official(fetch_text_file(sitting.code_url))
        except urllib.error.URLError as error:
            note = f"download failed: {error}"
            continue
        if not compiled["ok"]:
            note = "official solution did not compile"
            continue
        result = run_official(code, compiled, sample_input)
        if result["timed_out"] or result["is_oom"] or result["exit_code"] != 0:
            note = f"official solution failed on the sample (exit {result['exit_code']})"
            continue
        if not result["stdout"]:
            note = "official solution printed nothing on the sample"
            continue
        return result["stdout"] + "\n", "ok"
    return None, note


def samples(uva_ids: list[int]):
    """Stores statement samples whose official output agrees with the PDF; the rest go to review."""
    content = json.loads(CONTENT_FILE.read_text(encoding = "utf-8"))
    sittings = official_sittings()
    review = json.loads(SAMPLE_REVIEW_FILE.read_text(encoding = "utf-8")) if SAMPLE_REVIEW_FILE.exists() else {}
    counts = {}

    for key, entry in content.items():
        # Without a list, only problems that have no sample yet; a list redoes those problems.
        if (uva_ids and int(key) not in uva_ids) or (not uva_ids and "sample_input" in entry):
            continue
        text_file = TEXT_DIR / f"{key}.txt"
        sample = statement_sample(text_file.read_bytes().decode("utf-8", errors = "replace")) if text_file.exists() else None
        if sample is None:
            outcome = {"status": "no sample found in the PDF text"}
        else:
            sample_input, printed = sample
            output, note = official_output(sittings.get(int(key), []), sample_input)
            if output is None:
                outcome = {"status": note, "input": sample_input, "pdf_output": printed}
            elif not plain_text(sample_input):
                outcome = {"status": "not plain ASCII", "input": sample_input, "pdf_output": printed, "official_output": output}
            else:
                status = compare_samples(output, printed)
                outcome = {"status": status, "input": sample_input, "pdf_output": printed, "official_output": output}
                if status in ("same", "spacing"):
                    entry["sample_input"] = sample_input
                    entry["sample_output"] = output
        review[key] = outcome
        counts[outcome["status"]] = counts.get(outcome["status"], 0) + 1
        print(f"UVa {key}: {outcome['status']}")

    CONTENT_FILE.write_text(json.dumps(content, indent = 2, ensure_ascii = False) + "\n", encoding = "utf-8")
    SAMPLE_REVIEW_FILE.write_text(json.dumps(review, indent = 2, ensure_ascii = False) + "\n", encoding = "utf-8")
    print(f"\n{counts}\nDetails in {SAMPLE_REVIEW_FILE}")


def apply_sample(db, problem: Problem, entry: dict) -> bool:
    """Makes the statement's sample the only visible test; the tests it replaces stay as hidden tests."""
    if "sample_input" not in entry:
        return False
    tests = db.query(TestCase).filter(TestCase.problem_id == problem.id).order_by(TestCase.id).all()
    statement = next((test for test in tests if STATEMENT_SAMPLE_SUFFIX in Path(test.input_path).name), None)
    if statement is None:
        statement = TestCase(problem_id = problem.id, input_path = "", output_path = "")
        db.add(statement)
        db.flush()
        statement.input_path = save_file(problem.id, f"{statement.id}{STATEMENT_SAMPLE_SUFFIX}_input.txt", entry["sample_input"])
        statement.output_path = save_file(problem.id, f"{statement.id}{STATEMENT_SAMPLE_SUFFIX}_output.txt", entry["sample_output"])
    else:
        if read_file(statement.input_path) != entry["sample_input"]:
            write_file(statement.input_path, entry["sample_input"])
        if read_file(statement.output_path) != entry["sample_output"]:
            write_file(statement.output_path, entry["sample_output"])
    for test in tests:
        test.is_sample = False
        test.sample_order = None
    statement.is_sample = True
    statement.sample_order = 1
    return True


def statement_markdown(entry: dict, pdf_url: str | None) -> str:
    parts = []
    if pdf_url:
        parts.append(f"**[Read the official statement (PDF)]({pdf_url})**")
    parts.append(entry["statement"].strip())
    parts.append(
        "*This summary was written for YZU Judge. If anything here disagrees with the "
        "official statement, the official statement is right.*"
    )
    return "\n\n".join(parts)


def apply():
    content = json.loads(CONTENT_FILE.read_text(encoding = "utf-8"))
    db = SessionLocal()
    updated, with_samples, missing = 0, 0, []
    try:
        for key, entry in content.items():
            problem = db.query(Problem).filter(Problem.uva_id == int(key)).first()
            if problem is None:
                missing.append(key)
                continue
            unknown = set(entry.get("topics", [])) - set(TOPICS)
            if unknown:
                sys.exit(f"UVa {key}: unknown topics {sorted(unknown)}")
            problem.description = statement_markdown(entry, pdf_url_of(problem))
            # The CPE site mislabels a few problems; the PDF has the real title.
            if entry.get("title"):
                problem.title = entry["title"]
            problem.topics = normalize_topics(entry.get("topics", []))
            with_samples += apply_sample(db, problem, entry)
            updated += 1
        db.commit()
    finally:
        db.close()
    print(
        f"Updated {updated} problems, {with_samples} with the statement's sample."
        + (f" Not in the database: {', '.join(missing)}" if missing else "")
    )


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "extract":
        extract([int(value) for value in sys.argv[2:]])
    elif command == "samples":
        samples([int(value) for value in sys.argv[2:]])
    elif command == "apply":
        apply()
    else:
        sys.exit(__doc__)
