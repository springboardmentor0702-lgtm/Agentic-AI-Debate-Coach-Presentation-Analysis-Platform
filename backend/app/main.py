"""
FastAPI app entrypoint - CORS, router registration, health check.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    arguments,
    case_review,
    classes,
    coaching,
    coaching_agent_router,
    comparison,
    counterarguments,
    dashboards,
    debates,
    easy_wins_router,
    fallacies,
    goals,
    health,
    notifications,
    presentation,
    profiles,
    reports,
    research,
    scoring,
)

app = FastAPI(title="ClashLab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(profiles.router)
app.include_router(arguments.router)
app.include_router(fallacies.router)
app.include_router(counterarguments.router)
app.include_router(case_review.router)
app.include_router(debates.router)
app.include_router(presentation.router)
app.include_router(scoring.router)
app.include_router(coaching.router)
app.include_router(dashboards.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(goals.router)
app.include_router(comparison.router)
app.include_router(classes.router)
app.include_router(research.router)
app.include_router(coaching_agent_router.router)
app.include_router(easy_wins_router.router)
