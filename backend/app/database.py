import os

import sqlalchemy as db
from dotenv import load_dotenv
from sqlalchemy.orm import declarative_base, sessionmaker


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")


engine = db.create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db_session = SessionLocal()

    try:
        yield db_session
    finally:
        db_session.close()


def check_connection():
    try:
        with engine.connect():
            print("✅ PostgreSQL CONNECTED!")
    except Exception as e:
        print("❌ Connection failed:")
        print(e)


if __name__ == "__main__":
    check_connection()