from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "local"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/debate_coach"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    admin_registration_key: str | None = None
    cors_origins: list[str] = Field(default_factory=lambda: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ])
    upload_directory: str = "uploads"
    max_upload_size_mb: int = 50
    ai_mock_mode: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

"""Application configuration."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------

    app_name: str = "Debate Coach API"
    debug: bool = False

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------

    database_url: str

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    jwt_secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ------------------------------------------------------------------
    # File uploads
    # ------------------------------------------------------------------

    upload_directory: str = "uploads"
    max_upload_size_mb: int = 20

    # ------------------------------------------------------------------
    # Gemini
    # ------------------------------------------------------------------

    gemini_api_key: str = Field(
        ...,
        description="Google Gemini API key",
    )

    gemini_model: str = "gemini-2.5-flash"


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()


settings = get_settings()

