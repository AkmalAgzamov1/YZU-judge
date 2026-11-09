from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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
    is_admin: bool = False

# Only a cap against huge requests; the real rules are checked at sign up.
class UserLogin(BaseModel):
    username: Annotated[str, Field(max_length = 256)]
    password: Annotated[str, Field(max_length = 1024)]

class Token(BaseModel):
    access_token: str
    token_type: str