# backend/app/core/security.py
import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings

# IN PRODUCTION: This must be a long, random string stored in a .env file!
# Never hardcode secrets in production code.
SECRET_KEY = "super-secret-development-key-change-me"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # Token lasts for 1 week


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + \
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    # Use settings.SECRET_KEY and settings.ALGORITHM
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
