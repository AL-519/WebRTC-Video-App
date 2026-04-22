# backend/app/main.py
from fastapi import FastAPI
from app.api import auth, rooms
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WebRTC Signaling Server")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers (including Authorization)
)

# ROUTER HERE
app.include_router(auth.router)
app.include_router(rooms.router)


@app.get("/")
async def root():
    return {"message": "System is online and ready for WebRTC signaling."}
