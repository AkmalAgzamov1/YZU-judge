import os
from pathlib import Path


# Test files live here. The database stores paths relative to this folder, so the
# data can move between machines (a Windows laptop, the Linux server) unchanged.
BASE_DIR = Path(os.getenv("TEST_DATA_DIR") or Path(__file__).resolve().parent.parent / "test_data")

folder = BASE_DIR
folder.mkdir(parents=True, exist_ok=True)


def resolve(path: str) -> Path:
    # Absolute paths are what older rows stored; scripts/portable_test_data.py rewrites them.
    stored = Path(path)
    return stored if stored.is_absolute() else BASE_DIR / stored


def save_file(problem_id: int, filename: str, content: str) -> str:

    problem_folder = folder / str(problem_id)
    problem_folder.mkdir(
        parents=True,
        exist_ok=True
    )

    write_file(str(problem_folder / filename), content)

    return f"{problem_id}/{filename}"


# Always UTF-8 with \n line ends. Platform defaults (cp1252 and \r\n on Windows)
# would make the same test read differently on the server.
def read_file(path: str) -> str:

    with open(resolve(path), "r", encoding="utf-8") as file:
        return file.read()


def write_file(path: str, content: str) -> None:

    with open(resolve(path), "w", encoding="utf-8", newline="\n") as file:
        file.write(content)


def delete_file(path: str) -> None:
    resolve(path).unlink(missing_ok=True)
