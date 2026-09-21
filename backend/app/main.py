from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer

from .database import Base, engine, get_db
from .models.user import User

from .schemas.user import UserCreate, UserOut, UserLogin

from .security import hash_password, verify_password, create_access_token, decode_access_token

app = FastAPI()
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

@app.get("/")
def root():
    return {"message": "Hello CodeArena"}

@app.post("/users/register", response_model = UserOut)
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



@app.post("/users/login")
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


@app.get("/users/me", response_model = UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user