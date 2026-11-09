import threading

from fastapi import HTTPException  
import jwt

from .config import SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import datetime, timedelta, timezone

from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

# Each Argon2 hash takes 64 MB of memory. Without a cap, a burst of logins runs
# up to 40 at once per uvicorn process. Extra requests wait for a free slot.
HASH_SLOTS = 4
_hash_slots = threading.BoundedSemaphore(HASH_SLOTS)

# Checked when the username does not exist, so the answer takes as long as for a real user.
_DUMMY_HASH = password_hash.hash("not a real password")


def hash_password(password: str) -> str:
    with _hash_slots:
        return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    with _hash_slots:
        return password_hash.verify(password, hashed_password)

def verify_password_or_dummy(password: str, hashed_password: str | None) -> bool:
    """Like verify_password, but spends the same time when there is no user."""
    if hashed_password is None:
        verify_password(password, _DUMMY_HASH)
        return False
    return verify_password(password, hashed_password)


def create_access_token(data: dict):
    expire = datetime.now(timezone.utc) + timedelta(minutes = ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
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

