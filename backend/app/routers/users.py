from fastapi import APIRouter, Depends, HTTPException

from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserOut, UserLogin
from ..security import hash_password, verify_password, create_access_token
from ..dependencies import get_current_user


router = APIRouter(
    prefix = "/users",
    tags = ["Users"]
)


@router.post("/register", response_model = UserOut)
def register(user: UserCreate, db = Depends(get_db)):

    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
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
    db.commit()
    db.refresh(new_user)


    return new_user



@router.post("/login")
def login(user: UserLogin, db = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.username == user.username)
    ).first()

    if not existing_user or not verify_password(user.password, existing_user.password_hash):
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