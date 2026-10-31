from fastapi import FastAPI
from .routers import problems, users, testcases, submissions, cpe_papers, mock_exams, problem_help
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS

app = FastAPI()

app.include_router(submissions.router)
app.include_router(testcases.router)
app.include_router(problems.router)
app.include_router(users.router)
app.include_router(cpe_papers.router)
app.include_router(mock_exams.router)
app.include_router(problem_help.router)

origins = CORS_ORIGINS

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



