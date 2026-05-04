# backend/models.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from database import Base
from datetime import datetime, timezone


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(6), unique=True, index=True, nullable=False)

    # HOST PRIVILEGES: We store the email of the person who created it
    host_email = Column(String, index=True, nullable=False)

    # SCHEDULING: If this is null, the room starts immediately
    scheduled_time = Column(DateTime(timezone=True), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
