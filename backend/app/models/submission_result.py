from sqlalchemy import Column, String, Integer, ForeignKey, Enum
from ..database import Base


class SubmissionResult(Base):
    __tablename__ = "submission_result"

    id = Column(Integer, primary_key = True, autoincrement = True)

    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable = False)
    test_case_id = Column(Integer, ForeignKey("testcases.id"), nullable = False)

    verdict = Column(Enum("accepted", "wrong_answer", "time_limit_exceeded", "memory_limit_exceeded", "runtime_error", name = "submission_result_verdict"), nullable = False) 

    time_taken_ms = Column(Integer, nullable = False)
    memory_used_mb = Column(Integer, nullable = False)

