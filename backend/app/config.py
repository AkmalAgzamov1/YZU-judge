
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY is not set")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Comma separated. In production the site and the API share one origin behind Caddy,
# so this only matters for the Vite dev server.
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

JWT_ALGORITHM = "HS256"

# Refreshing keeps active users signed in, but never longer than this after the
# password was typed, so a stolen token cannot be renewed forever.
MAX_SESSION_DAYS = int(os.getenv("MAX_SESSION_DAYS", 30))

# 7 days by default. The frontend swaps tokens for fresh ones while the site is in use,
# so active students stay signed in, including through a 3 hour mock exam.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7))
