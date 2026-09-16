import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    REFEREE_MODEL: str = os.getenv("REFEREE_MODEL", "gemini-2.5-flash")
    OPPONENT_MODEL: str = os.getenv("OPPONENT_MODEL", "gemini-2.5-flash")
    ASSISTANT_MODEL: str = os.getenv("ASSISTANT_MODEL", "gemini-2.5-flash")

    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "debate_platform_database")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/debate_db"
    )

    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")


settings = Settings()

if not settings.GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY is not set. Add GOOGLE_API_KEY=your_key to your .env file "
        "before starting the server."
    )
