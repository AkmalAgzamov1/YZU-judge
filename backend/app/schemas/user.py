from pydantic import BaseModel, ConfigDict, EmailStr

from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    created_at: datetime

class UserLogin(BaseModel):
    username: str
    password: str