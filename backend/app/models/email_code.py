from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from ..database import Base


class EmailCode(Base):
    """A one time code we emailed to a user, stored only as a hash."""

    __tablename__ = "email_codes"

    id = Column(Integer, primary_key = True, autoincrement = True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete = "CASCADE"), nullable = False, index = True)
    # "verify" for a new account, "reset" for a forgotten password.
    purpose = Column(String(16), nullable = False)
    code_hash = Column(String(64), nullable = False)
    attempts = Column(Integer, nullable = False, default = 0)
    created_at = Column(DateTime, nullable = False, default = datetime.utcnow)
    expires_at = Column(DateTime, nullable = False)
    # Set when the code was used or replaced by a newer one.
    used_at = Column(DateTime, nullable = True)
