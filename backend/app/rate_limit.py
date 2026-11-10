"""Fixed window request limits, counted in the Redis that Celery already uses."""

import logging

import redis
from fastapi import HTTPException, Request

from .config import REDIS_URL


logger = logging.getLogger(__name__)

_redis = redis.Redis.from_url(REDIS_URL, socket_timeout = 1, socket_connect_timeout = 1)


def client_ip(request: Request) -> str:
    # Behind Caddy this is the visitor's address, because uvicorn runs with --proxy-headers.
    return request.client.host if request.client else "unknown"


def hit(key: str, limit: int, window_seconds: int, message: str) -> None:
    """Counts one request for key and answers 429 once the window holds more than limit."""
    redis_key = f"rate:{key}"

    try:
        pipe = _redis.pipeline()
        pipe.incr(redis_key)
        # NX keeps the window fixed; setting it in the same round trip means a
        # crash between the two calls cannot leave a counter that never expires.
        pipe.expire(redis_key, window_seconds, nx = True)
        count, _ = pipe.execute()
    except redis.RedisError:
        # Signing in matters more than the limit, so a Redis outage lets requests through.
        logger.warning("Rate limit check skipped, Redis is unavailable", exc_info = True)
        return

    if count > limit:
        raise HTTPException(status_code = 429, detail = message)
