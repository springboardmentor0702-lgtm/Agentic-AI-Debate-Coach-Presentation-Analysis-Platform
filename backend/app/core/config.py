from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    app_name: str = "Agentic AI Debate Coach & Presentation Intelligence Platform"
    environment: str = "development"
    ai_provider: str = "groq"
    ai_fallback_enabled: bool = True
    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3.8-27b"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    postgres_database_url: str = "sqlite:///./debate_coach.db"
    mongodb_uri: str = ""
    mongodb_database: str = "debate_coach"
    jwt_secret: str = "dev-only-change-me"
    jwt_refresh_secret: str = "dev-only-refresh-change-me"
    access_token_expire_minutes: int = 60
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    upload_directory: str = "./uploads"
    max_upload_mb: int = 25
    rate_limit_per_minute: int = 120
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def cors_list(self) -> List[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

settings = Settings()
