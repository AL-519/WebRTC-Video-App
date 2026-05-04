# backend/app/api/rooms.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import random
import string
import jwt

from app.services.signaling import manager
from app.core.config import settings

# Import from the backend root
import models
import schemas
from database import get_db

router = APIRouter(prefix="/rooms", tags=["Rooms"])

# --- AUTHENTICATION HELPERS ---


async def get_current_user_http(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def verify_ws_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None

# --- HELPER ---


def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# --- DATABASE-BACKED ROUTES ---


@router.post("/create", response_model=schemas.RoomResponse)
def create_room(
    room_data: schemas.RoomCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_http)  # Enforces login check
):
    """Generates a random room code and saves it to the Neon Database."""
    code = generate_room_code()

    # Ensure code is completely unique in the DB
    while db.query(models.Room).filter(models.Room.room_code == code).first():
        code = generate_room_code()

    new_room = models.Room(
        room_code=code,
        host_email=room_data.host_email,
        scheduled_time=room_data.scheduled_time
    )

    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    return new_room


@router.get("/{room_code}/status")
def get_room_status(room_code: str, db: Session = Depends(get_db)):
    """Checks if a room exists and if its scheduled time has arrived."""
    room = db.query(models.Room).filter(
        models.Room.room_code == room_code.upper()).first()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if not room.is_active:
        raise HTTPException(status_code=400, detail="This meeting has ended.")

    # Check if the meeting is scheduled for the future
    if room.scheduled_time:
        scheduled_utc = room.scheduled_time.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)

        if scheduled_utc > now:
            return {
                "status": "scheduled",
                "scheduled_time": room.scheduled_time,
                "host": room.host_email
            }

    return {
        "status": "ready",
        "host": room.host_email
    }


# --- SIGNALING WEBSOCKET ---

@router.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, token: str = Query(...)):
    """Handles signaling. Requires valid JWT token."""
    user_id = await verify_ws_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, room_code)

    # Notify others that this verified user joined
    await manager.broadcast({"type": "peer-joined", "user_id": user_id}, room_code, exclude=websocket)

    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data, room_code, exclude=websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)
        # CRITICAL: Broadcast leave event to fix the 'ghost user' UI bug
        await manager.broadcast({"type": "peer-left", "user_id": user_id}, room_code)
