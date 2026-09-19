from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key = True, autoincrement = True)
    email = Column(String, unique = True, nullable = False, index = True)
    username = Column(String, unique = True, nullable = False, index = True)
    password_hash = Column(String, nullable = False)
    created_at = Column(DateTime, default = datetime.utcnow)
