from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from ..database import Base


class Run(Base):
    """A throwaway test run from the editor: sample tests or a custom input.

    Runs never count as submissions, never appear in the problem stats, and are
    deleted after a day. They use the same sandbox as a real judgment, so the
    tests a student can try before submitting are exactly the sample tests.
    """

    __tablename__ = "runs"

    id = Column(Integer, primary_key = True, autoincrement = True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable = False, index = True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable = False)

    language = Column(String, nullable = False)
    # "samples" runs every visible sample; "custom" runs one user supplied input.
    mode = Column(String, nullable = False)

    code = Column(Text, nullable = False)
    custom_input = Column(Text, nullable = True)

    # pending / running / finished / error
    status = Column(String, nullable = False, default = "pending")
    # accepted, wrong_answer, ... compilation_error. Null while running or on error.
    verdict = Column(String, nullable = True)

    compile_output = Column(Text, nullable = True)
    # JSON list of per case results: input, expected output, stdout, stderr, verdict, time.
    results_json = Column(Text, nullable = True)

    created_at = Column(DateTime, default = datetime.utcnow, nullable = False, index = True)
