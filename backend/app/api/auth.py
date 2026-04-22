# backend/app/api/auth.py
import random
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select
from app.db.database import get_session
from app.models.user import User
from app.services.email import generate_and_store_otp, send_otp_email, verify_and_clear_otp
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Pydantic Schemas for Input Validation ---


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
    name: str = "Anonymous"  # Optional: Used only if it's a new user signup
    username: str = ""      # Optional: Used only if it's a new user signup

# --- Routes ---


@router.post("/request-otp")
def request_otp(data: OTPRequest, background_tasks: BackgroundTasks):
    """Generates an OTP and 'sends' it to the user."""
    otp = generate_and_store_otp(data.email)
    background_tasks.add_task(send_otp_email, data.email, otp)

    return {"message": "OTP sent successfully. Check your terminal!"}


@router.post("/verify-otp")
def verify_otp(data: OTPVerify, db: Session = Depends(get_session)):
    """Verifies the OTP and issues a JWT token."""

    # 1. Check if OTP is valid
    is_valid = verify_and_clear_otp(data.email, data.otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # 2. Database interaction: Check if user exists
    statement = select(User).where(User.email == data.email)
    user = db.exec(statement).first()

    # 3. If user doesn't exist, create them (Signup flow)
    if not user:
        if not data.username:
            # Generate a random username if not provided
            data.username = data.email.split(
                "@")[0] + str(random.randint(100, 999))

        user = User(email=data.email, name=data.name,
                    username=data.username, is_verified=True)
        db.add(user)
        db.commit()
        db.refresh(user)  # Fetch the generated ID from the DB

    # 4. Create the JWT Token
    token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username
    }
