from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MindArena AI - Train Your Mind. Sharpen Your Arguments. Master Every Debate."
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ORIGINS == "*" else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Health check endpoint for Render, container orchestrators, and monitoring"""
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.get("/api/health")
def api_health_check():
    return {
        "status": "ok",
        "service": "MindArena AI Backend Engine",
        "version": settings.VERSION
    }
