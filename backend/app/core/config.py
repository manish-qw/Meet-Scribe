"""Centralized application settings."""

from pydantic_settings import BaseSettings


import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Settings(BaseSettings):
    firebase_credentials_path: str = os.path.join(BASE_DIR, "secrets", "firebase-service-account.json")
    
    firebase_credentials: str = ""

    # Google Gemini
    gemini_api_key: str = ""

    # Firebase Cloud Storage
    firebase_storage_bucket: str = "meet-scribe-c0367.firebasestorage.app"

    cors_origins: list[str] = ["http://localhost:5173"]

    internal_api_url: str = "http://127.0.0.1:7860"

    class Config:
        env_file = os.path.join(BASE_DIR, ".env")
        env_file_encoding = "utf-8"


settings = Settings()
