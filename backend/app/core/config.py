from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Agentic AI Debate Coach Platform"
    SECRET_KEY: str = "dev-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    POSTGRES_URL: str = "sqlite:///./debate.db"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    FRONTEND_URL: str = "http://localhost:5173"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_SECRET: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
