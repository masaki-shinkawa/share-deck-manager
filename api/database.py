from sqlmodel import create_engine, SQLModel, Session
import os
from typing import Generator

# Use environment variable or default to local sqlite
DATABASE_URL = os.getenv("POSTGRES_URL", "sqlite:///./dev.db")

# Ensure the URL uses the correct driver for SQLAlchemy
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
# check_same_thread=False is needed for SQLite with FastAPI
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
