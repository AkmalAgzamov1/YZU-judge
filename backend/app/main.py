from fastapi import FastAPI

from .database import Base, engine
from .models.user import User

app = FastAPI()

Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Hello CodeArena"}