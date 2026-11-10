from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime

from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key = True, autoincrement = True)
    email = Column(String, unique = True, nullable = False, index = True)
    username = Column(String, unique = True, nullable = False, index = True)
    password_hash = Column(String, nullable = False)
    created_at = Column(DateTime, default = datetime.utcnow)

    is_admin = Column(Boolean, nullable = False, default = False)

    # False until the student types the code we emailed them. Unverified accounts
    # cannot sign in and are deleted after a day.
    email_verified = Column(Boolean, nullable = False, default = False)

    # Goes up on every password reset. Tokens carry it, so older tokens stop working.
    token_version = Column(Integer, nullable = False, default = 0)
