from fastapi import HTTPException  
import jwt

from .config import SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, MAX_SESSION_DAYS
from datetime import datetime, timedelta, timezone

from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(data: dict, auth_time: int | None = None):
    """auth_time is when the user last typed the password; a refresh passes the old one on."""
    now = datetime.now(timezone.utc)
    auth_time = auth_time if auth_time is not None else int(now.timestamp())
    session_end = datetime.fromtimestamp(auth_time, timezone.utc) + timedelta(days = MAX_SESSION_DAYS)
    expire = min(now + timedelta(minutes = ACCESS_TOKEN_EXPIRE_MINUTES), session_end)
    data.update({"exp": expire, "auth_time": auth_time})
    token = jwt.encode(
        data, 
        SECRET_KEY,
        algorithm = JWT_ALGORITHM
    )

    return token

def decode_access_token(token: str):
    try: 
        return jwt.decode(
        token, 
        SECRET_KEY,
        algorithms = [JWT_ALGORITHM]
        )
    
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

