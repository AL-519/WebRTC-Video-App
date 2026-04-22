# backend/app/models/user.py
from sqlmodel import SQLModel, Field
from typing import Optional


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    is_verified: bool = Field(default=False)
