# backend/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy requires 'postgresql://' but some providers give 'postgres://'
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create the database engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our database models
Base = declarative_base()

# Dependency block to get the DB session in our routes


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
