# backend/app/services/signaling.py
from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()
        if room_code not in self.active_rooms:
            self.active_rooms[room_code] = []
        self.active_rooms[room_code].append(websocket)
        print(
            f"User connected to room {room_code}. Total users: {len(self.active_rooms[room_code])}")

    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.active_rooms:
            if websocket in self.active_rooms[room_code]:
                self.active_rooms[room_code].remove(websocket)
            if len(self.active_rooms[room_code]) == 0:
                del self.active_rooms[room_code]
                print(f"Room {room_code} closed.")

    async def broadcast(self, message: dict, room_code: str, sender_ws: WebSocket = None):
        if room_code in self.active_rooms:
            dead_connections = []

            # 1. Safely attempt to message everyone
            for connection in self.active_rooms[room_code]:
                if connection != sender_ws:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        print(
                            f"⚠️ Caught dead connection during broadcast: {e}")
                        dead_connections.append(connection)

            # 2. Clean up any ghosts we found so we don't message them again
            for dead in dead_connections:
                self.disconnect(dead, room_code)


manager = ConnectionManager()
