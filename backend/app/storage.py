from pathlib import Path

BASE_DIR = "test_data"

folder = Path(BASE_DIR)
folder.mkdir(exist_ok = True)


def save_file(problem_id: int, filename: str, content: str) -> str:
    problem_folder = folder / str(problem_id)
    problem_folder.mkdir(parents = True, exist_ok = True)

    path = problem_folder / filename
    with open(path, "w") as file:
        file.write(content)

    return str(path)

def read_file(path: str) -> str:
    with open(path, "r") as file:
        return file.read()