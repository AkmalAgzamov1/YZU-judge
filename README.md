# CodeArena (YZU-Judge)

An online judge built from scratch, with the long-term goal of helping **Yuan Ze University** students prepare for the **CPE** (Collegiate Programming Exam, Taiwan): solve problems, submit code, get verdicts based on test cases.

> **Status: backend core is working; automatic judging is not wired into the API yet.**
> Auth, problems, test cases and submissions have complete CRUD, and the Docker-based judge engine works and is tested standalone. The next milestone is connecting the two through a job queue (Celery + Redis).

This is also a **learning project**. Every layer was written by hand, step by step, with the "why" behind each decision. That is why this README documents decisions and trade-offs, not just features.

---

## Table of contents

1. [What works today](#what-works-today)
2. [Tech stack and why](#tech-stack-and-why)
3. [Architecture](#architecture)
4. [Data model](#data-model)
5. [API reference](#api-reference)
6. [Authentication and authorization](#authentication-and-authorization)
7. [Test case storage](#test-case-storage)
8. [The judge engine](#the-judge-engine)
9. [Design decisions log](#design-decisions-log)
10. [Getting started](#getting-started)
11. [Known limitations](#known-limitations)
12. [Roadmap](#roadmap)
13. [Project layout](#project-layout)

---

## What works today

| Area | State |
|---|---|
| User registration and login (Argon2 + JWT) | Done |
| Protected `/users/me`, admin role (`is_admin`) | Done |
| Problem CRUD (admin-only writes, public reads) | Done |
| Test case CRUD with file-based storage (admin-only) | Done |
| Submission create/read, ownership checks | Done |
| Alembic migrations as the only way to change the schema | Done |
| Docker sandbox runner with CPU / memory / process / network limits | Done |
| Judge service: runs all test cases, early stop, verdict classification | Done (tested standalone) |
| Memory usage measurement, TLE / MLE / RE / WA detection | Done (tested standalone) |
| **Async grading via Celery + Redis, results written to DB** | **Next** |
| More languages (C++, Java), frontend, community features | Planned |

---

## Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| API | **FastAPI** | Type-driven validation, dependency injection (used heavily for auth), automatic Swagger docs for manual testing. |
| Database | **PostgreSQL** | Real relational integrity (foreign keys, native enums) and what production would use anyway. |
| ORM | **SQLAlchemy 2.x** | Standard, explicit, and pairs with Alembic. |
| Migrations | **Alembic** | Schema changes are versioned and reviewable. `create_all()` was removed on purpose so the database can never drift from the migrations. |
| Validation | **Pydantic v2** | Separate input/output schemas, so password hashes and internal paths are never exposed by accident. |
| Password hashing | **Argon2** (via `pwdlib`) | Current best-practice password hash. |
| Auth | **JWT** (PyJWT, HS256) | Stateless and simple to start with. |
| Sandbox | **Docker** (`docker` SDK) | One short-lived container per test case, with hard resource limits. |
| Queue (next) | **Celery + Redis** | Grading must not block HTTP requests. Celery over RQ because RQ relies on `fork()` and does not run on Windows, where this is developed. |
| Frontend (later) | **React** | Decided after the backend is complete. |

---

## Architecture

### Today

```mermaid
flowchart LR
    Client -->|HTTP + JWT| API[FastAPI]
    API --> PG[(PostgreSQL)]
    API --> FS[(test_data/ files)]
    subgraph Standalone, not yet connected to the API
        JS[judge_service] --> DR[docker_runner]
        DR --> C[Docker container per test case]
        JS --> FS
    end
```

### Target (next milestone)

```mermaid
flowchart LR
    Client -->|POST /submissions| API[FastAPI]
    API -->|status = pending| PG[(PostgreSQL)]
    API -->|enqueue submission_id| R[(Redis)]
    R --> W[Celery worker]
    W -->|load code, limits, test cases| PG
    W --> JS[judge_service]
    JS --> DR[docker_runner]
    DR --> C[Sandboxed container]
    W -->|SubmissionResult rows, final status| PG
    Client -->|GET /submissions/id| API
```

The API process and the worker are **separate processes** that communicate only through Redis (the queue) and PostgreSQL (the data). `judge_service` receives the code runner as a parameter (`run_code` is injected).

---

## Data model

```
users ──< submissions >── problems ──< testcases
              │                            │
              └──────< submission_result >─┘
```

| Table | Key fields |
|---|---|
| `users` | `id`, `email` (unique, indexed), `username` (unique, indexed), `password_hash`, `is_admin` (default `false`), `created_at` |
| `problems` | `id`, `title`, `description`, `time_limit_ms`, `memory_limit_mb`, `difficulty` (`easy`/`medium`/`hard`), `is_cpe`, `created_by` -> `users.id` |
| `testcases` | `id`, `problem_id`, `input_path`, `output_path`, `is_sample`, `sample_order` |
| `submissions` | `id`, `user_id`, `problem_id`, `language`, `code`, `status`, `created_at` |
| `submission_result` | `id`, `submission_id`, `test_case_id`, `verdict`, `time_taken_ms`, `memory_used_mb` (**nullable**) |

Notes on a few choices:

- **Test case contents live on disk, not in PostgreSQL.** The database stores only paths. See [Test case storage](#test-case-storage).
- **No stored "tests passed" counter.** It can be derived by counting `submission_result` rows with `verdict = accepted`. Storing it would create a second source of truth that can drift.
- **`sample_order` and `is_sample`:** sample tests are shown in the problem statement; hidden tests are not. `sample_order` is only meaningful when `is_sample` is true.
- **`memory_used_mb` is nullable** because measurement can legitimately fail (for example on a host without the needed cgroup counters). "Unknown" is stored as `NULL` rather than a misleading `0`.
- **`is_cpe`** flags problems that belong to the CPE-preparation track.

---

## API reference

Interactive docs are available at `/docs` (Swagger UI) when the server is running.

### Users, prefix `/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/register` | none | Create an account. Rejects duplicate username/email. |
| POST | `/users/login` | none | Returns `{access_token, token_type}`. |
| GET | `/users/me` | user | Current user (including `is_admin`). |

### Problems, prefix `/problems`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/problems/` | none | List problems. |
| GET | `/problems/{id}` | none | Problem details. |
| POST | `/problems/` | **admin** | Create a problem. |
| PUT | `/problems/{id}` | **admin** | Replace a problem (full update). |
| DELETE | `/problems/{id}` | **admin** | Delete a problem. |

### Test cases, nested under problems

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/problems/{problem_id}/testcases` | **admin** | Add a test case (input/output text is saved to files). |
| GET | `/problems/{problem_id}/testcases` | **admin** | List test cases of a problem. |
| GET | `/problems/{problem_id}/testcases/{id}` | **admin** | One test case. |
| PUT | `/problems/{problem_id}/testcases/{id}` | **admin** | Overwrite its files and flags. |
| DELETE | `/problems/{problem_id}/testcases/{id}` | **admin** | Delete the record and its files. |

Every test case endpoint verifies that the test case actually belongs to the problem in the URL.

### Submissions, prefix `/submissions`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/submissions/` | user | Submit code. Stored with `status = pending`. |
| GET | `/submissions/` | user | Your own submissions. |
| GET | `/submissions/{id}` | owner | One submission. 403 if it is not yours. |
| GET | `/submissions/{id}/results` | owner | Per-test-case results. |

Submission input is validated up front: `language` must be a supported language (currently Python only) and `code` is limited to **64 KiB** (checked in characters and in UTF-8 bytes).

---

## Authentication and authorization

Flow: `JWT -> get_current_user -> get_current_admin_user -> allow / 403`

- Passwords are hashed with Argon2 and never returned (`UserOut` has no hash field).
- Login returns a JWT (HS256, 30-minute lifetime) containing `user_id`, `username` and `exp`.
- `get_current_user` (FastAPI dependency) decodes the token and loads the user, returning 401 if the token is invalid or the user no longer exists.
- `get_current_admin_user` wraps `get_current_user` and returns 403 unless `is_admin` is true. It is reused by every admin-only route, so authorization lives in one place instead of being copy-pasted.
- Login uses one generic message for "wrong username" and "wrong password", so it does not reveal which usernames exist.
- Submissions are private. Even a valid token cannot read someone else's submission or results.

Secrets (`SECRET_KEY`, `DATABASE_URL`) are read from environment variables and the app refuses to start if they are missing.

---

## Test case storage

Test cases can be large, so their contents are stored as **files**, with only paths in PostgreSQL:

```
test_data/
  <problem_id>/
    <testcase_id>_input.txt
    <testcase_id>_output.txt
```

Why files and not database columns:

- Megabyte-sized values in a relational table are slow to read and write and bloat backups.
- The judge reads a file straight into a container's stdin and compares output as text.

How creation works: the `TestCase` row is inserted and flushed first to obtain its `id`, the files are written using that id (so names never collide and never come from user input, which also prevents directory traversal).

All file access goes through `app/storage.py` (`save_file`, `write_file`, `read_file`). Routers never build paths themselves. For production this module is the single seam to swap in S3-compatible object storage.

---

## The judge engine

Two modules, split on purpose:

- `app/services/judge_service.py`: pure judging logic (load test cases, run each one, classify, stop early). It takes `run_code` as an argument.
- `app/services/docker_runner.py`: runs one program against one input inside a locked-down container and reports what happened.

### Sandbox limits (per test case)

| Protection | Setting | Defends against |
|---|---|---|
| Fresh container, removed afterwards | `python:3.11-slim`, `remove(force=True)` in `finally` | State leaking between runs, leftover containers |
| No network | `network_disabled=True` | Downloading things, attacking other hosts |
| Memory cap | `mem_limit = problem.memory_limit_mb` | One submission exhausting host RAM |
| CPU cap | `nano_cpus` = 1 core | Multi-threaded busy loops starving the host |
| Process cap | `pids_limit = 50` | Fork bombs |
| Wall-clock limit | enforced from outside the container | Infinite loops |
| Code size | 64 KiB at the API | Linux's per-argument limit (the code is passed via `argv`) |

### How one run works

1. The container starts running a tiny **bootstrap**: it blocks reading a single line from stdin (a "gate"), then `exec`s the student's code.
2. While it is blocked, the runner takes its first memory sample. This guarantees the monitor has observed the container even if the program would otherwise finish instantly.
3. The runner sends `\n` followed by the test input **in a separate thread**, and waits for the container **in another thread**. The deadline is applied to the waiting, not to the sending.
4. A background thread polls the container's cgroup **memory high-water mark** every ~10 ms (`memory.peak` on cgroup v2, `memory.max_usage_in_bytes` on v1). The bootstrap also reports `ru_maxrss` on exit.
5. On timeout the container is killed. Afterwards the runner reads stdout, stderr, exit code, and Docker's `OOMKilled` flag.

Why it is built this way, in terms of problems that were actually hit:

- **Gate on one line only.** An earlier version read the whole input into memory first. On a 40 MB input that made peak memory about 85 MB, versus about 11 MB when only the gate line is read. With "big input" test cases, this matters.
- **Sending input in a thread.** If the code never reads stdin (for example `while True: pass`) and the input is larger than the socket and pipe buffers, a blocking `sendall` would hang forever *before* the deadline could be applied to the container.
- **Polling instead of streaming Docker stats.** Docker's stats stream emits roughly once per second, longer than a typical run, so most runs would have reported 0 MB.
- **Unknown is not zero.** If no counter can be read, memory is reported as unknown (`NULL`).

### Verdict classification

Checked in this order; the first match wins:

1. Deadline hit -> `time_limit_exceeded`
2. Container OOM-killed -> `memory_limit_exceeded` (checked **before** the exit code, because an OOM kill also produces a non-zero exit code and would otherwise be mislabelled)
3. Non-zero exit code -> `runtime_error`
4. Output differs after trimming leading/trailing whitespace -> `wrong_answer`
5. Otherwise -> `accepted`

### Early stopping

Test cases run in order and judging **stops at the first non-accepted verdict**, which is what Codeforces-style judges do. It saves a lot of CPU when tests are large, and for exam practice the first failure is the only one that matters.

---

## Design decisions log

| Decision | Alternatives considered | Reason |
|---|---|---|
| FastAPI + SQLAlchemy + PostgreSQL | Django, SQLite | Learn the explicit stack used in industry; Postgres matches production. |
| Alembic only, no `create_all()` | `create_all()` | One source of truth for the schema. Adding `is_admin` to existing rows was done with a `server_default` migration. |
| Pydantic schemas separate from ORM models | Returning ORM objects | Never leak `password_hash` or file paths by accident. |
| Argon2 for passwords | bcrypt | Modern recommended default. |
| `get_current_admin_user` dependency | `if not is_admin` in every route | DRY; authorization cannot be forgotten in one route. |
| Test case files on disk behind `storage.py` | Text columns in Postgres | Large data; clean seam for S3 later. |
| Test case content sent as text in JSON | `UploadFile` multipart | Simpler for the current stage; revisit if files get very large. |
| Docker container per test case | Run on host, a long-lived container | Isolation and clean limits. |
| Stop at first failing test | Run all tests | Saves resources; matches CPE/Codeforces semantics. |
| Python only first | Python + C++ + Java | Compilation adds a whole stage; do one language well first. |
| Celery over RQ | RQ | RQ requires `fork()` and does not run on Windows. |
| Community features are phase 2 | Build everything at once | The judge core has to work before anything else matters. |

---

## Getting started

### Prerequisites

- Python 3.11+
- PostgreSQL
- Docker (running), with the sandbox image pulled: `docker pull python:3.11-slim`

### Setup

```bash
git clone https://github.com/AkmalAgzamov1/YZU-judge.git
cd YZU-judge/backend

python -m venv venv
# Windows (PowerShell):  venv\Scripts\activate
# macOS / Linux:         source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@localhost:5432/yzu_judge
SECRET_KEY=change-me-to-a-long-random-string
```

Create the database, then apply migrations and start the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs.

### Creating the first admin

Registration always creates a normal user. Promote one manually:

```sql
UPDATE users SET is_admin = true WHERE username = 'your_username';
```

### Trying the judge engine

The judge is not connected to the API yet, so it is exercised by a standalone script. With at least one problem and its test cases in the database, edit the `code` in `backend/test_judge_service.py` and run:

```bash
python test_judge_service.py
```

Cases verified so far: accepted on all test cases, wrong answer with early stop, runtime error (`1 / 0`), and a hanging program with 5 MB of stdin returning `time_limit_exceeded`.

---

## Known limitations

Being explicit about what is **not** done:

- **Submissions are not judged automatically yet.** `POST /submissions` stores a `pending` row and nothing consumes it. This is the next milestone.
- **Python only.** The schema accepts only `python`; C++ and Java need a compile stage and `compilation_error` handling.
- **The sandbox is solid for development but not production-hardened.** Further hardening is listed in the roadmap.
- **Memory numbers are approximate.** Sampling is periodic, so a very short-lived spike right before exit can be missed; treat the value as a lower bound. Real enforcement is Docker's OOM kill, not the sampling.
- **Memory counters depend on the host kernel.** `memory.peak` needs cgroup v2 and Linux 5.19 or newer (older hosts fall back to cgroup v1 or `ru_maxrss`). Check the worker host before deploying.
- **Measured time includes the time to push the input** into the container.
- **Output comparison is exact after trimming.** There is no token-based or floating-point-tolerant checker, and no special judges.
- **No pagination, rate limiting, or refresh tokens yet.**
- **Test case endpoints return server-side file paths** (admin-only today). Returning the content instead would be cleaner.
- **No automated tests yet**, only manual checks through Swagger and the standalone judge script.
- **A stuck `running` submission is possible** if a worker dies mid-judge, until the failure-handling work below is done.

---

## Roadmap

### Next: asynchronous grading pipeline

- [ ] Run Redis locally (Docker)
- [ ] Minimal `celery_app.py` and a trivial task, worker started with `-P solo` on Windows, called via `.delay()` from a shell
- [ ] Real judge task: own DB session, set `running`, load problem limits and test cases, run `judge_submission`, write one `SubmissionResult` per executed test, set the final status
- [ ] Add an `internal_error` submission status (Alembic enum migration) and wrap the task so unexpected failures never leave a submission stuck in `running`
- [ ] Wire `POST /submissions` to enqueue the task
- [ ] Late acknowledgement / retry policy so a crashed worker does not lose a submission

### Judge engine

- [ ] C++ and Java with a compile step and `compilation_error`
- [ ] Safer comparison: token-based and floating-point-tolerant checkers, then special judges
- [ ] Sandbox hardening: non-root user, read-only root filesystem with a small tmpfs, dropped capabilities, seccomp profile, or a stronger runtime such as gVisor
- [ ] Worker concurrency tuned to CPU/RAM (each container may use up to one core plus its memory limit)

### API polish

- [ ] Pagination and filtering for problems and submissions
- [ ] Admin access to all submissions
- [ ] Partial updates (`PATCH`)
- [ ] Rate limiting on submit and login
- [ ] Automated tests (pytest) for auth, permissions, and the judge verdict matrix

### Frontend

- [ ] React app: problem list, problem page with sample tests, code editor, submission history
- [ ] Live verdict updates (polling first, WebSocket later)
- [ ] Admin screens for problems and test cases

### Phase 2: community (for YZU / CPE preparation)

- [ ] Discussions and comments per problem
- [ ] Viewing solutions after solving
- [ ] CPE-focused problem sets and progress tracking (building on the existing `is_cpe` flag)

### Production

- [ ] `docker-compose` for API, worker, Redis and PostgreSQL
- [ ] S3-compatible object storage behind `storage.py`
- [ ] Worker hosts on a cgroup v2 kernel (>= 5.19)
- [ ] HTTPS, structured logging, monitoring, CI/CD
- [ ] Secrets management and a CORS policy for the frontend

---

## Project layout

```
backend/
├── alembic/                 # migrations (versions/ holds the history)
├── app/
│   ├── main.py              # app + router registration only
│   ├── config.py            # JWT settings, SECRET_KEY
│   ├── database.py          # engine, SessionLocal, Base, get_db
│   ├── dependencies.py      # get_current_user, get_current_admin_user
│   ├── security.py          # Argon2 hashing, JWT create/decode
│   ├── storage.py           # file storage for test cases
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # users, problems, testcases, submissions
│   └── services/
│       ├── judge_service.py # judging logic, verdicts, early stop
│       └── docker_runner.py # sandboxed execution + memory measurement
├── test_data/               # generated test case files (gitignored)
├── test_judge_service.py    # standalone judge check
├── alembic.ini
└── requirements.txt
```
