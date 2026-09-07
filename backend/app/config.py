import os

class Settings:
    PROJECT_NAME: str = "Agentic AI Debate Coach & Presentation Analysis Platform"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-debate-coach-jwt-key-2025-secure-token")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./debate_platform.db")
    
    # Optional LLM API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Storage & Exports
    EXPORTS_DIR: str = os.getenv("EXPORTS_DIR", "./exports")
    UPLOADS_DIR: str = os.getenv("UPLOADS_DIR", "./uploads")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()

# Ensure directories exist
os.makedirs(settings.EXPORTS_DIR, exist_ok=True)
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
