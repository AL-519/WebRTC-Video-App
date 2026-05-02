# backend/app/main.py
from fastapi import FastAPI
from app.api import auth, rooms
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WebRTC Signaling Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keep Auth for OTP login, Keep Rooms for DB-Free video chat
app.include_router(auth.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Hybrid System Online: Auth enabled, Signaling DB-Free."}
