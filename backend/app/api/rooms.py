# backend/app/api/rooms.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, Header
from app.services.signaling import manager
from app.core.config import settings
import jwt
import secrets

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

# --- DATABASE-FREE ROUTES ---


@router.post("/create")
def create_room(user_id: str = Depends(get_current_user_http)):
    """Generates a random room code. Requires login, but does NOT save to a database."""
    room_code = secrets.token_hex(3).upper()
    return {"room_code": room_code}


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
