from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import settings
from .database import engine, Base
from .seed_data import seed_database
from .routers import (
    auth,
    users,
    debates,
    arguments,
    fallacies,
    counterarguments,
    presentation,
    simulation,
    scoring,
    coaching,
    analytics,
    notifications,
    reports
)

# Initialize database schema and seed data
Base.metadata.create_all(bind=engine)
try:
    seed_database()
except Exception as e:
    print(f"Notice on seed: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Full-stack Agentic AI Debate Coach & Presentation Analysis Platform"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount exports directory for downloads if exists
if os.path.exists(settings.EXPORTS_DIR):
    app.mount("/exports", StaticFiles(directory=settings.EXPORTS_DIR), name="exports")

# Register all Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(debates.router, prefix=settings.API_V1_STR)
app.include_router(arguments.router, prefix=settings.API_V1_STR)
app.include_router(fallacies.router, prefix=settings.API_V1_STR)
app.include_router(counterarguments.router, prefix=settings.API_V1_STR)
app.include_router(presentation.router, prefix=settings.API_V1_STR)
app.include_router(simulation.router, prefix=settings.API_V1_STR)
app.include_router(scoring.router, prefix=settings.API_V1_STR)
app.include_router(coaching.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "Operational",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "debate-coach-api"}
