"""LOGOS.AI Debate Coach & Presentation Analysis Platform \u2014 Backend API"""
import sys
import os

# Ensure project root and ai-ml dir are in sys.path for imports
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

_AIML_DIR = os.path.join(_PROJECT_ROOT, 'ai-ml')
if _AIML_DIR not in sys.path:
    sys.path.insert(0, _AIML_DIR)

_AIML_DIR_2 = os.path.join(_PROJECT_ROOT, 'aiml')
if _AIML_DIR_2 not in sys.path:
    sys.path.insert(0, _AIML_DIR_2)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import create_tables
from backend.schemas import HealthResponse
from backend.routers import analysis, debate, pipeline, history

# Set env vars for AIML modules
os.environ['GEMINI_API_KEY'] = settings.GEMINI_API_KEY
os.environ.setdefault('GROK_API_KEY', '')
os.environ.setdefault('GROQ_API_KEY', '')

app = FastAPI(
    title="LOGOS.AI \u2014 Debate Coach & Presentation Analysis Platform",
    description=(
        "AI-powered backend for debate coaching, argument analysis, "
        "fallacy detection, and performance evaluation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers under /api/v1
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(debate.router, prefix="/api/v1")
app.include_router(pipeline.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    """Initialize database tables on startup."""
    create_tables()
    print("\\n" + "=" * 60)
    print("  LOGOS.AI Backend API \u2014 Ready")
    print(f"  Swagger UI:  http://localhost:8000/docs")
    print(f"  ReDoc:       http://localhost:8000/redoc")
    print(f"  Health:      http://localhost:8000/api/v1/health")
    print("=" * 60 + "\\n")


@app.get(
    "/api/v1/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check",
)
def health_check():
    return HealthResponse(status="healthy", version="1.0.0", service="LOGOS.AI Backend")


@app.get("/", tags=["System"])
def root():
    return {
        "service": "LOGOS.AI Debate Coach & Presentation Analysis Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
