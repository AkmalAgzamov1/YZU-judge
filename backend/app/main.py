from fastapi import FastAPI
from .routers import problems, users, testcases, submissions

app = FastAPI()

app.include_router(submissions.router)
app.include_router(testcases.router)
app.include_router(problems.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {"message": "Aki Chan!"}



