from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from ..database import Base


class CpePaper(Base):
    """One past CPE sitting: its date and the problems in exam order."""
    __tablename__ = "cpe_papers"

    id = Column(Integer, primary_key = True, autoincrement = True)
    title = Column(String, nullable = False)
    held_on = Column(Date, nullable = False)
    duration_minutes = Column(Integer, nullable = False, default = 180)

    created_at = Column(DateTime, default = datetime.utcnow, nullable = False)

    problems = relationship(
        "CpePaperProblem",
        order_by = "CpePaperProblem.position",
        cascade = "all, delete-orphan",
        back_populates = "paper",
    )


class CpePaperProblem(Base):
    __tablename__ = "cpe_paper_problems"
    __table_args__ = (
        UniqueConstraint("paper_id", "position", name = "uq_cpe_paper_problems_position"),
        UniqueConstraint("paper_id", "problem_id", name = "uq_cpe_paper_problems_problem"),
    )

    id = Column(Integer, primary_key = True, autoincrement = True)
    paper_id = Column(Integer, ForeignKey("cpe_papers.id", ondelete = "CASCADE"), nullable = False)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable = False)

    # 1 based, shown as A, B, C...
    position = Column(Integer, nullable = False)

    paper = relationship("CpePaper", back_populates = "problems")
    problem = relationship("Problem")
