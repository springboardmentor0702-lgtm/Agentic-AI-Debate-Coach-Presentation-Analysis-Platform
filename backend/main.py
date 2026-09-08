from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import engine, Base
import models
from sqlalchemy import inspect, text
import logging
import time

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
    notifications
)

# Initialize DB tables
Base.metadata.create_all(bind=engine)

# Add new presentation analytics fields to existing SQLite/PostgreSQL databases.
presentation_columns = {
    "prosody_score": "FLOAT",
    "vocal_variety": "FLOAT",
    "vocabulary_diversity": "FLOAT",
    "avg_sentence_length": "FLOAT",
    "pace_feedback": "VARCHAR(255)"
}
existing_columns = {column["name"] for column in inspect(engine).get_columns("presentation_metrics")}
with engine.begin() as connection:
    for column_name, column_type in presentation_columns.items():
        if column_name not in existing_columns:
            connection.execute(text(f"ALTER TABLE presentation_metrics ADD COLUMN {column_name} {column_type}"))

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("logos-ai")

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    logger.info("%s %s -> %s (%sms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(reports.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/health/live")
def liveness():
    return {"status": "alive"}

@app.get("/health/ready")
def readiness():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ready", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
