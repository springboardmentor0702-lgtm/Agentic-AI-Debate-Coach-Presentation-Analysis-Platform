from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.logging import configure_logging
from app.core.settings import settings
from app.db.session import init_db


def create_app() -> FastAPI:
    configure_logging()
    init_db()

    app = FastAPI(
        title="Agentic AI Debate Coach API",
        version="0.1.0",
        description="Backend API for debate coaching and presentation analysis.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()

