from sqlalchemy import Boolean, Column, Integer, Text, DateTime, ForeignKey, Enum
from datetime import datetime
from ..database import Base

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, nullable = False, primary_key = True, autoincrement = True)

    status = Column(Enum("pending", "running", "memory_limit_exceeded","accepted", "wrong_answer", "time_limit_exceeded", "compilation_error", "runtime_error", "internal_error", "output_limit_exceeded", name = "submission_status"), nullable = False, default = "pending")

    user_id = Column(Integer, ForeignKey("users.id"), nullable = False)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable = False)

    language = Column(Enum("python", "java", "cpp", name = "submission_language"), nullable = False)
    code = Column(Text, nullable = False)

    # Compiler messages, trimmed, when the verdict is compilation_error.
    compile_output = Column(Text, nullable = True)

    # Accepted here, but the output does not end with a newline, which UVa and the CPE reject.
    missing_final_newline = Column(Boolean, nullable = False, default = False, server_default = "false")

    # Set when the submission was sent during a mock CPE exam.
    mock_exam_id = Column(Integer, ForeignKey("mock_exams.id"), nullable = True, index = True)

    created_at = Column(DateTime, default = datetime.utcnow, nullable = False)