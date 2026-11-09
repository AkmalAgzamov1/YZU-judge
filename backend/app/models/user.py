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

    # Every token carries this number. Raising it signs the user out everywhere:
    #   UPDATE users SET token_version = token_version + 1 WHERE username = '...';
    token_version = Column(Integer, nullable = False, default = 0, server_default = "0")
