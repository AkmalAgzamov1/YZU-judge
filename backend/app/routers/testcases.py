from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.problem import Problem
from ..models.user import User
from ..dependencies import get_current_admin_user

from ..models.testcase import TestCase
from ..schemas.testcase import TestCaseCreate, TestCaseOut, TestCaseUpdate
from ..storage import save_file, write_file

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