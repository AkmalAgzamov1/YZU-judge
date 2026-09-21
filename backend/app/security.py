from fastapi import HTTPException  
import jwt

from .config import SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import datetime, timedelta, timezone

from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


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

