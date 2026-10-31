from sqlalchemy import Column, Integer, ForeignKey

from ..database import Base


class HintReveal(Base):
    """How many hints of a problem a user has opened. Hints open in order, so a count is enough."""
    __tablename__ = "hint_reveals"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key = True)
    problem_id = Column(Integer, ForeignKey("problems.id"), primary_key = True)

    revealed_count = Column(Integer, nullable = False, default = 0)
