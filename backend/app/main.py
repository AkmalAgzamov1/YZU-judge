from fastapi import FastAPI
from .routers import problems, users, testcases, submissions
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(submissions.router)
app.include_router(testcases.router)
app.include_router(problems.router)
app.include_router(users.router)

origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Aki Chan!"}



