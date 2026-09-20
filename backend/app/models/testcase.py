from sqlalchemy import Column, Integer, String, ForeignKey, Boolean

from ..database import Base

class TestCase(Base):
    __tablename__ = "testcases"

    id = Column(Integer, primary_key = True, autoincrement = True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable = False)

    input_path = Column(String, nullable = False)
    output_path = Column(String, nullable = False)

    is_sample = Column(Boolean, nullable = False, default = False)
    sample_order = Column(Integer, nullable = True)