import time
from fastapi import APIRouter
from database import engine

router = APIRouter(prefix="/api/v1/operations", tags=["Operations, Monitoring & Health"])

@router.get("/health")
def detailed_health():
    checks = {}
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        checks["database"] = "healthy"
    except Exception as exc:
        checks["database"] = f"degraded: {type(exc).__name__}"
    return {"status": "healthy" if checks["database"] == "healthy" else "degraded", "checks": checks, "timestamp": time.time()}

@router.get("/metrics")
def metrics():
    return {"service": "LOGOS.AI", "request_monitoring": "enabled", "database_monitoring": "enabled", "ai_engine": "deterministic-local", "speech_engine": "faster-whisper compatible"}
