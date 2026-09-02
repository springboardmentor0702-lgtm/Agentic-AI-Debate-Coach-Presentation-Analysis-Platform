from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user_optional
from services.speech_engine import speech_engine_service
import models
import schemas


router = APIRouter(prefix="/api/v1/presentation-analysis", tags=["Presentation Analysis Engine"])


@router.post("/evaluate", response_model=schemas.PresentationMetricResponse)
def evaluate_presentation(
    payload: schemas.SpeechAnalysisSubmit,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    try:
        metric_data = speech_engine_service.analyze_speech(payload.speech_text, payload.audio_duration_seconds or 60.0)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    session_id = payload.session_id

    # If authenticated and session_id is provided, persist metrics to PostgreSQL
    if current_user is not None and session_id is not None:
        debate_session = (
            db.query(models.DebateSession)
            .filter(models.DebateSession.id == session_id, models.DebateSession.user_id == current_user.id)
            .first()
        )
        if debate_session:
            metric = models.PresentationMetric(session_id=session_id, user_id=current_user.id, **metric_data)
            db.add(metric)
            db.commit()

    return {"session_id": session_id, **metric_data}
