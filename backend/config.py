import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))  # root .env fallback


class Settings(BaseSettings):
    # LLM
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # MySQL (optional — only used if MYSQL_PASSWORD is set)
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "speakaz")

    # App
    SECRET_KEY: str = "change-me-in-production"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def DATABASE_URL(self) -> str:
        """Generate database URL. Defaults to SQLite so the app works with zero setup."""
        # Allow full override via env
        explicit = os.getenv("DATABASE_URL", "")
        if explicit:
            return explicit
        # Use MySQL only if a password is explicitly provided
        if self.MYSQL_PASSWORD:
            return (
                f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
                f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
            )
        # Default: SQLite (works out of the box, no server needed)
        return "sqlite:///./speakaz.db"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
