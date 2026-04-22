WebRTC Secure Video Conferencing 🚀

A full-stack, real-time peer-to-peer video conferencing application.
Built with a modern Next.js frontend and a high-performance FastAPI
WebSockets backend, featuring secure OTP email authentication and a
pre-join hardware lobby.

🌟 Features

-   Peer-to-Peer Video & Audio: Ultra-low latency WebRTC streaming
    (STUN ready).
-   Pre-Join Lobby: Hardware validation and permission checking before
    entering a room.
-   Screen Sharing: Swap camera feeds for screen sharing on the fly.
-   Real-time UI Sync: Dynamic WebSocket broadcasting for mute/video
    statuses and user avatars.
-   Secure Authentication: Passwordless OTP email login via Google SMTP and JWT authorization.

🛠️ Tech Stack

-   Frontend: Next.js (App Router), React, Tailwind CSS v4, Lucide
    Icons.
-   Backend: FastAPI, Python, WebSockets, SQLModel (SQLite).
-   Networking: WebRTC (RTCPeerConnection), STUN.

------------------------------------------------------------------------

🚀 Getting Started

Prerequisites

-   Node.js (v18+)
-   Python (3.10+)

1. Backend Setup (FastAPI)

Navigate to the backend directory, set up your virtual environment, and
run the server.

cd backend python -m venv venv

Windows:

venv # Mac/Linux: source venv/bin/activate

Install dependencies

pip install -r requirements.txt

Environment Variables Create a .env file in the backend/ directory:

SECRET_KEY=“your-random-jwt-secret-string”
SMTP_EMAIL=“your-email@gmail.com”
SMTP_PASSWORD=“your-google-app-password”

Run the Server

fastapi dev app/main.py

The backend will start at http://127.0.0.1:8000

2. Frontend Setup (Next.js)

Open a new terminal, navigate to the frontend directory, and start the
client.

cd frontend

Install dependencies

npm install

Run the development server

npm run dev

Environment Variables Create a .env.local file in the frontend/
directory:

NEXT_PUBLIC_API_URL=“http://127.0.0.1:8000”

The frontend will start at http://localhost:3000
