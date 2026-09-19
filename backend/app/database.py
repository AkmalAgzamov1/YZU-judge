import sqlalchemy as db

from sqlalchemy.orm import declarative_base, sessionmaker


engine = db.create_engine("postgresql://username:password@localhost:5432/company")
session_local = sessionmaker(autocommit = False, autoflush = False, bind = engine)
Base = declarative_base()

