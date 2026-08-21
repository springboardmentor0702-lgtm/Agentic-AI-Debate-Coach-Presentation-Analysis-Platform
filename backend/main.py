import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, SessionLocal, engine
from migrations import run_migrations
from middleware import InMemoryRateLimitMiddleware
import models

from routers import (
    argument_analysis,
    auth,
    coaching,
    counterarguments,
    dashboards,
    fallacy_detection,
    feedback,
    notifications,
    presentation_analysis,
    reports,
    scoring,
    sessions,
    simulation,
    workflows,
)


settings.validate()
Base.metadata.create_all(bind=engine)
run_migrations(engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(InMemoryRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

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
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(feedback.router)
app.include_router(workflows.router)


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
    started = time.perf_counter()
    db_status = "healthy"
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "unavailable"
    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    overall = "healthy" if db_status == "healthy" else "degraded"
    return {
        "status": overall,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "latency_ms": latency_ms,
        "ai_provider": settings.AI_PROVIDER,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
