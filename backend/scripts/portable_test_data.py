"""Make test data portable before moving it to another machine (safe to run again).

Rows written before app/storage.py stored relative paths hold absolute Windows
paths, and files written on Windows have \\r\\n line ends and sometimes cp1252
text. This rewrites every test case to a relative path and every file to UTF-8
with \\n, which is exactly what the judge read from them on Windows anyway.

    venv/Scripts/python.exe -m scripts.portable_test_data
"""

from pathlib import PureWindowsPath, PurePosixPath

from app.database import SessionLocal
from app.models.cpe_paper import CpePaper  # noqa: F401  # mapper registry
from app.models.mock_exam import MockExam  # noqa: F401  # mapper registry
from app.models.problem import Problem  # noqa: F401  # mapper registry
from app.models.submission import Submission  # noqa: F401  # mapper registry
from app.models.testcase import TestCase
from app.models.user import User  # noqa: F401  # mapper registry
from app.storage import BASE_DIR, resolve


def relative(path: str) -> str:
    parts = (PureWindowsPath(path) if "\\" in path else PurePosixPath(path)).parts
    if "test_data" in parts:
        parts = parts[len(parts) - parts[::-1].index("test_data"):]
    return "/".join(parts)


def normalize_file(path):
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    fixed = text.encode("utf-8")
    if fixed != raw:
        path.write_bytes(fixed)
        return True
    return False


def main():
    db = SessionLocal()
    moved = rewritten = missing = 0
    try:
        for test in db.query(TestCase).all():
            for field in ("input_path", "output_path"):
                old = getattr(test, field)
                new = relative(old)
                if new != old:
                    setattr(test, field, new)
                    moved += 1
                target = resolve(new)
                if not target.exists():
                    missing += 1
                    print(f"Missing file for test {test.id}: {target}")
                elif normalize_file(target):
                    rewritten += 1
        db.commit()
    finally:
        db.close()
    print(f"{moved} paths made relative to {BASE_DIR}, {rewritten} files rewritten as UTF-8 with \\n, {missing} missing.")


if __name__ == "__main__":
    main()
