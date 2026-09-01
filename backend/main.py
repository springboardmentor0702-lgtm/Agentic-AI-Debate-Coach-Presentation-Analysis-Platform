from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base
from database import engine

from config import settings

from routers import (
    auth,
    profile,
    sessions
)


# --------------------------------
# DATABASE
# --------------------------------

Base.metadata.create_all(
    bind=engine
)


# --------------------------------
# APPLICATION
# --------------------------------

app = FastAPI(
    title="AI Debate Coach & Presentation Analysis API",
    description=(
        "Backend API for the Agentic AI "
        "Debate Coach and Presentation "
        "Analysis Platform"
    ),
    version="1.0.0"
)


# --------------------------------
# CORS
# --------------------------------

origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]


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

app.include_router(
    auth.router
)

app.include_router(
    profile.router
)

app.include_router(
    sessions.router
)


# --------------------------------
# HEALTH CHECK
# --------------------------------

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "debate-coach-api",
        "version": "1.0.0"
    }


# --------------------------------
# ROOT
# --------------------------------

@app.get("/")
def root():

    return {
        "message":
            "AI Debate Coach API is running",

        "docs":
            "/docs"
    }
