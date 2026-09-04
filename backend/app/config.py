"""
Central place all environment variables get read from.
Every other file imports `settings` from here instead of touching
os.environ directly - keeps secrets management in one spot.
"""
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- LLM providers (free tier) ---
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Model names are configurable, not hardcoded, on purpose: both
    # Gemini and Groq have deprecated and shut down models we were
    # using previously (gemini-2.0-flash on June 1 2026, Groq's
    # llama-3.3-70b-versatile on August 16 2026) with only a few
    # months' notice. When it happens again - and it will - update
    # these in your .env instead of needing a code change.
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # --- Supabase (added in Segment 1) ---
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # --- App ---
    ENVIRONMENT: str = "development"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Minimum opted-in pool size (including yourself) before Peer
    # Comparison shows any percentile - see comparison_service.py for
    # why this exists and the privacy tradeoff of lowering it.
    COMPARISON_MIN_POOL_SIZE: int = 3

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("SUPABASE_URL")
    @classmethod
    def normalize_supabase_url(cls, v: str) -> str:
        """
        Supabase's dashboard shows the project URL in a couple of
        places, and it's an easy copy-paste mistake to grab one that
        already has "/rest/v1" or a trailing slash on it. Every request
        in supabase_client.py appends its own path, so a URL with
        extra path segments on it silently breaks every Supabase call.
        Strip them here once, so the mistake can't propagate.
        """
        v = v.strip().rstrip("/")
        for suffix in ("/rest/v1", "/auth/v1"):
            if v.endswith(suffix):
                v = v[: -len(suffix)]
        return v.rstrip("/")


settings = Settings()
