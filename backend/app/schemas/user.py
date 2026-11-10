from pydantic import BaseModel, ConfigDict, EmailStr, Field

from datetime import datetime

class UserCreate(BaseModel):
    username: str = Field(min_length = 3)
    password: str = Field(min_length = 8)
    email: EmailStr

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    created_at: datetime
    is_admin: bool = False

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str


class CodeSent(BaseModel):
    """The address a code went to (or would go to, for a password reset)."""
    email: str

class EmailOnly(BaseModel):
    email: EmailStr

class VerifyEmail(BaseModel):
    email: EmailStr
    code: str

class ResetPassword(BaseModel):
    email: EmailStr
    code: str
    password: str = Field(min_length = 8)
