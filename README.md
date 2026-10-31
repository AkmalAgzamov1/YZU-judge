# YZU Judge

An online judge for practicing the **CPE** (Collegiate Programming Examination), made for students at Yuan Ze University and anyone else in Taiwan who has to pass it.

You get 299 real problems from past CPE exams, a judge that runs your Python or C++ code against real test data, and timed mock exams that feel like the real thing.

## Why I built this

At a lot of Taiwanese universities, passing the CPE is a graduation requirement. Depending on your department, you have to solve at least two problems in a single exam, or three across separate exams. Some students only find this out late, keep failing it, and end up staying for a fifth or even sixth year.

What surprised me most is how many freshmen and sophomores don't know what the CPE is at all. They don't know the format, what the problems look like, or how to prepare. The official site has the past exams, but it's not a place where you can actually practice: you read a PDF, write code somewhere, and hope it's right.

### Especially for international students

For international students it's even harder. Most of the information about the CPE spreads in Chinese: department announcements, senior students' advice, study groups, blog posts with solutions. If you don't read Chinese well, or you're not in those circles, it's easy to not even hear about the exam until it's suddenly a problem for your graduation.

On top of that, you're new to the country, the university and the whole system, and nobody sits you down and says "hey, you need to pass this, here's how." A lot of international students end up struggling with the CPE not because they can't code, but because nobody told them about it early enough.

That's a big part of why YZU Judge is fully in English, and why it tries to explain the exam itself, not just give you problems.

So I wanted one place where you can open a past CPE problem, read it, write your solution, press Submit, and know in a few seconds whether it passes. That's YZU Judge.

## How it grew

I started on September 19, 2026, and I wanted to really understand every layer, so I built the backend step by step:

- **Weeks 1–2:** the database, user accounts with login, and the basic pieces: problems, test cases and submissions.
- **Early October:** the scary part, running other people's code safely. Every submission runs inside a Docker container with no internet, no extra privileges, and hard limits on time, memory and processes. I spent a while fixing holes and memory bugs here.
- **Mid October:** Celery and Redis, so judging happens in the background and the site never freezes while code is running.
- **Late October:** the frontend, then everything that turns it into a real practice platform: the problem pages, the editor, mock exams, an admin panel, C++ support, and finally the import of all the past CPE exams.

## What you can do on it

- **Know what's coming.** The home page counts down to the next CPE and shows the official "one star" list. Every one of the last 52 exams had exactly one problem from that list, so we group them by how likely they are to show up next time.
- **Practice problems.** 299 problems from past CPE exams, sorted from easy to hard. You can filter by difficulty and by topic (math, strings, dp, graphs, and so on).
- **Read the statement your way.** Every problem has a short summary written for this site, plus a button that opens the official CPE PDF.
- **Submit in Python or C++.** You see the verdict for each test: Accepted, Wrong Answer, Time Limit, Memory Limit, Runtime Error or Compilation Error.
- **Take a Mock CPE.** 38 real past exams, 3 hours each, with a timer and your results at the end. Topics and tags are hidden during the exam, so you have to figure out the approach yourself, just like in the real one.
- **Track your progress.** Your account page shows what you solved and your recent activity.
- **Avoid spoilers.** Topics are hidden behind a "Show topics" button, because sometimes knowing it's a DP problem is half the answer.

## How it works

```mermaid
flowchart LR
    Browser -->|submit code| API[FastAPI]
    API -->|save as pending| DB[(PostgreSQL)]
    API -->|queue the job| Redis[(Redis)]
    Redis --> Worker[Celery worker]
    Worker -->|compile + run each test| Docker[Docker sandbox]
    Worker -->|verdicts| DB
    Browser -->|check status| API
```

1. You press Submit. The API saves the submission as *pending* and puts a job in the queue right away, so the page doesn't wait.
2. A Celery worker picks up the job. For C++ it first compiles your code in a `gcc:13` container. Python runs in `python:3.11-slim`.
3. Each test runs in a fresh, locked down container: no network, all Linux capabilities dropped, a non-root user, no swap, and limits on memory and processes. If your code runs too long, it gets stopped.
4. Your output is compared with the expected output, and the verdict for every test is saved. The page polls until the result is ready.

### Where the problems come from

The CPE publishes its past exams at [cpe.mcu.edu.tw](https://cpe.mcu.edu.tw/). An import script downloads each exam, its problems, the official test inputs and the official C++ solutions. It then runs those solutions to produce the expected outputs, so every test is checked against the CPE's own answers.

- **Difficulty** comes from how many people solved the problem in the real exam: easy if at least 30% solved it, medium if at least 3%, hard otherwise.
- **Skipped problems:** if the CPE site is missing a problem's test data, or the official solution doesn't work, we just skip that problem. No test data means nothing to judge against.
- **Old C code:** a lot of older official solutions use `gets()`, which modern compilers removed. The importer adds a small replacement for it, so those problems still work.
- **Mock exams:** an exam only becomes a Mock CPE if all of its problems made it in.

## Running it locally

You'll need Python 3.11, Node.js, PostgreSQL, Redis and Docker.

**Backend**, in `backend/`. Create a `.env` file:

```env
SECRET_KEY=change-me
DATABASE_URL=postgresql://user:password@localhost:5432/yzu_judge
REDIS_URL=redis://localhost:6379/0
```

Then:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

In a second terminal, start the worker (`--pool=solo` is needed on Windows):

```bash
celery -A app.celery_app worker --pool=solo --loglevel=info
```

Import the past CPE exams and the statements:

```bash
python -m scripts.import_cpe
python -m scripts.cpe_content apply
```

**Frontend**, in `frontend/`:

```bash
npm install --legacy-peer-deps
npm run dev
```

Then open http://localhost:5173.

## What's next

- Java support, since some students take the CPE in Java
- Our own non-CPE problems, for people who want to warm up first
- Deploying it so YZU students can actually use it

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, CodeMirror
- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Judging:** Celery, Redis, Docker
