# backend/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "WebRTC Video App"

    # JWT Security
    SECRET_KEY: str = "change-me-in-production-to-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # SMTP Email Settings
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""

    # User Database (Keep this for Auth!)
    DATABASE_URL: str = ""

    # Tell Pydantic to ignore MONGODB_URL and CLOUDINARY in your .env
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
