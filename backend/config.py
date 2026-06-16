from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "PantauStok"
    VERSION: str = "1.0.0"
    API_STR: str = "/api/v1"

    # AI Integration
    SUMOPOD_API_KEY: str = ""
    SUMOPOD_BASE_URL: str = "https://ai.sumopod.com/v1"
    SUMOPOD_MODEL: str = "seed-2-0-mini-free"
    
    SECRET_KEY: str = "DEVELOPMENT_SECRET_KEY_REPLACE_IN_PROD"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/stocksense"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
