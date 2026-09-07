from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base
import models
from services import agent_bridge

from routers import (
    auth,
    sessions,
    argument_analysis,
    fallacy_detection,
    counterarguments,
    presentation_analysis,
    simulation,
    scoring,
    coaching,
    dashboards,
    reports,
    roster_management,
    notifications
)

# Initialize DB tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up the agent bridge on startup.
    # This prevents the first request from taking the import hit and ensures
    # /health and the dashboard tell the truth about agent availability immediately.
    print("[LOGOS.AI] Warming up agent layer...")
    status = agent_bridge.warmup()
    print(f"[LOGOS.AI] Agent layer active engine: {status.get('active_engine')}")
    yield
    print("[LOGOS.AI] Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register All Microservices Routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(argument_analysis.router)
app.include_router(fallacy_detection.router)
app.include_router(counterarguments.router)
app.include_router(presentation_analysis.router)
app.include_router(simulation.router)
app.include_router(scoring.router)
app.include_router(coaching.router)
app.include_router(dashboards.router)
app.include_router(roster_management.router)
app.include_router(reports.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
    }


@app.get("/health", tags=["Operations"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_engine": agent_bridge.status()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)