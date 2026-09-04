from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from config import settings

from routers import (
    auth,
    profile,
    sessions,
    analysis,
    counterargument,
    simulation,
    scoring,
    coaching,
    presentation,
    analytics,
    reports,
    notifications,
    dashboard
)

# --------------------------------
# DATABASE TABLES INIT
# --------------------------------
Base.metadata.create_all(bind=engine)

# --------------------------------
# APPLICATION SETUP
# --------------------------------
app = FastAPI(
    title="Agentic AI Debate Coach & Presentation Analysis API",
    description=(
        "Backend API for the Agentic AI Debate Coach and "
        "Presentation Analysis Platform supporting argument mining, "
        "fallacy detection, counterargument generation, presentation analytics, "
        "debate simulations, and coaching intelligence."
    ),
    version="1.0.0"
)

# --------------------------------
# CORS MIDDLEWARE
# --------------------------------
origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]
if "*" not in origins:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# --------------------------------
# ROUTERS
# --------------------------------
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(sessions.router)
app.include_router(analysis.router)
app.include_router(counterargument.router)
app.include_router(simulation.router)
app.include_router(scoring.router)
app.include_router(coaching.router)
app.include_router(presentation.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


# --------------------------------
# HEALTH CHECK
# --------------------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "debate-coach-api",
        "version": "1.0.0",
        "modules_active": 14,
        "database": "connected"
    }


# --------------------------------
# ROOT
# --------------------------------
@app.get("/")
def root():
    return {
        "message": "Agentic AI Debate Coach & Presentation Analysis API is running",
        "docs": "/docs",
        "health": "/health"
    }
