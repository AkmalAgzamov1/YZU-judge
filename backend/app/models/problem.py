from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey

from ..database import Base

class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key = True, autoincrement = True)

    title = Column(String, nullable = False)
    description = Column(String, nullable = False)

    time_limit_ms = Column(Integer, nullable = False)
    memory_limit_mb = Column(Integer, nullable = False)

    is_cpe = Column(Boolean, nullable = False, default = True)
    difficulty = Column(Enum("Easy", "Medium", "Hard", name = "problem_difficulty"), nullable = False)

    created_by = Column(String, ForeignKey("users.id"), nullable = False)