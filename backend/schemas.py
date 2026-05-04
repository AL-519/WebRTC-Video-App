# backend/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# What the frontend sends when creating/scheduling a room


class RoomCreate(BaseModel):
    host_email: str
    scheduled_time: Optional[datetime] = None  # None means start immediately

# What the backend sends back to the frontend


class RoomResponse(BaseModel):
    room_code: str
    host_email: str
    scheduled_time: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True
