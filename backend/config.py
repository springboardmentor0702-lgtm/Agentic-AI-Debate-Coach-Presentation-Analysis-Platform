import os
from pathlib import Path


# Load a simple .env file when present; deployment environments still take precedence.
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"\''))


def _csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "LOGOS.AI - Agentic Debate Coach & Presentation Analysis Platform")
    VERSION: str = os.getenv("APP_VERSION", "4.3.0")
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    MAX_FAILED_LOGINS: int = int(os.getenv("MAX_FAILED_LOGINS", "5"))
    LOGIN_LOCKOUT_MINUTES: int = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "120"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "20000"))
    DEFAULT_PAGE_SIZE: int = min(int(os.getenv("DEFAULT_PAGE_SIZE", "25")), 100)

    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "logos_ai_db")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}",
    )
    SQLITE_FALLBACK_URL: str = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./logos_ai.db")

    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "logos_ai_transcripts")
    CORS_ORIGINS: list[str] = _csv_env("CORS_ORIGINS", "http://localhost:3000")

    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "heuristic").lower()
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-5-mini")
    AI_REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "30"))
    TRANSCRIPTION_PROVIDER: str = os.getenv("TRANSCRIPTION_PROVIDER", "disabled").lower()
    TRANSCRIPTION_MODEL: str = os.getenv("TRANSCRIPTION_MODEL", "whisper-1")
    OPENAI_API_BASE: str = os.getenv("OPENAI_API_BASE", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    FAISS_INDEX_PATH: str = os.getenv("FAISS_INDEX_PATH", "./data/argument_memory.index")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_AUDIO_FILE_MB: int = min(int(os.getenv("MAX_AUDIO_FILE_MB", "25")), 100)
    ARTIFACT_RETENTION_DAYS: int = int(os.getenv("ARTIFACT_RETENTION_DAYS", "30"))
    ALLOW_SELF_ASSIGN_ROLES: bool = os.getenv("ALLOW_SELF_ASSIGN_ROLES", "false").lower() in {"1", "true", "yes"}

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    def validate(self) -> None:
        if self.is_production and self.SECRET_KEY == "change-me-in-production":
            raise RuntimeError("SECRET_KEY must be set to a non-default value in production.")
        if not self.CORS_ORIGINS or "*" in self.CORS_ORIGINS:
            raise RuntimeError("Production CORS_ORIGINS must contain explicit allowed origins.")
        if self.is_production and self.DATABASE_URL.startswith("sqlite"):
            raise RuntimeError("Production requires a PostgreSQL DATABASE_URL.")
        if self.is_production and self.AI_PROVIDER in {"openai", "openai-compatible", "llm", "builtin"} and not self.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is required for the configured production AI provider.")
        if self.is_production and self.ALLOW_SELF_ASSIGN_ROLES:
            raise RuntimeError("ALLOW_SELF_ASSIGN_ROLES must be disabled in production.")
        if self.MAX_FAILED_LOGINS < 1 or self.LOGIN_LOCKOUT_MINUTES < 1:
            raise RuntimeError("Login lockout settings must be positive.")
        if self.RATE_LIMIT_REQUESTS < 1 or self.RATE_LIMIT_WINDOW_SECONDS < 1:
            raise RuntimeError("Rate-limit settings must be positive.")


settings = Settings()
