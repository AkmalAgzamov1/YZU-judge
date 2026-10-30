from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


class MockExam(Base):
    """A user's timed attempt at a CPE paper. Times are naive UTC like the rest of the schema."""
    __tablename__ = "mock_exams"

    id = Column(Integer, primary_key = True, autoincrement = True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable = False, index = True)
    paper_id = Column(Integer, ForeignKey("cpe_papers.id"), nullable = False)

    started_at = Column(DateTime, nullable = False)
    ends_at = Column(DateTime, nullable = False)

    # Set when the user finishes early. Otherwise the exam ends at ends_at.
    finished_at = Column(DateTime, nullable = True)

    paper = relationship("CpePaper")
