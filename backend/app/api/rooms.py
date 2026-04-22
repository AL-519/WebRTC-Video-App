# backend/app/api/rooms.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, Header
from sqlmodel import Session
from app.db.database import get_session
from app.models.room import Room
from app.services.signaling import manager
from app.core.config import settings  # <--- WE NOW IMPORT SETTINGS HERE
import jwt

router = APIRouter(prefix="/rooms", tags=["Rooms"])


async def get_current_user_http(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    try:
        # Check against the .env SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/create")
def create_room(user_id: str = Depends(get_current_user_http), db: Session = Depends(get_session)):
    room = Room(created_by=int(user_id))
    db.add(room)
    db.commit()
    db.refresh(room)
    return {"room_code": room.code}


async def verify_ws_token(token: str):
    try:
        # Check against the .env SECRET_KEY
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


@router.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, token: str = Query(...)):
    user_id = await verify_ws_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, room_code)
    await manager.broadcast({"type": "peer-joined", "user_id": user_id}, room_code, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data, room_code, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)
        await manager.broadcast({"type": "peer-left", "user_id": user_id}, room_code)
