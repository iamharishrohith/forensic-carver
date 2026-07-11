import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ACPIA"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./acpia.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "acpia-secret-key-change-in-production")
    
    class Config:
        case_sensitive = True

settings = Settings()
