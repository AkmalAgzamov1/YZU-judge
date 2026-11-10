from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from datetime import datetime

# Length rules are checked in the router, so students get a readable 400 instead of a 422.
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
    is_admin: bool = False

# Only a cap against huge requests; the real rules are checked at sign up.
class UserLogin(BaseModel):
    username: Annotated[str, Field(max_length = 256)]
    password: Annotated[str, Field(max_length = 1024)]

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
    code: Annotated[str, Field(max_length = 32)]

class ResetPassword(BaseModel):
    email: EmailStr
    code: Annotated[str, Field(max_length = 32)]
    password: Annotated[str, Field(min_length = 8, max_length = 128)]
