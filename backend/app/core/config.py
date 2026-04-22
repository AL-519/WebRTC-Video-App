# backend/app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JWT Security
    SECRET_KEY: str = "change-me-in-production-to-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # SMTP Email Settings
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        env_file = ".env"


# Instantiate the settings so we can import it everywhere
settings = Settings()
