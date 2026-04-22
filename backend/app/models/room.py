# backend/app/models/room.py
from sqlmodel import SQLModel, Field
from typing import Optional
import random
import string


def generate_room_code() -> str:
    """Generates a 6-character random alphanumeric code for the room."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class Room(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(default_factory=generate_room_code,
                      unique=True, index=True)
    created_by: int = Field(foreign_key="user.id")
    is_active: bool = Field(default=True)
