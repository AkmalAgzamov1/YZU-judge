from fastapi import FastAPI, Depends, HTTPException

from .database import Base, engine, get_db
from .models.user import User

from .schemas.user import UserCreate, UserOut

from .security import hash_password, verify_password

app = FastAPI()

Base.metadata.create_all(bind=engine)


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
    