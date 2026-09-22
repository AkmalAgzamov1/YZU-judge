from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models.user import User
from .security import decode_access_token


oauth2_scheme = HTTPBearer()
def get_current_user(credentials = Depends(oauth2_scheme), db = Depends(get_db)):
    token = credentials.credentials
    payload = decode_access_token(token)

    user_id = payload.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin: 
        raise HTTPException(
            status_code = 403,
            detail = "User is not an admin"
        )
    return current_user
