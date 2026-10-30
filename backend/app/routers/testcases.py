from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.problem import Problem
from ..models.user import User
from ..dependencies import get_current_admin_user

from ..models.testcase import TestCase
from ..schemas.testcase import TestCaseCreate, TestCaseOut, TestCaseUpdate, TestCaseFlags, TestCaseAdminOut
from ..storage import save_file, write_file, read_file

from pathlib import Path

router = APIRouter(prefix = "/problems", tags = ["TestCases"])


@router.post("/{problem_id}/testcases", response_model=TestCaseOut)
def add_testcase(
    problem_id: int, testcase_data: TestCaseCreate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):

    problem = db.query(Problem).filter(problem_id == Problem.id).first()

    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "No such problem"
        )
    
    testcase = TestCase(
    problem_id=problem_id,
    input_path="",
    output_path="",
    is_sample=testcase_data.is_sample,
    sample_order=testcase_data.sample_order
)

    db.add(testcase)
    db.flush()

    input_path = save_file(
        problem_id,
        f"{testcase.id}_input.txt",
        testcase_data.input_content
    )

    output_path = save_file(
        problem_id,
        f"{testcase.id}_output.txt",
        testcase_data.output_content
    )

    testcase.input_path = input_path
    testcase.output_path = output_path

    db.commit()
    db.refresh(testcase)

    return testcase


PREVIEW_CHARS = 120
MAX_BULK = 200


def to_admin_out(testcase: TestCase) -> TestCaseAdminOut:
    input_text = read_file(testcase.input_path)
    output_text = read_file(testcase.output_path)

    return TestCaseAdminOut(
        id = testcase.id,
        problem_id = testcase.problem_id,
        is_sample = testcase.is_sample,
        sample_order = testcase.sample_order,
        input_size = len(input_text.encode("utf-8")),
        output_size = len(output_text.encode("utf-8")),
        input_preview = input_text[:PREVIEW_CHARS],
        output_preview = output_text[:PREVIEW_CHARS],
    )


@router.post("/{problem_id}/testcases/bulk", response_model = list[TestCaseAdminOut])
def add_testcases_bulk(problem_id: int, testcases_data: list[TestCaseCreate], current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Adds many tests in one request, in order. Either all are added or none."""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if problem is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such problem"
        )

    if not testcases_data or len(testcases_data) > MAX_BULK:
        raise HTTPException(
            status_code = 400,
            detail = f"Send between 1 and {MAX_BULK} tests at a time"
        )

    created = []
    written = []

    try:
        for testcase_data in testcases_data:
            testcase = TestCase(
                problem_id = problem_id,
                input_path = "",
                output_path = "",
                is_sample = testcase_data.is_sample,
                sample_order = testcase_data.sample_order
            )
            db.add(testcase)
            db.flush()

            testcase.input_path = save_file(problem_id, f"{testcase.id}_input.txt", testcase_data.input_content)
            written.append(testcase.input_path)
            testcase.output_path = save_file(problem_id, f"{testcase.id}_output.txt", testcase_data.output_content)
            written.append(testcase.output_path)
            created.append(testcase)

        db.commit()
    except Exception:
        db.rollback()
        for path in written:
            Path(path).unlink(missing_ok = True)
        raise

    return [to_admin_out(testcase) for testcase in created]


@router.patch("/{problem_id}/testcases/{testcase_id}", response_model = TestCaseAdminOut)
def update_testcase_flags(problem_id: int, testcase_id: int, flags: TestCaseFlags, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Marks a test as a sample, or not, without resending its files."""
    testcase = db.query(TestCase).filter(TestCase.id == testcase_id, TestCase.problem_id == problem_id).first()

    if testcase is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such testcase"
        )

    testcase.is_sample = flags.is_sample
    testcase.sample_order = flags.sample_order
    db.commit()
    db.refresh(testcase)

    return to_admin_out(testcase)


@router.get("/{problem_id}/testcases/admin", response_model = list[TestCaseAdminOut])
def get_testcases_admin(problem_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if problem is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such problem"
        )

    testcases = db.query(TestCase).filter(TestCase.problem_id == problem_id).order_by(TestCase.id).all()

    return [to_admin_out(testcase) for testcase in testcases]


@router.get("/{problem_id}/testcases", response_model = list[TestCaseOut])
def get_testcases(problem_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "Problem does not exist"
        )

    testcases = db.query(TestCase).filter(TestCase.problem_id == problem_id).all()

    return testcases

@router.get("/{problem_id}/testcases/{testcase_id}", response_model = TestCaseOut)
def get_testcase(problem_id: int, testcase_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if problem is None:
        raise HTTPException(
            status_code = 404, 
            detail = "Problem does not exist"
        )

    testcase = db.query(TestCase).filter(TestCase.id == testcase_id, TestCase.problem_id == problem_id).first()
    if testcase is None:
        raise HTTPException(
            status_code = 404, 
            detail = "testcase does not exist"
        )

    return testcase



@router.put("/{problem_id}/testcases/{testcase_id}", response_model = TestCaseOut)
def update_testcase(problem_id: int, testcase_id: int, testcase_data: TestCaseUpdate, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if problem is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such problem"
        )

    testcase = db.query(TestCase).filter(TestCase.id == testcase_id, TestCase.problem_id == problem_id).first()
    if testcase is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such testcase"
        ) 
    write_file(testcase.input_path, testcase_data.input_content)
    write_file(testcase.output_path, testcase_data.output_content)

    testcase.is_sample = testcase_data.is_sample
    testcase.sample_order = testcase_data.sample_order

    db.commit()
    db.refresh(testcase)

    return testcase


@router.delete("/{problem_id}/testcases/{testcase_id}")
def delete_testcase( problem_id: int, testcase_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):

    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if problem is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such problem"
        )
    
    testcase = db.query(TestCase).filter(TestCase.id == testcase_id, TestCase.problem_id == problem_id).first()
    if testcase is None:
        raise HTTPException(
            status_code = 404,
            detail = "No such testcase"
        )

    Path(testcase.input_path).unlink(missing_ok = True)
    Path(testcase.output_path).unlink(missing_ok = True)

    db.delete(testcase)
    db.commit()

    return {"message": "Testcase deleted"}