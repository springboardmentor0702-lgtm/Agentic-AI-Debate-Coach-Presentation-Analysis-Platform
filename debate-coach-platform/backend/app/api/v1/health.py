from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import get_db
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    db.execute(text("SELECT 1"))
    return HealthResponse(
        status="ok",
        service="agentic-ai-debate-coach-api",
        environment=settings.environment,
        ai_mock_mode=settings.ai_mock_mode,
    )

