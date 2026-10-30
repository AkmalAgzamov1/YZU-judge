
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

JWT_ALGORITHM = "HS256"

# 7 days by default. The frontend swaps tokens for fresh ones while the site is in use,
# so active students stay signed in, including through a 3 hour mock exam.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7))
