from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum
from datetime import datetime
from ..database import Base

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, nullable = False, primary_key = True, autoincrement = True)

    status = Column(Enum("pending", "running", "memory_limit_exceeded","accepted", "wrong_answer", "time_limit_exceeded", "compilation_error", "runtime_error", name = "submission_status"), nullable = False, default = "pending")

    user_id = Column(Integer, ForeignKey("users.id"), nullable = False)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable = False)

    language = Column(Enum("python", "java", "cpp", name = "submission_language"), nullable = False)
    code = Column(Text, nullable = False)

    created_at = Column(DateTime, default = datetime.utcnow, nullable = False)