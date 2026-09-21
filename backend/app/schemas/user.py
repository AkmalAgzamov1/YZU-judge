from pydantic import BaseModel

from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    email: str

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime