
from celery import Celery
from app.config import REDIS_URL

celery_app = Celery(
    "yzu_judge",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    # Judging is slow, so a worker takes one job at a time instead of holding some back.
    worker_prefetch_multiplier=1,
    beat_schedule={
        "reap-stuck-submissions": {
            "task": "app.tasks.reap_stuck_submissions",
            "schedule": 60.0,
        },
    },
)
