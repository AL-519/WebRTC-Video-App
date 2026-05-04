# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, rooms
import models
from database import engine

app = FastAPI(title="WebRTC Signaling Server")

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach our API routers
app.include_router(auth.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Hybrid System Online: Auth enabled, Signaling DB-Ready."}
