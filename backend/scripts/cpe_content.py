"""Statements and topics for imported CPE problems.

The statements in cpe_content.json are written for YZU Judge in our own words;
the official PDF stays linked on every problem for the original text.

    # Pull PDF text into import_cache/cpe/text/ so statements can be written
    venv/Scripts/python.exe -m scripts.cpe_content extract [UVA ...]

    # Write cpe_content.json into the problems (safe to run again)
    venv/Scripts/python.exe -m scripts.cpe_content apply
"""

import json
import re
import sys
import time
import urllib.request
from io import BytesIO
from pathlib import Path

from app.database import SessionLocal
from app.models.cpe_paper import CpePaper  # noqa: F401  # mapper registry
from app.models.mock_exam import MockExam  # noqa: F401  # mapper registry
from app.models.problem import Problem
from app.models.testcase import TestCase  # noqa: F401  # mapper registry
from app.models.submission import Submission  # noqa: F401  # mapper registry
from app.models.user import User  # noqa: F401  # mapper registry
from app.topics import TOPICS, normalize_topics

CONTENT_FILE = Path(__file__).resolve().parent / "cpe_content.json"
TEXT_DIR = Path(__file__).resolve().parent.parent / "import_cache" / "cpe" / "text"
PDF_LINK = re.compile(r"\]\((https://cpe\.mcu\.edu\.tw/[^)]+\.pdf)\)")


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
    updated, missing = 0, []
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
            updated += 1
        db.commit()
    finally:
        db.close()
    print(f"Updated {updated} problems." + (f" Not in the database: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "extract":
        extract([int(value) for value in sys.argv[2:]])
    elif command == "apply":
        apply()
    else:
        sys.exit(__doc__)
