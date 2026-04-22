# backend/app/db/database.py
from sqlmodel import Session, create_engine

# For local development, we use SQLite.
# For production, change this to your PostgreSQL URL (e.g., "postgresql+asyncpg://user:pass@localhost/dbname")
sqlite_file_name = "webrtc_app.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# check_same_thread is required for SQLite + FastAPI to prevent thread sharing errors
engine = create_engine(sqlite_url, echo=True, connect_args={
                       "check_same_thread": False})


def get_session():
    """Dependency to provide a database session to API routes."""
    with Session(engine) as session:
        yield session
