from fastapi import FastAPI
from .routers import problems, users

app = FastAPI()


app.include_router(problems.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {"message": "Aki Chan!"}



