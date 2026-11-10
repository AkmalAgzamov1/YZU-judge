from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from ..database import Base

class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key = True, autoincrement = True)

    title = Column(String, nullable = False)
    uva_id = Column(Integer, unique = True, nullable = True)
    description = Column(String, nullable = False)

    time_limit_ms = Column(Integer, nullable = False)
    memory_limit_mb = Column(Integer, nullable = False)

    is_cpe = Column(Boolean, nullable = False, default = True)

    # Values come from app/topics.py.
    topics = Column(ARRAY(String), nullable = False, default = list, server_default = "{}")

    # Drafts are visible to admins only, until they are published.
    is_published = Column(Boolean, nullable = False, default = False)
    difficulty = Column(Enum("easy", "medium", "hard", name = "problem_difficulty"), nullable = False)

    # Higher comes first within the same difficulty. 0 for almost every problem; raise it to pin
    # warm-ups like A + B to the top of the list.
    sort_order = Column(Integer, nullable = False, default = 0, server_default = "0")

    # Help for easy and medium problems, written by scripts/cpe_help.py. Never part of ProblemOut:
    # routers/problem_help.py hands it out only once the unlock rules are met.
    hints = Column(ARRAY(String), nullable = False, default = list, server_default = "{}")
    solution_explanation = Column(Text, nullable = True)
    solution_python = Column(Text, nullable = True)
    solution_cpp = Column(Text, nullable = True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable = False)
    testcases = relationship("TestCase", back_populates="problem")