import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserOut, UserLogin
from ..security import hash_password, verify_password_or_dummy, create_access_token
from ..rate_limit import client_ip, hit
from ..dependencies import get_current_user
from ..schemas.user import UserCreate, UserOut, UserLogin, Token


router = APIRouter(
    prefix = "/users",
    tags = ["Users"]
)


USERNAME_MIN, USERNAME_MAX = 3, 32
PASSWORD_MIN, PASSWORD_MAX = 8, 128

# Generous, because a whole class can sign up from one campus address.
REGISTER_LIMIT_PER_HOUR = 30
LOGIN_LIMIT_PER_IP_PER_MINUTE = 30
LOGIN_LIMIT_PER_USERNAME_PER_MINUTE = 10
TOO_MANY = "Too many attempts. Wait a minute and try again."


def check_new_account(user: UserCreate) -> None:
    username = user.username
    if not USERNAME_MIN <= len(username) <= USERNAME_MAX:
        raise HTTPException(status_code = 400, detail = f"Username must be {USERNAME_MIN} to {USERNAME_MAX} characters.")
    # Spaces and invisible characters make names that look like someone else's.
    if any(char.isspace() or unicodedata.category(char).startswith("C") for char in username):
        raise HTTPException(status_code = 400, detail = "Username cannot contain spaces or invisible characters.")
    if not PASSWORD_MIN <= len(user.password) <= PASSWORD_MAX:
        raise HTTPException(status_code = 400, detail = f"Password must be {PASSWORD_MIN} to {PASSWORD_MAX} characters.")


@router.post("/register", response_model = UserOut)
def register(user: UserCreate, request: Request, db = Depends(get_db)):
    hit(f"register:{client_ip(request)}", REGISTER_LIMIT_PER_HOUR, 3600, "Too many new accounts from this network. Try again later.")
    check_new_account(user)

    # Case insensitive, so nobody can sign up as "Admin" next to "admin".
    existing_user = db.query(User).filter(
        (func.lower(User.username) == user.username.lower()) | (func.lower(User.email) == user.email.lower())
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code = 400,
            detail = "Username or Email already exists"
        )

    hashed_password = hash_password(user.password)
    new_user = User(
        email = user.email,
        username = user.username,
        password_hash = hashed_password
    )

    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        # Two sign ups with the same name at the same moment: the second one lands here.
        db.rollback()
        raise HTTPException(status_code = 400, detail = "Username or Email already exists")
    db.refresh(new_user)


    return new_user



@router.post("/login", response_model = Token)
def login(user: UserLogin, request: Request, db = Depends(get_db)):
    hit(f"login-ip:{client_ip(request)}", LOGIN_LIMIT_PER_IP_PER_MINUTE, 60, TOO_MANY)
    hit(f"login-user:{user.username.lower()}", LOGIN_LIMIT_PER_USERNAME_PER_MINUTE, 60, TOO_MANY)

    existing_user = db.query(User).filter(
        (User.username == user.username)
    ).first()

    password_hash = existing_user.password_hash if existing_user else None
    if not verify_password_or_dummy(user.password, password_hash):
        raise HTTPException(
            status_code = 401,
            detail = "Invalid username or password"
        )

    access_token = create_access_token({
        "user_id": existing_user.id,
        "username": existing_user.username
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model = UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model = Token)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Trades a still valid token for a fresh one, so active users are never signed out."""
    access_token = create_access_token({
        "user_id": current_user.id,
        "username": current_user.username
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
