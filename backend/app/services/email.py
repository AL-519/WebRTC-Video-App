# backend/app/services/email.py
import random
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from app.core.config import settings

# Temporary in-memory store for OTPs
otp_storage = {}


def generate_and_store_otp(email: str) -> str:
    otp = str(random.randint(100000, 999999))
    expiration_time = datetime.now() + timedelta(minutes=5)
    otp_storage[email] = {"otp": otp, "expires": expiration_time}
    return otp


def send_otp_email(email: str, otp: str):
    """Sends the OTP via Google SMTP, or falls back to console if unconfigured."""

    # Fallback if you haven't set up your .env yet
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        print("=" * 40)
        print(f"⚠️ MOCK EMAIL (No SMTP credentials found)")
        print(f"📧 TO: {email}")
        print(f"🔐 OTP CODE: {otp}")
        print("=" * 40)
        return

    # Create the email message
    msg = MIMEText(
        f"Welcome to WebRTC Sync!\n\nYour secure login code is: {otp}\n\nThis code will expire in 5 minutes.")
    msg['Subject'] = 'Your WebRTC Login Code'
    msg['From'] = f"WebRTC Sync <{settings.SMTP_EMAIL}>"
    msg['To'] = email

    try:
        # Connect to Google's SMTP server securely
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.send_message(msg)
            print(f"✅ Real email successfully sent to {email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")


def verify_and_clear_otp(email: str, provided_otp: str) -> bool:
    record = otp_storage.get(email)
    if not record:
        return False
    if datetime.now() > record["expires"]:
        del otp_storage[email]
        return False
    if record["otp"] == provided_otp:
        del otp_storage[email]
        return True
    return False
